# Next.js 마이그레이션 작업 계획

## 목표
- 기존 Vite + Express 스택을 Next.js Pages Router 기반의 단일 프로젝트로 전환한다.
- UI, 라우트, API 계약, 사용자 플로우가 기존과 100% 동일하게 유지되도록 한다.

## 세부 계획
1. **현황 파악**: 기존 client/server/shared 구조와 npm 스크립트, 경로 별칭, 공통 타입 등을 분석한다.
2. **Next.js 설정**: Next.js Pages Router 프로젝트 구조를 생성하고 tsconfig, eslint, Tailwind, alias 설정을 맞춘다.
3. **클라이언트 마이그레이션**: `client/src` 의 페이지, 컴포넌트, 훅, 스타일을 Next.js `pages`, `components`, `lib` 등으로 이동하고 필요한 수정(Head, Image 등)을 적용한다.
4. **API 마이그레이션**: Express 라우트를 Next.js API Routes(`/pages/api/*`)로 옮기고 기존 `storage`, `shared` 모듈을 재사용한다.
5. **서버/빌드 정리**: Express 관련 진입 파일과 스크립트를 제거하거나 Next.js 실행 스크립트로 교체한다.
6. **검증**: `npm run dev`, `npm run build`, `npm run start` 등 명령을 Next.js 기준으로 갱신하고 `npm run check` 대체 검증을 수행한다.
7. **문서 & 후속 조치**: README, 환경 변수 가이드, 필요한 테스트 코드를 업데이트한다.

## 완료 정의
- Next.js dev/build/start가 정상 동작하고, 기존 UI/API와 기능이 동일하다.
- TypeScript/Tailwind 설정이 정합성을 유지하며, 공유 타입은 `shared` 아래에 계속 존재한다.
- 문서와 스크립트가 모두 최신 상태로 반영된다.
