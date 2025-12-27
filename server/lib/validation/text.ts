const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;

export function normalizePlainText(input: string, maxLen: number): string {
  let normalized = input.replace(CONTROL_CHAR_REGEX, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();
  if (normalized.length > maxLen) {
    normalized = normalized.slice(0, maxLen);
  }
  return normalized;
}
