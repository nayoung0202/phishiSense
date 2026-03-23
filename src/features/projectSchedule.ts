export const getDefaultProjectStartDate = (now = new Date()) => {
  const next = new Date(now);
  next.setSeconds(0, 0);
  return next;
};

export const startOfLocalDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const isPastProjectDate = (value: Date, now = new Date()) =>
  startOfLocalDay(value).getTime() < startOfLocalDay(now).getTime();

export const preserveTimeOnDateChange = (selectedDate: Date, sourceDate?: Date) => {
  const next = new Date(selectedDate);
  const source = sourceDate ?? getDefaultProjectStartDate();
  next.setHours(source.getHours(), source.getMinutes(), 0, 0);
  return next;
};

export const applyTimeToDate = (value: Date, timeValue: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());
  if (!match) {
    return value;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return value;
  }

  const next = new Date(value);
  next.setHours(hours, minutes, 0, 0);
  return next;
};

export const formatTimeInputValue = (value?: Date) => {
  if (!value || Number.isNaN(value.getTime())) {
    return "";
  }

  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
};

export const isFutureScheduledDateTime = (value?: Date, now = new Date()) =>
  Boolean(value && !Number.isNaN(value.getTime()) && value.getTime() > now.getTime());

export const resolveProjectStartDate = (
  selectedStartDate: Date | undefined,
  now = new Date(),
) => {
  if (selectedStartDate && !Number.isNaN(selectedStartDate.getTime())) {
    return selectedStartDate;
  }

  return getDefaultProjectStartDate(now);
};
