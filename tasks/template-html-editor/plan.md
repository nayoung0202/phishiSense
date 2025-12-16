# 템플릿 편집 HTML 입력 모드 추가 계획

1. 템플릿 수정/생성 페이지 구조와 RichTextEditor 컴포넌트에서 HTML 모드를 지원할 수 있는 확장 포인트를 파악한다.
2. 에디터에 HTML 토글 버튼을 추가하고, 버튼 클릭 시 contentEditable 대신 textarea에서 원시 HTML을 편집할 수 있도록 상태 전환 로직을 설계한다.
3. Mail 본문과 악성 메일 본문에 공통으로 적용할 수 있도록 RichTextEditor를 개선하고 TemplateEdit 페이지에서 변경된 API를 반영한다.
4. 타입 검사를 수행하고 변경 사항을 정리한다.
