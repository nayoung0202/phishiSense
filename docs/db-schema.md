# DB 스키마 정리 (PostgreSQL + Drizzle)

## 범위
- 스키마 정의 위치: `shared/schema.ts`, `src/server/db/schema.ts`
- DB에는 전체 테이블이 생성됩니다.
- 현재 앱 로직에서 실제로 영속 저장을 사용하는 테이블은 `templates`, `smtp_accounts`입니다.
- 나머지 테이블(`projects`, `targets`, `training_pages`, `project_targets`, `users`)은 DB에 존재하지만 앱 동작은 메모리 스토리지를 따릅니다.

## 테이블 목록 요약
| 테이블 | 용도 |
| --- | --- |
| users | 사용자 계정(현재 미사용) |
| projects | 훈련 프로젝트 |
| templates | 피싱 메일 템플릿 |
| targets | 훈련 대상자 |
| training_pages | 교육 안내 페이지 |
| project_targets | 프로젝트-대상자 매핑 |
| smtp_accounts | 테넌트별 SMTP 설정 |

## 공통 참고
- `timestamp`는 타임존 없는 `timestamp` 입니다. 필요 시 `NOW()` 또는 ISO 문자열로 입력하세요.
- 배열 컬럼은 `ARRAY[...]` 문법으로 업데이트합니다. 예: `ARRAY['a','b']`.
- 스키마에 외래키 제약은 정의되어 있지 않습니다(관계 컬럼은 존재).

## 테이블 상세

### users
- 용도: 사용자 계정
- 기본 키: `id`
- 제약: `username` 유니크

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| id | varchar | N | `gen_random_uuid()` | 사용자 ID |
| username | text | N | - | 로그인 계정 |
| password | text | N | - | 비밀번호 해시 |

### projects
- 용도: 훈련 프로젝트
- 기본 키: `id`

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| id | varchar | N | `gen_random_uuid()` | 프로젝트 ID |
| name | text | N | - | 프로젝트명 |
| description | text | Y | - | 설명 |
| department | text | Y | - | 주관 부서 |
| department_tags | text[] | Y | - | 부서 태그 목록 |
| template_id | varchar | Y | - | 템플릿 ID |
| training_page_id | varchar | Y | - | 교육 페이지 ID |
| sending_domain | text | Y | - | 발송 도메인 |
| from_name | text | Y | - | 발신자 이름 |
| from_email | text | Y | - | 발신자 이메일 |
| timezone | text | Y | - | 타임존 |
| notification_emails | text[] | Y | - | 알림 수신 이메일 목록 |
| start_date | timestamp | N | - | 시작일 |
| end_date | timestamp | N | - | 종료일 |
| status | text | N | - | 예약/진행중/완료 |
| target_count | integer | Y | 0 | 대상자 수 |
| open_count | integer | Y | 0 | 오픈 수 |
| click_count | integer | Y | 0 | 클릭 수 |
| submit_count | integer | Y | 0 | 제출 수 |
| fiscal_year | integer | Y | - | 회계연도 |
| fiscal_quarter | integer | Y | - | 회계 분기 |
| week_of_year | integer[] | Y | - | 포함 주차(ISO week) |
| created_at | timestamp | Y | `now()` | 생성일 |

### templates
- 용도: 피싱 메일 템플릿
- 기본 키: `id`

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| id | varchar | N | `gen_random_uuid()` | 템플릿 ID |
| name | text | N | - | 템플릿 이름 |
| subject | text | N | - | 메일 제목 |
| body | text | N | - | 메일 본문(HTML) |
| malicious_page_content | text | N | - | 악성 페이지 본문(HTML) |
| created_at | timestamp | Y | `now()` | 생성일 |
| updated_at | timestamp | Y | `now()` | 수정일 |

### targets
- 용도: 훈련 대상자
- 기본 키: `id`
- 제약: `email` 유니크

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| id | varchar | N | `gen_random_uuid()` | 대상자 ID |
| name | text | N | - | 이름 |
| email | text | N | - | 이메일 |
| department | text | Y | - | 부서 |
| tags | text[] | Y | - | 태그 |
| status | text | Y | `active` | 상태(active/inactive) |
| created_at | timestamp | Y | `now()` | 생성일 |

### training_pages
- 용도: 교육 안내 페이지
- 기본 키: `id`

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| id | varchar | N | `gen_random_uuid()` | 페이지 ID |
| name | text | N | - | 페이지 이름 |
| description | text | Y | - | 설명 |
| content | text | N | - | HTML 콘텐츠 |
| status | text | Y | `active` | 상태(active/inactive) |
| created_at | timestamp | Y | `now()` | 생성일 |
| updated_at | timestamp | Y | `now()` | 수정일 |

### project_targets
- 용도: 프로젝트-대상자 매핑 및 상태
- 기본 키: `id`

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| id | varchar | N | `gen_random_uuid()` | 매핑 ID |
| project_id | varchar | N | - | 프로젝트 ID |
| target_id | varchar | N | - | 대상자 ID |
| status | text | Y | `sent` | 상태(sent/opened/clicked/submitted/no_response) |
| opened_at | timestamp | Y | - | 오픈 시각 |
| clicked_at | timestamp | Y | - | 클릭 시각 |
| submitted_at | timestamp | Y | - | 제출 시각 |

### smtp_accounts
- 용도: 테넌트별 SMTP 설정
- 기본 키: `id` (테넌트 ID)

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| id | text | N | - | 테넌트 ID |
| name | text | N | - | 표시 이름(현재 tenantId와 동일) |
| host | text | N | - | SMTP 호스트 |
| port | integer | N | - | SMTP 포트 |
| secure | boolean | N | false | SMTPS 여부(465) |
| security_mode | text | N | - | SMTPS/STARTTLS/NONE |
| username | text | Y | - | 사용자명 |
| password_enc | text | N | - | 암호화된 비밀번호(AES-256-GCM) |
| from_email | text | Y | - | 발신 이메일 |
| from_name | text | Y | - | 발신자 이름 |
| reply_to | text | Y | - | 회신 이메일 |
| tls_verify | boolean | N | true | TLS 검증 여부 |
| rate_limit_per_min | integer | N | 60 | 분당 제한 |
| allowed_domains_json | text | Y | - | 허용 도메인 배열(JSON 문자열) |
| is_active | boolean | N | true | 활성 여부 |
| last_tested_at | timestamp | Y | - | 마지막 테스트 시각 |
| last_test_status | text | Y | - | success/failure |
| last_test_error | text | Y | - | 마지막 테스트 오류 |
| created_at | timestamp | Y | `now()` | 생성일 |
| updated_at | timestamp | Y | `now()` | 수정일 |

## 상태/열거값 정리
- projects.status: `예약`, `진행중`, `완료`
- targets.status: `active`, `inactive`
- training_pages.status: `active`, `inactive`
- project_targets.status: `sent`, `opened`, `clicked`, `submitted`, `no_response`
- smtp_accounts.security_mode: `SMTPS`, `STARTTLS`, `NONE`
- smtp_accounts.last_test_status: `success`, `failure`

## 조회/수정 예시 SQL

```sql
-- 템플릿 목록 조회
SELECT id, name, subject, updated_at
FROM templates
ORDER BY updated_at DESC;

-- 템플릿 제목 수정
UPDATE templates
SET subject = '[긴급] 주소 확인 필요', updated_at = NOW()
WHERE id = 'tmpl-shipping-alert';

-- SMTP 설정 목록 조회
SELECT id, host, port, security_mode, is_active, updated_at
FROM smtp_accounts
ORDER BY updated_at DESC;

-- SMTP 허용 도메인 수정(JSON 문자열로 저장)
UPDATE smtp_accounts
SET allowed_domains_json = '["example.com", "corp.co.kr"]', updated_at = NOW()
WHERE id = 'tenant-001';

-- 프로젝트 상태 변경
UPDATE projects
SET status = '완료'
WHERE id = 'project-123';

-- 프로젝트 대상 매핑 + 대상자 정보 조회
SELECT pt.id, pt.status, t.name, t.email
FROM project_targets AS pt
JOIN targets AS t ON t.id = pt.target_id
WHERE pt.project_id = 'project-123';

-- 배열 컬럼 업데이트 예시
UPDATE projects
SET department_tags = ARRAY['인사부', '신입교육']
WHERE id = 'project-123';
```

## 주의사항
- `smtp_accounts.password_enc`는 암호화 문자열이므로 수동 수정 시 복호화 실패가 발생합니다. 변경이 필요하면 앱 UI 또는 `scripts/rotate-smtp-secret.mjs`를 사용하세요.
- 배열 컬럼은 `ARRAY[...]`로 입력해야 하며, 빈 배열은 `ARRAY[]::text[]` 같은 명시적 캐스팅이 필요할 수 있습니다.
