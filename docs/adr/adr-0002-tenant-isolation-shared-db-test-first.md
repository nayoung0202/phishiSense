# ADR-0002 Tenant Isolation Shared DB Test-First Migration

## 상태

승인

## 배경

PhishSense는 이미 세션과 플랫폼 entitlement 계층에서 tenant 개념을 사용하지만, 핵심 업무 데이터와 파일 저장 규칙은 tenant 기준으로 일관되게 분리되어 있지 않습니다.

이 상태에서 일부 테이블만 부분 보강하면 cross-tenant 참조 누수와 id 기반 상세 조회 누수를 남길 가능성이 큽니다. 동시에 현재 코드베이스는 tenant별 별도 앱/DB 라우팅을 전제로 설계되어 있지 않으므로, 지금 시점에 per-tenant 인프라 분리까지 함께 추진하면 복잡도가 과도하게 증가합니다.

## 결정

### 1. 아키텍처 방향

- 공유 애플리케이션 + 공유 DB 구조를 유지합니다.
- 업무 데이터는 tenant-owned 리소스로 재설계합니다.
- 세션, 플랫폼 entitlement, callback 이벤트 같은 플랫폼 메타데이터는 global로 유지합니다.

### 2. 신규 tenant 초기 상태

- tenant와 entitlement가 준비된 사용자는 업무 데이터가 없어도 제품에 정상 진입할 수 있어야 합니다.
- 신규 tenant는 빈 상태로 시작할 수 있습니다.
- 업무 데이터 provisioning 자동화와 제품 내 onboarding flow는 후속 범위로 분리합니다.

### 3. Public token 정책

- 공개 URL은 token-only 구조를 유지합니다.
- `training_link_token`, `tracking_token`은 전역 unique를 유지합니다.
- public route는 public 전용 storage/service helper를 사용해 문맥을 읽습니다.
- helper 내부에서 관련 row들의 tenant 일관성을 검증합니다.
- 불일치 또는 비정상 참조는 `404`로 처리합니다.

### 4. 파일 저장 정책

- tenant-owned 파일은 `tenants/{tenantId}/...` prefix를 사용합니다.
- 진짜 global 자산만 `global/...` 사용을 허용합니다.
- 보고서 템플릿, 보고서 산출물, 캡처 파일, 로고, 업로드 파일에 동일 규칙을 적용합니다.

### 5. 마이그레이션 방식

- tenant 격리 전환은 test-first 방식으로 진행합니다.
- 기존 테스트를 전면 폐기하지 않고 유지합니다.
- 현재 동작을 잠그는 회귀 테스트를 먼저 보강합니다.
- 그 다음 tenant A/B fixture와 cross-tenant 테스트를 추가합니다.
- 이후 storage 계층을 tenant-aware 경계로 바꾸고 도메인별로 순차 전환합니다.

## 결과

### 기대 효과

- per-tenant 인프라 분리 없이도 강한 논리적 격리를 확보할 수 있습니다.
- 나중에 DB-per-tenant 또는 별도 배포로 확장할 때 재작업 범위를 줄일 수 있습니다.
- 테스트 우선 전환으로 구조 변경 중 회귀를 조기에 감지할 수 있습니다.

### 수반 작업

- tenant-owned 테이블에 `tenant_id`와 관련 인덱스/관계를 추가합니다.
- storage/dao/API/worker 계층 전반에 tenant 컨텍스트를 강제합니다.
- id 기반 상세/다운로드/export/status 경로를 전수 검증합니다.
- 문서와 운영 절차를 단계별 구현에 맞춰 갱신합니다.
