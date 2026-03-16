# PhishSense

PhishSense는 기업 내부 피싱 시뮬레이션 훈련을 운영하는 Next.js 기반 애플리케이션입니다.

## 기술 스택

- Next.js 15, React 18, TypeScript
- Tailwind CSS, Radix UI, TanStack Query
- PostgreSQL 16, Drizzle ORM
- Vitest, React Testing Library

## 디렉터리 요약

- `src/`: 애플리케이션 코드
- `shared/`: 공용 스키마와 타입
- `docs/`: 공식 기준 문서
- `plans/`: 로컬 작업 계획 메모
- `scripts/`: 보조 스크립트

## 개발 시작

```bash
cp .env.example .env
npm install
npm run db:push
npm run dev
```

실제 메일 발송 테스트가 필요하면 별도 터미널에서 `npm run worker:send`를 실행합니다.

## 문서

상세 문서는 `docs/README.md`를 먼저 확인합니다.
