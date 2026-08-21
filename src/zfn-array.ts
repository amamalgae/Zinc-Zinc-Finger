export type FingerPosition = 1 | 2 | 3 | 4 | 5 | 6;

export type ZfnArrayMethod = "gupta-2012" | "coda-2011" | "bhakta-2013";

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
  fingerCount?: 3 | 4 | 5 | 6;
  fingers: readonly ZfnFinger[];
  linkers: readonly string[];
  protein: string;
  nTerminalFixed?: string;
  cTerminalFixed?: string;
};
