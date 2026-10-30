import http from 'node:http';
import { AppError, invalidJson, routeNotFound } from '../errors.js';
import { createStore } from '../store.js';
import { routes } from './routes.js';

const PARAM_PATTERN = /:([a-z]+)/g;

const compiled = routes.map((route) => {
  const names = [];
  const source = route.path.replace(PARAM_PATTERN, (_, name) => {
    names.push(name);
    return '([^/]+)';
  });
  return { route, names, regex: new RegExp(`^${source}$`) };
});

function findRoute(method, pathname) {
  for (const { route, names, regex } of compiled) {
    const match = route.method === method && regex.exec(pathname);
    if (match) {
      return { route, params: Object.fromEntries(names.map((name, index) => [name, match[index + 1]])) };
    }
  }
  return null;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw invalidJson();
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

export function createApp(store = createStore()) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const found = findRoute(req.method, url.pathname);
      if (!found) throw routeNotFound();
      const body = await readJson(req);
      const result = await found.route.handler({
        store,
        params: found.params,
        query: url.searchParams,
        body,
        headers: req.headers,
      });
      send(res, result.status, result.body);
    } catch (error) {
      if (error instanceof AppError) {
        send(res, error.status, { error: { code: error.code, message: error.message } });
        return;
      }
      console.error(error);
      send(res, 500, { error: { code: 'INTERNAL', message: 'internal error' } });
    }
  });
  return { server, store };
}
