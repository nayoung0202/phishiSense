import type { Template } from "@shared/schema";

const landingTokenMatcher = /\{\{\s*LANDING_URL\s*\}\}/i;
const landingTokenReplacer = /\{\{\s*LANDING_URL\s*\}\}/gi;
const openPixelReplacer = /\{\{\s*OPEN_PIXEL_URL\s*\}\}/gi;

type AutoInsertKind = "link" | "button";

export type MailAutoInsertConfig = {
  enabled: boolean;
  label: string;
  kind: AutoInsertKind;
  newTab: boolean;
};

export type MailBuildResult = {
  html: string;
  hasLandingToken: boolean;
  autoInserted: boolean;
};

type AutoInsertSource = Pick<
  Template,
  | "autoInsertLandingEnabled"
  | "autoInsertLandingLabel"
  | "autoInsertLandingKind"
  | "autoInsertLandingNewTab"
>;

export const resolveAutoInsertConfig = (template: AutoInsertSource): MailAutoInsertConfig => {
  const label =
    typeof template.autoInsertLandingLabel === "string" &&
    template.autoInsertLandingLabel.trim().length > 0
      ? template.autoInsertLandingLabel.trim()
      : "문서 확인하기";
  const kind: AutoInsertKind =
    template.autoInsertLandingKind === "button" ? "button" : "link";
  return {
    enabled: template.autoInsertLandingEnabled ?? true,
    label,
    kind,
    newTab: template.autoInsertLandingNewTab ?? true,
  };
};

export const buildAutoInsertBlock = (
  landingUrl: string,
  config: MailAutoInsertConfig,
) => {
  const newTabAttrs = config.newTab
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
  if (config.kind === "button") {
    return [
      "<p>",
      `<a href="${landingUrl}"${newTabAttrs} style="display:inline-flex; align-items:center; justify-content:center; padding:10px 18px; border-radius:999px; background:#2563eb; color:#ffffff; text-decoration:none; font-weight:600;">`,
      config.label,
      "</a>",
      "</p>",
    ].join("");
  }
  return `<p><a href="${landingUrl}"${newTabAttrs}>${config.label}</a></p>`;
};

export type MailTemplate = Pick<
  Template,
  | "body"
  | "autoInsertLandingEnabled"
  | "autoInsertLandingLabel"
  | "autoInsertLandingKind"
  | "autoInsertLandingNewTab"
> & {
  body?: string | null;
};

export const buildMailHtml = (
  template: MailTemplate,
  landingUrl: string,
  openPixelUrl?: string | null,
): MailBuildResult => {
  const htmlBody = template.body ?? "";
  const hasLandingToken = landingTokenMatcher.test(htmlBody);
  let output = htmlBody.replace(landingTokenReplacer, landingUrl);

  if (openPixelUrl) {
    output = output.replace(openPixelReplacer, openPixelUrl);
  } else {
    output = output.replace(openPixelReplacer, "");
  }

  return { html: output, hasLandingToken, autoInserted: false };
};
