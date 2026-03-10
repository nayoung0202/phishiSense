import { getPlatformClientConfig } from "./config";
import {
  platformMeResponseSchema,
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

export class PlatformApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

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
    const errorText = await response.text();
    throw new PlatformApiError(
      response.status,
      `[platform] /platform/me 호출 실패 (${response.status}): ${errorText.slice(0, 240)}`,
    );
  }

  const parsed = await parseJson<unknown>(response);
  return platformMeResponseSchema.parse(parsed);
}
