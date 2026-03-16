const tokenPattern = /\{\{\s*([A-Z0-9_]+)\s*\}\}/gi;
const trainingUrlAliasPattern =
  /\{\{\{?\s*(?:TRAINING_URL|TRANNING_URL|TRAINNING_URL)\s*\}\}\}?/gi;

export const MAIL_ALLOWED_TOKENS = ["LANDING_URL", "OPEN_PIXEL_URL"] as const;
export const MAIL_LANDING_TOKENS = ["LANDING_URL"] as const;
export const MALICIOUS_TRAINING_TOKENS = ["TRAINING_URL"] as const;
export const MALICIOUS_SUBMIT_TOKENS = ["SUBMIT_URL"] as const;
export const MALICIOUS_NAV_TOKENS = [
  ...MALICIOUS_TRAINING_TOKENS,
  ...MALICIOUS_SUBMIT_TOKENS,
] as const;
export const MALICIOUS_ALLOWED_TOKENS = [...MALICIOUS_NAV_TOKENS] as const;

export type TemplateToken =
  | typeof MAIL_ALLOWED_TOKENS[number]
  | typeof MALICIOUS_ALLOWED_TOKENS[number];

export const normalizeTrainingUrlPlaceholders = (html: string) => {
  if (!html) return "";
  return html.replace(trainingUrlAliasPattern, "{{TRAINING_URL}}");
};

export const extractTemplateTokens = (html: string) => {
  const tokens = new Set<string>();
  const normalizedHtml = normalizeTrainingUrlPlaceholders(html);
  if (!normalizedHtml) return [];
  tokenPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(normalizedHtml))) {
    const token = (match[1] ?? "").trim().toUpperCase();
    if (token) {
      tokens.add(token);
    }
  }
  return Array.from(tokens);
};

export const hasAnyToken = (tokens: string[], candidates: readonly string[]) =>
  candidates.some((candidate) => tokens.includes(candidate));

export const findUnknownTokens = (tokens: string[], allowed: readonly string[]) => {
  const allowedSet = new Set(allowed);
  return tokens.filter((token) => !allowedSet.has(token));
};

export const countTokenOccurrences = (
  html: string,
  candidates: readonly string[],
) => {
  const normalizedHtml = normalizeTrainingUrlPlaceholders(html);
  if (!normalizedHtml) return 0;
  const candidateSet = new Set(candidates.map((token) => token.toUpperCase()));
  tokenPattern.lastIndex = 0;
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(normalizedHtml))) {
    const token = (match[1] ?? "").trim().toUpperCase();
    if (candidateSet.has(token)) {
      count += 1;
    }
  }
  return count;
};
