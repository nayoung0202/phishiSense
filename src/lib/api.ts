import type {
  SmtpConfigResponse,
  SmtpConfigSummary,
  TestSmtpConfigPayload,
  UpdateSmtpConfigPayload,
} from "@/types/smtp";

export type ImportTrainingTargetsResponse = {
  ok: boolean;
  totalRows: number;
  successCount: number;
  failCount: number;
  failures: Array<{ rowNumber: number; email?: string; reason: string }>;
};

const ADMIN_BASE_PATH = "/api/admin";

type ApiErrorBody = {
  message?: string;
  error?: string;
};

async function requestJson<TResponse = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const headers: HeadersInit = init.body
    ? {
        "Content-Type": "application/json",
        ...init.headers,
      }
    : init.headers || {};

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  const rawText = await response.text();
  let parsedBody: unknown;

  if (rawText) {
    try {
      parsedBody = JSON.parse(rawText);
    } catch (error) {
      parsedBody = rawText;
    }
  }

  if (!response.ok) {
    const body = parsedBody as ApiErrorBody;
    const message = body?.message || body?.error || response.statusText;
    throw new Error(message || "알 수 없는 오류가 발생했습니다.");
  }

  return parsedBody as TResponse;
}

function buildTenantPath(tenantId: string, suffix: string) {
  return `${ADMIN_BASE_PATH}/tenants/${tenantId}${suffix}`;
}

export async function getSmtpConfig(tenantId: string) {
  return requestJson<SmtpConfigResponse>(
    buildTenantPath(tenantId, "/smtp-config"),
  );
}

export async function listSmtpConfigs() {
  return requestJson<SmtpConfigSummary[]>(`${ADMIN_BASE_PATH}/smtp-configs`);
}

export async function updateSmtpConfig(
  tenantId: string,
  payload: UpdateSmtpConfigPayload,
) {
  const body: UpdateSmtpConfigPayload = { ...payload };

  if (!body.password) {
    delete body.password;
  }

  return requestJson<void>(buildTenantPath(tenantId, "/smtp-config"), {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function testSmtpConfig(
  tenantId: string,
  payload: TestSmtpConfigPayload,
) {
  return requestJson<{ message?: string }>(
    buildTenantPath(tenantId, "/smtp-config/test"),
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function importTrainingTargetsExcel(
  file: File,
): Promise<ImportTrainingTargetsResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/admin/training-targets/import", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    let message = "엑셀 업로드에 실패했습니다.";
    try {
      const errorBody = (await response.json()) as ApiErrorBody;
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return (await response.json()) as ImportTrainingTargetsResponse;
}
