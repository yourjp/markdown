# Markdown App 배포 가이드 (DEPLOY.md)

이 문서는 Markdown Viewer & Editor 프로젝트의 현재 자동화된 배포 프로세스 및 배포 가이드를 제공합니다.

---

## 📌 배포 아키텍처 개요

- **주 배포 플랫폼**: **Vercel** (`https://markdown-yourjp.vercel.app`)
- **자동화 트리거 (CI/CD)**: GitHub 저장소의 `master` 브랜치에 커밋을 `git push origin master` 할 때 Vercel에서 즉시 프로덕션 자동 빌드 및 배포 실행.
- **빌드 명령어**: `npx tsc && npx vite build`
- **출력 결과물 디렉토리**: `dist/`

---

## 🚀 표준 배포 절차 (Standard Deployment Workflow)

새로운 기능 추가, 버그 수정, 스타일 수정 완료 후 배포 시 **반드시 아래 순서대로 진행**합니다.

### 1단계: 버전 업그레이드 (Versioning Check)
AGENTS.md 규칙에 따라 코드/기능 변경 시 버전 번호를 동시에 수정합니다.
- [`package.json`](file:///d:/APP/Markdown/package.json): `"version": "1.X.X"`
- [`Toolbar.tsx`](file:///d:/APP/Markdown/src/components/Toolbar.tsx): 툴바 뱃지 `v1.X.X`

> **주의 (Docker 관련)**: 단순 Docker 이미지 재구성(Rebuild) 및 컨테이너 갱신 시에는 버전을 올리지 않고 현재 버전을 그대로 유지합니다.

### 2단계: 로컬 사전 빌드 & 타입 검사 (Pre-deploy Verification)
터미널에서 타입 오류 및 빌드 오류가 없는지 사전 검증합니다:

```bash
# 1. TypeScript 타입 검사 (오래 0건 확인)
npx tsc --noEmit

# 2. Vite 프로덕션 빌드 미리 검증
npm run build
```

### 3단계: Git 커밋 & 원격 푸시 (Git Commit & Push)
변경 사항을 `master` 브랜치로 커밋 후 푸시합니다:

```bash
# 변경 파일 스테이징
git add .

# 의미 있는 커밋 메시지 작성
git commit -m "feat: 추가한 신규 기능 설명"  # 또는 fix: 수정 내용 설명

# 원격 master 브랜치로 푸시
git push origin master
```

### 4단계: Vercel 자동 배포 확인 (Automatic Deployment)
- `git push origin master` 실행 즉시 Vercel이 브랜치 변경을 감지하고 약 30초 내에 자동으로 프로덕션 웹서버에 배포를 완료합니다.
- 배포 완료 주소: **[https://markdown-yourjp.vercel.app](https://markdown-yourjp.vercel.app)**

---

## 🐳 Docker 온프레미스 배포 가이드 (선택 사항)

자체 서버 또는 로컬 Docker 환경에서 배포할 때 사용하는 방법입니다.

```bash
# 1. Docker Compose 빌드 및 백그라운드 실행 (3333 포트)
docker compose up -d --build

# 2. 접속 확인
# http://localhost:3333
```

---

## 💡 트러블슈팅 요약

- **Vercel 127/254 빌드 에러 방지**: `vercel.json`에 `"buildCommand": "npm run build"`, `"outputDirectory": "dist"`, `"framework": "vite"`가 명시되어 있어야 합니다.
- **`gh-pages` 빌드 오류 방지**: Vercel이 불필요하게 `gh-pages` 브랜치를 빌드하지 않도록 `vercel.json`의 `ignoreCommand`가 적용되어 있습니다.
- 상세 오류 처리 이력은 [`GUIDE.md`](file:///d:/APP/Markdown/GUIDE.md) 문서를 참고하세요.
