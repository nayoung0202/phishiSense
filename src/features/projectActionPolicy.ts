export type ProjectActionKind = "detail" | "edit" | "delete" | "cancel" | "stop" | "report";

export const resolveProjectStopUpdates = (status: string, stoppedAt: Date) => {
  if (status === "예약") {
    return {
      status: "임시",
    } as const;
  }

  return {
    status: "완료",
    endDate: stoppedAt,
  } as const;
};

export const getProjectActionKinds = (status: string): ProjectActionKind[] => {
  switch (status) {
    case "임시":
      return ["detail", "edit", "delete"];
    case "예약":
      return ["detail", "cancel"];
    case "진행중":
      return ["detail", "stop"];
    case "완료":
      return ["report", "detail"];
    default:
      return ["detail"];
  }
};
