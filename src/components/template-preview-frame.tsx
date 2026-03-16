import { useEffect, useMemo, useRef, useState } from "react";
import { extractBodyHtml } from "@/lib/html";
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
  interactive?: boolean;
  theme?: "light" | "dark";
}

export function TemplatePreviewFrame({
  html,
  className,
  minHeight = 240,
  interactive = false,
  theme = "light",
}: TemplatePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentHeight, setContentHeight] = useState(minHeight);
  const safeHtml = useMemo(
    () => neutralizePreviewModalHtml(extractBodyHtml(html)),
    [html],
  );
  const bodyBackground = theme === "dark" ? "#020617" : "#ffffff";
  const bodyTextColor = theme === "dark" ? "#f8fafc" : "#0f172a";
  const linkColor = theme === "dark" ? "#38bdf8" : "#0284c7";

  const srcDoc = useMemo(
    () =>
      [
        "<!DOCTYPE html>",
        "<html>",
        "<head>",
        '<meta charset="utf-8" />',
        "<style>",
        `body { margin: 0; padding: 1rem; background: ${bodyBackground}; color: ${bodyTextColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; font-size: 14px; line-height: 1.6; }`,
        `a { color: ${linkColor}; text-decoration: underline; }`,
        "*, *::before, *::after { box-sizing: border-box; }",
        "img { max-width: 100%; height: auto; display: block; }",
        "input, select, textarea, button { font: inherit; width: 100%; max-width: 100%; padding: 0.55rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5f5; background-color: #ffffff; color: #0f172a; }",
        "label { display: block; margin-bottom: 0.35rem; font-weight: 600; }",
        "table { border-collapse: collapse; width: 100%; }",
        !interactive
          ? [
              "a, a *, button, button *, input, select, textarea, label, form { pointer-events: none !important; }",
              "a, button { cursor: default !important; }",
            ].join("")
          : "",
        TEMPLATE_PREVIEW_SANDBOX_CSS,
        "</style>",
        "</head>",
        `<body class="${TEMPLATE_PREVIEW_SANDBOX_CLASS}">`,
        safeHtml || "",
        "</body>",
        "</html>",
      ].join(""),
    [bodyBackground, bodyTextColor, interactive, linkColor, safeHtml],
  );

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
      className={cn("w-full border-0", theme === "dark" ? "bg-slate-950" : "bg-white", className)}
      style={{ height: `${contentHeight}px` }}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="template-preview-frame"
    />
  );
}
