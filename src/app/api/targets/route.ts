import { NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { insertTargetSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function GET() {
  try {
    const targets = await storage.getTargets();
    return NextResponse.json(targets);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const validated = insertTargetSchema.parse(payload);
    const target = await storage.createTarget(validated);
    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid target data", issues: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create target" }, { status: 500 });
  }
}
