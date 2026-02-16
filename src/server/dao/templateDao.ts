import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { InsertTemplate, Template } from "@shared/schema";
import { db } from "../db";
import { templates } from "../db/schema";

export async function listTemplates(): Promise<Template[]> {
  return db.select().from(templates).orderBy(desc(templates.updatedAt));
}

export async function hasTemplates(): Promise<boolean> {
  const rows = await db.select({ id: templates.id }).from(templates).limit(1);
  return rows.length > 0;
}

export async function getTemplateById(id: string): Promise<Template | undefined> {
  const rows = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return rows[0];
}

export async function createTemplate(payload: InsertTemplate): Promise<Template> {
  const now = new Date();
  const id = randomUUID();
  const autoInsertLandingKind =
    payload.autoInsertLandingKind === "button" ? "button" : "link";
  const rows = await db
    .insert(templates)
    .values({
      id,
      name: payload.name,
      subject: payload.subject,
      body: payload.body,
      maliciousPageContent: payload.maliciousPageContent ?? "",
      autoInsertLandingEnabled: payload.autoInsertLandingEnabled ?? true,
      autoInsertLandingLabel: (payload.autoInsertLandingLabel ?? "문서 확인하기").trim(),
      autoInsertLandingKind,
      autoInsertLandingNewTab: payload.autoInsertLandingNewTab ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const template = rows[0];
  if (!template) throw new Error("템플릿을 저장하지 못했습니다.");
  return template;
}

export async function updateTemplateById(
  id: string,
  payload: Partial<InsertTemplate>,
): Promise<Template | undefined> {
  const existing = await getTemplateById(id);
  if (!existing) return undefined;
  const now = new Date();
  const autoInsertLandingKind =
    payload.autoInsertLandingKind === "button"
      ? "button"
      : payload.autoInsertLandingKind === "link"
        ? "link"
        : existing.autoInsertLandingKind;
  const rows = await db
    .update(templates)
    .set({
      name: payload.name ?? existing.name,
      subject: payload.subject ?? existing.subject,
      body: payload.body ?? existing.body,
      maliciousPageContent:
        payload.maliciousPageContent !== undefined
          ? payload.maliciousPageContent ?? ""
          : existing.maliciousPageContent,
      autoInsertLandingEnabled:
        payload.autoInsertLandingEnabled ?? existing.autoInsertLandingEnabled,
      autoInsertLandingLabel:
        payload.autoInsertLandingLabel !== undefined
          ? payload.autoInsertLandingLabel.trim()
          : existing.autoInsertLandingLabel,
      autoInsertLandingKind,
      autoInsertLandingNewTab:
        payload.autoInsertLandingNewTab ?? existing.autoInsertLandingNewTab,
      updatedAt: now,
    })
    .where(eq(templates.id, id))
    .returning();
  return rows[0];
}

export async function deleteTemplateById(id: string): Promise<boolean> {
  const rows = await db
    .delete(templates)
    .where(eq(templates.id, id))
    .returning({ id: templates.id });
  return rows.length > 0;
}

export async function ensureSeedTemplates(defaultTemplates: Template[]): Promise<void> {
  const now = new Date();
  for (const template of defaultTemplates) {
    await db
      .insert(templates)
      .values({
        id: template.id,
        name: template.name,
        subject: template.subject,
        body: template.body,
        maliciousPageContent: template.maliciousPageContent ?? "",
        autoInsertLandingEnabled: template.autoInsertLandingEnabled ?? true,
        autoInsertLandingLabel: (template.autoInsertLandingLabel ?? "문서 확인하기").trim(),
        autoInsertLandingKind: template.autoInsertLandingKind ?? "link",
        autoInsertLandingNewTab: template.autoInsertLandingNewTab ?? true,
        createdAt: template.createdAt ?? now,
        updatedAt: template.updatedAt ?? now,
      })
      .onConflictDoNothing({ target: templates.id });
  }
}
