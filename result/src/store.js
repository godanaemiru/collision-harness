import { DEFAULT_CURRENCY, SYSTEM_ACCOUNTS } from './config.js';
import { createLedger } from './ledger/ledger.js';

export function createStore({ clock = () => new Date() } = {}) {
  const accounts = new Map();
  for (const id of Object.values(SYSTEM_ACCOUNTS)) {
    accounts.set(id, { id, name: id, currency: DEFAULT_CURRENCY, frozen: false });
  }
  return { accounts, ledger: createLedger(clock), clock };
}
