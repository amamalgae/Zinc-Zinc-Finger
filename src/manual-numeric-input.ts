export const DEFAULT_DESIRED_CUT_INPUT = "1000";
export const DEFAULT_MAX_DISTANCE_INPUT = "1000";

export function parseUnsignedIntegerInput(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function desiredCutInputError(value: string, sequenceLength: number): string | null {
  const parsed = parseUnsignedIntegerInput(value);
  if (parsed === null) return "Enter a whole number of 0 or more.";
  const maximum = Math.max(0, sequenceLength);
  if (parsed > maximum) return `Enter a coordinate between 0 and ${maximum}.`;
  return null;
}
