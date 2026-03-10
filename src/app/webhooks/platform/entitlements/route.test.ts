import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformCallbackError } from "@/server/platform/signature";

const serviceMock = vi.hoisted(() => ({
  processPlatformEntitlementCallback: vi.fn(),
}));

vi.mock("@/server/platform/entitlementService", () => ({
  processPlatformEntitlementCallback: serviceMock.processPlatformEntitlementCallback,
}));

import { POST } from "./route";

describe("POST /webhooks/platform/entitlements", () => {
  beforeEach(() => {
    serviceMock.processPlatformEntitlementCallback.mockReset();
  });

  it("정상 처리 결과를 반환한다", async () => {
    serviceMock.processPlatformEntitlementCallback.mockResolvedValue({
      duplicate: false,
      ignored: false,
      eventId: "event-1",
      tenantId: "tenant-1",
      productId: "PHISHSENSE",
    });

    const response = await POST(
      new Request("http://localhost/webhooks/platform/entitlements", {
        method: "POST",
        body: JSON.stringify({ eventId: "event-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.eventId).toBe("event-1");
  });

  it("Platform callback 오류를 상태 코드와 함께 반환한다", async () => {
    serviceMock.processPlatformEntitlementCallback.mockRejectedValue(
      new PlatformCallbackError(401, "signature_mismatch", "서명 불일치"),
    );

    const response = await POST(
      new Request("http://localhost/webhooks/platform/entitlements", {
        method: "POST",
        body: JSON.stringify({ eventId: "event-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("signature_mismatch");
  });
});
