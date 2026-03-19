import { NextResponse } from "next/server";
import {
  getPublicProjectContextByTrackingToken,
  updateProjectForTenant,
  updateProjectTargetForTenant,
} from "@/server/tenant/tenantStorage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64",
);

const buildPixelResponse = () =>
  new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Content-Length": String(TRANSPARENT_GIF.byteLength),
    },
  });

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    const normalized = token?.trim();
    if (!normalized) {
      return buildPixelResponse();
    }

    const context = await getPublicProjectContextByTrackingToken(normalized);
    if (!context) {
      return buildPixelResponse();
    }

    const { tenantId, projectTarget, project } = context;
    if (!projectTarget.openedAt) {
      const openedAt = new Date();
      const nextStatus =
        projectTarget.status === "submitted"
          ? "submitted"
          : projectTarget.status === "clicked"
            ? "clicked"
            : projectTarget.status === "test"
              ? "test"
              : "opened";

      await updateProjectTargetForTenant(tenantId, projectTarget.id, {
        openedAt,
        status: nextStatus,
      });

      if (projectTarget.status !== "test") {
        await updateProjectForTenant(tenantId, project.id, {
          openCount: (project.openCount ?? 0) + 1,
        });
      }
    }

    return buildPixelResponse();
  } catch {
    return buildPixelResponse();
  }
}
