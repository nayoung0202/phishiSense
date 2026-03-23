import { describe, expect, it } from "vitest";
import { getProjectActionKinds, resolveProjectStopUpdates } from "./projectActionPolicy";

describe("projectActionPolicy", () => {
  it("임시 프로젝트는 상세, 수정, 삭제 액션을 노출한다", () => {
    expect(getProjectActionKinds("임시")).toEqual(["detail", "edit", "delete"]);
  });

  it("예약 프로젝트는 상세, 취소 액션을 노출한다", () => {
    expect(getProjectActionKinds("예약")).toEqual(["detail", "cancel"]);
  });

  it("진행중 프로젝트는 상세, 중지 액션을 노출한다", () => {
    expect(getProjectActionKinds("진행중")).toEqual(["detail", "stop"]);
  });

  it("완료 프로젝트는 보고서, 상세 액션을 노출한다", () => {
    expect(getProjectActionKinds("완료")).toEqual(["report", "detail"]);
  });

  it("예약 프로젝트 중지는 임시 상태로 되돌린다", () => {
    expect(resolveProjectStopUpdates("예약", new Date("2026-03-20T10:00:00Z"))).toEqual({
      status: "임시",
    });
  });

  it("진행중 프로젝트 중지는 완료 상태와 종료 시각을 기록한다", () => {
    const stoppedAt = new Date("2026-03-20T10:00:00Z");

    expect(resolveProjectStopUpdates("진행중", stoppedAt)).toEqual({
      status: "완료",
      endDate: stoppedAt,
    });
  });
});
