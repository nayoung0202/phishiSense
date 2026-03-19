import { describe, expect, it } from "vitest";
import { getProjectActionKinds } from "./projectActionPolicy";

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
});
