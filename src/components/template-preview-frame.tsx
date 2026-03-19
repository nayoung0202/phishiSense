import { useEffect, useMemo, useRef } from "react";
import { extractBodyHtml } from "@/lib/html";
import { cn } from "@/lib/utils";
import {
  neutralizePreviewModalHtml,
  stripPreviewScriptTags,
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
  const hostRef = useRef<HTMLDivElement>(null);
  const safeHtml = useMemo(
    () => stripPreviewScriptTags(neutralizePreviewModalHtml(extractBodyHtml(html))),
    [html],
  );
  const bodyBackground = theme === "dark" ? "#020617" : "#ffffff";
  const bodyTextColor = theme === "dark" ? "#f8fafc" : "#0f172a";
  const linkColor = theme === "dark" ? "#38bdf8" : "#0284c7";

  const shadowContent = useMemo(
    () =>
      [
        "<style>",
        `*, *::before, *::after { box-sizing: border-box; }`,
        `:host { display: block; min-height: ${minHeight}px; background: ${bodyBackground}; color: ${bodyTextColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; font-size: 14px; line-height: 1.6; }`,
        `.${TEMPLATE_PREVIEW_SANDBOX_CLASS} { padding: 1rem; }`,
        `a { color: ${linkColor}; text-decoration: underline; }`,
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
        `<div class="${TEMPLATE_PREVIEW_SANDBOX_CLASS}">`,
        safeHtml || "",
        "</div>",
      ].join(""),
    [bodyBackground, bodyTextColor, interactive, linkColor, minHeight, safeHtml],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadow.innerHTML = shadowContent;
  }, [shadowContent]);

  return (
    <div
      ref={hostRef}
      className={cn(
        "w-full",
        !interactive && "pointer-events-none",
        theme === "dark" ? "bg-slate-950" : "bg-white",
        className,
      )}
      style={{ minHeight: `${minHeight}px` }}
      title="template-preview-frame"
      tabIndex={interactive ? 0 : -1}
    />
  );
}
