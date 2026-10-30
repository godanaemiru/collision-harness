export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const invalidJson = () => new AppError(400, 'INVALID_JSON', 'request body is not valid JSON');
export const invalidBody = (message) => new AppError(400, 'INVALID_BODY', message);
export const invalidAmount = () =>
  new AppError(400, 'INVALID_AMOUNT', 'amount must be a positive whole number within the allowed maximum');
export const invalidType = () => new AppError(400, 'INVALID_TYPE', 'unknown transaction type');
export const selfTransfer = () => new AppError(400, 'SELF_TRANSFER', 'sender and receiver must differ');
export const routeNotFound = () => new AppError(404, 'NOT_FOUND', 'no such route');
export const accountNotFound = (id) => new AppError(404, 'ACCOUNT_NOT_FOUND', `account ${id} not found`);
export const accountExists = (id) => new AppError(409, 'ACCOUNT_EXISTS', `account ${id} already exists`);
export const insufficientFunds = () =>
  new AppError(422, 'INSUFFICIENT_FUNDS', 'balance is too low for the amount plus charges');
export const accountFrozen = () =>
  new AppError(422, 'ACCOUNT_FROZEN', 'account is frozen');
