import { NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { insertTemplateSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function GET() {
  try {
    const templates = await storage.getTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const validated = insertTemplateSchema.parse(payload);
    const template = await storage.createTemplate(validated);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid template data", issues: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
