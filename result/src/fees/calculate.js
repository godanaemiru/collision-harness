import { SCHEDULE } from './schedule.js';

export function calculateFee(type, amount) {
  const bands = SCHEDULE[type];
  if (!bands) throw new Error(`no fee schedule for ${type}`);
  const band = bands.find((candidate) => amount <= candidate.upTo);
  if (!band) throw new Error(`amount ${amount} is above the top fee band for ${type}`);
  if (band.flat !== undefined) return band.flat;
  const percentFee = (amount * band.percent) / 100;
  const roundedFee = Math.floor(percentFee + 0.5);
  return band.minFee !== undefined ? Math.max(band.minFee, roundedFee) : roundedFee;
}
