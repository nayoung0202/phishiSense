import type { PlatformContextResult } from "@/server/platform/context";
import { countTargetsForTenant } from "@/server/dao/targetDao";

type TargetSeatContext = Pick<PlatformContextResult, "platformProduct" | "localEntitlement">;

export type TargetSeatUsage = {
  seatLimit: number | null;
  usedSeats: number;
  remainingSeats: number | null;
};

const normalizeSeatLimit = (seatLimit: number | null | undefined) =>
  typeof seatLimit === "number" ? seatLimit : null;

export const resolveTargetSeatLimit = (context: TargetSeatContext) =>
  normalizeSeatLimit(context.platformProduct?.seatLimit ?? context.localEntitlement?.seatLimit);

export async function getTargetSeatUsage(
  tenantId: string,
  context: TargetSeatContext,
): Promise<TargetSeatUsage> {
  const seatLimit = resolveTargetSeatLimit(context);
  const usedSeats = await countTargetsForTenant(tenantId);

  return {
    seatLimit,
    usedSeats,
    remainingSeats: seatLimit === null ? null : Math.max(seatLimit - usedSeats, 0),
  };
}

export const buildTargetSeatLimitMessage = (usage: TargetSeatUsage) => {
  if (usage.seatLimit === null) {
    return "대상자 시트 한도를 확인하지 못했습니다.";
  }

  if ((usage.remainingSeats ?? 0) <= 0) {
    return `대상자 시트 한도를 초과했습니다. 현재 ${usage.seatLimit}명 중 ${usage.usedSeats}명이 등록되어 있어 더 추가할 수 없습니다.`;
  }

  return `대상자 시트 한도를 초과했습니다. 현재 ${usage.seatLimit}명 중 ${usage.usedSeats}명이 등록되어 있어 ${usage.remainingSeats}명만 더 추가할 수 있습니다.`;
};

export class TargetSeatLimitError extends Error {
  status = 409;
  code = "seat_limit_exceeded" as const;
  seatLimit: number | null;
  usedSeats: number;
  remainingSeats: number | null;

  constructor(usage: TargetSeatUsage) {
    super(buildTargetSeatLimitMessage(usage));
    this.seatLimit = usage.seatLimit;
    this.usedSeats = usage.usedSeats;
    this.remainingSeats = usage.remainingSeats;
  }
}

export const isTargetSeatLimitError = (
  error: unknown,
): error is TargetSeatLimitError => error instanceof TargetSeatLimitError;

export function assertTargetSeatCapacity(usage: TargetSeatUsage, seatsToAdd = 1) {
  if (usage.seatLimit === null) {
    return;
  }

  if ((usage.remainingSeats ?? 0) >= seatsToAdd) {
    return;
  }

  throw new TargetSeatLimitError(usage);
}
