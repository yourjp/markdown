# Docker 실행 및 이미지 가이드 (docker-run.md)

이 문서는 Markdown 애플리케이션의 Docker 컨테이너 빌드 및 실행 시 필요한 Docker 이미지 정보와 가이드를 제공합니다.

---

## 📦 필요한 Docker 베이스 이미지 (Required Docker Images)

Dockerfile의 멀티 스테이지 빌드(Multi-stage build) 과정에서 사용되는 2가지 공식 베이스 이미지입니다:

| 이미지명 | 용도 | 설명 |
| :--- | :--- | :--- |
| **`node:20-alpine`** | **Build Stage** | React / TypeScript 소스코드를 검사하고 `npm run build`를 수행하여 `dist/` 정적 파일을 생성하는 빌드용 이미지 |
| **`nginx:alpine`** | **Production Stage** | 빌드 완료된 정적 파일(`dist`)을 서빙하는 경량 Nginx 웹 서버 이미지 (포트 80) |

> **참고**: Docker Build 시 상기 베이스 이미지들은 Docker Hub로부터 자동으로 풀(Pull) 받아옵니다.

---

## 🚀 Docker 실행 방법 (Port: `3333`)

로컬 개발 서버(`npm run dev`, 3000 포트)와의 포트 중복을 방지하기 위해 컨테이너는 외부 **`3333`** 포트로 연결됩니다.

### 1) Docker Compose로 실행 (권장)

```bash
# 컨테이너 빌드 및 백그라운드 실행
docker compose up -d --build

# 접속 확인: http://localhost:3333
```

### 2) Docker CLI로 직접 실행

```bash
# 1. 이미지 빌드
docker build -t markdown-app .

# 2. 컨테이너 실행 (외부 3333 -> 내부 80 포트)
docker run -d -p 3333:80 --name markdown-app markdown-app

# 접속 확인: http://localhost:3333
```

---

## 🛠️ 주요 Docker 관리 명령어

```bash
# 실행 중인 컨테이너 상태 확인
docker ps

# 컨테이너 실시간 로그 확인
docker logs -f markdown-app

# 컨테이너 중지
docker stop markdown-app

# 컨테이너 삭제
docker rm markdown-app

# Compose 서비스 전체 정지 및 삭제
docker compose down
```
