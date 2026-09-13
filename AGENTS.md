# AGENTS.md - Agent Workflow & Versioning Guidelines

## 📌 Versioning Policy (버전 관리 필수 지침)

1. **자동 버전 업그레이드 규칙**:
   - 앱에 새로운 기능이 추가되거나 기존 기능이 유의미하게 개선/수정될 때마다 **반드시 버전을 올려야 합니다.**
   - 버전을 수정해야 하는 위치:
     1. [`package.json`](file:///d:/APP/Markdown/package.json) 의 `"version"` 필드
     2. [`Toolbar.tsx`](file:///d:/APP/Markdown/src/components/Toolbar.tsx) 툴바 상단의 `vX.X.X` 뱃지 텍스트

2. **버전 체계 규칙 (Semantic Versioning)**:
   - **Major (X.0.0)**: 전면적 구조 변경 또는 대규모 아키텍처 개편 시.
   - **Minor (1.X.0)**: 신규 기능(기능 추가, 모드 추가, 단축키 추가 등)이 새로 반영될 때.
   - **Patch (1.1.X)**: 버그 수정, 스타일 미세 조정, 리팩토링 시.

3. **Docker 이미지 현행화 시 버전 유지 규칙**:
   - 코드나 기능의 변경 없이 단순 Docker 이미지 재구성(Rebuild) 및 컨테이너 갱신/현행화만 수행하는 경우 **버전을 올리지 않고 현재 버전을 그대로 유지**합니다.

4. **작업 완료 체크리스트**:
   - [ ] 새로운 기능 구현 후 `package.json` 및 `Toolbar.tsx` 버전 번호 동시 올림 확인
   - [ ] `npx tsc --noEmit` 검사 수행
