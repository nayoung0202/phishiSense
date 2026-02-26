import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "로그인 - PhishSense",
  description: "PhishSense 악성메일 모의훈련 서비스 로그인",
};

/**
 * /login 전용 레이아웃
 * AppShell(사이드바, 헤더)을 포함하지 않는 독립 레이아웃입니다.
 */
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
