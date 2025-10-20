# Repository Guidelines

## 프로젝트 구조 및 모듈 구성
이 저장소는 Vite 기반의 React 클라이언트와 Express API로 구성되어 있습니다. 클라이언트 코드는 `client/src`에 위치하며, 기본 UI 컴포넌트는 `components`, 라우팅되는 화면은 `pages`, 재사용 훅과 유틸리티는 `hooks`와 `lib`, Tailwind 진입 스타일은 `index.css`에 정리합니다. Express 로직은 `server`에 있으며 `routes.ts`가 REST 엔드포인트를 연결하고, `storage.ts`는 시드 데이터 계층을 제공하며, `vite.ts`는 개발 도구를 중계합니다. 공통 타입과 Drizzle 스키마는 `shared/schema.ts`에, 참고용 자산은 `attached_assets`에 보관합니다.

## 작업 진행 절차
모든 작업을 시작하기 전에 해당 기능이나 작업 단위에 적합한 디렉터리를 생성하고, 그 디렉터리 내부에 작업 계획을 담은 Markdown 파일을 작성해 이를 업무 수행의 기준으로 삼습니다.

## 빌드·테스트·개발 명령어
- `npm run dev`: Express 서버와 실시간 Vite 미들웨어를 함께 실행하여 전체 스택 개발 환경을 제공합니다.
- `npm run build`: Vite로 클라이언트를 빌드하고 esbuild로 서버 엔트리를 번들링하여 `dist/`에 출력합니다.
- `npm run start`: `NODE_ENV=production` 상태에서 `dist/index.js`를 실행해 프로덕션 번들을 제공합니다.
- `npm run check`: TypeScript 컴파일러를 실행해 `client`, `server`, `shared` 전반의 타입 검사를 수행합니다.
- `npm run db:push`: `shared/schema.ts`에 정의된 Drizzle 스키마를 설정된 데이터베이스에 반영합니다.

## 코딩 스타일 및 네이밍 규칙
TypeScript는 2칸 들여쓰기, ES 모듈, 엄격한 타입을 기본으로 사용합니다. React 컴포넌트는 PascalCase(`DashboardHeader`), 훅은 `use` 접두사를 붙이고, 유틸리티는 camelCase를 유지합니다. 스타일은 Tailwind 클래스를 우선 사용하고, 필요한 경우에만 `client/src/index.css`에 보조 스타일을 추가합니다. 경로는 가능한 `@/`와 `@shared/` 별칭을 활용해 깊은 상대 경로를 피합니다.

## 테스트 가이드라인
신규 기능은 `client/src` 또는 `server`에 Vitest 기반 테스트를 `*.test.ts(x)` 혹은 `*.spec.ts(x)` 패턴으로 추가합니다. 새로운 HTTP 통신이 생기면 `client/src/mocks`에 `msw` 핸들러를 만들어 목킹합니다. REST 핸들러는 `storage`를 스텁 처리해 상태 코드, 응답 형태, 실패 시나리오(Drizzle 쿼리와 Zod 검증 포함)를 검증하는 통합 테스트를 함께 작성합니다.

## 커밋 및 Pull Request 가이드라인
Git 기록과 동일하게 설명형, 문장형 커밋 메시지를 사용하되, 모든 커밋 제목과 본문은 작업 단위별로 한글로 작성합니다. 관련 변경은 단일 커밋으로 묶고, 가능하면 이슈 ID를 함께 언급하며 각 PR은 하나의 주제에 집중합니다. PR 본문에는 사용자 영향, 스키마·환경 변수 변경, UI 변경 시 스크린샷, 실행한 점검(`npm run check`, 로컬 테스트 등)을 정리하고, 마이그레이션이나 시드가 정상 적용되었는지 확인한 뒤 리뷰를 요청합니다.
작업이나 기능 단위의 작업이 완료되면 변경사항을 반드시 커밋해 변경 이력을 지속적으로 남깁니다.

## 보안 및 설정 팁
영속 저장소를 사용하기 전에 반드시 `DATABASE_URL`을 설정합니다. 로컬 개발은 시드된 `MemStorage`에 의존할 수 있지만, 프로덕션은 Neon 등 Postgres 호스트를 지정해야 합니다. `server/index.ts`에서 강제하는 대로 항상 `PORT`(기본값 `5000`)에서 서비스를 제공하고, 새 환경 변수를 추가하면 `.env.example`를 갱신합니다. 비밀값은 커밋하지 말고, 인증·세션 코드를 수정할 때는 PR에 흐름을 문서화하고 무단 접근에 대한 간단한 스모크 테스트를 포함합니다.

## 커뮤니케이션 지침
이 저장소에 기여하거나 리뷰를 진행할 때는 모든 답변, Markdown 문서, 코드 주석을 한국어로 작성해야 합니다. 기존 영문 자료를 수정할 경우에도 한국어 번역본을 우선 제공하고, 필요한 경우에만 영문을 병기합니다.
작업 수행 중 발생한 이슈와 해결 과정 역시 한글로 명확하게 기록해 공유합니다.
