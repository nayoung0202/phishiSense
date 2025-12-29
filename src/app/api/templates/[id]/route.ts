import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { ZodError } from "zod";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const template = await storage.getTemplate(id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const payload = await request.json();
    const { id } = await params;
    const template = await storage.updateTemplate(id, payload);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid template data", issues: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update template" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const deleted = await storage.deleteTemplate(id);
    if (!deleted) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
