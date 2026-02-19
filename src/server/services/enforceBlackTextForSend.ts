const BLACK_TEXT_COLOR = "#111111";

type StyleDeclaration = {
  property: string;
  value: string;
};

const WHITE_TEXT_VALUES = new Set([
  "#fff",
  "#ffffff",
  "white",
  "rgb(255,255,255)",
  "rgba(255,255,255,1)",
]);

const normalizeCssValue = (value: string) =>
  value
    .replace(/!important/gi, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();

const isWhiteTextValue = (value: string) => WHITE_TEXT_VALUES.has(normalizeCssValue(value));

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");

const parseStyleDeclarations = (styleText: string): StyleDeclaration[] => {
  return styleText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex < 0) return null;
      return {
        property: entry.slice(0, separatorIndex).trim(),
        value: entry.slice(separatorIndex + 1).trim(),
      } satisfies StyleDeclaration;
    })
    .filter((entry): entry is StyleDeclaration => entry !== null);
};

const serializeStyleDeclarations = (declarations: StyleDeclaration[]) =>
  declarations
    .map(({ property, value }) => `${property}: ${value}`)
    .join("; ")
    .trim();

const enforceInlineStyleTextColor = (styleText: string) => {
  const declarations = parseStyleDeclarations(styleText);

  const normalized = declarations.map((declaration) => {
    if (declaration.property.toLowerCase() !== "color") {
      return declaration;
    }
    if (!isWhiteTextValue(declaration.value)) {
      return declaration;
    }
    return {
      property: declaration.property,
      value: BLACK_TEXT_COLOR,
    } satisfies StyleDeclaration;
  });

  return serializeStyleDeclarations(normalized);
};

const enforceStyleBlockTextColor = (cssText: string) =>
  cssText.replace(
    /(^|[;{\s])color\s*:\s*(#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*1(?:\.0+)?\s*\))(\s*!important)?/gi,
    `$1color: ${BLACK_TEXT_COLOR}$3`,
  );

export const enforceBlackTextForSend = (html: string) => {
  if (!html) return "";

  let out = html;

  out = out.replace(
    /\scolor\s*=\s*(?:"(?:#fff|#ffffff|white)"|'(?:#fff|#ffffff|white)'|(?:#fff|#ffffff|white))/gi,
    ` color="${BLACK_TEXT_COLOR}"`,
  );

  out = out.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_match, _quote, styleValue: string) => {
    const normalized = enforceInlineStyleTextColor(styleValue);
    return normalized ? ` style="${escapeAttribute(normalized)}"` : "";
  });

  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, cssText: string) => {
    const normalizedCss = enforceStyleBlockTextColor(cssText);
    return match.replace(cssText, normalizedCss);
  });

  return out;
};
