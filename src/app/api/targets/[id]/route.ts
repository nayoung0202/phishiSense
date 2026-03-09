import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const target = await storage.getTarget(id);
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    return NextResponse.json(target);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch target" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const payload = await request.json();
    const { id } = await params;
    if (typeof payload?.email === "string" && payload.email.trim().length > 0) {
      const existing = await storage.findTargetByEmail(payload.email);
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "duplicate_email", message: "이미 등록된 이메일입니다." },
          { status: 409 },
        );
      }
    }
    const target = await storage.updateTarget(id, payload);
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    return NextResponse.json(target);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update target" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const deleted = await storage.deleteTarget(id);
    if (!deleted) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete target" }, { status: 500 });
  }
}
