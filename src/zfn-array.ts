export type FingerPosition = 1 | 2 | 3;

export type ZfnArrayMethod = "gupta-2012" | "coda-2011";

export type ZfnFinger = {
  position: FingerPosition;
  triplet: string;
  helix: string;
  source: string;
  protein: string;
};

export type ZfnArray = {
  recognition: string;
  method: ZfnArrayMethod;
  methodLabel: string;
  assembly: string;
  fingers: readonly [ZfnFinger, ZfnFinger, ZfnFinger];
  linkers: readonly [string, string];
  protein: string;
};
