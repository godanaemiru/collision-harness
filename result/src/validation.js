import { ACCOUNT_ID_PATTERN, MAX_AMOUNT } from './config.js';
import { invalidAmount, invalidBody, invalidType } from './errors.js';

const QUOTE_TYPES = ['send'];

export function requireObject(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw invalidBody('body must be a JSON object');
  }
  return body;
}

export function requireAmount(value) {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_AMOUNT) throw invalidAmount();
  return value;
}

export function requireAccountId(value, field) {
  if (typeof value !== 'string' || !ACCOUNT_ID_PATTERN.test(value)) {
    throw invalidBody(`${field} must be a valid account id`);
  }
  return value;
}

export function validateNewAccount(body) {
  const { id, name, openingBalance = 0 } = requireObject(body);
  requireAccountId(id, 'id');
  if (typeof name !== 'string' || name.trim() === '') throw invalidBody('name is required');
  if (!Number.isInteger(openingBalance) || openingBalance < 0) {
    throw invalidBody('openingBalance must be a non-negative whole number');
  }
  return { id, name: name.trim(), openingBalance };
}

export function validateTransfer(body) {
  const { from, to, amount } = requireObject(body);
  return {
    from: requireAccountId(from, 'from'),
    to: requireAccountId(to, 'to'),
    amount: requireAmount(amount),
  };
}

export function validateQuote(body) {
  const { type, amount } = requireObject(body);
  if (!QUOTE_TYPES.includes(type)) throw invalidType();
  return { type, amount: requireAmount(amount) };
}
