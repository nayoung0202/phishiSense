import { getPlatformClientConfig } from "./config";
import {
  platformCreateTenantResponseSchema,
  platformMeResponseSchema,
  type PlatformCreateTenantResponse,
  type PlatformMeResponse,
} from "./types";

const parseJson = async <T>(response: Response) => {
  const text = await response.text();
  if (!text) {
    throw new Error("[platform] 빈 응답을 수신했습니다.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("[platform] JSON 파싱에 실패했습니다.");
  }
};

const extractPlatformErrorDetail = async (response: Response) => {
  const text = await response.text();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text) as { message?: unknown; error?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    // ignore JSON parsing errors and fallback to raw text
  }

  return text.slice(0, 240);
};

export class PlatformApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const createPlatformApiError = async (response: Response, path: string) => {
  const detail = await extractPlatformErrorDetail(response);
  throw new PlatformApiError(
    response.status,
    `[platform] ${path} 호출 실패 (${response.status})${
      detail ? `: ${detail}` : ""
    }`,
  );
};

export async function fetchPlatformMe(options: {
  accessToken: string;
  tenantId?: string | null;
}): Promise<PlatformMeResponse> {
  const { baseUrl } = getPlatformClientConfig();
  const url = new URL("/platform/me", baseUrl);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      ...(options.tenantId
        ? {
            "X-Platform-Tenant-Id": options.tenantId,
          }
        : {}),
    },
  });

  if (!response.ok) {
    await createPlatformApiError(response, "/platform/me");
  }

  const parsed = await parseJson<unknown>(response);
  return platformMeResponseSchema.parse(parsed);
}

export async function createPlatformTenant(options: {
  accessToken: string;
  name: string;
}): Promise<PlatformCreateTenantResponse> {
  const { baseUrl } = getPlatformClientConfig();
  const url = new URL("/tenants", baseUrl);

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: options.name,
    }),
  });

  if (!response.ok) {
    await createPlatformApiError(response, "/tenants");
  }

  const parsed = await parseJson<unknown>(response);
  return platformCreateTenantResponseSchema.parse(parsed);
}
