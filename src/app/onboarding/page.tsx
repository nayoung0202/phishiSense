export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-lg px-6">
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          <div className="mb-6 flex justify-center">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-primary"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-2xl font-bold text-foreground">PhishSense</span>
            </div>
          </div>

          <h1 className="mb-4 text-center text-xl font-semibold text-foreground">
            설정 시작하기
          </h1>

          <p className="mb-8 text-center text-sm text-muted-foreground">
            PhishSense를 처음 사용하시네요!
            <br />
            서비스를 시작하기 위한 초기 설정을 진행합니다.
          </p>

          {/* TODO: 온보딩 단계별 UI 추가 */}
          <div className="rounded-lg border border-border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            온보딩 기능이 곧 추가됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
