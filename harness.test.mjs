import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { atomic, applyAnswer, safeSource, validatePlan, overlaps, FreeBudget, passes, catalog, git, exec, readJson } from './core.mjs';
const home = path.dirname(fileURLToPath(import.meta.url));
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'collision-harness-test-'));
const tasks = ['A','B','C'].map(id => ({ id, title: id, body: 'Implement feature ' + id }));
const plan = () => ({ tasks: tasks.map(t => ({ id:t.id, dependsOn:[], conflicts:[], files:['src/' + t.id + '.js'] })) });
test('ownership prevents collisions; unsafe and protected writes rejected atomically', () => {
  const root = temp();
  assert.equal(overlaps(['src/*'], ['src/a.js']), true);
  assert.equal(overlaps(['src/a.js'], ['src/b.js']), false);
  for (const p of ['../secret.js','src/../../secret.js','test/a.js','src/../a.js','src/a\\b.js']) assert.throws(() => safeSource(root, p));
  assert.throws(() => applyAnswer(root, {files:[{path:'src/a.js',content:'ok'},{path:'test/a.js',content:'bad'}]}, ['src/*']));
  assert.equal(fs.existsSync(path.join(root, 'src/a.js')), false);
  assert.throws(() => applyAnswer(root, {files:[{path:'src/b.js',content:'bad'}]}, ['src/a.js']));
});
test('dependency planner rejects missing tasks, invalid references and cycles', () => {
  assert.equal(validatePlan(plan(), tasks).length, 3);
  assert.throws(() => validatePlan({tasks:[]}, tasks));
  const p = plan(); p.tasks[0].dependsOn = ['B']; p.tasks[1].dependsOn = ['A'];
  assert.throws(() => validatePlan(p, tasks), /cycle/);
  p.tasks[1].dependsOn = ['unknown']; assert.throws(() => validatePlan(p, tasks));
});
test('free-only guard persists before dispatch, limits calls and fails closed on missing costs', () => {
  const s = {requests:[],spentUsd:0}; let persisted = 0;
  const b = new FreeBudget(s, {budgetUsd:5,maxRequests:2}, () => persisted++, () => {});
  assert.throws(() => b.reserve('paid/model'));
  const r = b.reserve('a/model:free'); assert.equal(persisted,1);
  b.settle(r, {id:'gen-1',usage:{cost:0}});
  const r2 = b.reserve('b/model:free');
  assert.throws(() => b.reserve('a/model:free'), /quota/);
  assert.throws(() => b.settle(r2, {usage:{}}), /Missing spend/);
  assert.equal(s.halted,true); assert.equal(r2.costUsd,null);
});
test('unexpected billing halts all subsequent calls', () => {
  const s = {requests:[],spentUsd:0}; const b = new FreeBudget(s,{budgetUsd:5,maxRequests:45},()=>{},()=>{});
  const r=b.reserve('a/model:free'); assert.throws(()=>b.settle(r,{usage:{cost:0.1}}));
  assert.equal(s.spentUsd,0.1); assert.throws(()=>b.reserve('b/model:free'));
});
test('zero budget permits zero-price requests; task status requires grader evidence', () => {
  const b = new FreeBudget({requests:[],spentUsd:0},{budgetUsd:0,maxRequests:1},()=>{},()=>{});
  b.reserve('a/model:free');
  assert.equal(passes({regression:{passed:true},testsUnmodified:true,tasks:{A:{passed:false}}},'A'),false);
  assert.equal(passes({regression:{passed:false},testsUnmodified:true,tasks:{A:{passed:true}}},'A'),false);
});
test('catalog excludes paid models and routes with non-token charges', async () => {
  const result=await catalog(async()=>({ok:true,json:async()=>({data:[
    {id:'ok:free',pricing:{prompt:'0',completion:'0'}},
    {id:'paid',pricing:{prompt:'0',completion:'0'}},
    {id:'bad:free',pricing:{prompt:'0',completion:'0',request:'0.01'}}
  ]})})); assert.deepEqual(result.map(x=>x.id),['ok:free']);
});
test('atomic state survives replacing an existing checkpoint', () => {
  const p=path.join(temp(),'state.json'); atomic(p,{n:1}); atomic(p,{n:2}); assert.equal(readJson(p).n,2);
});

test('offline end-to-end: three workers/two models, integration rollback, honest reporting and resume', {timeout:120000}, async () => {
  const root=temp(), repo=path.join(root,'fixture'), runs=path.join(root,'private'); fs.mkdirSync(repo);
  for(const d of ['src','docs','backlog','scripts']) fs.mkdirSync(path.join(repo,d));
  fs.writeFileSync(path.join(repo,'AGENTS.md'),'Fixture repository');
  fs.writeFileSync(path.join(repo,'docs/api.md'),'Fixture API');
  fs.writeFileSync(path.join(repo,'backlog/backlog.json'),JSON.stringify({version:1,tasks}));
  fs.writeFileSync(path.join(repo,'tests.lock.json'),'{}');
  fs.writeFileSync(path.join(repo,'scripts/test-lock.js'),'');
  for(const t of tasks) fs.writeFileSync(path.join(repo,'src',t.id+'.js'),'0');
  fs.writeFileSync(path.join(repo,'package.json'),'{"type":"module"}');
  // Each worker passes alone. B conflicts semantically with A only after integration.
  fs.writeFileSync(path.join(repo,'scripts/grade.js'), `import fs from 'node:fs';
const has=id=>fs.readFileSync('src/'+id+'.js','utf8').trim()==='1';
const bad=has('A')&&has('B');
fs.writeFileSync('grade-report.json',JSON.stringify({regression:{passed:!bad},testsUnmodified:true,tasks:Object.fromEntries(['A','B','C'].map(id=>[id,{passed:has(id)}]))}));`);
  fs.writeFileSync(path.join(repo,'.gitignore'),'grade-report.json\n');
  await git(repo,'init'); await git(repo,'add','.');
  await git(repo,'-c','user.name=Test','-c','user.email=test@localhost','commit','-m','fixture');
  const cfg=path.join(root,'config.json'); atomic(cfg,{repo,runsDir:runs,budgetUsd:5,maxRequests:45,workers:3,models:['test/a:free','test/b:free'],maxTokens:8000,attemptsPerTask:2});
  const mock=path.join(root,'mock.mjs');
  fs.writeFileSync(mock, `globalThis.fetch=async(url,options)=>{
if(url.endsWith('/models'))return {ok:true,json:async()=>({data:['test/a:free','test/b:free'].map(id=>({id,pricing:{prompt:'0',completion:'0'}}))})};
const request=JSON.parse(options.body),p=JSON.parse(request.messages[1].content);
const answer=p.backlog?{tasks:p.backlog.tasks.map(t=>({id:t.id,dependsOn:[],conflicts:[],files:['src/'+t.id+'.js']}))}:{files:[{path:'src/'+p.task.id+'.js',content:'1'}],summary:'I claim done'};
return {ok:true,json:async()=>({id:'fixture-'+Date.now(),model:request.model,usage:{cost:0,prompt_tokens:10,completion_tokens:10},choices:[{message:{content:JSON.stringify(answer)}}]})};
};`);
  const opts={cwd:home,env:{...process.env,OPENROUTER_API_KEY:'test-not-a-real-key'},timeout:90000,maxBuffer:4e6};
  await exec(process.execPath,['--import',pathToFileURL(mock).href,'cli.mjs','run','--config',cfg],opts);
  const dir=path.join(runs,fs.readdirSync(runs)[0]), summary=readJson(path.join(dir,'summary.json'));
  assert.equal(summary.agentRequirementMet,true); assert.equal(summary.confirmedSpendUsd,0);
  assert.equal(summary.tasks.A.status,'verified'); assert.equal(summary.tasks.C.status,'verified'); assert.equal(summary.tasks.B.status,'failed');
  assert.match(fs.readFileSync(path.join(dir,'events.jsonl'),'utf8'),/merge_rejected/);
  assert.equal(await git(repo,'status','--porcelain'),'');
  assert.equal(fs.readFileSync(path.join(repo,'src/A.js'),'utf8'),'0');
  const before=summary.requests;
  // Simulate a crash after a worker was marked running; accepted commits are recovered from tests.
  const state=readJson(path.join(dir,'state.json')); state.tasks.A.status='running'; state.tasks.B.status='merging'; state.tasks.B.beforeIntegrationCommit=summary.finalCommit;
  fs.writeFileSync(path.join(dir,'integrated/src/B.js'),'1');
  await git(path.join(dir,'integrated'),'add','src/B.js');
  await git(path.join(dir,'integrated'),'-c','user.name=Test','-c','user.email=test@localhost','commit','-m','interrupted merge fixture');
  atomic(path.join(dir,'state.json'),state);
  await exec(process.execPath,['--import',pathToFileURL(mock).href,'cli.mjs','resume','--run',dir,'--config',cfg],opts);
  const resumed=readJson(path.join(dir,'summary.json'));
  assert.equal(resumed.tasks.A.status,'verified'); assert.equal(resumed.requests,before);
  assert.equal(fs.readFileSync(path.join(dir,'events.jsonl'),'utf8').includes('test-not-a-real-key'),false);
});
