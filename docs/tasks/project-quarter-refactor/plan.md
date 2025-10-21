# 프로젝트 분기 기반 관리 1단계 작업 계획

## 목표
- 프로젝트 데이터 모델에 회계 연도/분기/주차 필드를 도입해 일정 변화 시 자동 계산되도록 정비한다.
- 서버 측 프로젝트 CRUD 로직을 업데이트하고 신규 필드 저장/재계산을 보장한다.
- 목록/분기 KPI/캘린더/일정 PATCH를 위해 필요한 API 골격을 마련한다.
- 후속 단계가 활용할 수 있도록 기본 시드 데이터를 2025년 분기 단위로 보강한다.

## 세부 작업
1. `shared/schema.ts`에 `fiscalYear`, `fiscalQuarter`, `weekOfYear` 필드 추가 및 Insert 스키마 정리
2. `server/storage.ts`에서 날짜 파싱·주차 계산 헬퍼 구성, create/update/copy 로직 재작성, 시드 데이터 갱신
3. `server/routes.ts`에 검색 필터가 적용된 `/api/projects` 목록 개선과 `quarter-stats`, `calendar`, PATCH 보강
4. (검증) `npm run check` 및 기본 API 테스트 실행, 필요한 경우 추가 샘플 데이터 점검

## 범위 외 (추후 단계)
- 프런트엔드 UI 개편(리스트/보드/캘린더/타임라인)
- 드래그/리사이즈 인터랙션 & 사이드패널
- KPI·뷰 상태 보존 등 UX 확장

