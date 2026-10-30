const seen = new Map();

export function recall(key) {
  return key === undefined ? undefined : seen.get(key);
}

export function remember(key, response) {
  if (key !== undefined) seen.set(key, response);
}
