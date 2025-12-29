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
    const targets = await storage.getProjectTargets(id);
    return NextResponse.json(targets);
  } catch {
    return NextResponse.json({ error: "Failed to fetch project targets" }, { status: 500 });
  }
}
