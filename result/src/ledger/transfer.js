import { requireAccount } from '../accounts.js';
import { SYSTEM_ACCOUNTS } from '../config.js';
import { accountFrozen, insufficientFunds, selfTransfer } from '../errors.js';
import { calculateFee } from '../fees/calculate.js';

export function sendMoney(store, { from, to, amount }) {
  if (from === to) throw selfTransfer();
  const fromAccount = requireAccount(store, from);
  requireAccount(store, to);
  if (fromAccount.frozen) throw accountFrozen();
  
  const toAccount = store.accounts.get(to);
  if (toAccount.frozen) throw accountFrozen();
  
  const { ledger } = store;
  const fee = calculateFee('send', amount);
  if (ledger.balance(from) < amount + fee) throw insufficientFunds();

  const lines = [
    { account: from, debit: amount + fee },
    { account: to, credit: amount },
  ];
  if (fee > 0) lines.push({ account: SYSTEM_ACCOUNTS.fees, credit: fee });
  ledger.post({ kind: 'send', memo: `send ${from} to ${to}`, lines });

  return {
    fee,
    from: { id: from, balance: ledger.balance(from) },
    to: { id: to, balance: ledger.balance(to) },
  };
}
