# SMTP 관리 UI 개선 및 테넌트 자동 생성 계획

## 목표
- SMTP 관리 페이지에서 테넌트 ID 입력 과정을 제거하고 고객사명 기반 find-or-create 플로우를 도입한다.
- 백엔드에 tenantId 생성 규칙과 find-or-create API를 추가해 고객사명만으로 SMTP 설정을 저장할 수 있게 한다.

## 작업 항목
1. 서버 구조 분석 후 tenantId 생성 유틸, 임시 저장소(혹은 기존 storage 활용) 도입 방식 결정.
2. tenantId generator 및 서비스 로직 구현, find-or-create API/라우터 추가 후 기존 서버에 마운트.
3. 클라이언트 API 래퍼에 findOrCreateTenant 추가, localStorage 기반 tenantId 관리/부트스트랩 UI 컴포넌트 작성.
4. SMTP 페이지에서 테넌트 입력 UI 제거, customerName 입력 블럭/현재 테넌트 배지/자동 로딩 흐름 구현.
5. 신규 흐름 점검 및 타입 검사/빌드 확인.
