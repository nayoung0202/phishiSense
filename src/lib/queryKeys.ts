export const PROJECTS_LIST_QUERY_KEY = ["projects"] as const;
export const PROJECTS_QUARTER_STATS_QUERY_KEY = ["projects-quarter-stats"] as const;
export const PROJECTS_CALENDAR_QUERY_KEY = ["projects-calendar"] as const;

export const PROJECTS_DETAIL_QUERY_KEY = (projectId: string) =>
  ["/api/projects", projectId] as const;

export const PROJECTS_TARGETS_QUERY_KEY = (projectId: string) =>
  ["/api/projects", projectId, "targets"] as const;
