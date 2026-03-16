import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/queryClient";
import TemplateEdit from "./TemplateEdit";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("TemplateEdit", () => {
  it("템플릿 저장 폼은 브라우저 기본 유효성 검사를 사용하지 않는다", () => {
    const { container } = renderWithClient(<TemplateEdit />);
    const form = container.querySelector("form");

    expect(form).not.toBeNull();
    expect(form).toHaveAttribute("novalidate");
  });
});
