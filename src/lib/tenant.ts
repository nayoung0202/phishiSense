import { useEffect, useState } from "react";

const defaultTenantFromEnv = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;
const DEFAULT_TENANT_ID = defaultTenantFromEnv && defaultTenantFromEnv.trim().length > 0
  ? defaultTenantFromEnv.trim()
  : "demo-tenant";

export function resolveAutoTenantId() {
  if (typeof window === "undefined") {
    return DEFAULT_TENANT_ID;
  }
  const stored = window.localStorage.getItem("currentTenantId");
  const trimmed = stored?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_TENANT_ID;
}

export function createNewTenantId() {
  const fromCrypto = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `tenant-${fromCrypto}`.replace(/[^a-zA-Z0-9-]/g, "");
}

export function useAutoTenantId(): string {
  const [tenantId, setTenantId] = useState<string>(() => resolveAutoTenantId());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "currentTenantId") {
        setTenantId(resolveAutoTenantId());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return tenantId;
}
