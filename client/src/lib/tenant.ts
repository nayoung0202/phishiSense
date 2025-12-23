const defaultTenantFromEnv = import.meta.env.VITE_DEFAULT_TENANT_ID;
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
import { useEffect, useState } from "react";
