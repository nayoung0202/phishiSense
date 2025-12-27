import { sql, eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { InsertTemplate, Template } from "@shared/schema";
import { db } from "../db";
import { templatesTable, type TemplateRow } from "../db/schema";
import type { RunResult } from "better-sqlite3";

const mapTemplate = (row: TemplateRow): Template => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  body: row.htmlBody,
  maliciousPageContent: row.phishingBody || "",
  createdAt: row.createdAt ?? new Date(),
  updatedAt: row.updatedAt ?? new Date(),
});

export async function listTemplates(): Promise<Template[]> {
  const rows = await db.select().from(templatesTable).orderBy(desc(templatesTable.updatedAt));
  return rows.map(mapTemplate);
}

export async function getTemplateById(id: string): Promise<Template | undefined> {
  const rows = await db.select().from(templatesTable).where(eq(templatesTable.id, id)).limit(1);
  const row = rows[0];
  return row ? mapTemplate(row) : undefined;
}

export async function createTemplate(payload: InsertTemplate): Promise<Template> {
  const now = new Date();
  const id = randomUUID();
  await db
    .insert(templatesTable)
    .values({
      id,
      name: payload.name,
      subject: payload.subject,
      htmlBody: payload.body,
      phishingBody: payload.maliciousPageContent ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const template = await getTemplateById(id);
  if (!template) {
    throw new Error("템플릿을 저장하지 못했습니다.");
  }
  return template;
}

export async function updateTemplateById(
  id: string,
  payload: Partial<InsertTemplate>,
): Promise<Template | undefined> {
  const existing = await getTemplateById(id);
  if (!existing) return undefined;
  const now = new Date();
  await db
    .update(templatesTable)
    .set({
      name: payload.name ?? existing.name,
      subject: payload.subject ?? existing.subject,
      htmlBody: payload.body ?? existing.body,
      phishingBody:
        payload.maliciousPageContent !== undefined
          ? payload.maliciousPageContent ?? null
          : existing.maliciousPageContent,
      updatedAt: now,
    })
    .where(eq(templatesTable.id, id))
    .run();
  return getTemplateById(id);
}

export async function deleteTemplateById(id: string): Promise<boolean> {
  const result = (await db.delete(templatesTable).where(eq(templatesTable.id, id))) as RunResult;
  return result.changes > 0;
}

export async function ensureSeedTemplates(defaultTemplates: Template[]): Promise<void> {
  const now = new Date();
  for (const template of defaultTemplates) {
    await db
      .insert(templatesTable)
      .values({
        id: template.id,
        name: template.name,
        subject: template.subject,
        htmlBody: template.body,
        phishingBody: template.maliciousPageContent ?? null,
        createdAt: template.createdAt ?? now,
        updatedAt: template.updatedAt ?? now,
      })
      .onConflictDoNothing({ target: templatesTable.id })
      .run();
  }
}
