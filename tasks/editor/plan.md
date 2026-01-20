# 에디터 전환 작업 계획

## 목표
- 템플릿 관리(메일본문/악성메일본문) 및 훈련 안내 페이지에서 form/input 태그 제한 없이 편집 가능한 에디터를 선정한다.
- 상업용 무료 조건을 만족하면서 현재 Next.js/React 구조에 가장 안정적으로 적용 가능한 에디터를 채택한다.

## 비교 요약
### Tiptap
- 특징: ProseMirror 기반, 확장성/커스터마이징 자유도 높음
- 장점: 노드/마크 확장으로 기능 세밀 제어 가능, TypeScript 친화적
- 단점: form/input 같은 특수 태그는 커스텀 노드/NodeView 구현이 필요해 초기 적용 부담 큼

### Lexical
- 특징: Meta(페이스북) 개발, 성능 지향, 노드 기반 에디터
- 장점: 경량/고성능, 구조적 편집에 강함
- 단점: HTML import/export 커스터마이징 필요, form/input 태그 허용을 위한 노드 정의와 플러그인 구성이 복잡함

### TinyMCE
- 특징: 전통적인 WYSIWYG, 기능 풍부, 플러그인 생태계 크고 안정적
- 장점: `extended_valid_elements` 등으로 태그 허용 제어 가능, HTML 모드 제공
- 단점: 자산 호스팅/라이선스/번들 크기 관리 부담, 초기 설정이 비교적 무거움

### SunEditor
- 특징: 가볍고 단순한 WYSIWYG, React 래퍼 제공
- 장점: 상업용 무료(MIT), 태그 허용 정책을 옵션으로 제어 가능, 현재 구조와 통합 용이
- 단점: 대형 에디터 대비 고급 편집 기능/플러그인 생태계는 제한적

## 최종 선택: SunEditor
### 근거
- 상업용 무료이며, form/input 태그를 옵션으로 보존할 수 있어 요구사항에 부합
- 현재 `RichHtmlEditor`처럼 HTML 문자열 기반 저장 구조와 잘 맞고, 적용 난이도/오류 가능성이 낮음
- Next.js App Router에서도 클라이언트 전용 컴포넌트 + 동적 로딩으로 안정 적용 가능

## 적용 방법(초안)
1. 패키지 설치
   - `suneditor` 및 React 래퍼(`suneditor-react`) 설치
2. 클라이언트 전용 컴포넌트 구성
   - `use client` 적용, App Router 환경에서 `dynamic(() => import(...), { ssr: false })` 활용
3. 허용 태그/속성 정책 연결
   - 에디터 측 허용 옵션에 `form`, `input`, `select`, `textarea`, `button` 포함
   - 기존 sanitizer(`shared/sanitizeConfig.ts`)는 그대로 유지(필요 시 허용 속성만 추가)
4. 이미지 업로드 연결
   - 기존 `/api/uploads/images` 엔드포인트를 에디터 업로드 훅에 연결
5. 적용 대상 화면 교체
   - 템플릿 관리(메일본문/악성메일본문), 훈련 안내 페이지 컴포넌트에 새 에디터 연결
6. 검증
   - form/input 포함 HTML이 저장/렌더링에 문제 없는지 확인
   - 서버/클라이언트 sanitizer 통과 여부 확인

## 리스크 및 대응
- 에디터 자체 필터링으로 태그 제거 가능성 → 허용 옵션 명시적으로 적용
- sanitizer 허용 속성 부족 가능성 → `shared/sanitizeConfig.ts`에 필요한 속성 추가

## 완료 기준
- form/input 포함 콘텐츠가 WYSIWYG에서 편집 가능하고 저장/렌더링이 정상 동작한다.
