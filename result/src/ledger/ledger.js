// Balances are credits minus debits, so SYSTEM_FLOAT goes negative as wallets are funded
// and every account in the store always sums to zero.
export function createLedger(clock) {
  const entries = [];

  function post({ kind, memo, lines }) {
    const normalized = lines.map(({ account, debit = 0, credit = 0 }) => ({ account, debit, credit }));
    const debits = normalized.reduce((sum, line) => sum + line.debit, 0);
    const credits = normalized.reduce((sum, line) => sum + line.credit, 0);
    if (debits !== credits) {
      throw new Error(`unbalanced ledger entry: debits ${debits}, credits ${credits}`);
    }
    const entry = { seq: entries.length + 1, kind, memo, at: clock().toISOString(), lines: normalized };
    entries.push(entry);
    return entry;
  }

  function balance(accountId) {
    return entries
      .flatMap((entry) => entry.lines)
      .filter((line) => line.account === accountId)
      .reduce((sum, line) => sum + line.credit - line.debit, 0);
  }

  function statementFor(accountId) {
    return entries
      .filter((entry) => entry.lines.some((line) => line.account === accountId))
      .map((entry) => ({
        seq: entry.seq,
        kind: entry.kind,
        memo: entry.memo,
        at: entry.at,
        amount: entry.lines
          .filter((line) => line.account === accountId)
          .reduce((sum, line) => sum + line.credit - line.debit, 0),
      }));
  }

  return { post, balance, statementFor };
}
