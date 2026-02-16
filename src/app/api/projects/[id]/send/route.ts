import { NextResponse } from "next/server";
import { enqueueSendJobForProject } from "@/server/services/sendJobs";
import { SendValidationError } from "@/server/services/templateSendValidation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { job, created } = await enqueueSendJobForProject(id);
    return NextResponse.json(job, { status: created ? 201 : 200 });
  } catch (error) {
    if (error instanceof SendValidationError) {
      return NextResponse.json(
        { error: "send_validation_failed", issues: error.issues },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Failed to enqueue send job" }, { status: 500 });
  }
}
