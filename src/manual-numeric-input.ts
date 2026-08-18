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
  if (parsed === null) return "0以上の整数を入力してください。";
  const maximum = Math.max(0, sequenceLength);
  if (parsed > maximum) return `入力配列の範囲内（0〜${maximum}）に訂正してください。`;
  return null;
}
