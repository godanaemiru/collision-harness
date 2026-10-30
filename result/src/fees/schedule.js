export const SCHEDULE = {
  send: [
    { upTo: 5_000, percent: 5, minFee: 100 },
    { upTo: 50_000, flat: 500 },
    { upTo: 500_000, percent: 1 },
    { upTo: 5_000_000, percent: 0.8 },
  ],
};
