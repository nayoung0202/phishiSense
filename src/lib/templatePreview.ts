export const TEMPLATE_PREVIEW_SANDBOX_CLASS = "template-preview-sandbox";

const TEMPLATE_PREVIEW_MODAL_KEYWORD_SELECTOR =
  ':is(dialog, [role="dialog"], [aria-modal="true"], [class*="modal"], [class*="Modal"], [id*="modal"], [id*="Modal"], [class*="popup"], [class*="Popup"], [id*="popup"], [id*="Popup"])';

const TEMPLATE_PREVIEW_FIXED_LAYER_SELECTOR =
  ':is([style*="position:fixed"], [style*="position: fixed"], [class~="fixed"], [class*=":fixed"], [class~="inset-0"], [class*=":inset-0"])';

const TEMPLATE_PREVIEW_BLOCKED_LAYER_SELECTOR = `:is(${TEMPLATE_PREVIEW_MODAL_KEYWORD_SELECTOR.slice(4, -1)}, ${TEMPLATE_PREVIEW_FIXED_LAYER_SELECTOR.slice(4, -1)})`;

const TEMPLATE_PREVIEW_BACKDROP_SELECTOR =
  ':is([class*="backdrop"], [class*="Backdrop"], [id*="backdrop"], [id*="Backdrop"], [class*="overlay"], [class*="Overlay"], [id*="overlay"], [id*="Overlay"], [class*="scrim"], [class*="Scrim"], [class*="dimmer"], [class*="Dimmer"])';

export const TEMPLATE_PREVIEW_SANDBOX_CSS = `
.${TEMPLATE_PREVIEW_SANDBOX_CLASS} {
  position: relative !important;
  isolation: isolate !important;
  overflow: hidden !important;
}

.${TEMPLATE_PREVIEW_SANDBOX_CLASS} ${TEMPLATE_PREVIEW_BLOCKED_LAYER_SELECTOR} {
  position: static !important;
  inset: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  z-index: auto !important;
  width: min(100%, 720px) !important;
  max-width: 100% !important;
  max-height: none !important;
  margin: 12px auto !important;
  transform: none !important;
  overflow: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
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
  return html ?? "";
};
