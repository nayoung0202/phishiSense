# Next.js App Router 마이그레이션 계획

## 목표
- 기존 Vite React + Express 서버를 Next.js App Router 기반 단일 리포 구조로 이전
- UI/디자인, 기능, URL, API 스펙 100% 동일 유지

## 주요 단계
1. **현황 파악**: 기존 client/server/shared 구조, 라우팅, API 스펙, 상태 관리 확인
2. **Next.js 골격 구성**: `app/`, `pages/api` 혹은 `app/api` 구조 설정, 기존 빌드 스크립트 대체, 환경설정(tsconfig, eslint 등) 정리
3. **클라이언트 마이그레이션**: Vite 엔트리(`client/src/main.tsx`)와 Routes를 Next의 `app` 구조로 변환, Tailwind/글로벌 스타일 이식
4. **API 마이그레이션**: Express 라우트를 Next의 Route Handler로 이전, `shared` 타입 재사용, 스토리지 의존성 주입 유지
5. **통합 및 동작 검증**: 기존 npm 스크립트 대체, 타입 검사 및 필요한 테스트 업데이트, 로컬 smoke test
6. **불변성 검증**: URL/디자인/기능/API가 동일하게 동작하는지 체크리스트 작성

## 산출물
- Next.js App Router 기반 프로젝트 구조
- 기존 기능과 1:1 대응하는 페이지 및 API 핸들러
- 업데이트된 빌드/런/체크 스크립트와 문서

## 주의사항
- 기존 UI/기능/URL/API 변경 금지
- 한국어 커뮤니케이션 유지
- 변경사항 단일 커밋으로 정리 예정
