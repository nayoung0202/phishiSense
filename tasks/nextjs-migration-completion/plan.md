# Next.js 마이그레이션 마무리 계획

1. Express 기반 서버 구조와 라우트를 분석해 Next Route Handler로 대체해야 하는 목록을 완성한다.
2. Projects 및 Admin API 등 남아 있는 모든 Express 라우트를 `src/app/api` 경로로 옮기고 `registerRoutes` 의존성을 제거한다.
3. dev/build/start 스크립트와 서버 엔트리를 Next 기본 명령어로 정리하고, 타입/환경 구성을 최신화한다.
4. React Query 클라이언트 코드와 API 호출부를 점검해 새 Route Handler와 호환되도록 수정하고 필요한 서버 컴포넌트 전환을 수행한다.
5. 테스트/검증: `npm run check`, 필요한 경우 빌드 혹은 lint를 실행해 회귀 여부를 확인한다.
