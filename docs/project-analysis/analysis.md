# PhishSenseDashboard 정밀 분석

## 1. 개요
- **목적**: Express 기반 API와 Vite + React 클라이언트로 구성된 피싱 훈련 관리 대시보드.
- **핵심 기능**: 훈련 프로젝트/템플릿/대상자/훈련 안내 페이지 CRUD, 대시보드 요약, 실시간 개발 환경 통합.
- **기술 스택**: TypeScript, React 18, Wouter, TanStack Query, TailwindCSS(Shadcn UI), Express 4, Drizzle ORM(스키마 정의), Neon(Postgres) 클라이언트.

## 2. 리포지토리 구조
- `client/`: Vite 루트. `src/`에 UI 페이지와 컴포넌트, 훅, 유틸리티 정리.
- `server/`: Express 진입점, REST 라우트 및 개발용 Vite 브리지, 인메모리 스토리지.
- `shared/`: Drizzle 스키마 및 Zod 기반 입력 스키마, 타입 정의.
- `docs/`: 작업 계획(`plan.md`)과 본 분석 문서.
- 루트 설정 파일: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `vite.config.ts`, `drizzle.config.ts`, `postcss.config.js`.
- 참고 자료: `design_guidelines.md`(UI 방향성), `attached_assets/`(시각 자료).

## 3. 클라이언트 분석 (`client/src`)
### 3.1 진입점
- `main.tsx`: `createRoot`로 `App` 마운트, 전역 스타일 `index.css` 로드.
- `App.tsx`: `QueryClientProvider`, `TooltipProvider`, 커스텀 `SidebarProvider`를 감싸고 `wouter` 라우터로 페이지 전환.

### 3.2 라우팅 및 페이지
- 대시보드/프로젝트/템플릿/대상자/훈련 안내 페이지 CRUD에 대응하는 화면(`pages/*.tsx`)과 404 페이지(`pages/not-found.tsx`).
- 대부분의 데이터 페이지는 `@tanstack/react-query`로 `/api/...` REST 엔드포인트를 호출해 목록/상세를 갱신. 생성·수정은 `react-hook-form` + `zodResolver`를 사용.
- `Dashboard` 페이지는 아직 Mock 데이터 기반으로 카드/차트를 렌더링하며 실제 API 연동이 미완료.
- `ProjectDetail`는 차트(`recharts`) 및 상세 표 구성을 포함하지만 부분적으로 mock 데이터(부서 분포, 타임라인)를 사용.

### 3.3 공용 상태 및 유틸
- `lib/queryClient.ts`: 기본 `QueryClient` 옵션 정의, `fetch` 기반 공용 `apiRequest`/`getQueryFn` 제공(401 처리 전략 포함).
- `hooks/use-toast.ts`: Shadcn Toast 로직을 래핑.
- `hooks/use-mobile.tsx`: 미디어쿼리 기반 모바일 여부 판단.
- `components/ui/*`: Shadcn UI 컴포넌트 전체 세트가 포함되며 Tailwind 변수 기반으로 스타일이 확장.
- 레이아웃 컴포넌트: `AppSidebar`, `DashboardHeader` 등에서 `SidebarProvider`(대형 컴포넌트) 사용.
- CSS(`index.css`): 라이트/다크 테마 변수, elevation 유틸리티 등 디자인 가이드에 맞춘 맞춤 변수 정의.

## 4. 서버 분석 (`server`)
### 4.1 진입점 및 개발 서버
- `index.ts`: Express 앱 생성 → JSON 파서 적용 → `/api` 요청에 대한 성능 로그(80자 제한) 기록 → `registerRoutes`로 REST 라우트 등록.
- 에러 미들웨어: 예외 발생 시 상태 코드/메시지를 JSON으로 반환하되, 동시에 throw하여 프로세스 레벨 로그를 남김.
- 개발 모드에서 `setupVite` 호출하여 HMR 미들웨어 삽입, 프로덕션에서는 `serveStatic`으로 `dist/public`을 제공.
- 서버는 `PORT` 환경 변수(기본 5000)에서 IPv4 `0.0.0.0`로 리슨.

### 4.2 라우팅 (`routes.ts`)
- 리소스: `projects`, `templates`, `targets`, `training-pages`. 각 리소스마다 `GET/POST/PATCH/DELETE` REST API 제공.
- 유효성 검사: 생성 시 `@shared/schema`의 `insert*Schema`로 `zod` 검증. 업데이트(`PATCH`)와 일부 오류는 단순 `400/500` 응답으로 일괄 처리되어 상세 에러 메시지가 부족.
- `/api/projects/:projectId/targets` 엔드포인트는 특정 프로젝트 대상자 매핑을 반환.

### 4.3 스토리지 (`storage.ts`)
- `MemStorage` 클래스: Map 기반 인메모리 저장소. 서버 기동 시 템플릿, 프로젝트, 대상자 더미 데이터를 시드.
- CRUD 메서드는 모두 `Promise`를 반환해 비동기 DB와 호환되도록 설계됐으나 실제 DB 연동은 없음.
- `projectTargets`/`trainingPages` 관련 데이터는 기본적으로 빈 상태에서 시작.
- 사용자 관련 메서드(`getUser`, `createUser`)가 정의돼 있지만 현재 라우트에서 미사용.

### 4.4 데이터베이스 설정 (`db.ts`)
- Neon 서버리스 클라이언트와 Drizzle을 초기화하며 `DATABASE_URL` 존재를 강제.
- 현 시점에는 `db`가 라우트나 스토리지 어디에서도 참조되지 않아 실제 Postgres 연동이 구현되지 않은 상태.

## 5. 공유 스키마 (`shared/schema.ts`)
- Drizzle ORM으로 `users`, `projects`, `templates`, `targets`, `training_pages`, `project_targets` 테이블 정의.
- `createInsertSchema` + Zod으로 생성/삽입용 스키마 제공. 대부분 `id`와 타임스탬프는 `omit` 처리해 서버 측에서 생성.
- 프로젝트 상태(`status`), 대상자 상태(`status`), 훈련 페이지 상태 등은 문자열(enum 미활용)로 관리.
- 타입: `Insert*`와 선택 타입(`Project`, `Template` 등)을 Zod/Drizzle에서 추론하여 클라이언트·서버가 공유.

## 6. 빌드·런타임 구성
- `package.json` 스크립트:
  - `dev`: `tsx server/index.ts`로 Express + Vite(미들웨어 모드) 동시 구동.
  - `build`: `vite build`로 클라이언트 빌드 후 `esbuild`로 서버 번들(`dist/index.js` 포함) 생성.
  - `start`: 프로덕션 번들 실행.
  - `check`: `tsc --noEmit`.
  - `db:push`: `drizzle-kit push`로 스키마 적용.
- `vite.config.ts`: React 플러그인 + Replit 전용 플러그인, 경로 별칭(`@`, `@shared`, `@assets`), 루트/출력 경로 지정.
- `tailwind.config.ts`: CSS 변수 기반 색상/테마 확장, `tailwindcss-animate`, `@tailwindcss/typography` 플러그인 포함.
- `tsconfig.json`: `moduleResolution: bundler`, 경로 별칭, `client/src`, `server`, `shared` 전체 커버.

## 7. 테스트 및 품질 상태
- **자동 테스트 부재**: 프로젝트 내 `*.test.ts(x)` 파일이 없으며 Vitest/MSW 구성이 아직 미사용.
- 타입 검사용 `npm run check`만 제공되며, 런타임 검증과 통합 테스트는 미구현.
- 목업 데이터(Dashboard, ProjectDetail 차트 등)와 실제 API 데이터가 혼재하여 QA 시 혼동 가능.

## 8. 주요 관찰 사항 및 리스크
- **DB 미연동**: `server/db.ts`와 Drizzle 설정이 존재하지만 라우트/스토리지에서 사용되지 않음 → 실제 데이터 지속성이 없음.
- **에러 처리 단순화**: 모든 예외에 대해 동일한 메시지를 반환하는 구간이 많아 클라이언트 디버깅이 어려울 수 있음.
- **인증 미구현**: Passport 의존성이 추가돼 있으나 로그인/세션 라우트가 전혀 없음. 향후 인증 흐름 구현 시 스토리지 사용자 로직을 확장 필요.
- **Mock 데이터 잔존**: Dashboard와 ProjectDetail 일부 UI가 하드코딩된 데이터를 사용 → 실데이터 연동 계획 필요.
- **국제화 불균형**: 페이지 대부분은 한국어지만 `pages/not-found.tsx` 등 일부 메시지가 영어로 남아 있어 지침과 불일치.
- **테스트 커버리지 부족**: 저장소 지침(REST 핸들러 통합 테스트, MSW 등)이 아직 반영되지 않음.

## 9. 향후 개선 제안
1. **스토리지 계층 교체**: `MemStorage`를 Drizzle 기반 Postgres 구현으로 대체하고, `server/db.ts`를 실사용하도록 라우트 리팩터링.
2. **유효성/에러 처리 강화**: `PATCH` 요청에도 Zod 스키마 부분 적용, 에러 메시지 구체화.
3. **Mock 데이터 정리**: Dashboard/ProjectDetail에 서버 데이터 연결 및 가짜 타임라인/부서 통계에 대한 백엔드 API 설계.
4. **인증 흐름 구현**: Passport-Local 또는 OpenID Connect 기반 로그인 라우트 추가, `express-session` 설정과 연계.
5. **테스트 인프라 구축**: Vitest 환경 세팅, 서버 라우트 통합 테스트, 클라이언트 MSW 핸들러 작성.
6. **다국어 정비**: 남아 있는 영문 UI 문구를 한국어로 통일하고 필요 시 i18n 도입 검토.

## 10. 참고 리소스
- 디자인 기준: `design_guidelines.md`
- 자산: `attached_assets/image_1760595471593.png`
- 개발 지침: `AGENTS.md` (작업 절차, 커밋 규범 등)
