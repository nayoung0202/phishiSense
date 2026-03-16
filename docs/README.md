# PhishSense 문서 인덱스

`docs/`는 이 저장소의 공식 기준 문서(SSOT)입니다. 구현, 운영, 정책, 릴리즈 기준은 항상 이 디렉터리의 문서를 우선합니다.

## 운영 원칙

- `docs/`는 확정된 기준만 기록합니다.
- `plans/`는 로컬 작업 메모이며 공식 기준이 아닙니다.
- `outputs/`는 파일 산출물이 꼭 필요할 때만 사용합니다.
- 세부 구현보다 현재 제품 운영과 다음 작업에 필요한 기준을 우선 남깁니다.

## 문서 지도

| 경로 | 목적 | 대표 문서 |
| --- | --- | --- |
| `docs/product/` | 제품 목적, 사용자 흐름, 범위 | `product-overview.md` |
| `docs/requirements/` | 현재 기능 범위와 요구사항 | `current-scope.md` |
| `docs/architecture/` | 시스템 구조와 데이터 모델 | `system-overview.md`, `database-schema.md` |
| `docs/api/` | 제품 API와 외부 플랫폼 연동 계약 | `application-api-overview.md`, `platform-integration.md` |
| `docs/policy/` | 인증, 보안, 접근 정책 | `authentication.md`, `security-guidelines.md` |
| `docs/ops/` | 개발·운영 실행 절차 | `runbook.md` |
| `docs/adr/` | 중요한 구조적 결정 기록 | `adr-0001-docs-ssot-and-artifact-governance.md` |

## 문서 갱신 기준

아래 변경이 생기면 관련 `docs/` 문서 업데이트를 반드시 검토합니다.

- 기능 범위 변경
- 사용자 화면 흐름 변경
- API 경로 또는 계약 변경
- DB 스키마 변경
- 인증 또는 권한 모델 변경
- 보안 정책 변경
- 배포 및 운영 방식 변경

## 작성 기준

- 파일명은 소문자와 하이픈을 사용합니다.
- 일회성 핸드오프 문서, 조사 로그, 임시 메모는 `docs/`에 두지 않습니다.
- 구현 사실과 문서가 충돌하면 문서를 먼저 갱신하거나 구현을 바로잡습니다.
