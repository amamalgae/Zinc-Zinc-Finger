export const DEFAULT_DESIRED_CUT_INPUT = "1000";
export const DEFAULT_MAX_DISTANCE_INPUT = "1000";

export function parseUnsignedIntegerInput(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Language-free so the caller renders the message in the active UI language. */
export type DesiredCutError =
  | { kind: "not-an-integer" }
  | { kind: "out-of-range"; maximum: number };

export function desiredCutInputError(value: string, sequenceLength: number): DesiredCutError | null {
  const parsed = parseUnsignedIntegerInput(value);
  if (parsed === null) return { kind: "not-an-integer" };
  const maximum = Math.max(0, sequenceLength);
  if (parsed > maximum) return { kind: "out-of-range", maximum };
  return null;
}
