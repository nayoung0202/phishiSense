import { ensureSeedTemplates } from "../dao/templateDao";
import { DEFAULT_TEMPLATES } from "./defaultTemplates";

let seeded = false;

export async function seedTemplates() {
  if (seeded) return;
  await ensureSeedTemplates(DEFAULT_TEMPLATES);
  seeded = true;
}
