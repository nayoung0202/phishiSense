export const canCompareSelectedProjects = (count: number) => count >= 2;

export const canCopySelectedProjects = (count: number) => count === 1;

const BULK_START_ALLOWED_STATUSES = new Set(["임시", "예약"]);
const BULK_STOP_ALLOWED_STATUSES = new Set(["예약", "진행중"]);

export const canStartSelectedProjects = (statuses: string[]) =>
  statuses.length > 0 && statuses.every((status) => BULK_START_ALLOWED_STATUSES.has(status));

export const canStopSelectedProjects = (statuses: string[]) =>
  statuses.length > 0 && statuses.every((status) => BULK_STOP_ALLOWED_STATUSES.has(status));
