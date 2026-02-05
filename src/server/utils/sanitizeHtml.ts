import sanitizeHtmlLib from "sanitize-html";

const defaultAllowedTags = [
  ...sanitizeHtmlLib.defaults.allowedTags,
  "img",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "div",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "section",
  "article",
  "header",
  "footer",
  "figure",
  "figcaption",
  "hr",
];

export const sanitizeHtml = (value: string) =>
  sanitizeHtmlLib(value, {
    allowedTags: defaultAllowedTags,
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "class", "style"],
      img: ["src", "alt", "title", "width", "height", "style", "class"],
      "*": ["class", "style", "id", "data-*"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    allowProtocolRelative: true,
  });
