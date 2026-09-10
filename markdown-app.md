# Markdown Viewer 앱 개발 계획

## 1. 개발 목표

Windows 환경에서 로컬 Markdown 문서를 빠르고 편리하게 열람할 수 있는 경량 Markdown Viewer 앱을 개발한다.

핵심 방향은 다음과 같다.

- Markdown 파일을 빠르게 열기
- GitHub 스타일로 보기 좋게 렌더링
- 왼쪽에 문서 목차(TOC) 표시
- 목차 선택 시 해당 Heading 위치로 즉시 이동
- 목차 패널을 토글로 숨겨 본문 공간을 최대한 활용
- 긴 문서를 효율적으로 탐색
- 다크/라이트 모드 지원
- 향후 Obsidian 호환 문법까지 확장 가능하도록 설계

---

## 2. 핵심 사용자 경험

기본 화면은 다음과 같이 구성한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ ☰  Markdown Viewer                           🔍   🌙         │
├────────────────┬─────────────────────────────────────────────┤
│ TABLE OF       │                                             │
│ CONTENTS       │  # Markdown Viewer                          │
│                │                                             │
│ 1. Overview    │  Markdown 본문                              │
│                │                                             │
│ 2. Install     │  ## Install                                 │
│   2.1 Windows  │                                             │
│   2.2 Linux    │  ...                                        │
│                │                                             │
│ 3. Usage       │                                             │
│   3.1 Basic    │                                             │
│   3.2 Advanced │                                             │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

목차를 닫으면 Markdown 본문이 전체 폭을 사용한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ ☰  Markdown Viewer                           🔍   🌙         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  # Markdown Viewer                                           │
│                                                              │
│  Markdown 본문이 전체 화면 너비 사용                         │
│                                                              │
│  ## Install                                                  │
│                                                              │
│  ...                                                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. 화면 구성

### 3.1 상단 Toolbar

주요 기능:

- 목차 열기/닫기 토글
- 현재 파일명 표시
- 검색
- 다크/라이트 모드 전환
- 확대/축소
- 기타 설정 메뉴

### 3.2 왼쪽 목차 패널

Markdown Heading을 분석해 자동 생성한다.

지원 범위:

- H1
- H2
- H3
- 필요 시 H4~H6 확장

예시:

```text
Overview
Install
  Windows
  Linux
Usage
  Basic
  Advanced
```

권장 폭:

```text
220px ~ 280px
```

### 3.3 Markdown 본문 영역

지원 항목:

- Heading
- Paragraph
- Bold / Italic
- List
- Table
- Checkbox
- Blockquote
- Link
- Image
- Code block
- Syntax highlighting
- Horizontal rule

---

---

## 3.4 보기 모드

앱은 Markdown 원본과 렌더링 결과를 확인할 수 있도록 두 가지 보기 모드를 제공한다.

### 모드 1 — 원본 + View

Markdown 원본과 렌더링 결과를 동시에 표시한다.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰  Markdown Viewer                [Source + View] [View Only]   🔍   🌙      │
├───────────────┬───────────────────────────┬─────────────────────────────────┤
│ TABLE OF      │ MARKDOWN SOURCE           │ MARKDOWN VIEW                   │
│ CONTENTS      │                           │                                 │
│               │ # Markdown Viewer         │ # Markdown Viewer               │
│ Overview      │                           │                                 │
│ Install       │ ## Install                │ Install                         │
│   Windows     │                           │                                 │
│   Linux       │ - Windows                 │ • Windows                       │
│ Usage         │ - Linux                   │ • Linux                         │
│               │                           │                                 │
└───────────────┴───────────────────────────┴─────────────────────────────────┘
```

구성:

```text
[토글형 TOC] + [Markdown Source] + [Markdown View]
```

주요 동작:

- Markdown 원본을 그대로 표시
- 오른쪽에 렌더링된 결과 표시
- Source와 View를 동시에 비교 가능
- Source / View 사이의 분할선은 드래그하여 폭 조절 가능하도록 설계
- 목차는 기존과 동일하게 토글로 숨길 수 있음
- 목차 클릭 시 View 영역의 해당 Heading으로 이동
- 향후 Source 영역도 같은 위치로 동기화하는 기능을 추가할 수 있음

### 모드 2 — View Only

Markdown 원본 영역을 완전히 숨기고 렌더링 결과만 표시한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ ☰  Markdown Viewer        [Source + View] [View Only]  🔍 🌙 │
├────────────────┬─────────────────────────────────────────────┤
│ TABLE OF       │                                             │
│ CONTENTS       │  # Markdown Viewer                          │
│                │                                             │
│ Overview       │  Markdown 렌더링 결과                       │
│ Install        │                                             │
│   Windows      │  ## Install                                 │
│   Linux        │                                             │
│ Usage          │  ...                                        │
└────────────────┴─────────────────────────────────────────────┘
```

구성:

```text
[토글형 TOC] + [Markdown View]
```

목차까지 숨기면 다음과 같이 View가 전체 화면을 사용한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ ☰  Markdown Viewer        [Source + View] [View Only]  🔍 🌙 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  # Markdown Viewer                                           │
│                                                              │
│  Markdown View 전체 화면                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 보기 모드 상태

상태값 예시:

```ts
type ViewMode = "split" | "view";

const [viewMode, setViewMode] = useState<ViewMode>("view");
```

렌더링 구조 예시:

```tsx
<div className="content">
  {tocOpen && (
    <TableOfContents headings={headings} />
  )}

  {viewMode === "split" && (
    <MarkdownSource markdown={markdown} />
  )}

  <MarkdownView markdown={markdown} />
</div>
```

기본 모드는 사용자가 문서를 읽는 데 집중할 수 있도록 다음으로 권장한다.

```text
View Only
```

마지막으로 선택한 보기 모드를 저장하여 앱 재실행 후에도 유지할 수 있도록 한다.

저장 대상:

```text
viewMode = split / view
tocOpen = true / false
```

## 4. 목차 기능

### 4.1 Heading 자동 추출

Markdown 파싱 시 Heading 정보를 추출한다.

예시 데이터:

```ts
[
  {
    level: 1,
    title: "Overview",
    id: "overview"
  },
  {
    level: 2,
    title: "Windows",
    id: "windows"
  },
  {
    level: 2,
    title: "Linux",
    id: "linux"
  }
]
```

### 4.2 목차 클릭 이동

목차를 클릭하면 해당 Heading으로 스크롤 이동한다.

```tsx
const moveToHeading = (id: string) => {
  document
    .getElementById(id)
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
};
```

### 4.3 현재 읽는 Heading 강조

현재 화면에 위치한 Heading을 감지해 목차에서 자동 강조한다.

권장 구현:

- IntersectionObserver 사용
- 현재 Heading을 active 상태로 표시
- 스크롤 시 목차도 필요한 경우 자동 스크롤

### 4.4 목차 토글

상단 왼쪽 `☰` 버튼으로 목차를 열고 닫는다.

```tsx
const [tocOpen, setTocOpen] = useState(true);
```

```tsx
<Toolbar
  onToggleToc={() => setTocOpen(!tocOpen)}
/>

<div className="content">
  {tocOpen && (
    <TableOfContents headings={headings} />
  )}

  <MarkdownView />
</div>
```

목차를 닫으면 본문 영역이 자동으로 확장된다.

### 4.5 목차 상태 저장

선택 기능으로 앱 재실행 시 마지막 상태를 유지한다.

저장 대상:

```text
tocOpen = true / false
```

저장 방식:

- localStorage
- 또는 Tauri Store

---

## 5. 추천 기술 스택

```text
Desktop
 └─ Tauri
     ├─ Frontend: React
     ├─ Language: TypeScript
     ├─ Markdown: react-markdown
     ├─ GFM: remark-gfm
     ├─ Heading ID: rehype-slug
     ├─ Code Highlight: Shiki
     ├─ Styling: Tailwind CSS
     └─ File Access: Tauri File System API
```

### Tauri 선택 이유

- Electron보다 일반적으로 설치 용량이 작음
- 메모리 사용량을 줄이기 유리
- Windows 로컬 앱에 적합
- 파일 시스템 접근 가능
- React UI와 쉽게 통합 가능

---

## 6. 기본 데이터 흐름

```text
.md 파일
   ↓
파일 읽기
   ↓
UTF-8 Text
   ↓
Markdown Parser
   ↓
Heading 추출
   ├─→ TOC 생성
   ↓
remark / rehype
   ↓
React Component
   ↓
HTML Rendering
```

---

## 7. 프로젝트 구조

```text
markdown-viewer/
├─ src/
│  ├─ components/
│  │  ├─ Toolbar.tsx
│  │  ├─ TableOfContents.tsx
│  │  ├─ MarkdownSource.tsx
│  │  └─ MarkdownView.tsx
│  │
│  ├─ hooks/
│  │  ├─ useFile.ts
│  │  ├─ useHeadings.ts
│  │  ├─ useActiveHeading.ts
│  │  └─ useTheme.ts
│  │
│  ├─ utils/
│  │  ├─ markdown.ts
│  │  └─ path.ts
│  │
│  ├─ App.tsx
│  └─ main.tsx
│
├─ src-tauri/
│  ├─ src/
│  └─ tauri.conf.json
│
└─ package.json
```

---

## 8. MVP 기능

### 필수

- `.md` 파일 열기
- Markdown 렌더링
- Markdown Source 표시
- Source + View / View Only 모드 전환
- GFM 지원
- 왼쪽 TOC 자동 생성
- `Source + View` 분할 보기
- `View Only` 보기
- Source/View 보기 모드 전환
- TOC 클릭 시 Heading 이동
- TOC 토글 열기/닫기
- 본문 전체 폭 자동 확장
- 코드 블록 Syntax Highlight
- 상대경로 이미지 표시
- Markdown 내부 링크 이동
- 다크/라이트 모드

### 권장

- 현재 Heading 자동 강조
- 문서 내 검색
- 확대/축소
- 최근 파일
- Drag & Drop 파일 열기
- TOC 열림/닫힘 상태 기억

---

## 9. 상대경로 처리

Markdown 파일 위치를 기준으로 이미지와 링크를 해석한다.

예:

```markdown
![image](./images/photo.png)

[다른 문서](./guide.md)
```

현재 문서:

```text
D:\옵시디언\project\README.md
```

실제 경로:

```text
./images/photo.png
→ D:\옵시디언\project\images\photo.png

./guide.md
→ D:\옵시디언\project\guide.md
```

---

## 10. 개발 단계

### Phase 1 — 기본 Viewer

- Tauri + React 프로젝트 생성
- Markdown 파일 열기
- Markdown 렌더링
- Markdown Source 표시
- Source + View / View Only 모드 전환
- GFM 지원
- 코드 Highlight
- Dark Mode

### Phase 2 — TOC

- Heading 추출
- 왼쪽 TOC 패널 생성
- Heading 계층 표현
- TOC 클릭 이동
- Smooth Scroll
- 현재 Heading 강조
- TOC 토글

### Phase 3 — 문서 탐색

- 내부 `.md` 링크 이동
- 상대경로 이미지
- 검색
- 최근 파일
- Drag & Drop

### Phase 4 — Obsidian 호환

향후 아래 문법 지원을 검토한다.

```text
[[문서명]]

[[문서명#Heading]]

![[image.png]]

#태그
```

### Phase 5 — 고급 기능

- Mermaid
- KaTeX
- Source / Preview 전환
- Split View
- Print
- PDF Export
- `.md` 파일 연결
- 키보드 단축키

---

## 11. 권장 키보드 단축키

| 기능 | 단축키 |
|---|---|
| 파일 열기 | `Ctrl + O` |
| 목차 열기/닫기 | `Ctrl + B` |
| 검색 | `Ctrl + F` |
| 확대 | `Ctrl + +` |
| 축소 | `Ctrl + -` |
| 기본 확대율 | `Ctrl + 0` |
| 다크모드 전환 | 사용자 설정 |

---

## 12. 핵심 설계 원칙

앱의 핵심 방향은 다음과 같다.

> **VS Code보다 가볍고, Obsidian보다 단순한 Windows Markdown Viewer**

특히 긴 Markdown 문서를 읽을 때 다음 흐름을 가장 중요하게 본다.

```text
Markdown 파일 열기
        ↓
자동 목차 생성
        ↓
왼쪽 TOC에서 원하는 항목 선택
        ↓
본문의 해당 Heading으로 이동
        ↓
필요하면 TOC를 닫아 본문 전체 화면 사용
```

따라서 1차 UI의 핵심 구조는 다음 두 가지로 확정한다.

```text
1. [토글형 TOC] + [Markdown Source] + [Markdown View]
2. [토글형 TOC] + [Markdown View]
```

기본 보기 모드는 `View Only`로 하고, 필요할 때 `Source + View`로 전환한다.
