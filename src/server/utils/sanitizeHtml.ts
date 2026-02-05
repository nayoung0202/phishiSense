import sanitizeHtmlLib from "sanitize-html";
import {
  SANITIZE_ALLOWED_ATTRIBUTES,
  SANITIZE_ALLOWED_TAGS,
} from "@shared/sanitizeConfig";

export const sanitizeHtml = (value: string) =>
  sanitizeHtmlLib(value, {
    allowedTags: SANITIZE_ALLOWED_TAGS,
    allowedAttributes: SANITIZE_ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    allowProtocolRelative: true,
  });
