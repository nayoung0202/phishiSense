const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#47;",
};

const HTML_ESCAPE_REGEX = /[&<>"'/]/g;

export function escapeHtml(input: string): string {
  return input.replace(HTML_ESCAPE_REGEX, (match) => HTML_ESCAPE_MAP[match] ?? match);
}
