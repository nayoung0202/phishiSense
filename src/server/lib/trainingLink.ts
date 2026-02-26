import process from "node:process";
import { randomBytes } from "node:crypto";

const DEFAULT_APP_URL = "http://localhost:3000";

const normalizeAppUrl = (value: string) => value.replace(/\/+$/, "");

export const getAppBaseUrl = () => {
  const raw =
    process.env.APP_BASE_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    DEFAULT_APP_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return normalizeAppUrl(trimmed.length > 0 ? trimmed : DEFAULT_APP_URL);
};

export const buildLandingUrl = (token: string) =>
  `${getAppBaseUrl()}/p/${encodeURIComponent(token)}`;

export const buildSubmitUrl = (token: string) =>
  `${getAppBaseUrl()}/t/${encodeURIComponent(token)}`;

export const buildSubmitFormUrl = (token: string) =>
  `${getAppBaseUrl()}/p/${encodeURIComponent(token)}/submit`;

export const buildOpenPixelUrl = (token: string) =>
  `${getAppBaseUrl()}/o/${encodeURIComponent(token)}.gif`;

export const buildTrainingLinkUrl = (token: string) => buildSubmitUrl(token);

export const buildPhishingLinkUrl = (token: string) => buildLandingUrl(token);

export const generateTrainingLinkToken = () => randomBytes(16).toString("hex");

const placeholderDetector = /\{\{\s*TRAINING_URL\s*\}\}/;
const placeholderReplacer = /\{\{\s*TRAINING_URL\s*\}\}/g;
const phishPlaceholderDetector = /\{\{\s*(?:PHISH_LINK|PHISH_URL)\s*\}\}/;
const phishPlaceholderReplacer = /\{\{\s*(?:PHISH_LINK|PHISH_URL)\s*\}\}/g;
const landingPlaceholderReplacer = /\{\{\s*LANDING_URL\s*\}\}/g;
const submitPlaceholderReplacer = /\{\{\s*SUBMIT_URL\s*\}\}/g;
const openPixelPlaceholderReplacer = /\{\{\s*OPEN_PIXEL_URL\s*\}\}/g;
const anchorHrefMatcher = /<a\b([^>]*?)\bhref=(["'])(.*?)\2([^>]*)>/i;
const anchorHrefFinder = /<a\b[^>]*\bhref=(["'])(.*?)\1/gi;
const buttonOpenTagMatcher = /<button\b([^>]*)>/i;

type InjectTrainingLinkOptions = {
  replaceSingleAnchor?: boolean;
  replaceFirstAnchor?: boolean;
  replaceFirstButton?: boolean;
  appendType?: "link" | "button";
};

export const injectTrainingLink = (
  htmlBody: string,
  trainingUrl: string,
  options: InjectTrainingLinkOptions = {},
) => {
  if (placeholderDetector.test(htmlBody)) {
    return htmlBody.replace(placeholderReplacer, trainingUrl);
  }

  if (options.replaceFirstAnchor && anchorHrefMatcher.test(htmlBody)) {
    return htmlBody.replace(
      anchorHrefMatcher,
      (_match, leading, quote, _href, trailing) =>
        `<a${leading}href=${quote}${trainingUrl}${quote}${trailing}>`,
    );
  }

  const shouldReplaceSingleAnchor = options.replaceSingleAnchor !== false;
  if (shouldReplaceSingleAnchor) {
    const anchorMatches = htmlBody.match(anchorHrefFinder);
    if (anchorMatches?.length === 1) {
      return htmlBody.replace(
        anchorHrefMatcher,
        (_match, leading, quote, _href, trailing) =>
          `<a${leading}href=${quote}${trainingUrl}${quote}${trailing}>`,
      );
    }
  }

  if (options.replaceFirstButton) {
    const buttonMatch = htmlBody.match(buttonOpenTagMatcher);
    if (buttonMatch) {
      const rawAttributes = buttonMatch[1] ?? "";
      const trimmed = rawAttributes.trim();
      let updatedAttributes = trimmed;
      const hasOnclick = /\bonclick\s*=/.test(updatedAttributes);
      const hasType = /\btype\s*=/.test(updatedAttributes);
      if (hasOnclick) {
        updatedAttributes = updatedAttributes.replace(
          /\bonclick\s*=\s*(["'])(.*?)\1/i,
          `onclick=$1location.href='${trainingUrl}'$1`,
        );
      } else {
        updatedAttributes =
          `${updatedAttributes} onclick="location.href='${trainingUrl}'"`.trim();
      }
      if (!hasType) {
        updatedAttributes = `${updatedAttributes} type="button"`.trim();
      }
      const normalized =
        updatedAttributes.length > 0 ? ` ${updatedAttributes}` : "";
      return htmlBody.replace(buttonOpenTagMatcher, `<button${normalized}>`);
    }
  }

  const appendType = options.appendType ?? "link";
  const linkBlock =
    appendType === "button"
      ? `<hr />\n<form action="${trainingUrl}" method="get" style="margin:16px 0;">\n  <button type="submit" style="padding:10px 16px; border-radius:999px; background:#2563eb; color:#ffffff; border:none; font-weight:600;">훈련 안내 페이지로 이동</button>\n</form>`
      : `<hr />\n<p>훈련 안내 페이지: <a href="${trainingUrl}">여기 클릭</a></p>`;
  if (!htmlBody || htmlBody.trim().length === 0) {
    return linkBlock;
  }

  const separator = htmlBody.endsWith("\n") ? "\n" : "\n\n";
  return `${htmlBody}${separator}${linkBlock}`;
};

export const injectPhishingLink = (htmlBody: string, phishingUrl: string) => {
  if (phishPlaceholderDetector.test(htmlBody)) {
    return htmlBody.replace(phishPlaceholderReplacer, phishingUrl);
  }

  return injectTrainingLink(htmlBody, phishingUrl);
};

type InjectLinksOptions = {
  landingUrl: string;
  submitUrl: string;
  openPixelUrl?: string | null;
};

export const injectLinks = (
  htmlBody: string,
  { landingUrl, submitUrl, openPixelUrl }: InjectLinksOptions,
) => {
  let output = htmlBody;

  output = output.replace(landingPlaceholderReplacer, landingUrl);
  output = output.replace(submitPlaceholderReplacer, submitUrl);
  output = output.replace(phishPlaceholderReplacer, landingUrl);
  output = output.replace(placeholderReplacer, submitUrl);

  if (openPixelUrl) {
    output = output.replace(openPixelPlaceholderReplacer, openPixelUrl);
  } else {
    output = output.replace(openPixelPlaceholderReplacer, "");
  }

  return output;
};
