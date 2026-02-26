# npm audit fix --force 실행 로그 (2026-02-20)

## 0) 사전 스냅샷

### 브랜치
```bash
git branch --show-current
```
```text
feature/login-integration
```

### 워킹트리 상태
```bash
git status --short
```
```text
 M package-lock.json
 M package.json
?? docs/security/
?? plans/2026-02-20-audit-force-validation/
```

### package 변경 diff 파일
- `plans/2026-02-20-audit-force-validation/baseline-package-diff.patch`

### 의존성 버전(사전)
```bash
npm ls vitest vite vite-node esbuild minimatch exceljs drizzle-kit --depth=3
```
```text
rest-express@1.0.0 /Users/seonghyeon/workspace/01_companies/evriz_202503/projects/phishsense/app
├─┬ drizzle-kit@0.31.9
│ ├─┬ @esbuild-kit/esm-loader@2.6.5
│ │ └─┬ @esbuild-kit/core-utils@3.3.2
│ │   └── esbuild@0.18.20
│ ├─┬ esbuild-register@3.6.0
│ │ └── esbuild@0.25.12 deduped
│ └── esbuild@0.25.12
├─┬ exceljs@4.4.0
│ └─┬ archiver@5.3.2
│   └─┬ readdir-glob@1.1.3
│     └── minimatch@5.1.6
├─┬ tsx@4.21.0
│ └── esbuild@0.27.3
└─┬ vitest@1.6.1
  ├─┬ vite-node@1.6.1
  │ └── vite@5.4.21 deduped
  └─┬ vite@5.4.21
    └── esbuild@0.21.5
```

## 1) `npm audit fix --force` 실행

### 1차 실행(권한 상승 없이)
```bash
npm audit fix --force
```
```text
실패: getaddrinfo ENOTFOUND registry.npmjs.org
```

### 2차 실행(권한 상승)
```bash
npm audit fix --force
```
```text
성공: vitest 4.0.18 / drizzle-kit 0.18.1 / exceljs 4.1.1 변경
```

## 2) 의존성 변경 요약 (before -> after)

- `vitest`: `1.6.1` -> `4.0.18`
- `vite`: `5.4.21` -> `6.4.1` (vitest 전이)
- `drizzle-kit`: `0.31.9` -> `0.18.1`
- `exceljs`: `4.4.0` -> `4.1.1`

## 3) 검증 실행

### check
```bash
npm run check
```
```text
최종 결과: 통과
```

### test
```bash
npm run test -- --run
```
```text
초기 실패 원인:
- vitest 4 hoisting 규칙 변화로 vi.mock 사용 테스트 실패
- JSX 런타임 차이로 React 미정의 오류(일부 컴포넌트)

호환성 패치 후 최종 결과: 통과 (11 files, 23 tests)
```

### build
```bash
npm run build
```
```text
최종 결과: 통과
주의: Next.js가 상위 lockfile(/Users/seonghyeon/package-lock.json) 감지 경고 출력
```

## 4) 실패 원인 분류 및 대응

| 분류 | 증상 | 원인 | 대응 |
| --- | --- | --- | --- |
| 타입 체크 | `defineConfig` export 오류 | `drizzle-kit` 하향으로 API 불일치 | `drizzle.config.ts`를 `default export object` 형태로 변경 |
| 타입 체크 | `JsonWebKey` 타입 불일치 | Node 타입 해석 차이 | `node:crypto`의 `JsonWebKey` 타입으로 명시 |
| 테스트 | `vi.mock` hoisting 오류 | vitest 4 hoist 규칙 강화 | 실패 테스트를 `vi.hoisted` 패턴으로 전환 |
| 테스트 | `React is not defined` | 테스트 변환 경로에서 JSX runtime 차이 | 관련 TSX 컴포넌트에 React import 추가 |
| 테스트 | MSW unhandled request | 로딩 케이스 핸들러 부재 | 핸들러 추가 및 경로 매칭 보강 |

## 5) 최종 audit 결과
```bash
npm audit
```
```text
잔여 취약점: 9개 (moderate 1, high 8)
핵심 경로: drizzle-kit 0.18.1 하위의 esbuild/minimatch/glob 체인
해결 방향: drizzle-kit을 다시 0.31.9 이상으로 상향 시 잔여 항목 축소 가능
```

## 6) 판정
- `check + test + build`는 통과함.
- 다만 `npm audit` 관점에서는 `drizzle-kit` 하향으로 잔여 취약점이 남음.
- 권고: 현재 상태를 즉시 반영하지 말고, `drizzle-kit`을 최신 안정 버전(기존 0.31.9 계열)으로 복구한 뒤 audit 재평가.

### 운영 의존성 기준(`--omit=dev`) 확인
```bash
npm audit --omit=dev
```
```text
잔여 취약점: high 7
주요 원인: exceljs -> archiver -> glob -> minimatch 체인
```
