import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { storage } from "@/server/storage";

const copySchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { ids } = copySchema.parse(await request.json());
    const projects = await storage.copyProjects(ids);
    return NextResponse.json(projects, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "validation_error",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Failed to copy projects" }, { status: 400 });
  }
}
