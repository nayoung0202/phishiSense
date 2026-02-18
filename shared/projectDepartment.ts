export type ProjectDepartmentLike = {
  department?: string | null;
  departmentTags?: readonly (string | null | undefined)[] | null;
};

const normalizeDepartmentValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getProjectDepartmentTags = (project: ProjectDepartmentLike): string[] => {
  if (!Array.isArray(project.departmentTags)) {
    return [];
  }

  const uniqueTags = new Set<string>();
  project.departmentTags.forEach((tag) => {
    const normalized = normalizeDepartmentValue(tag);
    if (normalized) {
      uniqueTags.add(normalized);
    }
  });
  return Array.from(uniqueTags);
};

export const getProjectPrimaryDepartment = (project: ProjectDepartmentLike): string | null => {
  const tags = getProjectDepartmentTags(project);
  if (tags.length > 0) {
    return tags[0] ?? null;
  }
  return normalizeDepartmentValue(project.department) ?? null;
};

export const getProjectDepartmentDisplay = (
  project: ProjectDepartmentLike,
  fallback = "부서 미지정",
): string => {
  const tags = getProjectDepartmentTags(project);
  if (tags.length > 0) {
    return tags.join(", ");
  }
  return normalizeDepartmentValue(project.department) ?? fallback;
};
