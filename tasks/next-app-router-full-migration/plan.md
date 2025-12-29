# Next App Router 마이그레이션 계획

## 목표
- 기존 Vite React + Express 조합을 Next.js App Router 구조로 이전하되 UI/디자인/기능/URL/API가 변하지 않도록 유지
- 서버 사이드 Express 로직과 REST 엔드포인트를 Next.js API Route 또는 별도 서버 통합 계층으로 옮기고, 동일한 스토리지 계층과 타입을 재사용
- Next 빌드·실행 스크립트로 전환하면서도 개발자 경험(dev/check/build/start) 명령은 동일하게 유지

## 작업 단계
1. **현 구조 파악 및 적응 전략 수립**: 클라이언트 진입점(App.tsx/main.tsx), 라우팅 구조, Express server/index.ts, routes.ts, storage.ts 등을 분석하여 Next App Router로 옮길 방법 정의
2. **Next.js 기본 구성 준비**: `app/` 디렉터리, `next.config.mjs`, `tsconfig.json`, `tailwind` 설정을 Next App Router에 맞게 조정하고 절대경로 별칭(`@/`, `@shared/`) 유지
3. **클라이언트 페이지/레이아웃 포팅**: 기존 React Router 라우트를 Next `app/(routes)` 구조로 옮기고, 필요한 경우 클라이언트 컴포넌트를 유지하여 UI와 URL을 동일하게 만듦
4. **API/서버 로직 이전**: Express 라우트를 Next API Route 또는 Route Handler로 변환하면서 스토리지 로직/타입/미들웨어를 유지, 파일 업로드나 Nodemailer 등 부가 기능도 동일 처리
5. **명령어 및 배포 경로 정리**: `package.json` 스크립트와 빌드 산출물을 Next에 맞게 수정하고, 필요 시 Drizzle/환경설정 문서를 업데이트
6. **테스트 및 검증**: `npm run dev`, `npm run build`, `npm run check` 등을 실행해 타입·빌드 오류를 확인하고 주요 페이지/엔드포인트를 스모크 테스트

## 메모/리스크
- 파일 업로드 및 Nodemailer가 App Router 환경에서 제대로 동작하는지 확인 필요
- 기존 Express 전용 미들웨어/라우팅 패턴 이식 시 Next Route Handler의 Edge/Node 실행 컨텍스트를 주의
- UI 불변 조건을 만족시키기 위해 Tailwind 및 상태 관리가 동일하게 동작하는지 비교 검증 필요
