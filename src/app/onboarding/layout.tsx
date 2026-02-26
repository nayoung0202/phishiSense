import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "온보딩 - PhishSense",
  description: "PhishSense 초기 설정",
};

/**
 * /onboarding 전용 레이아웃
 * AppShell(사이드바, 헤더)을 포함하지 않는 독립 레이아웃입니다.
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
