import { DEFAULT_CURRENCY, SYSTEM_ACCOUNTS } from './config.js';
import { accountExists, accountNotFound } from './errors.js';

export function requireAccount(store, id) {
  const account = store.accounts.get(id);
  if (!account) throw accountNotFound(id);
  return account;
}

export function accountView(store, account) {
  return {
    id: account.id,
    name: account.name,
    currency: account.currency,
    balance: store.ledger.balance(account.id),
    frozen: account.frozen,
  };
}

export function createAccount(store, { id, name, openingBalance }) {
  if (store.accounts.has(id)) throw accountExists(id);
  const account = { id, name, currency: DEFAULT_CURRENCY, frozen: false };
  store.accounts.set(id, account);
  if (openingBalance > 0) {
    store.ledger.post({
      kind: 'opening',
      memo: `opening balance for ${id}`,
      lines: [
        { account: SYSTEM_ACCOUNTS.float, debit: openingBalance },
        { account: id, credit: openingBalance },
      ],
    });
  }
  return accountView(store, account);
}
