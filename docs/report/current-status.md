# PhishSenseDashboard 구조/운영 한눈에 보기

## 1. 시스템 개요
- 목적: 악성메일 모의훈련(피싱 시뮬레이션) 관리 콘솔을 제공한다.
- 핵심 기능: 프로젝트 관리, 훈련 대상 관리, 템플릿/악성 본문 편집, 훈련 페이지 관리, SMTP 설정/테스트 발송, 공개 훈련 링크, 이미지 업로드.
- 기술 스택: Next.js(App Router) + React 18 + TypeScript, Tailwind CSS, Radix UI, Drizzle ORM + PostgreSQL, nodemailer, sanitize-html, TanStack Query, react-hook-form + zod.

## 2. 요청/데이터 흐름(개념도)
```
사용자 브라우저(UI)
  -> UI 화면(src/app, src/features)
  -> API 호출(src/lib/api + react-query)
  -> API 라우트(src/app/api/**)
  -> 서버 도메인 로직(src/server/**)
  -> 저장소(PostgreSQL/메모리) + SMTP + 업로드 디렉터리
```
- 공용 타입/스키마는 `shared/schema.ts`에서 정의하고, 프런트/서버가 함께 사용한다.

## 3. 루트 폴더 구조와 배치 이유
아래는 루트에 존재하는 주요 폴더와 “왜 이 위치에 둬야 하는지”에 대한 설명이다.

| 폴더 | 역할 | 배치 이유/생성 시점 |
| --- | --- | --- |
| `.git/` | Git 메타데이터 | 버전 관리 기본 폴더로, 저장소 최상위에 위치해야 한다. |
| `.idea/` | IDE 설정 | JetBrains 계열 IDE 사용 시 자동 생성되는 로컬 설정 폴더다. |
| `.local/` | 로컬 전용 설정/캐시 | 개발 환경별 임시 데이터가 저장되며 커밋 대상이 아니다. |
| `.next/` | Next.js 빌드/캐시 | `npm run dev` 또는 `npm run build` 실행 시 자동 생성된다. |
| `.tmp/` | 임시 파일 | 스크립트/도구의 작업 중간 산출물을 저장한다. |
| `attached_assets/` | 참고 자산 | 문서/디자인 참고 파일을 소스와 분리해 관리한다. |
| `dist/` | 배포/번들 산출물 | 과거 또는 보조 빌드 산출물을 분리 보관하기 위해 사용한다. |
| `docs/` | 문서 저장소 | 설계/운영/현황 문서를 코드와 분리해 기록한다. |
| `node_modules/` | 의존성 | `npm install` 시 생성되며 실행에 필요한 패키지가 저장된다. |
| `plans/`, `tasks/`, `work*/` | 작업 계획/기록 | 작업 단위 계획을 남기기 위한 폴더로, 업무 흐름을 추적하기 위해 사용한다. |
| `scripts/` | 보조 스크립트 | 시드/유지보수 등 반복 작업을 자동화하기 위해 별도 관리한다. |
| `shared/` | 공용 스키마/타입 | 프런트와 서버가 공통으로 사용하는 타입을 분리해 중복을 줄인다. |
| `src/` | 애플리케이션 코드 | 실행 코드의 중심 폴더로, UI/서버 로직을 구조화한다. |
| `tatus/` | 확인 필요 | 역할이 불명확하여 필요 시 정리 대상이다. |

## 4. `src/` 내부 구조(코드 배치 이유)
### 4.1 앱 라우터와 화면 구성
- `src/app/`: Next.js App Router 기반 화면/라우트를 둔다.
  - `page.tsx`, `layout.tsx`, `globals.css`: 루트 페이지, 레이아웃, 전역 스타일 정의.
  - `projects/`, `templates/`, `targets/`, `training-pages/`, `admin/smtp/`: 관리 화면 라우트.
  - `p/[token]/`, `t/[token]/`: 공개 훈련 링크/악성 본문 접근 라우트.
  - `api/`: 서버 API 라우트(파일 기반 라우팅)로, URL 구조와 파일 구조를 일치시킨다.

### 4.2 화면 단위 기능과 공용 컴포넌트
- `src/features/`: 대시보드/프로젝트/템플릿/훈련 페이지 등 화면 단위 컴포넌트를 분리해 관리한다.
- `src/components/`: 재사용 가능한 UI/레이아웃 컴포넌트를 모아 중복을 줄인다.
  - `src/components/ui/`: Radix 기반의 공통 UI 프리미티브.
  - `src/components/admin/`: 관리 화면에 특화된 컴포넌트.

### 4.3 재사용 로직과 타입
- `src/hooks/`: 커스텀 훅을 모아 UI 로직의 재사용성을 높인다.
- `src/lib/`: API 호출, 쿼리 클라이언트, HTML 정제 등 공통 유틸을 관리한다.
- `src/types/`: 화면/도메인에서 필요한 타입을 별도 정의한다.

### 4.4 서버 도메인 로직
- `src/server/`: API 라우트에서 사용하는 서버 전용 로직을 분리한다.
  - `dao/`: DB 접근 로직을 모아 쿼리 책임을 분리한다.
  - `services/`: 도메인 비즈니스 로직을 묶어 API 라우트의 복잡도를 줄인다.
  - `seed/`: 기본 데이터 시드 관리.
  - `lib/`: SMTP, SSRF 방어, 링크 토큰 등 공통 서버 유틸.
  - `utils/`: HTML 정제/암호화 관련 유틸 및 테스트.
  - `data/`: 로컬 스토리지/캐시 성격의 데이터 파일을 보관한다.

## 5. 기능별 위치 매핑(현재까지 개발된 내용)
| 기능 | UI/라우트 | API 라우트 | 서버 로직 |
| --- | --- | --- | --- |
| 프로젝트 관리 | `src/app/projects/`, `src/features/Projects.tsx` | `src/app/api/projects/` | `src/server/dao/projectDao.ts` |
| 템플릿 관리 | `src/app/templates/`, `src/features/Templates.tsx` | `src/app/api/templates/` | `src/server/dao/templateDao.ts`, `src/server/seed/` |
| 훈련 대상 관리 | `src/app/targets/`, `src/features/Targets.tsx` | `src/app/api/targets/`, `src/app/api/admin/training-targets/` | `src/server/dao/targetDao.ts` |
| 훈련 페이지 | `src/app/training-pages/`, `src/features/TrainingPages.tsx` | `src/app/api/training-pages/` | `src/server/dao/trainingPageDao.ts` |
| SMTP 관리 | `src/app/admin/smtp/`, `src/features/admin/` | `src/app/api/admin/smtp-configs/` | `src/server/services/adminSmtpService.ts`, `src/server/lib/smtp.ts` |
| 공개 훈련 링크 | `src/app/p/[token]/`, `src/app/t/[token]/` | - | `src/server/lib/trainingLink.ts` |
| 이미지 업로드 | - | `src/app/api/uploads/` | 저장 위치: `public/uploads`(로컬 생성) |

## 6. `shared/` 구조(공유 타입/스키마)
- `shared/schema.ts`: Drizzle 스키마와 Zod 기반 입력 스키마를 정의한다.
- `shared/sanitizeConfig.ts`: HTML 정제 규칙을 공통으로 유지해 입력 안전성을 확보한다.

## 7. 설정/메타 파일 설명(왜 필요하고, 언제 쓰는가)
### 환경 변수
- `.env`: 실행 환경별 비밀값/설정을 저장한다. 로컬 개발 또는 배포 시점에 필요하다.
- `.env.example`: `.env` 작성 가이드로, 신규 환경 세팅 시 복사해 사용한다.
- 사용 예: `DATABASE_URL`(DB 연결), `SEED_DEFAULTS`(개발용 시드 토글), `SMTP_SECRET`(암호화 키), `APP_BASE_URL`(메일 링크 생성), `SMTP_TEST_ALLOWED_DOMAINS`(테스트 제한).

### 빌드/런타임 설정
- `package.json`: 실행 스크립트와 의존성 정의.
- `package-lock.json`: 의존성 버전 고정을 위해 자동 생성된다.
- `tsconfig.json`: TypeScript 컴파일 설정.
- `next.config.mjs`: Next.js 빌드/라우팅 설정.
- `tailwind.config.ts`, `tailwind.config.js`: Tailwind 설정(환경/도구 호환 목적).
- `postcss.config.js`: PostCSS 플러그인 설정.
- `drizzle.config.ts`: Drizzle Kit 설정(DB 스키마 반영용).
- `vitest.config.ts`: 테스트 러너 설정.
- `next-env.d.ts`: Next.js 타입을 TS에 반영하기 위한 자동 생성 파일.
- `tsconfig.tsbuildinfo`: TS 증분 빌드 캐시 파일.

### 문서/정책
- `README.md`: DB/SMTP 등 실행 방법과 운영 체크리스트.
- `AGENTS.md`: 저장소 작업 규칙 및 커뮤니케이션 지침.
- `design_guidelines.md`: 디자인/레이아웃 기준.

### 개발 보조 파일
- `docker-compose.yml`: 로컬 DB 등 외부 서비스 실행용.
- `components.json`: UI 컴포넌트 생성/관리 도구 설정.
- `check.log`: 타입체크/검사 결과 로그 기록 용도.
- `dev.db`: 로컬 개발용 DB 산출물(커밋 대상 아님).
- `*:Zone.Identifier`: Windows 다운로드 메타데이터 파일로, 소스가 아니다.

### 버전 관리 예외
- `.gitignore`: 빌드 산출물(`.next`, `dist`), 의존성(`node_modules`), 비밀값(`.env`), 업로드 파일(`public/uploads`) 등을 커밋에서 제외한다.

## 8. 개발/운영 사용법 요약
- 개발 서버: `npm run dev`
- 빌드: `npm run build`
- 프로덕션 실행: `npm run start`
- 타입 체크: `npm run check`
- DB 스키마 반영: `npm run db:push`
- 로컬 DB 실행: `docker-compose up -d db`
- 로컬 DB 연결: `.env`에 `DATABASE_URL` 지정
- 기본 시드 필요 시: `SEED_DEFAULTS=true`로 실행
- CI 환경: 테스트 전용 `DATABASE_URL`을 사용하고 기본 시드는 비활성화 유지

## 9. 한눈에 보는 폴더 트리(핵심만)
```
.
├─ src/
│  ├─ app/            # 화면/라우트(Next App Router)
│  ├─ features/       # 화면 단위 기능
│  ├─ components/     # 공용 컴포넌트
│  ├─ hooks/          # 커스텀 훅
│  ├─ lib/            # 유틸/클라이언트
│  ├─ server/         # 서버 전용 로직
│  └─ types/          # 타입 정의
├─ shared/            # 공용 스키마/타입
├─ docs/              # 문서
├─ scripts/           # 보조 스크립트
├─ attached_assets/   # 참고 자산
└─ (기타 로컬/빌드 폴더: .next, node_modules, .tmp, .local 등)
```
