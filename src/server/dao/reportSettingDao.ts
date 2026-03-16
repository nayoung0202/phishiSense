import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { InsertReportSetting, ReportSetting } from "@shared/schema";
import { db } from "../db";
import { reportSettings } from "../db/schema";

type ListReportSettingsParams = {
  page: number;
  pageSize: number;
};

export async function listReportSettings(
  params: ListReportSettingsParams,
): Promise<ReportSetting[]> {
  const offset = (params.page - 1) * params.pageSize;
  return db
    .select()
    .from(reportSettings)
    .orderBy(desc(reportSettings.createdAt))
    .limit(params.pageSize)
    .offset(offset);
}

export async function listReportSettingsForTenant(
  tenantId: string,
  params: ListReportSettingsParams,
): Promise<ReportSetting[]> {
  const offset = (params.page - 1) * params.pageSize;
  return db
    .select()
    .from(reportSettings)
    .where(eq(reportSettings.tenantId, tenantId))
    .orderBy(desc(reportSettings.createdAt))
    .limit(params.pageSize)
    .offset(offset);
}

export async function countReportSettings(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportSettings);
  return rows[0]?.count ?? 0;
}

export async function countReportSettingsForTenant(tenantId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportSettings)
    .where(eq(reportSettings.tenantId, tenantId));
  return rows[0]?.count ?? 0;
}

export async function getReportSettingById(id: string): Promise<ReportSetting | undefined> {
  const rows = await db.select().from(reportSettings).where(eq(reportSettings.id, id)).limit(1);
  return rows[0];
}

export async function getReportSettingByIdForTenant(
  tenantId: string,
  id: string,
): Promise<ReportSetting | undefined> {
  const rows = await db
    .select()
    .from(reportSettings)
    .where(and(eq(reportSettings.tenantId, tenantId), eq(reportSettings.id, id)))
    .limit(1);
  return rows[0];
}

export async function getDefaultReportSetting(): Promise<ReportSetting | undefined> {
  const rows = await db
    .select()
    .from(reportSettings)
    .where(eq(reportSettings.isDefault, true))
    .limit(1);
  return rows[0];
}

export async function getDefaultReportSettingForTenant(
  tenantId: string,
): Promise<ReportSetting | undefined> {
  const rows = await db
    .select()
    .from(reportSettings)
    .where(and(eq(reportSettings.tenantId, tenantId), eq(reportSettings.isDefault, true)))
    .limit(1);
  return rows[0];
}

export async function createReportSetting(
  payload: typeof reportSettings.$inferInsert,
  options?: { makeDefault?: boolean; id?: string },
): Promise<ReportSetting> {
  const now = new Date();
  const id = options?.id ?? randomUUID();
  const shouldSetDefault = options?.makeDefault ?? false;
  const rows = await db.transaction(async (tx) => {
    if (shouldSetDefault) {
      await tx
        .update(reportSettings)
        .set({ isDefault: false, updatedAt: now })
        .where(eq(reportSettings.tenantId, payload.tenantId));
    }
    return tx
      .insert(reportSettings)
      .values({
        id,
        tenantId: payload.tenantId,
        name: payload.name,
        companyName: payload.companyName,
        companyLogoFileKey: payload.companyLogoFileKey,
        approverName: payload.approverName,
        approverTitle: payload.approverTitle,
        isDefault: shouldSetDefault,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
  });
  const setting = rows[0];
  if (!setting) throw new Error("보고서 설정을 저장하지 못했습니다.");
  return setting;
}

export async function setDefaultReportSetting(id: string): Promise<ReportSetting | undefined> {
  const existing = await getReportSettingById(id);
  if (!existing) return undefined;
  const now = new Date();
  const rows = await db.transaction(async (tx) => {
    await tx
      .update(reportSettings)
      .set({ isDefault: false, updatedAt: now })
      .where(eq(reportSettings.tenantId, existing.tenantId));
    return tx
      .update(reportSettings)
      .set({ isDefault: true, updatedAt: now })
      .where(eq(reportSettings.id, id))
      .returning();
  });
  return rows[0];
}

export async function setDefaultReportSettingForTenant(
  tenantId: string,
  id: string,
): Promise<ReportSetting | undefined> {
  const existing = await getReportSettingByIdForTenant(tenantId, id);
  if (!existing) return undefined;
  const now = new Date();
  const rows = await db.transaction(async (tx) => {
    await tx
      .update(reportSettings)
      .set({ isDefault: false, updatedAt: now })
      .where(eq(reportSettings.tenantId, tenantId));
    return tx
      .update(reportSettings)
      .set({ isDefault: true, updatedAt: now })
      .where(and(eq(reportSettings.tenantId, tenantId), eq(reportSettings.id, id)))
      .returning();
  });
  return rows[0];
}

export async function updateReportSetting(
  id: string,
  payload: Partial<InsertReportSetting>,
  options?: { makeDefault?: boolean },
): Promise<ReportSetting | undefined> {
  const existing = await getReportSettingById(id);
  if (!existing) return undefined;
  const now = new Date();
  const shouldSetDefault = options?.makeDefault ?? existing.isDefault;

  const rows = await db.transaction(async (tx) => {
    if (shouldSetDefault) {
      await tx.update(reportSettings).set({ isDefault: false, updatedAt: now });
    }
    return tx
      .update(reportSettings)
      .set({
        name: payload.name ?? existing.name,
        companyName: payload.companyName ?? existing.companyName,
        companyLogoFileKey: payload.companyLogoFileKey ?? existing.companyLogoFileKey,
        approverName: payload.approverName ?? existing.approverName,
        approverTitle: payload.approverTitle ?? existing.approverTitle,
        isDefault: shouldSetDefault,
        updatedAt: now,
      })
      .where(eq(reportSettings.id, id))
      .returning();
  });

  return rows[0];
}

export async function updateReportSettingForTenant(
  tenantId: string,
  id: string,
  payload: Partial<InsertReportSetting>,
  options?: { makeDefault?: boolean },
): Promise<ReportSetting | undefined> {
  const existing = await getReportSettingByIdForTenant(tenantId, id);
  if (!existing) return undefined;
  const now = new Date();
  const shouldSetDefault = options?.makeDefault ?? existing.isDefault;

  const rows = await db.transaction(async (tx) => {
    if (shouldSetDefault) {
      await tx
        .update(reportSettings)
        .set({ isDefault: false, updatedAt: now })
        .where(eq(reportSettings.tenantId, tenantId));
    }
    return tx
      .update(reportSettings)
      .set({
        name: payload.name ?? existing.name,
        companyName: payload.companyName ?? existing.companyName,
        companyLogoFileKey: payload.companyLogoFileKey ?? existing.companyLogoFileKey,
        approverName: payload.approverName ?? existing.approverName,
        approverTitle: payload.approverTitle ?? existing.approverTitle,
        isDefault: shouldSetDefault,
        updatedAt: now,
      })
      .where(and(eq(reportSettings.tenantId, tenantId), eq(reportSettings.id, id)))
      .returning();
  });

  return rows[0];
}
