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
    const page = await storage.getTrainingPage(id);
    if (!page) {
      return NextResponse.json({ error: "Training page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch training page" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const payload = await request.json();
    const { id } = await params;
    const page = await storage.updateTrainingPage(id, payload);
    if (!page) {
      return NextResponse.json({ error: "Training page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update training page" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const deleted = await storage.deleteTrainingPage(id);
    if (!deleted) {
      return NextResponse.json({ error: "Training page not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete training page" }, { status: 500 });
  }
}
