import { cn } from "@/lib/utils";

interface TemplatePreviewFrameProps {
  html: string;
  className?: string;
}

export function TemplatePreviewFrame({ html, className }: TemplatePreviewFrameProps) {
  const srcDoc = [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8" />',
    "<style>",
    "body { margin: 0; padding: 1rem; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; font-size: 14px; line-height: 1.6; }",
    "a { color: inherit; }",
    "</style>",
    "</head>",
    "<body>",
    html || "",
    "</body>",
    "</html>",
  ].join("");

  return (
    <iframe
      className={cn("h-full w-full border-0 bg-white", className)}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="template-preview-frame"
    />
  );
}
