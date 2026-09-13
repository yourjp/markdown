# Markdown Viewer & Editor 실행 및 배포 가이드

이 문서는 Markdown 애플리케이션의 로컬 개발, 프로덕션 빌드, Docker 컨테이너 실행 및 클라우드 배포 방법을 안내합니다.

---

## 1. 로컬 개발 환경 실행 (Development)

Node.js(v18 이상)가 설치된 환경에서 아래 명령어로 개발 서버를 실행합니다.

```bash
# 1. 의존성 패키지 설치 (최초 1회)
npm install

# 2. Vite 개발 서버 실행
npm run dev
```

- 실행 후 기본 브라우저에서 `http://localhost:3000` 접속

---

## 2. 프로덕션 빌드 및 미리보기 (Production Build & Preview)

TypeScript 타입 검사 및 Vite 정적 파일 번들링을 수행합니다.

```bash
# 타입 검사 및 프로덕션 빌드 (dist/ 폴더 생성)
npm run build

# 빌드된 결과물 로컬 미리보기
npm run preview
```

---

## 3. Docker 컨테이너 실행 (Docker Execution)

Docker 환경에서 Nginx 기반으로 컨테이너를 빌드하고 실행하는 방법입니다.

### 방법 A: Docker Compose 사용 (권장)

```bash
# 이미지 빌드 및 백그라운드 컨테이너 실행
docker compose up -d --build

# 실행 확인
# 웹 브라우저에서 http://localhost:3000 접속

# 컨테이너 중지 및 제거
docker compose down
```

### 방법 B: Docker CLI 직접 사용

```bash
# 1. 이미지 빌드
docker build -t markdown-app .

# 2. 컨테이너 실행 (포트 3000 연결)
docker run -d -p 3000:80 --name markdown-app markdown-app

# 3. 컨테이너 중지
docker stop markdown-app && docker rm markdown-app
```

---

## 4. 클라우드 배포 (Vercel Deployment)

프로젝트는 GitHub 저장소와 Vercel이 연동되어 있습니다.

```bash
# master 브랜치로 커밋 및 푸시 시 Vercel 자동 프로덕션 배포 실행
git add .
git commit -m "feat: your update message"
git push origin master
```
