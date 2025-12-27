# React XSS 가이드라인

- 템플릿/훈련 안내/HTML 작성 페이지를 제외한 모든 화면에서는 `dangerouslySetInnerHTML` 사용을 금지합니다. 새 마크업이 필요하면 `SafeText` 컴포넌트를 사용하거나 React JSX 텍스트 렌더링으로 출력하세요.
- URL 값은 사용자 입력일 수 있으므로 `toSafeHttpUrl`을 통과시킨 뒤 렌더링합니다. 허용되지 않은 스킴은 `#` 등 중립 경로로 대체합니다.
- React 텍스트 출력은 기본적으로 escaping 되므로, 문자열은 `<>{value}</>` 형태로 렌더링하고 필요 시 `SafeText`를 활용해 길이 제한/폴백을 제공합니다.
- 템플릿·훈련 안내 등 HTML 작성 페이지는 후속 작업에서 DOMPurify 기반 sanitize를 적용할 예정입니다. 그 외 위치에는 HTML을 직접 삽입하지 마세요.
