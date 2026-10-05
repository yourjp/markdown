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
12. [Markdown App 전체 구현 기능 명세서 (v1.27.0)](#12-markdown-app-전체-구현-기능-명세서-v1270)
13. [옵시디언(Obsidian) 이미지 & 로컬 파일 시스템 아키텍처 및 트러블슈팅](#13-옵시디언obsidian-이미지--로컬-파일-시스템-아키텍처-및-트러블슈팅)
14. [Windows 탐색기 파일 연결(더블클릭 실행) & Single Instance 아키텍처](#14-windows-탐색기-파일-연결더블클릭-실행--single-instance-아키텍처)
15. [옵시디언 이미지 자동 감지, 영구 Base64 임베딩 및 Data URL 파서 트러블슈팅](#15-옵시디언-이미지-자동-감지-영구-base64-임베딩-및-data-url-파서-트러블슈팅)
16. [React 19 동시성 모드 기반 비차단(Non-blocking) 렌더링 파이프라인 (v1.27.0)](#16-react-19-동시성-모드-기반-비차단non-blocking-렌더링-파이프라인-v1270)
17. [외부 파일 실시간 변경 감지 및 알림 배너 아키텍처 (`ExternalChangeBanner`)](#17-외부-파일-실시간-변경-감지-및-알림-배너-아키텍처-externalchangebanner)
18. [리치 HTML 서식 복사 엔진 (블로그/노션/워드 완벽 호환 `Ctrl+Shift+C`)](#18-리치-html-서식-복사-엔진-블로그노션워드-완벽-호환-ctrlshiftc)
19. [마크다운 렌더링 성능 최적화 종합 (React.memo, Plain Codeblock, LocalStorage Debounce)](#19-마크다운-렌더링-성능-최적화-종합-reactmemo-plain-codeblock-localstorage-debounce)

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

## 12. Markdown App 전체 구현 기능 명세서 (v1.27.0)

### 1) 📝 마크다운 에디터 & 뷰어 다중 모드 (View Modes)
* **View 모드**: 읽기에 최적화된 마크다운 최종 렌더링 뷰어 (깔끔한 타이포그래피 & 독서 모드).
* **Source 모드**: 순수 텍스트/코드 중심의 마크다운 소스 편집기.
* **Edit 모드**: 소스 코드 패널과 실시간 렌더링 프리뷰 패널이 동시 제공되는 라이브 편집 모드.
* **Inline 모드**: 타이핑 및 작성 즉시 인라인으로 스타일과 위젯이 반영되는 실시간 인라인 에디팅.
* **Split 모드**: 분할 리사이저 바(20% ~ 80%)를 자유롭게 드래그하여 소스와 뷰어를 분할 배치 및 스크롤 동기화.

### 2) 🗂️ 탭 관리 & 파일 시스템 연동 (Tauri Native Desktop)
* **다중 탭(Multi-tab)**: 여러 문서를 동시에 열어두고 탭 전환, 새 탭 생성, 닫기, 수정 여부(`*` 뱃지) 감지.
* **네이티브 파일 대화상자 (`rfd` 연동)**:
  * **파일 열기**: Windows 파일 탐색기에서 문서를 선택하면 OS 절대 경로(`filePath`)를 캡처하여 바인딩.
  * **저장 / 다른 이름으로 저장**: 자동 버전 넘버링(`_v1.0`, `_v1.1` 등) 추천 및 디스크에 직접 쓰기.
  * **디스크에서 다시 불러오기**: 외부(Obsidian, VS Code 등)에서 수정된 원본 파일 내용을 디스크에서 즉시 새로고침.
* **최근 문서 목록 (Recent Files)**: 로컬 스토리지 기반 최근 작업 문서 히스토리 저장 및 원클릭 복원.

### 3) 💎 옵시디언(Obsidian) 완벽 호환 & 이미지 엔진
* **옵시디언 위키링크 이미지 파싱**:
  * `![[Pasted image 2026.png]]`
  * `![[Pasted image 2026.png|612]]` (너비 지정)
  * `![[Pasted image 2026.png|612x400]]` (너비x높이 지정)
  * `![[folder/image.png|캡션 설명]]`
* **볼트(Vault) 자동 탐색 엔진 (`resolve_image_path`)**:
  * 상위 디렉터리의 `.obsidian` 폴더를 자동 감지하여 볼트 루트 식별.
  * `.obsidian/app.json`의 `attachmentFolderPath`(사용자 지정 첨부 폴더)를 직접 파싱하여 우선 탐색.
  * `attachments`, `assets`, `images`, `files`, `_resources`, `media`, `pasted_images`, `99_Attachments` 등 다계층 첨부 폴더 및 볼트 전체 재귀 탐색.
* **이미지 수동 위치 지정 (Manual Image Picker)**:
  * 이미지를 찾지 못했을 때 안내 카드를 클릭하거나 **`📁 위치 지정`** 버튼으로 파일 직접 선택.
  * 이미지 호버 퀵 버튼 및 라이트박스 상단 툴바에서 언제든 파일 위치 재지정 가능.
  * 수동 지정된 경로는 `localStorage`에 영구 저장되어 이후에도 자동 유지.
* **Rust Data URL 직접 스트리밍 (`read_image_data_url`)**:
  * 로컬 이미지 바이너리를 Rust에서 직접 읽어 Base64 Data URL로 변환하여 WebView2 보안 차단 없이 100% 즉각 렌더링.
* **멀티미디어 & PDF 임베드 지원**:
  * `![[audio.mp3]]`, `![[video.mp4]]`, `![[document.pdf]]` 네이티브 임베드 뷰어 지원.

### 4) 🎨 콜아웃 블록 & 서식 확장 (Rich Markdown)
* **옵시디언 스타일 콜아웃 블록 (Callout Blocks)**:
  * `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!CAUTION]`, `> [!FAQ]`, `> [!SUMMARY]`, `> [!EXAMPLE]` 등 15종 이상의 콜아웃 지원.
  * 접기/펼치기(Collapsible `[!NOTE]-` / `[!NOTE]+`) 토글 기능.
  * 각 테마별 최적화된 배경색(라이트 `#F5F6F7`, 다크 기본 배경 일체형, 세피아 웜톤) 통일.
* **형광펜 하이라이트 문법**:
  * `==하이라이트==` 및 `==태그+<span style="...">==` 복합 인라인 서식 파싱 (`<mark>` 태그 변환).
* **HTML 인라인 스타일 완벽 지원**:
  * `<span style="color:#1e88e5; font-size:16px">`, `<font color="...">` 스타일 실시간 렌더링.
* **단일 물결표 & 공백 보존**:
  * `~단일 물결표~` 보존 및 `~~취소선~~` 지원, 3개 이상 연속된 빈 줄(엔터) 공백 유지.
* **대화형 태스크 리스트 (Interactive Checkboxes)**:
  * 뷰어/인라인 모드에서 체크박스 클릭 시 원본 마크다운 소스의 `[ ]` <-> `[x]`가 즉시 상호작용 수정됨.
* **수식 & 다이어그램 & 코드 하이라이팅**:
  * KaTeX 수학 수식(`$...$`, `$$...$$`), Mermaid 차트/다이어그램, Prism 코드 구문 강조.

### 5) 📑 인터랙티브 목차(TOC) & 네이티브 내비게이션
* **우측 사이드바 자동 목차**: H1~H6 헤딩 태그를 실시간 추출하여 계층형 트리 렌더링.
* **부드러운 스크롤 이동**: 목차 클릭 시 해당 섹션으로 부드러운 스크롤 이동.
* **목차 헤더/패널 접기 토글**: 목차 영역 클릭 또는 버튼으로 사이드바를 손쉽게 접고 펼침.
* **하단 독서 진행률 알약 캡슐**: 스크롤 시 읽기 진행률(%), 현재 라인 번호 / 전체 라인 수를 표시하며 유휴 시 자동 투명화.

### 6) 🌓 테마(Theme) & 뷰포트 제어
* **3가지 테마 지원**:
  * **라이트(Light)**: 밝고 선명한 표준 모드.
  * **다크(Dark)**: 눈의 피로를 최소화하는 딥 다크 모드.
  * **세피아(Sepia)**: 따뜻한 베이지/아이보리 톤의 종이책 느낌 모드 (표 테두리 및 텍스트 시인성 최적화).
* **텍스트 확대/축소 (Zoom)**: `Ctrl + 마우스 휠` 또는 상단 툴바 줌 버튼 (70% ~ 200%).
* **인쇄 전용 스타일 (Print View)**: 인쇄 시 배경을 백색으로 전환하고 A4 레이아웃에 맞춰 자동 클린 출력.
* **이미지 라이트박스(Lightbox)**: 이미지를 클릭하여 전체 화면 확대, 줌 인/아웃, 100% 리셋, ESC 키 닫기.

### 7) ⚡ 데스크톱 패키징 & 성능
* **초경량 데스크톱 앱**: Tauri v2 기반의 고성능/저메모리 네이티브 윈도우 앱.
* **인메모리 캐싱**: 이미지 및 Data URL을 메모리에 캐시하여 버벅임 없는 즉각 반응 속도 구현.
* **현재 최신 배포 버전**: **`v1.27.0`** (`MarkdownViewer_1.27.0_x64-setup.exe` & `.msi`)

---

## 13. 옵시디언(Obsidian) 이미지 & 로컬 파일 시스템 아키텍처 및 트러블슈팅

### 🚨 문제 증상
1. 옵시디언에서 복사/작성한 노트의 이미지(`![[Pasted image ...|612]]`)를 열면 이미지를 찾을 수 없다는 에러 발생.
2. 수동으로 파일 위치를 지정해도 Tauri WebView2 환경에서 이미지가 표시되지 않음.
3. "현재 파일 디스크에서 다시 불러오기" 실행 시 연결된 디스크 경로가 없다고 경고 발생.

### 🔍 원인 분석
1. **옵시디언의 Shortest Path 규칙**: 옵시디언은 기본 설정상 마크다운 본문에 전체 경로 없이 `Pasted image 2026.png` 파일명만 기록하고 실제 파일은 `attachments/` 등 볼트 설정 폴더에 보관함.
2. **WebView2 asset 프로토콜 제약**: `convertFileSrc`(`http://asset.localhost/...`) 사용 시 WebView2 보안 스코프 제약으로 인해 로컬 파일 요청이 차단됨.
3. **웹 input 태그의 OS 절대 경로 은닉**: 기존 `<input type="file">` 방식은 보안상 전체 파일 경로를 제공하지 않아 탭 상태에 `filePath`가 기록되지 않았음.

### 💡 해결 아키텍처
1. **Tauri 네이티브 파일 다이얼로그 (`rfd`)**:
   - `open_file_dialog`를 통해 실제 OS 절대 경로를 획득하여 탭에 `filePath` 보존.
2. **옵시디언 볼트 자동 탐색 엔진 (`resolve_image_path`)**:
   - 상위 디렉터리 `.obsidian/app.json`을 파싱하여 첨부 폴더(`attachmentFolderPath`)를 자동 조회하고, 볼트 전체를 고속 재귀 탐색.
3. **Data URL 직접 스트리밍 (`read_image_data_url`)**:
   - 디스크의 이미지 바이너리를 Rust에서 직접 읽어 Base64 Data URL(`data:image/png;base64,...`)로 프론트엔드에 전달함으로써 WebView2의 모든 보안/프로토콜 제약을 우회.
4. **수동 지정 및 로컬 스토리지 캐싱**:
   - 사용자가 직접 선택한 이미지 경로를 `localStorage`에 영구 저장하고, 인메모리 캐시(`imageDataCache`)를 통해 즉각 렌더링 보장.

---

## 14. Windows 탐색기 파일 연결(더블클릭 실행) & Single Instance 아키텍처

### 🚨 문제 증상
Windows 탐색기에서 `.md` 파일의 기본 연결 프로그램을 이 앱으로 지정한 후, 파일을 더블클릭하여 열었을 때 해당 파일의 내용이 열리지 않고 빈 기본 화면이 표시되는 문제 발생.

### 🔍 원인 분석
1. Windows가 실행 인자(`argv[1]`)로 대상 파일의 절대 경로를 전달하지만, 앱 초기 실행(`main.rs` / `App.tsx`) 시점에 CLI 인자를 읽고 탭으로 로드하는 로직이 부재했음.
2. 이미 앱이 실행 중인 상태에서 다른 파일을 더블클릭할 경우 프로세스가 중복 실행되거나 새 파일이 기존 창에 탭으로 추가되지 못함.

### 💡 해결 아키텍처
1. **CLI 인자 파싱 (`get_cli_file`)**:
   - Rust 백엔드에서 `std::env::args()`를 검사하여 첫 번째 실행 인자가 유효한 파일인지 확인.
   - 해당 파일의 내용, 파일명, 최종 수정일, 절대 경로를 추출하여 앱 시작 시 첫 번째 탭으로 즉시 오픈.
2. **단일 인스턴스 플러그인 (`tauri-plugin-single-instance`)**:
   - 앱이 이미 켜져 있는 상태에서 탐색기의 다른 `.md` 파일을 더블클릭하면, 중복 프로세스를 방지하고 기존 실행 중인 메인 윈도우를 포커스(`set_focus`, `unminimize`).
   - `open-file-from-cli` 이벤트를 프론트엔드로 브로드캐스트하여 기존 창에서 **새 탭으로 즉시 열리도록 처리**.
3. **Windows 파일 연결 메타데이터 (`tauri.conf.json`)**:
   - `bundle.fileAssociations`에 `.md`, `.markdown`, `.mdown`, `.mkd`, `.mkdn` 확장자를 등록하여 설치본(`.msi` / `.exe`)에서 윈도우 탐색기 기본 마크다운 뷰어로 영구 연동.

---

## 15. 옵시디언 이미지 자동 감지, 영구 Base64 임베딩 및 Data URL 파서 트러블슈팅

### 15.1 이미지 박스 상단 디스크 경로 표시 헤더 및 Windows 경로 정규화
- **기능 개요**: 
  - 옵시디언 위키링크(`![[Pasted image ...png]]`) 파싱 시 자동 감지된 디스크 상의 실제 절대 경로(예: `D:\옵시디언\image\Pasted image 20260824200601.png`)를 이미지 상단 바에 항상 명확하게 표시.
- **UI 시인성 최적화**:
  - 어떤 테마(다크/라이트/세피아)에서도 경로 텍스트가 묻히지 않도록 헤더 텍스트 색상을 순백색(`text-white`, CSS `#ffffff !important`)으로 고정.
- **경로 구분자 정규화**:
  - Windows 파일 시스템에서 슬래시(`/`)와 백슬래시(`\`)가 혼용되어 `D:\옵시디언\image/Pasted...` 형태로 출력되는 현상을 방지하기 위해 Rust 백엔드 및 TypeScript 정규식 레벨에서 `replace(/\//g, '\\')` 정규화 적용.

### 15.2 영구 Base64 임베딩 기능 및 원본 파일 경로 알림 팝업
- **기능 개요**:
  - 로컬 디스크 파일 경로에 의존하는 옵시디언 위키링크 또는 상대경로 이미지를 문서 자체에 내장되는 Base64 Data URL(`![Pasted image.png](data:image/png;base64,...)`) 형태로 원클릭 영구 임베딩 변환.
- **원본 경로 안내 팝업 (Toast)**:
  - 영구 임베딩 버튼 클릭 시 어떤 디스크 경로의 파일을 가져와 Base64로 인코딩했는지 사용자에게 즉각 안내하는 팝업 토스트 노출:
    - `"영구 임베딩 완료: 원본 파일 경로 [D:\옵시디언\image\Pasted image...png]"`

### 15.3 Base64 이미지 렌더링 시 3대 충돌 트러블슈팅 및 해결
임베딩 데이터가 정상적으로 마크다운 소스에 삽입되었음에도 불구하고 렌더링 화면에 이미지가 깨지거나 표시되지 않던 3가지 원인과 해결책입니다:

1. **WebView2 `crossOrigin="anonymous"`로 인한 `data:` URL 로드 차단**:
   - **원인**: `<img crossOrigin="anonymous">` 속성이 모든 이미지에 일괄 적용되어 브라우저/WebView2 보안 엔진이 `data:image/...` 스킴을 CORS 에러로 간주하여 로드를 거부함.
   - **해결**: `MarkdownImage.tsx`에서 `isDataUrl = src.startsWith('data:')` 검사를 거쳐 Data URL일 경우 `crossOrigin` 속성을 제외하도록 수정.
2. **형광펜 정규식(`/==(?!=)...==/g`)과 Base64 패딩(`==`) 충돌**:
   - **원인**: Base64 문자열의 끝부분에 붙는 패딩 기호 `==`가 마크다운 전처리 단계(`preprocessMarkdown`)에서 형광펜 태그 문법으로 오인되어 `<mark>` 태그로 변환되면서 Data URL 데이터가 손상됨.
   - **해결**: 마크다운 전처리 시 `data:image/` 패턴을 안전하게 토큰으로 보호(Placeholding)하거나 Base64 패딩 기호가 형광펜 파서에 매칭되지 않도록 정규식 및 치환 파이프라인 격리.
3. **ReactMarkdown 기본 `urlTransform` 필터링**:
   - **원인**: `react-markdown` 내부 기본 `urlTransform` 함수가 과도하게 긴 Base64 Data URL을 잠재적 XSS 위험으로 판단하여 빈 문자열로 정화(Sanitize)해 버림.
   - **해결**: `<ReactMarkdown urlTransform={(url) => url} ...>` 커스텀 속성을 명시적으로 전달하여 Base64 Data URL이 원본 그대로 `<img>` 태그로 전달되도록 보장.

---

## 16. React 19 동시성 모드 기반 비차단(Non-blocking) 렌더링 파이프라인 (v1.27.0)

### 🚨 문제 증상
- 수천 줄의 대용량 문서나 여러 개의 코드 블록/이미지가 포함된 문서를 편집할 때, 에디터에서 키를 입력할 때마다 화면이 멈칫거리거나 타이핑 지연(Input Lag) 발생.
- 원인: 키 입력 1회마다 `setTabs` ➡️ 전체 마크다운 AST 파싱 ➡️ Prism 구문 강조 ➡️ TOC 헤더 정규식 파싱이 단일 메인 스레드에서 동기적으로 실행됨.

### 💡 해결 아키텍처
1. **입력 상태와 렌더링 파이프라인 분리 (`useDeferredValue`)**:
   - 사용자 키 입력은 에디터 로컬 state를 통해 **0ms 즉각 화면 반영** (High Priority).
   - 무거운 뷰어 렌더링 및 목차(TOC) 파싱은 `deferredMarkdown = useDeferredValue(markdown)`을 통해 **백그라운드 비차단 렌더링** (Low Priority)으로 전환.
2. **모드별 차등 렌더링 전략**:
   - **Split / Edit 모드**: 에디터 즉시 타이핑 + 우측 프리뷰는 백그라운드 우선순위로 갱신.
   - **Source 모드**: 에디터 즉시 타이핑 + `useHeadings(deferredMarkdown)`로 목차 정규식 파싱 지연.
   - **View 모드**: 할 일 체크박스 및 형광펜 1회성 편집 액션은 `flush`로 즉시 반영.

---

## 17. 외부 파일 실시간 변경 감지 및 알림 배너 아키텍처 (`ExternalChangeBanner`)

### 🚨 문제 배경
- 사용자가 Markdown App에서 노트를 열어둔 상태로 Obsidian, VS Code, Git CLI 등 외부 프로그램에서 해당 파일을 수정했을 때, 기존 앱 화면에 이전 내용이 남아있어 작업 충돌 또는 최신 내용 누락 위험이 존재함.

### 💡 해결 아키텍처
1. **디스크 수정 시간(mtime) 폴링 감지**:
   - 활성 탭에 연결된 `filePath`가 있을 경우, 백그라운드 타이머를 통해 파일의 최종 수정 시간(`mtime`)과 디스크 내용을 주기적으로 확인.
2. **비침습적 상단 알림 배너 (`ExternalChangeBanner`)**:
   - 외부 변경 발생 시 사용자 작업을 강제로 덮어쓰지 않고, 탭 바 하단에 눈에 띄는 알림 배너를 노출:
     - `[디스크 내용으로 다시 불러오기]`: 변경된 최신 파일 내용을 탭에 즉시 로드.
     - `[현재 내용 유지]`: Markdown App에서 작성 중인 내용을 보존하고 알림 닫기.
     - `[X 닫기]`: 해당 알림 무시 및 Dismiss 상태 기록.
3. **편집 중 안전 보호**:
   - 현재 탭이 수정 중(`isModified: true`)인 상태에서는 데이터 손실을 방지하기 위해 경고 배지를 추가 표시하여 실수로 덮어쓰는 사고 방지.

---

## 18. 리치 HTML 서식 복사 엔진 (블로그/노션/워드 완벽 호환 `Ctrl+Shift+C`)

### 🚨 문제 배경
- 일반 마크다운 텍스트 복사는 서식이 없는 원시 텍스트만 복사되므로, 네이버 블로그, 티스토리, Notion, Microsoft Word, Google Docs 등에 붙여넣을 때 서식(표, 하이라이트 색상, 콜아웃 박스, 코드 블록, 취소선 등)이 모두 깨지는 문제가 발생함.

### 💡 해결 아키텍처
1. **클립보드 표준 Rich HTML API (`ClipboardItem`)**:
   - `navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })])`를 사용하여 HTML 서식과 순수 텍스트를 클립보드에 동시 등록.
2. **스타일 인라인화 (Inline Style Inlining)**:
   - 외부 플랫폼 붙여넣기 시 외부 CSS 클래스(Tailwind 등)가 적용되지 않으므로, 주요 서식 요소(테이블 테두리/배경색, `<mark>` 형광펜 색상, `<pre><code>` 구문 강조 배경, 콜아웃 카드 테두리/아이콘)를 인라인 CSS `style="..."`로 변환하여 복사.
3. **단축키 및 툴바 지원**:
   - 툴바 **`서식 복사`** 아이콘 버튼 및 **`Ctrl + Shift + C`** 단축키 지원으로 즉각 복사 후 토스트 알림 안내.

---

## 19. 마크다운 렌더링 성능 최적화 종합 (React.memo, Plain Codeblock, LocalStorage Debounce)

### 💡 주요 최적화 기법 정리
1. **컴포넌트 단위 메모이제이션 (`React.memo` & `useMemo`)**:
   - `MarkdownView`, `MarkdownInlineView`, `LineItem` 등 고비용 컴포넌트를 `memo`로 감싸고, 내부 `components` 맵핑 객체를 `useMemo`로 고정하여 스크롤/목차 너비 조절/테마 변경 시 불필요한 전체 파싱 차단.
2. **경량 코드 블록 렌더링 (Plain Code Block Fast-path)**:
   - 언어가 지정되지 않은 백틱 3개(```) 일반 코드 블록이나 인라인 코드는 무거운 Prism 구문 강조 파서를 우회하고 가벼운 `<pre><code>` 태그로 초고속 렌더링.
3. **LocalStorage 동기화 디바운스 (400ms Debounce Sync)**:
   - 타이핑할 때마다 수백 KB의 탭 데이터를 `localStorage`에 동기적으로 쓰면 브라우저 메인 스레드에 디스크 I/O 렉이 발생하므로, 400ms 타이머를 적용하여 연속 입력 종료 시 일괄 저장되도록 최적화.
4. **목차 패널 실시간 리사이징 (Draggable Resizer)**:
   - 좌측 목차 패널 너비를 160px ~ 650px 범위에서 마우스 드래그로 부드럽게 조절 가능하며, 더블클릭 시 기본값(280px)으로 즉시 초기화.



