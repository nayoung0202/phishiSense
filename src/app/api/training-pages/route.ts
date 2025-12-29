import { NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { insertTrainingPageSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function GET() {
  try {
    const pages = await storage.getTrainingPages();
    return NextResponse.json(pages);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch training pages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const validated = insertTrainingPageSchema.parse(payload);
    const page = await storage.createTrainingPage(validated);
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid training page", issues: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create training page" }, { status: 500 });
  }
}
