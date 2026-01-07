import { ensureSeedTemplates, hasTemplates } from "../dao/templateDao";
import { DEFAULT_TEMPLATES } from "./defaultTemplates";
import { sanitizeHtml } from "../utils/sanitizeHtml";

let seeded = false;

export async function seedTemplates() {
  if (seeded) return;
  if (process.env.NODE_ENV === "production") {
    seeded = true;
    return;
  }
  if (await hasTemplates()) {
    seeded = true;
    return;
  }
  const sanitizedTemplates = DEFAULT_TEMPLATES.map((template) => ({
    ...template,
    body: sanitizeHtml(template.body ?? ""),
    maliciousPageContent: sanitizeHtml(template.maliciousPageContent ?? ""),
  }));
  await ensureSeedTemplates(sanitizedTemplates);
  seeded = true;
}
