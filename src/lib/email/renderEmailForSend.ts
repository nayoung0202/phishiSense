import { extractBodyHtml } from "@/lib/html";

export type RenderEmailForSendOptions = {
  subject?: string;
};

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

const BLACK_BACKGROUND_VALUES = new Set([
  "#000",
  "#000000",
  "#111111",
  "black",
  "rgb(0,0,0)",
  "rgba(0,0,0,1)",
]);

const LINK_COLOR = "#1a73e8";
const BASE_TEXT_COLOR = "#111111";
const BASE_BACKGROUND_COLOR = "#ffffff";

const normalizeCssValue = (value: string) =>
  value
    .replace(/!important/gi, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();

const isWhiteTextValue = (value: string) => WHITE_TEXT_VALUES.has(normalizeCssValue(value));

const isBlackBackgroundValue = (value: string) =>
  BLACK_BACKGROUND_VALUES.has(normalizeCssValue(value));

const isTransparentValue = (value: string) => normalizeCssValue(value) === "transparent";

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

const getStyleDeclarationIndex = (declarations: StyleDeclaration[], property: string) =>
  declarations.findIndex((declaration) => declaration.property.toLowerCase() === property);

const getStyleDeclaration = (declarations: StyleDeclaration[], property: string) => {
  return declarations.find((declaration) => declaration.property.toLowerCase() === property);
};

const upsertStyleDeclaration = (
  declarations: StyleDeclaration[],
  property: string,
  value: string,
) => {
  const index = getStyleDeclarationIndex(declarations, property.toLowerCase());
  if (index >= 0) {
    declarations[index] = {
      property: declarations[index].property,
      value,
    };
    return;
  }
  declarations.push({ property, value });
};

const cleanInlineStyle = (styleText: string) => {
  const declarations = parseStyleDeclarations(styleText);
  const hasTransparentBackground = declarations.some((declaration) => {
    const property = declaration.property.toLowerCase();
    if (property !== "background" && property !== "background-color") {
      return false;
    }
    return isTransparentValue(declaration.value);
  });

  const filtered = declarations.filter((declaration) => {
    const property = declaration.property.toLowerCase();

    if (property === "color" && isWhiteTextValue(declaration.value)) {
      return false;
    }

    if ((property === "background" || property === "background-color") && isBlackBackgroundValue(declaration.value)) {
      return false;
    }

    if (hasTransparentBackground && property === "color" && isWhiteTextValue(declaration.value)) {
      return false;
    }

    return true;
  });

  return serializeStyleDeclarations(filtered);
};

const cleanStyleBlock = (cssText: string) => {
  return cssText
    .replace(
      /color\s*:\s*(#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*1(?:\.0+)?\s*\))\s*(?:!important)?\s*;?/gi,
      "",
    )
    .replace(
      /background(?:-color)?\s*:\s*(#000(?:000)?|#111111|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*1(?:\.0+)?\s*\))\s*(?:!important)?\s*;?/gi,
      "",
    )
    .replace(/;\s*;/g, ";")
    .replace(/\{\s*;/g, "{")
    .replace(/;\s*\}/g, "}");
};

const shouldStripThemeClass = (token: string) => {
  const value = token.toLowerCase();
  if (value === "dark") return true;
  if (value.startsWith("dark:")) return true;
  if (value.startsWith("dark-")) return true;
  if (value.includes("theme-dark")) return true;
  if (value.includes("text-white")) return true;
  if (value.includes("bg-black")) return true;
  return false;
};

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const rewriteAnchorStyle = (anchorTag: string, declarations: StyleDeclaration[]) => {
  const serialized = serializeStyleDeclarations(declarations);
  const styleAttributePattern = /\sstyle\s*=\s*(["'])[\s\S]*?\1/i;

  if (!serialized) {
    return anchorTag
      .replace(styleAttributePattern, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+>/g, ">");
  }

  if (styleAttributePattern.test(anchorTag)) {
    return anchorTag
      .replace(styleAttributePattern, ` style="${escapeAttribute(serialized)}"`)
      .replace(/\s{2,}/g, " ")
      .replace(/\s+>/g, ">");
  }

  return anchorTag
    .replace(/^<a\b/i, `<a style="${escapeAttribute(serialized)}"`)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+>/g, ">");
};

const isButtonLikeAnchor = (classValue: string, declarations: StyleDeclaration[]) => {
  const hasButtonClass = /(^|\s)(btn|button|cta)([-_:a-z0-9]*)?(\s|$)/i.test(classValue);
  const hasPadding = getStyleDeclarationIndex(declarations, "padding") >= 0;
  const hasBackground =
    getStyleDeclarationIndex(declarations, "background") >= 0 ||
    getStyleDeclarationIndex(declarations, "background-color") >= 0;

  return hasButtonClass || (hasPadding && hasBackground);
};

const applyLinkContrastRules = (html: string) => {
  return html.replace(/<a\b[^>]*>/gi, (anchorTag) => {
    const classMatch = anchorTag.match(/\sclass\s*=\s*(["'])(.*?)\1/i);
    const styleMatch = anchorTag.match(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i);
    const classValue = classMatch?.[2] ?? "";
    const declarations = parseStyleDeclarations(styleMatch?.[2] ?? "");
    const buttonLike = isButtonLikeAnchor(classValue, declarations);

    const colorDeclaration = getStyleDeclaration(declarations, "color");
    const colorValue = colorDeclaration?.value ?? "";
    const hasColor = colorDeclaration !== undefined;
    const hasBackground =
      getStyleDeclaration(declarations, "background") !== undefined ||
      getStyleDeclaration(declarations, "background-color") !== undefined;

    if (buttonLike) {
      if (!hasBackground) {
        upsertStyleDeclaration(declarations, "background-color", "#e8f0fe");
      }
      if (!hasColor || isWhiteTextValue(colorValue)) {
        upsertStyleDeclaration(declarations, "color", BASE_TEXT_COLOR);
      }
      if (getStyleDeclaration(declarations, "padding") === undefined) {
        upsertStyleDeclaration(declarations, "padding", "10px 16px");
      }
      if (getStyleDeclaration(declarations, "display") === undefined) {
        upsertStyleDeclaration(declarations, "display", "inline-block");
      }
      if (getStyleDeclaration(declarations, "border-radius") === undefined) {
        upsertStyleDeclaration(declarations, "border-radius", "8px");
      }
      if (getStyleDeclaration(declarations, "text-decoration") === undefined) {
        upsertStyleDeclaration(declarations, "text-decoration", "none");
      }
    } else if (!hasColor || isWhiteTextValue(colorValue)) {
      upsertStyleDeclaration(declarations, "color", LINK_COLOR);
    }

    return rewriteAnchorStyle(anchorTag, declarations);
  });
};

const sanitizeHtml = (html: string) => {
  if (!html) return "";

  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
};

export function stripDarkThemeStyles(html: string): string {
  if (!html) return "";

  let out = html;

  out = out.replace(/\sdata-theme\s*=\s*(?:"dark"|'dark'|dark)/gi, "");

  out = out.replace(/\sclass\s*=\s*(["'])([^"']*)\1/gi, (_match, _quote, classValue: string) => {
    const filtered = classValue
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !shouldStripThemeClass(token))
      .join(" ");

    return filtered ? ` class="${filtered}"` : "";
  });

  out = out.replace(
    /\scolor\s*=\s*(?:"(?:#fff|#ffffff|white)"|'(?:#fff|#ffffff|white)'|(?:#fff|#ffffff|white))/gi,
    "",
  );

  out = out.replace(
    /\sbgcolor\s*=\s*(?:"(?:#000|#000000|#111111|black)"|'(?:#000|#000000|#111111|black)'|(?:#000|#000000|#111111|black))/gi,
    ` bgcolor="${BASE_BACKGROUND_COLOR}"`,
  );

  out = out.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_match, _quote, styleValue: string) => {
    const cleanedStyle = cleanInlineStyle(styleValue);
    return cleanedStyle ? ` style="${escapeAttribute(cleanedStyle)}"` : "";
  });

  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, cssText: string) => {
    const cleanedCss = cleanStyleBlock(cssText).trim();
    if (!cleanedCss) {
      return "";
    }
    return match.replace(cssText, cleanedCss);
  });

  return out;
}

export function wrapWithEmailShell(inner: string, opts: RenderEmailForSendOptions = {}): string {
  const title = opts.subject?.trim() ? escapeHtml(opts.subject.trim()) : "PhishSense Mail";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
  <style>
    body, table, td {
      background-color: ${BASE_BACKGROUND_COLOR} !important;
      color: ${BASE_TEXT_COLOR} !important;
    }
    a {
      color: ${LINK_COLOR} !important;
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BASE_BACKGROUND_COLOR};background-color:${BASE_BACKGROUND_COLOR};color:${BASE_TEXT_COLOR};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;background:${BASE_BACKGROUND_COLOR};background-color:${BASE_BACKGROUND_COLOR};color:${BASE_TEXT_COLOR};">
    <tr>
      <td align="center" style="padding:24px;background:${BASE_BACKGROUND_COLOR};background-color:${BASE_BACKGROUND_COLOR};color:${BASE_TEXT_COLOR};">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:600px;max-width:100%;background:${BASE_BACKGROUND_COLOR};background-color:${BASE_BACKGROUND_COLOR};color:${BASE_TEXT_COLOR};">
          <tr>
            <td style="background:${BASE_BACKGROUND_COLOR};background-color:${BASE_BACKGROUND_COLOR};color:${BASE_TEXT_COLOR};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;word-break:break-word;">
              ${inner}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailForSend(
  fragmentHtml: string,
  opts: RenderEmailForSendOptions = {},
): string {
  const fragment = extractBodyHtml(fragmentHtml ?? "");
  const sanitized = sanitizeHtml(fragment);
  const cleaned = stripDarkThemeStyles(sanitized);
  const contrastAdjusted = applyLinkContrastRules(cleaned);
  return wrapWithEmailShell(contrastAdjusted, opts);
}
