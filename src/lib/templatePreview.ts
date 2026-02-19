export const TEMPLATE_PREVIEW_SANDBOX_CLASS = "template-preview-sandbox";

const DIALOG_OPEN_ATTRIBUTE_PATTERN =
  /(<dialog\b[^>]*?)\sopen(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi;

const TEMPLATE_PREVIEW_MODAL_KEYWORD_SELECTOR =
  ':is(dialog, [role="dialog"], [aria-modal="true"], [class*="modal"], [class*="Modal"], [id*="modal"], [id*="Modal"], [class*="popup"], [class*="Popup"], [id*="popup"], [id*="Popup"])';

const TEMPLATE_PREVIEW_FIXED_LAYER_SELECTOR =
  ':is([style*="position:fixed"], [style*="position: fixed"], [class~="fixed"], [class*=":fixed"], [class~="inset-0"], [class*=":inset-0"])';

const TEMPLATE_PREVIEW_BLOCKED_LAYER_SELECTOR = `:is(${TEMPLATE_PREVIEW_MODAL_KEYWORD_SELECTOR.slice(4, -1)}, ${TEMPLATE_PREVIEW_FIXED_LAYER_SELECTOR.slice(4, -1)})`;

const TEMPLATE_PREVIEW_BACKDROP_SELECTOR =
  ':is([class*="backdrop"], [class*="Backdrop"], [id*="backdrop"], [id*="Backdrop"], [class*="overlay"], [class*="Overlay"], [id*="overlay"], [id*="Overlay"], [class*="scrim"], [class*="Scrim"], [class*="dimmer"], [class*="Dimmer"], [class~="inset-0"], [class*=":inset-0"])';

export const TEMPLATE_PREVIEW_SANDBOX_CSS = `
.${TEMPLATE_PREVIEW_SANDBOX_CLASS} {
  position: relative !important;
  isolation: isolate !important;
  overflow: hidden !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_BLOCKED_LAYER_SELECTOR} {
  position: relative !important;
  inset: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  z-index: 0 !important;
  width: min(100%, 360px) !important;
  max-width: 100% !important;
  min-height: 96px !important;
  margin: 12px auto !important;
  padding: 12px !important;
  border: 1px dashed #94a3b8 !important;
  border-radius: 12px !important;
  background: #f8fafc !important;
  box-shadow: none !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_BLOCKED_LAYER_SELECTOR} * {
  visibility: hidden !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_BLOCKED_LAYER_SELECTOR}::before {
  content: "모달 미리보기 플레이스홀더";
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-align: center;
  visibility: visible !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_BACKDROP_SELECTOR} {
  display: none !important;
  pointer-events: none !important;
}
`;

export const neutralizePreviewModalHtml = (html: string) => {
  if (!html) return "";
  return html.replace(DIALOG_OPEN_ATTRIBUTE_PATTERN, "$1");
};
