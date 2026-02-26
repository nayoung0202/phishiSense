# PhishSense 시스템 아키텍처 및 현황 오버뷰

본 문서는 PhishSense 프로젝트의 전반적인 기술 아키텍처, 코드베이스 구조 및 주요 데이터의 흐름을 설명합니다.

## 1. 시스템 목적 및 스택

- **시스템 목적**: 기업 내 임직원을 대상으로 하는 악성메일 모의훈련(피싱 시뮬레이션) 관리 콘솔 운영.
- **핵심 모듈**: 훈련 프로젝트 관리, 타겟(대상자) 리스트업, 피싱 템플릿 제작, 훈련 스케줄링 프로세스 워커, OIDC 인증 관리.
- **기술 스택**:
  - **Front-end**: Next.js 15 (App Router), React 18, Tailwind CSS, Radix UI (shadcn), Wouter, TanStack Query.
  - **Back-end**: Node.js (Express 호환 로직 내장 API 라우트), Drizzle ORM.
  - **Database**: PostgreSQL 16 (로컬/Neon).
  - **기타**: Nodemailer (SMTP 통신), Sanitize-html (XSS 방어).

## 2. 애플리케이션 요청 및 데이터 흐름

```text
[ 사용자 브라우저 (UI) ]
       │
       ▼ (1) UI 화면 인터랙션 (src/app, src/features)
       │
       ▼ (2) API 호출 (src/lib/api + React Query)
       │
       ▼ (3) Next.js 서버리스 API 라우트 (src/app/api/**)
       │
       ▼ (4) 서버 도메인 로직 처리 (src/server/services, src/server/dao)
       │
       ▼ (5) 영구 저장소 (PostgreSQL) / SMTP 통신 대기열
```

## 3. 핵심 디렉터리 아키텍처 (`src/` 내부)

코드베이스는 역할과 책임(Separation of Concerns)에 따라 명확히 분리됩니다.

### 3.1 라우팅 및 페이지 뷰 (`src/app/`)

Next.js의 App Router 패턴을 따르며, UI 페이지와 데이터 패칭을 위한 API 라우트를 통합 관리합니다.

- `projects/`, `templates/`, `targets/` 등의 관리자 패널 라우트.
- `p/[token]/`, `t/[token]/` 등의 훈련 피대상자용 공개 라우트.
- `api/` 경로 하단에는 각 리소스에 대응되는 서버사이드 REST API 엔드포인트가 위치합니다.

### 3.2 도메인 특화 기능 컴포넌트 (`src/features/`)

개별 라우트(페이지) 단위에 종속적인 비즈니스 로직과 화면 구성 요소입니다.

- Dashboard, Projects, Templates 등 도메인이 명확한 복합 컴포넌트들이 위치합니다.

### 3.3 공통 UI 프리미티브 (`src/components/`)

앱 전반에서 재사용되는 덤보(Dumb) 컴포넌트 단위입니다.

- `ui/`: 버튼, 모달, 폼 요소 등 순수 UI 엘리먼트 (Radix 기반).
- `admin/`: 관리자 페이지에서 범용적으로 사용되는 특화 레이아웃.

### 3.4 서버 및 비즈니스 로직 (`src/server/`)

프론트엔드와 분리된, 순수 백엔드 데이터 처리 로직의 집합체입니다.

- `dao/`: 데이터베이스 쿼리를 직접적으로 수행하는 Data Access Object 계층 (Drizzle ORM 활용).
- `services/`: API 라우트에서 호출되어, 비즈니스 룰을 검증하고 조율하는 도메인 서비스 계층.
- `seed/` & `data/`: 초기 데이터베이스 시딩 스크립트 및 참조 데이터.
- `lib/` & `utils/`: SMTP 발송 엔진, 링크 토큰 발급, 데이터 암호화 등의 공용 헬퍼 유틸리티.

### 3.5 공용 데이터 모델 (`shared/`)

프론트-백 간의 데이터 정합성을 강제하는 코어 모델이 위치합니다.

- `schema.ts`: DB 테이블 모델링 명세(Drizzle) 및 사용자 입력 검증을 위한 Zod 스키마로 구성. 추론된 타입 명세가 전체 앱에 공유됩니다.

## 4. 지속적인 아키텍처 개선 현황

1. **상태 관리 및 데이터 캐싱 로직**:
   React Query를 도입해 클라이언트 캐싱을 진행하고 있으며, 백엔드 API와의 통신을 표준화(`/api/...`)하였습니다. 이 과정에서 초기 개발에서 사용되던 인메모리 `MemStorage` 인프라를 전면적으로 Drizzle + PostgreSQL 기반으로 상용화 전환했습니다.
2. **복합 뷰 (캘린더/타임라인) 고도화**:
   프로젝트 목록 뷰에서 리스트/보드/캘린더의 시각적 전환이 가능하도록 확장되었으며, 거대한 타임라인 데이터로 인한 렌더링 성능 저하를 방어하기 위해 가상 스크롤(Virtual Scroll) 렌더링을 적용했습니다.
3. **인증 / 권한 분리**:
   과거 목업 테스트 기반에서 벗어나 EVRIZ OIDC를 통합 연동하여 전면 페이지를 보호하고 있으며, 세션 유지에 기반한 보안 정책을 완전히 셋업해 두었습니다.
