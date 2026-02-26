# PhishiSense

PhishiSense 프로젝트 소스 및 도큐먼트 저장소입니다.  
본 프로젝트는 **Next.js** 기반의 프론트엔드/백엔드 통합 애플리케이션으로 구성되어 있으며, 데이터베이스로 **PostgreSQL**을, ORM으로 **Drizzle ORM**을 사용합니다.

---

## 🏗 프로젝트 구조

```text
.
├── src/           # 메인 소스코드 (프론트/백엔드 로직, UI 컴포넌트, 워커 등)
├── docs/          # 설계 문서 (아키텍처, 스키마, 가이드, 인증 설정 등)
├── plans/         # 과거 태스크 로그 및 계획 내역 (Git 버전 관리 제외)
├── compose.yml    # 로컬 PostgreSQL 구동용 Docker Compose 설정 파일
├── package.json   # 프로젝트 의존성 및 스크립트 정의
└── CHANGELOG.md   # 주요 업데이트 및 변경 내역 (자동 정리됨)
```

---

## 🛠️ 주요 기술 스택

- **Framework**: Next.js 15 (App Router 기반)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **UI Components**: Radix UI (shadcn/ui 기반 커스텀 컴포넌트)
- **Database / ORM**: PostgreSQL 16, Drizzle ORM
- **Testing**: Vitest, React Testing Library

---

## 🚀 로컬 개발 셋업 및 구동 방법

로컬에서 프로젝트를 처음 구동하기 위한 가이드입니다.

### 1️⃣ 필수 권장 환경

- **Node.js**: v20 이상
- **Docker** & **Docker Compose**: DB 실행을 위해 필요

### 2️⃣ 환경 변수 설정

프로젝트 루트 경로에서 `.env.example` 파일을 복사하여 `.env` 파일을 생성하고, 내부의 값들을 개발 환경에 맞게 입력/수정합니다.

```bash
cp .env.example .env
```

### 3️⃣ 의존성(패키지) 설치

npm 모듈을 설치합니다.

```bash
npm install
```

### 4️⃣ 데이터베이스 구동

Docker Compose를 사용하여 PostgreSQL 컨테이너를 실행합니다.

```bash
# Docker 볼륨 생성 (최초 1회 필요 시)
docker volume create phishsense_pgdata

# 백그라운드로 DB 컨테이너 실행
docker compose up -d
```

### 5️⃣ 데이터베이스 스키마 푸시

Drizzle ORM을 이용해 `.env`에 등록된 DB로 스키마를 동기화합니다.

```bash
npm run db:push
```

(선택) DB 내부 데이터를 웹 스튜디오로 열어보고 싶다면 아래 명령어를 사용합니다.

```bash
npm run db:studio
```

### 6️⃣ 애플리케이션 실행

개발 서버를 실행합니다. (기본 포트: 3000)

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속하여 정상적으로 구동되는지 확인합니다.

### 7️⃣ 모의 해킹(비동기) 발송 워커 실행 (선택)

메일 발송 작업을 처리하기 위해서는 백그라운드 발송 워커 프로그램이 별도로 실행되어야 합니다. 터미널의 다른 탭을 열고 아래 명령어를 실행해 주세요.

```bash
npm run worker:send
```

---

## 💡 개발 시 참고 사항 (문서)

새로운 팀원이나 기능 추가에 대한 상세한 가이드는 `docs/` 내의 문서를 참고하세요.

- **설계 가이드라인**: `docs/design_guidelines.md`
- **DB 스키마 구성**: `docs/db-schema.md`
- **인증 연동 가이드**: `docs/auth/evriz-oidc-integration.md` 등

---
