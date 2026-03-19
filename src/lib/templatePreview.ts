export const TEMPLATE_PREVIEW_SANDBOX_CLASS = "template-preview-sandbox";

const TEMPLATE_PREVIEW_MODAL_KEYWORD_SELECTOR =
  ':is(dialog, [role="dialog"], [aria-modal="true"], [class*="modal"], [class*="Modal"], [id*="modal"], [id*="Modal"], [class*="popup"], [class*="Popup"], [id*="popup"], [id*="Popup"])';

const TEMPLATE_PREVIEW_FIXED_LAYER_SELECTOR =
  ':is([style*="position:fixed"], [style*="position: fixed"], [class~="fixed"], [class*=":fixed"], [class~="inset-0"], [class*=":inset-0"])';

const TEMPLATE_PREVIEW_DIRECT_FIXED_LAYER_SELECTOR = `> ${TEMPLATE_PREVIEW_FIXED_LAYER_SELECTOR}`;

const TEMPLATE_PREVIEW_BLOCKED_LAYER_SELECTOR = `:is(${TEMPLATE_PREVIEW_MODAL_KEYWORD_SELECTOR.slice(4, -1)}, ${TEMPLATE_PREVIEW_FIXED_LAYER_SELECTOR.slice(4, -1)})`;

const TEMPLATE_PREVIEW_BACKDROP_SELECTOR =
  ':is([class*="backdrop"], [class*="Backdrop"], [id*="backdrop"], [id*="Backdrop"], [class*="overlay"], [class*="Overlay"], [id*="overlay"], [id*="Overlay"], [class*="scrim"], [class*="Scrim"], [class*="dimmer"], [class*="Dimmer"])';

const TEMPLATE_PREVIEW_ROOT_WRAPPER_PATTERN = /^<([a-z0-9-]+)\b([^>]*)>([\s\S]*)<\/\1>$/i;
const TEMPLATE_PREVIEW_DIALOG_OPEN_ATTRIBUTE_PATTERN =
  /\sopen(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi;

const hasFullscreenFixedLayer = (attributesText: string) => {
  const normalizedAttributes = attributesText.toLowerCase();
  const hasFixedPosition =
    normalizedAttributes.includes("position:fixed") ||
    normalizedAttributes.includes("position: fixed") ||
    /\bclass\s*=\s*["'][^"']*\bfixed\b/i.test(attributesText);
  const spansViewport =
    normalizedAttributes.includes("inset:0") ||
    normalizedAttributes.includes("inset: 0") ||
    /\bclass\s*=\s*["'][^"']*\binset-0\b/i.test(attributesText) ||
    (/top\s*:\s*0/i.test(attributesText) &&
      /right\s*:\s*0/i.test(attributesText) &&
      /bottom\s*:\s*0/i.test(attributesText) &&
      /left\s*:\s*0/i.test(attributesText)) ||
    /(?:min-)?height\s*:\s*100(?:d|s)?vh/i.test(attributesText);

  return hasFixedPosition && spansViewport;
};

const stripFullscreenWrapper = (html: string) => {
  let output = html.trim();

  for (let depth = 0; depth < 3; depth += 1) {
    const match = output.match(TEMPLATE_PREVIEW_ROOT_WRAPPER_PATTERN);
    if (!match) {
      break;
    }

    const [, tagName, rawAttributes, innerHtml] = match;
    if (tagName.toLowerCase() === "dialog" || !hasFullscreenFixedLayer(rawAttributes)) {
      break;
    }

    output = innerHtml.trim();
  }

  return output;
};

const convertDialogToStaticContainer = (html: string) =>
  html
    .replace(/<dialog\b([^>]*)>/gi, (_match, rawAttributes: string) => {
      const nextAttributes = rawAttributes.replace(
        TEMPLATE_PREVIEW_DIALOG_OPEN_ATTRIBUTE_PATTERN,
        "",
      );
      return `<div data-preview-dialog="true"${nextAttributes}>`;
    })
    .replace(/<\/dialog>/gi, "</div>");

export const TEMPLATE_PREVIEW_SANDBOX_CSS = `
.${TEMPLATE_PREVIEW_SANDBOX_CLASS} {
  position: relative !important;
  isolation: isolate !important;
  overflow: visible !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_DIRECT_FIXED_LAYER_SELECTOR} {
  display: contents !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_DIRECT_FIXED_LAYER_SELECTOR} > * {
  max-width: min(100%, 720px) !important;
  margin: 12px auto !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_BLOCKED_LAYER_SELECTOR} {
  position: static !important;
  inset: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  z-index: auto !important;
  width: auto !important;
  max-width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 12px 0 !important;
  transform: none !important;
  overflow: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_MODAL_KEYWORD_SELECTOR} {
  width: min(100%, 720px) !important;
  max-width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 12px auto !important;
  overflow: visible !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_FIXED_LAYER_SELECTOR} {
  width: auto !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  background: transparent !important;
  background-color: transparent !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} dialog {
  display: block !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_BACKDROP_SELECTOR} {
  display: none !important;
  pointer-events: none !important;
}
`;

export const neutralizePreviewModalHtml = (html: string) => {
  if (!html) {
    return "";
  }

  return convertDialogToStaticContainer(stripFullscreenWrapper(html));
};

export const stripPreviewScriptTags = (html: string) => {
  if (!html) {
    return "";
  }

  return html
    .replace(/<script\b[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
};
