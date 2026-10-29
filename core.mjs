import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
export const exec = promisify(execFile);
export function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); }
export function atomic(p, value) {
  const tmp = p + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(tmp, p);
}
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function git(cwd, ...args) {
  const r = await exec('git', args, { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 16e6 });
  return r.stdout.trim();
}
export function parseAnswer(text) {
  if (typeof text !== 'string') throw Error('Model did not return text');
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
}
export function filesUnder(root, dir) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(e => {
    if (e.isSymbolicLink()) throw Error('Symlinks are not allowed: ' + dir + '/' + e.name);
    return e.isDirectory() ? filesUnder(root, dir + '/' + e.name) : [dir + '/' + e.name];
  });
}
export function safeSource(root, name) {
  if (typeof name !== 'string' || !/^src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.js$/.test(name) || name.split('/').some(x => x === '.' || x === '..')) throw Error('Only ordinary src/*.js paths may be written');
  const target = path.resolve(root, name);
  let cursor = root;
  for (const part of name.split('/')) {
    cursor = path.join(cursor, part);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw Error('Symlink rejected');
  }
  if (!target.startsWith(path.resolve(root) + path.sep)) throw Error('Path escapes workspace');
  return target;
}
export function applyAnswer(root, answer, owned) {
  if (!Array.isArray(answer.files) || answer.files.length > 20) throw Error('Expected at most 20 files');
  const seen = new Set();
  const writes = answer.files.map(f => {
    const target = safeSource(root, f.path);
    if (seen.has(f.path) || typeof f.content !== 'string' || Buffer.byteLength(f.content) > 150000) throw Error('Invalid or repeated file');
    if (!owned.includes('src/*') && !owned.includes(f.path)) throw Error('File outside task ownership: ' + f.path);
    seen.add(f.path); return { target, content: f.content };
  });
  for (const f of writes) { fs.mkdirSync(path.dirname(f.target), { recursive: true }); fs.writeFileSync(f.target, f.content); }
  return [...seen];
}
export function validatePlan(raw, tasks) {
  const ids = new Set(tasks.map(t => t.id));
  if (!Array.isArray(raw.tasks) || raw.tasks.length !== tasks.length) throw Error('Plan must cover every task');
  const seen = new Set();
  const result = raw.tasks.map(p => {
    if (!ids.has(p.id) || seen.has(p.id)) throw Error('Invalid task in plan'); seen.add(p.id);
    for (const field of ['dependsOn', 'conflicts']) {
      if (!Array.isArray(p[field]) || p[field].some(id => !ids.has(id) || id === p.id)) throw Error('Invalid ' + field);
    }
    if (!Array.isArray(p.files) || !p.files.length) p.files = ['src/*'];
    p.files.forEach(f => { if (f !== 'src/*') safeSource(path.resolve('.'), f); });
    return { id: p.id, dependsOn: [...new Set(p.dependsOn)], conflicts: [...new Set(p.conflicts)], files: [...new Set(p.files)], reason: String(p.reason || '') };
  });
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visiting.has(id)) throw Error('Dependency cycle');
    if (visited.has(id)) return;
    visiting.add(id); result.find(p => p.id === id).dependsOn.forEach(visit); visiting.delete(id); visited.add(id);
  }
  result.forEach(p => visit(p.id)); return result;
}
export function overlaps(a, b) { return a.includes('src/*') || b.includes('src/*') || a.some(x => b.includes(x)); }
export class FreeBudget {
  constructor(state, config, persist, event) { Object.assign(this, { state, config, persist, event }); }
  reserve(model) {
    if (!model.endsWith(':free')) throw Error('Paid models and automatic routers are disabled');
    if (this.state.halted || this.state.spentUsd >= this.config.budgetUsd && this.config.budgetUsd !== 0) throw Error('Budget guard stopped the run');
    if (this.state.requests.length >= this.config.maxRequests) throw Error('Request quota reached');
    const request = { id: this.state.requests.length + 1, model, startedAt: new Date().toISOString(), status: 'pending', upperBoundUsd: 0 };
    this.state.requests.push(request); this.persist(); this.event('request_reserved', request); return request;
  }
  settle(request, response) {
    const cost = response.usage?.cost;
    request.generationId = response.id || null;
    request.usage = response.usage || null;
    request.actualModel = response.model || request.model;
    request.finishedAt = new Date().toISOString();
    if (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0) {
      request.status = 'cost_unconfirmed'; request.costUsd = null;
      this.state.halted = true; this.persist(); throw Error('Missing spend evidence; stopped without assuming zero cost');
    }
    request.status = 'complete'; request.costUsd = cost;
    this.state.spentUsd += cost;
    if (cost !== 0 || this.state.spentUsd > this.config.budgetUsd) this.state.halted = true;
    this.persist(); this.event('request_completed', request);
    if (this.state.halted) throw Error('Unexpected charge on a zero-price route; further calls stopped');
  }
}
export async function grade(root, evidence) {
  fs.rmSync(path.join(root, 'grade-report.json'), { force: true });
  let output = '';
  try { const r = await exec(process.execPath, ['scripts/grade.js'], { cwd: root, timeout: 240000, maxBuffer: 16e6 }); output = r.stdout + r.stderr; }
  catch (e) { output = (e.stdout || '') + (e.stderr || '') + '\n' + e.message; }
  fs.writeFileSync(evidence + '.txt', output);
  const p = path.join(root, 'grade-report.json');
  if (!fs.existsSync(p)) throw Error('Grader did not produce a report; see ' + evidence + '.txt');
  const report = readJson(p); atomic(evidence + '.json', report); return report;
}
export function passes(report, id) { return report.regression?.passed === true && report.testsUnmodified === true && report.tasks?.[id]?.passed === true; }
export async function catalog(fetcher = fetch) {
  const res = await fetcher('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw Error('Could not read model catalog: HTTP ' + res.status);
  const { data } = await res.json();
  return data.filter(m => m.id.endsWith(':free') && Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0 && Object.values(m.pricing || {}).every(p => Number(p) === 0));
}
