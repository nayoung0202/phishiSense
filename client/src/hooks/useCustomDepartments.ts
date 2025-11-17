import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "phishsense:custom-departments";

const hasWindow = () => typeof window !== "undefined";

const readCustomDepartments = (): string[] => {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
};

const writeCustomDepartments = (values: string[]) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // noop
  }
};

const persistDepartment = (label: string): string[] => {
  const normalized = label.trim();
  if (!normalized) {
    return readCustomDepartments();
  }
  const existing = new Set(readCustomDepartments());
  existing.add(normalized);
  const sorted = Array.from(existing).sort((a, b) => a.localeCompare(b, "ko"));
  writeCustomDepartments(sorted);
  return sorted;
};

const removeDepartment = (label: string): string[] => {
  const normalized = label.trim();
  const existing = readCustomDepartments().filter(
    (item) => item.trim().length > 0 && item.trim() !== normalized,
  );
  writeCustomDepartments(existing);
  return existing;
};

export function useCustomDepartments() {
  const [customDepartments, setCustomDepartments] = useState<string[]>(() =>
    readCustomDepartments(),
  );

  useEffect(() => {
    setCustomDepartments(readCustomDepartments());
  }, []);

  useEffect(() => {
    if (!hasWindow()) return;
    const handler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setCustomDepartments(readCustomDepartments());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const addCustomDepartment = useCallback((label: string) => {
    const updated = persistDepartment(label);
    setCustomDepartments(updated);
    return updated;
  }, []);

  const removeCustomDepartment = useCallback((label: string) => {
    const updated = removeDepartment(label);
    setCustomDepartments(updated);
    return updated;
  }, []);

  const clearCustomDepartments = useCallback(() => {
    writeCustomDepartments([]);
    setCustomDepartments([]);
  }, []);

  return {
    customDepartments,
    addCustomDepartment,
    removeCustomDepartment,
    clearCustomDepartments,
  };
}

export function getCustomDepartmentsSnapshot(): string[] {
  return readCustomDepartments();
}
