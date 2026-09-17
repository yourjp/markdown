# Markdown App 개발 및 트러블슈팅 종합 가이드 (GUIDE.md)

이 문서는 개발 과정에서 발생했던 모든 주요 오류 사례와 그 원인, 해결 방법 및 아키텍처 규칙을 총망라한 개발자용 가이드 문서입니다. 신규 기능 개발 및 배포 시 동일한 문제가 재발하지 않도록 본 문서를 참고하시기 바랍니다.

---

## 📌 목차 (Table of Contents)

1. [Vite & ES Module 설정 오류](#1-vite--es-module-설정-오류)
2. [Vercel `vite: command not found` (Exit Code 127) 오류](#2-vercel-vite-command-not-found-exit-code-127-오류)
3. [Vercel 대시보드 Build Command 수동 오버라이드 충돌](#3-vercel-대시보드-build-command-수동-오버라이드-충돌)
4. [Vercel `Could not read package.json: ENOENT` (Exit Code 254) 오류](#4-vercel-could-not-read-packagejson-enoent-exit-code-254-오류)
5. [Vercel `gh-pages` 브랜치 빌드 실패 문제](#5-vercel-gh-pages-브랜치-빌드-실패-문제)
6. [TypeScript 엄격 타입 검사 오류 (`ToolbarProps.onPrint`)](#6-typescript-엄격-타입-검사-오류-toolbarpropsonprint)
7. [Vercel 프로덕션 환경 인쇄 1페이지 자름(Clipping) 현상](#7-vercel-프로덕션-환경-인쇄-1페이지-자름clipping-현상)
8. [인쇄(Print) 모드 표(Table) 셀 세로 붕괴 현상](#8-인쇄print-모드-표table-셀-세로-붕괴-현상)
9. [Docker 로컬 개발 서버(3000 포트) 충돌 문제](#9-docker-로컬-개발-서버3000-포트-충돌-문제)
10. [Docker 이미지 현행화 시 버전 관리 규칙](#10-docker-이미지-현행화-시-버전-관리-규칙)
11. [v1.9.0 신규 기능 명세 (다중 탭, 이미지 붙여넣기, 서식 복사)](#11-v190-신규-기능-명세-다중-탭-이미지-붙여넣기-서식-복사)
12. [Windows CRLF (`\r\n`) 줄바꿈 호환성 및 목차 파싱 오류 해결](#12-windows-crlf-rn-줄바꿈-호환성-및-목차-파싱-오류-해결)

---

## 1. Vite & ES Module 설정 오류

### 🚨 오류 증상
```text
(!) Your Vite config uses features that are unsupported by configLoader: 'native':
  - ESM syntax in a file loaded as CommonJS (vite.config.ts:1:1). Use a .mjs extension or set "type": "module" in the closest package.json
```

### 🔍 원인
`package.json`에 `"type": "commonjs"`가 지정되어 있으나 `vite.config.ts`에서 ES Module(`import/export`) 문법을 사용하여 Vite 로더 경고가 발생함.

### 💡 해결 방법
1. `package.json`의 `"type"`을 `"module"`로 설정.
2. `postcss.config.js` 및 `tailwind.config.js` 파일의 내보내기 문법을 `module.exports`에서 `export default`로 전환.

---

## 2. Vercel `vite: command not found` (Exit Code 127) 오류

### 🚨 오류 증상
```text
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

### 🔍 원인
Vercel 클라우드 프로덕션 빌드 시 `NODE_ENV=production` 환경 영향으로 `devDependencies` 패키지 설치가 누락되거나 글로벌 PATH에 `vite` 바이너리가 존재하지 않아서 빌드 실패.

### 💡 해결 방법
1. `package.json`에서 빌드 필수 패키지(`vite`, `typescript`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`)를 `dependencies` 항목으로 이동.
2. `scripts`의 `build` 명령을 `npx tsc && npx vite build`로 작성하여 `npx` 바이너리 실행 보장.

---

## 3. Vercel 대시보드 Build Command 수동 오버라이드 충돌

### 🚨 오류 증상
`package.json` 수정 후에도 Vercel이 `npm run build` 대신 계속 `vite build`를 직접 실행하여 127 에러 재발.

### 🔍 원인
Vercel 대시보드(Project Settings -> General)에서 Build Command가 `vite build`로 수동 오버라이드(Override) 입력되어 소스 코드 설정을 덮어씀.

### 💡 해결 방법
1. 프로젝트 루트에 `vercel.json` 생성:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite"
   }
   ```
2. Vercel 웹 대시보드 ➔ **Settings** ➔ **General** ➔ **Build & Development Settings**에서 Build Command의 **Override 스위치 OFF** (또는 `npm run build` 입력).

---

## 4. Vercel `Could not read package.json: ENOENT` (Exit Code 254) 오류

### 🚨 오류 증상
```text
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/vercel/path0/package.json'
Error: Command "npm run build" exited with 254
```

### 🔍 원인
Vercel Project Settings의 **Root Directory** 경로 옵션에 존재하지 않거나 잘못된 서브폴더 텍스트가 지정되어 탐색 실패.

### 💡 해결 방법
Vercel 대시보드 ➔ **Settings** ➔ **General** ➔ **Root Directory** 항목을 비워두거나 `./`로 초기화.

---

## 5. Vercel `gh-pages` 브랜치 빌드 실패 문제

### 🚨 오류 증상
`gh-pages` 브랜치에 푸시할 때마다 Vercel에서 `Error` 빌드 실패 로그 생성.

### 🔍 원인
`gh-pages` 브랜치에는 빌드된 정적 파일(`dist/`)만 업로드되므로 원본 소스 코드 및 `package.json`, `vercel.json`이 존재하지 않아 프리뷰 빌드 실패.

### 💡 해결 방법
1. `vercel.json`에 `ignoreCommand` 지정:
   ```json
   {
     "ignoreCommand": "if [ \"$VERCEL_GIT_COMMIT_REF\" = \"gh-pages\" ]; then exit 0; else exit 1; fi"
   }
   ```
2. Vercel 전용 배포 환경인 경우 원격 `gh-pages` 브랜치 완전 삭제: `git push origin --delete gh-pages`

---

## 6. TypeScript 엄격 타입 검사 오류 (`ToolbarProps.onPrint`)

### 🚨 오류 증상
```text
src/App.tsx: error TS2741: Property 'onPrint' is missing in type ... but required in type 'ToolbarProps'.
```

### 🔍 원인
`ToolbarProps` 인터페이스에서 `onPrint: () => void;`가 필수 프로퍼티로 정의되어 있어 부모 컴포넌트 전달 시 타입 미일치 오류 발생.

### 💡 해결 방법
`ToolbarProps` 인터페이스의 속성을 선택적 프로퍼티(`onPrint?: () => void;`)로 변경하여 타입 안전성 확보.

---

## 7. Vercel 프로덕션 환경 인쇄 1페이지 자름(Clipping) 현상

### 🚨 오류 증상
로컬 개발 서버에서는 다중 페이지 인쇄가 정상 동작하나, Vercel 프로덕션 빌드본 인쇄 시 1페이지만 출력되고 뒷부분 내용이 전부 잘림.

### 🔍 원인
Vite 프로덕션 CSS 번들링 과정에서 부모/자식 컨테이너의 `h-full` (`height: 100%`), `min-h-screen` (`100vh`), `overflow-y-auto` (`overflow-y: auto`) 속성이 Chromium 인쇄 엔진에서 뷰포트 스크롤 박스로 처리되어 Page 1 높이로 강제 고정됨.

### 💡 해결 방법
1. `#markdown-print-area` 인쇄 컨테이너에서 `min-h-screen` 클래스 제거.
2. `src/index.css`의 `@media print` 규칙 내에서 인쇄 구역 및 하위 모든 자식 엘리먼트에 높이/스크롤 해제 강제:
   ```css
   @media print {
     html, body, #root {
       height: auto !important;
       min-height: 0 !important;
       max-height: none !important;
       overflow: visible !important;
     }

     #markdown-print-area,
     #markdown-print-area * {
       height: auto !important;
       min-height: 0 !important;
       max-height: none !important;
       overflow: visible !important;
     }
   }
   ```

---

## 8. 인쇄(Print) 모드 표(Table) 셀 세로 붕괴 현상

### 🚨 오류 증상
인쇄 프리뷰에서 마크다운 표(`<table>`)의 열(Column)들이 한 줄씩 수직으로 세로 배치되며 모양이 무너짐.

### 🔍 원인
`#markdown-print-area * { display: block; }` 규칙으로 인해 `<table>`, `<tr>`, `<th>`, `<td>` 요소까지 전부 블록 요소로 변환되어 표 형태가 파괴됨.

### 💡 해결 방법
`src/index.css`의 `@media print` 내 표 전용 `display` 규칙 명시:
```css
#markdown-print-area table { display: table !important; width: 100% !important; border-collapse: collapse !important; }
#markdown-print-area thead { display: table-header-group !important; }
#markdown-print-area tbody { display: table-row-group !important; }
#markdown-print-area tr { display: table-row !important; }
#markdown-print-area th, #markdown-print-area td { display: table-cell !important; }
```

---

## 9. Docker 로컬 개발 서버(3000 포트) 충돌 문제

### 🚨 오류 증상
Docker 컨테이너 실행 시 로컬 `npm run dev` (3000 포트)와 충돌 발생.

### 💡 해결 방법
`compose.yaml` 및 `Dockerfile` 설정에서 외부 포트를 **`3333`**으로 변경 (`3333:80` 매핑).  
접속 주소: `http://localhost:3333`

---

## 10. Docker 이미지 현행화 시 버전 관리 규칙

### 📌 지침
코드 변경이나 신규 기능 구현 없이 단순 Docker 이미지 재구성(Rebuild) 및 컨테이너 갱신/현행화만 수행하는 경우 **`package.json` 및 `Toolbar.tsx` 버전 번호를 올리지 않고 현재 버전을 그대로 유지**합니다.

---

## 11. v1.9.0 신규 기능 명세 (다중 탭, 이미지 붙여넣기, 서식 복사)

### 1) 다중 탭 (Multi-Tab) 문서 관리
- 상단 `TabBar` 컴포넌트를 통해 여러 마크다운 문서를 동시에 탭으로 띄워두고 작업 가능.
- 탭 클릭으로 전환, `+` 버튼 또는 `Ctrl + Alt + N`으로 새 문서 탭 생성, `X` 버튼 또는 `Ctrl + Alt + W`로 탭 닫기.
- `Ctrl + Tab` 및 `Ctrl + Shift + Tab`으로 이전/다음 탭 순환 이동.
- 열려있는 모든 탭과 활성 탭 상태가 `localStorage`에 자동 보관되어 재접속 시 완벽 복원.

### 2) 클립보드 이미지 붙여넣기 (`Ctrl + V`)
- 화면 캡처 후 본문 어디서든 `Ctrl + V` 실행 시 클립보드의 이미지 데이터를 감지하여 `data:image/png;base64,...` 포맷으로 자동 변환 후 `![첨부 이미지](base64...)` 마크다운 태그로 본문에 즉시 삽입.

### 3) 서식 복사 (Rich HTML Clipboard Copy)
- 툴바의 **서식 복사 버튼** 또는 **`Ctrl + Shift + C`** 클릭 시 렌더링된 마크다운 결과물을 표준 Rich HTML 형식으로 클립보드에 복사.
- 네이버 블로그, 티스토리, 노션(Notion), MS Word, 이메일 등에 붙여넣으면 서식이 완벽하게 유지됨.

---

## 12. Windows CRLF (`\r\n`) 줄바꿈 호환성 및 목차 파싱 오류 해결

### 🚨 오류 증상
- 옵시디언(Obsidian)이나 메모장, Windows 환경의 기본 에디터에서 작성·수정된 마크다운 파일을 열었을 때 목차(TOC) 사이드바에 제목(`#`, `##` 등)이 하나도 인식되지 않고 빈 목록(0개)으로 표시되는 현상 발생.
- 인라인 편집(Inline Mode)이나 체크박스 토글 시 줄 끝에 `\r`이 잔류하여 서식이 깨지거나 줄바꿈이 중복되는 문제 발생.

### 🔍 원인
- Windows 텍스트 파일은 줄바꿈 문자로 `CRLF`(`\r\n`)를 사용함.
- 기존 정규식 및 줄바꿈 처리 로직이 POSIX 표준 `LF`(`\n`)만 가정하고 있어, `line = "### 제목\r"`과 같이 줄 끝에 `\r`이 남아 `slugger.slug()` 처리 및 엄격한 정규식 매칭이 비정상 동작함.

### 💡 해결 방법
1. **문서 로딩 시점 표준화**:
   - `FileReader`, 드래그 앤 드롭, `localStorage` 초기화, 탭 전환 시점에 `.replace(/\r\n/g, '\n').replace(/\r/g, '\n')` 처리를 일괄 적용하여 모든 문서 내용을 `LF`로 정규화.
2. **목차 파서 및 각 뷰 모드 방어 로직 강화**:
   - `useHeadings.ts`, `MarkdownInlineView.tsx`, `MarkdownSource.tsx`, `MarkdownEditor.tsx`, `App.tsx`의 줄바꿈 분할 시 `markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')`을 적용하여 `\r` 잔류를 원천 차단.
