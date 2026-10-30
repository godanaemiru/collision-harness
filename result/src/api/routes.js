import { accountView, createAccount, requireAccount } from '../accounts.js';
import { SCHEDULE } from '../fees/schedule.js';
import { sendMoney } from '../ledger/transfer.js';
import { validateNewAccount, validateQuote, validateTransfer } from '../validation.js';
import { recall, remember } from './idempotency.js';

const reply = (status, body) => ({ status, body });

function quoteFee(type, amount) {
  const band = SCHEDULE[type].find((candidate) => amount <= candidate.upTo);
  if (band.flat !== undefined) return band.flat;
  const percentFee = (amount * band.percent) / 100;
  const roundedFee = Math.floor(percentFee + 0.5);
  return band.minFee !== undefined ? Math.max(band.minFee, roundedFee) : roundedFee;
}

function postTransfer({ store, body, headers }) {
  const input = validateTransfer(body);
  const key = headers['Idempotency-Key'];
  const cached = recall(key);
  if (cached) return cached;
  const response = reply(201, sendMoney(store, input));
  remember(key, response);
  return response;
}

export const routes = [
  {
    method: 'GET',
    path: '/health',
    handler: () => reply(200, { ok: true }),
  },
  {
    method: 'POST',
    path: '/accounts',
    handler: ({ store, body }) => reply(201, createAccount(store, validateNewAccount(body))),
  },
  {
    method: 'GET',
    path: '/accounts/:id',
    handler: ({ store, params }) => reply(200, accountView(store, requireAccount(store, params.id))),
  },
  {
    method: 'GET',
    path: '/accounts/:id/statement',
    handler: ({ store, params }) => {
      requireAccount(store, params.id);
      return reply(200, { entries: store.ledger.statementFor(params.id) });
    },
  },
  {
    method: 'POST',
    path: '/fees/quote',
    handler: ({ body }) => {
      const { type, amount } = validateQuote(body);
      return reply(200, { type, amount, fee: quoteFee(type, amount) });
    },
  },
  {
    method: 'POST',
    path: '/transfers',
    handler: postTransfer,
  },
  {
    method: 'POST',
    path: '/accounts/:id/freeze',
    handler: ({ store, params }) => {
      const account = requireAccount(store, params.id);
      account.frozen = true;
      return reply(200, accountView(store, account));
    },
  },
  {
    method: 'POST',
    path: '/accounts/:id/unfreeze',
    handler: ({ store, params }) => {
      const account = requireAccount(store, params.id);
      account.frozen = false;
      return reply(200, accountView(store, account));
    },
  },
];
