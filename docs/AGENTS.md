# Homepage Project - Development Guide

## 프로젝트 개요
- **목적**: VibeCoder Playground 커뮤니티 웹사이트
- **기술 스택**: React 19 + Vite 7 + Tailwind CSS v4 + Shadcn/ui
- **프로젝트 경로**: `/Users/usabatch/coding/web`

## 개발 명령어

### 설치 및 실행
```bash
cd /Users/usabatch/coding/web

# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build
```

### Shadcn/ui 컴포넌트 추가
```bash
# 새 컴포넌트 추가
pnpm dlx shadcn@latest add [component-name] -y
```

## 디자인 시스템

### 브랜드 색상
| 토큰 | HEX | 용도 |
|------|-----|------|
| `--color-bg-0` | #0B1020 | 메인 배경 |
| `--color-bg-1` | #111936 | 보조 배경 |
| `--color-card` | #161F42 | 카드 배경 |
| `--color-text-0` | #F4F7FF | 메인 텍스트 |
| `--color-text-1` | #B8C3E6 | 보조 텍스트 |
| `--color-accent-0` | #23D5AB | CTA 버튼 |
| `--color-accent-1` | #FFB547 | 앰버 |
| `--color-accent-2` | #FF5D8F | 핑크 |
| `--color-danger` | #FF6B6B | 위험/에러 |

### 타이포그래피
- **Display**: Space Grotesk
- **Body**: Pretendard
- **Code**: JetBrains Mono

## 화면 구성

| 화면 | 컴포넌트 | 라우트 |
|------|---------|--------|
| Home/Feed | HomeScreen | / |
| Project Detail | ProjectDetailScreen | /project/:id |
| Submit | SubmitScreen | /submit |
| Profile | ProfileScreen | /profile |
| Admin | AdminScreen | /admin |

## 학습 자료
- `docs/IMPLEMENTATION_LEARNING_LOG.md` - 구현 과정 기록
