import { NextRequest, NextResponse } from "next/server";
import { insertTargetSchema } from "@shared/schema";
import { ZodError } from "zod";
import {
  createTargetForTenantWithinSeatLimit,
  findTargetByEmailInTenant,
  getTargetsForTenant,
} from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";
import {
  isTargetSeatLimitError,
  resolveTargetSeatLimit,
} from "@/server/services/targetSeatCapacity";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const targets = await getTargetsForTenant(tenantId);
    return NextResponse.json(targets);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch targets");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, platform } = await requireReadyTenant(request);
    const payload = await request.json();
    const validated = insertTargetSchema.parse(payload);
    const existing = await findTargetByEmailInTenant(tenantId, validated.email);
    if (existing) {
      return NextResponse.json(
        { error: "duplicate_email", message: "이미 등록된 이메일입니다." },
        { status: 409 },
      );
    }
    const seatLimit = resolveTargetSeatLimit(platform);
    const target = await createTargetForTenantWithinSeatLimit(
      tenantId,
      validated,
      seatLimit,
    );
    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    if (isTargetSeatLimitError(error)) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          seatLimit: error.seatLimit,
          usedSeats: error.usedSeats,
          remainingSeats: error.remainingSeats,
        },
        { status: error.status },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid target data", issues: error.errors },
        { status: 400 },
      );
    }
    return buildReadyTenantErrorResponse(error, "Failed to create target");
  }
}
