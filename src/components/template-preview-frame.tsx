import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  neutralizePreviewModalHtml,
  TEMPLATE_PREVIEW_SANDBOX_CLASS,
  TEMPLATE_PREVIEW_SANDBOX_CSS,
} from "@/lib/templatePreview";

interface TemplatePreviewFrameProps {
  html: string;
  className?: string;
  minHeight?: number;
}

const PREVIEW_RESET_CSS = `
*, *::before, *::after { box-sizing: border-box; }
img { max-width: 100%; height: auto; display: block; }
input, select, textarea, button { max-width: 100%; font: inherit; }
table { max-width: 100%; }
`;

const hasFullDocumentTag = (html: string) => /<!doctype\s+html|<html[\s>]/i.test(html);

const appendPreviewSandboxClass = (documentHtml: string) => {
  if (!/<body\b/i.test(documentHtml)) {
    return documentHtml;
  }

  return documentHtml.replace(/<body\b([^>]*)>/i, (fullTag, rawAttributes: string) => {
    const attributes = rawAttributes ?? "";
    const classPattern = /\bclass\s*=\s*(["'])(.*?)\1/i;
    if (!classPattern.test(attributes)) {
      return `<body${attributes} class=\"${TEMPLATE_PREVIEW_SANDBOX_CLASS}\">`;
    }

    return fullTag.replace(classPattern, (_match, quote: string, classValue: string) => {
      const classNames = classValue
        .split(/\s+/)
        .map((name) => name.trim())
        .filter(Boolean);

      if (!classNames.includes(TEMPLATE_PREVIEW_SANDBOX_CLASS)) {
        classNames.push(TEMPLATE_PREVIEW_SANDBOX_CLASS);
      }

      return `class=${quote}${classNames.join(" ")}${quote}`;
    });
  });
};

const injectPreviewStyle = (documentHtml: string) => {
  const styleTag = `<style>${PREVIEW_RESET_CSS}${TEMPLATE_PREVIEW_SANDBOX_CSS}</style>`;

  if (/<\/head>/i.test(documentHtml)) {
    return documentHtml.replace(/<\/head>/i, `${styleTag}</head>`);
  }

  if (/<html\b[^>]*>/i.test(documentHtml)) {
    return documentHtml.replace(/<html\b[^>]*>/i, (htmlTag) => `${htmlTag}<head>${styleTag}</head>`);
  }

  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset=\"utf-8\" />',
    styleTag,
    "</head>",
    `<body class=\"${TEMPLATE_PREVIEW_SANDBOX_CLASS}\">`,
    documentHtml,
    "</body>",
    "</html>",
  ].join("");
};

const buildFragmentSrcDoc = (safeHtml: string) =>
  [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset=\"utf-8\" />',
    "<style>",
    "body { margin: 0; padding: 1rem; background: #ffffff; color: #0f172a; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; }",
    "a { color: #1a73e8; text-decoration: underline; }",
    PREVIEW_RESET_CSS,
    TEMPLATE_PREVIEW_SANDBOX_CSS,
    "</style>",
    "</head>",
    `<body class=\"${TEMPLATE_PREVIEW_SANDBOX_CLASS}\">`,
    safeHtml || "",
    "</body>",
    "</html>",
  ].join("");

export function TemplatePreviewFrame({
  html,
  className,
  minHeight = 240,
}: TemplatePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentHeight, setContentHeight] = useState(minHeight);

  const srcDoc = useMemo(() => {
    const safeHtml = neutralizePreviewModalHtml(html ?? "").trim();
    if (!safeHtml) {
      return buildFragmentSrcDoc("");
    }

    if (!hasFullDocumentTag(safeHtml)) {
      return buildFragmentSrcDoc(safeHtml);
    }

    const withSandboxClass = appendPreviewSandboxClass(safeHtml);
    return injectPreviewStyle(withSandboxClass);
  }, [html]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const height = doc.body?.scrollHeight ?? minHeight;
        setContentHeight(Math.max(minHeight, height));
      } catch {
        setContentHeight(minHeight);
      }
    };
    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, [srcDoc, minHeight]);

  return (
    <iframe
      ref={iframeRef}
      className={cn("w-full border-0 bg-white", className)}
      style={{ height: `${contentHeight}px` }}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="template-preview-frame"
    />
  );
}
