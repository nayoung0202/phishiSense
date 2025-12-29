import process from "node:process";
import { randomBytes } from "node:crypto";

const DEFAULT_APP_URL = "http://localhost:3000";

const normalizeAppUrl = (value: string) => value.replace(/\/+$/, "");

export const getAppBaseUrl = () => {
  const raw = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return normalizeAppUrl(trimmed.length > 0 ? trimmed : DEFAULT_APP_URL);
};

export const buildTrainingLinkUrl = (token: string) =>
  `${getAppBaseUrl()}/t/${encodeURIComponent(token)}`;

export const buildPhishingLinkUrl = (token: string) =>
  `${getAppBaseUrl()}/p/${encodeURIComponent(token)}`;

export const generateTrainingLinkToken = () => randomBytes(16).toString("hex");

const placeholderDetector = /\{\{\s*(?:TRAINING_LINK|TRAINING_URL)\s*\}\}/;
const placeholderReplacer = /\{\{\s*(?:TRAINING_LINK|TRAINING_URL)\s*\}\}/g;
const anchorHrefMatcher = /<a\b([^>]*?)\bhref=(["'])(.*?)\2([^>]*)>/i;
const anchorHrefFinder = /<a\b[^>]*\bhref=(["'])(.*?)\1/gi;

type InjectTrainingLinkOptions = {
  replaceSingleAnchor?: boolean;
};

export const injectTrainingLink = (
  htmlBody: string,
  trainingUrl: string,
  options: InjectTrainingLinkOptions = {},
) => {
  if (placeholderDetector.test(htmlBody)) {
    return htmlBody.replace(placeholderReplacer, trainingUrl);
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

  const linkBlock = `<hr />\n<p>훈련 안내 페이지: <a href="${trainingUrl}">여기 클릭</a></p>`;
  if (!htmlBody || htmlBody.trim().length === 0) {
    return linkBlock;
  }

  const separator = htmlBody.endsWith("\n") ? "\n" : "\n\n";
  return `${htmlBody}${separator}${linkBlock}`;
};
