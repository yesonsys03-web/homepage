export type InstallStep = {
  command: string
  explanation: string
  note?: string
}

export type Prerequisite = {
  name: string
  check_command: string
  install_guide: string
}

export type SettingsTemplate = {
  filename: string
  content: string
  explanation: string
}

export type InstallGuide = {
  tool: "claude-code" | "gemini-cli" | "codex-cli" | "opencode"
  name: string
  emoji: string
  tagline: string
  status: "ready" | "coming-soon"
  prerequisites: Prerequisite[]
  steps: {
    mac: InstallStep[]
    windows: InstallStep[]
  }
  settings_template?: SettingsTemplate
  tips: string[]
}

const CLAUDE_MD_TEMPLATE = `# My VibeCoder Project

## 내 프로젝트에 대해
<!-- 여기에 프로젝트 설명을 적어주세요 -->

## Claude에게 부탁할 때 주의사항
- 코드 변경 전에 영향받는 파일을 먼저 알려줘
- 복잡한 변경은 단계별로 나눠서 진행해줘
- 기존 코드 스타일을 유지해줘

## 기술 스택
<!-- 예: React, TypeScript, TailwindCSS, FastAPI -->

## 하지 말아야 할 것
- .env 파일 수정하지 말기
- 불필요한 패키지 추가하지 말기
`.trimStart()

export const installGuides: InstallGuide[] = [
  {
    tool: "claude-code",
    name: "Claude Code",
    emoji: "🤖",
    tagline: "AI 페어 프로그래밍의 시작",
    status: "ready",
    prerequisites: [
      {
        name: "Node.js 18+",
        check_command: "node --version",
        install_guide: "nodejs.org에서 LTS 버전을 다운로드하거나, Mac이라면 brew install node를 실행하세요.",
      },
    ],
    steps: {
      mac: [
        {
          command: "brew install node",
          explanation: "☕ Homebrew한테 'Node.js 주문해줘' 라고 말하는 거예요. Node.js가 없으면 Claude Code를 설치할 수가 없거든요.",
          note: "Homebrew가 없으면 brew.sh에서 먼저 설치해야 해요.",
        },
        {
          command: "npm install -g @anthropic-ai/claude-code",
          explanation: "📦 npm 마트에서 Claude Code를 사서 내 컴퓨터 어디서든 쓸 수 있게 설치하는 거예요. -g는 'global', 이 폴더에서만이 아니라 전체에 까는 거예요.",
        },
        {
          command: "claude",
          explanation: "🚀 Claude Code를 실행해요! 처음 실행하면 Anthropic 계정 로그인을 요청해요.",
        },
      ],
      windows: [
        {
          command: "winget install OpenJS.NodeJS.LTS",
          explanation: "🪟 Windows에서 Node.js를 설치해요. winget은 Windows 기본 패키지 매니저예요.",
          note: "winget이 없으면 nodejs.org에서 직접 다운로드하세요.",
        },
        {
          command: "npm install -g @anthropic-ai/claude-code",
          explanation: "📦 npm 마트에서 Claude Code를 사서 내 컴퓨터 어디서든 쓸 수 있게 설치하는 거예요.",
        },
        {
          command: "claude",
          explanation: "🚀 Claude Code를 실행해요! 처음 실행하면 Anthropic 계정 로그인을 요청해요.",
        },
      ],
    },
    settings_template: {
      filename: "CLAUDE.md",
      content: CLAUDE_MD_TEMPLATE,
      explanation: "CLAUDE.md는 Claude에게 내 프로젝트를 소개하는 설명서예요. 프로젝트 폴더 최상단에 이 파일을 만들어두면 Claude가 내 프로젝트를 더 잘 이해해요.",
    },
    tips: [
      "Claude Code는 터미널에서 실행하는 AI예요. 코드 편집기(VS Code, Cursor)와 함께 쓰거나 단독으로 쓸 수 있어요.",
      "처음에는 '이 프로젝트가 뭔지 설명해줘'로 시작하면 Claude가 코드를 파악해요.",
      "CLAUDE.md 파일을 만들면 Claude가 내 프로젝트의 규칙을 기억해요.",
    ],
  },
  {
    tool: "gemini-cli",
    name: "Gemini CLI",
    emoji: "💎",
    tagline: "Google의 AI를 터미널에서",
    status: "ready",
    prerequisites: [
      {
        name: "Node.js 18+",
        check_command: "node --version",
        install_guide: "nodejs.org에서 LTS 버전을 다운로드하거나, Mac이라면 brew install node를 실행하세요.",
      },
      {
        name: "Google 계정",
        check_command: "",
        install_guide: "Google 계정이 있으면 바로 무료로 사용할 수 있어요. AI Studio API 키를 발급받으면 더 많이 쓸 수 있어요.",
      },
    ],
    steps: {
      mac: [
        {
          command: "npm install -g @google/gemini-cli",
          explanation: "📦 npm 마트에서 Gemini CLI를 내 컴퓨터 전체에 설치해요. Google이 만든 공식 터미널 AI 도구예요.",
        },
        {
          command: "gemini",
          explanation: "🚀 Gemini CLI를 실행해요! 처음 실행하면 Google 계정 로그인 창이 뜨거나 API 키를 물어봐요.",
          note: "Google 계정으로 로그인하면 Gemini 1.5 Pro를 하루 60회 무료로 쓸 수 있어요.",
        },
        {
          command: "gemini -p \"안녕! 이 프로젝트가 뭔지 설명해줘\"",
          explanation: "💬 -p 뒤에 AI에게 할 말을 적으면 돼요. 이렇게 한 줄 질문도 되고, 그냥 gemini만 치면 대화 모드로 들어가요.",
        },
      ],
      windows: [
        {
          command: "npm install -g @google/gemini-cli",
          explanation: "📦 npm 마트에서 Gemini CLI를 내 컴퓨터 전체에 설치해요.",
          note: "PowerShell이나 Command Prompt를 관리자 권한으로 실행하면 더 안전해요.",
        },
        {
          command: "gemini",
          explanation: "🚀 Gemini CLI를 실행해요! 처음 실행하면 Google 계정 로그인을 요청해요.",
          note: "Google 계정으로 로그인하면 Gemini 1.5 Pro를 하루 60회 무료로 쓸 수 있어요.",
        },
        {
          command: "gemini -p \"안녕! 이 프로젝트가 뭔지 설명해줘\"",
          explanation: "💬 -p 뒤에 AI에게 할 말을 적으면 돼요.",
        },
      ],
    },
    settings_template: {
      filename: "GEMINI.md",
      content: `# My Project — Gemini 가이드

## 프로젝트 소개
<!-- 여기에 프로젝트 설명을 적어주세요 -->

## Gemini에게 부탁할 때 주의사항
- 코드 변경 전에 어떤 파일을 바꿀지 먼저 알려줘
- 한국어로 설명해줘
- 기존 코드 스타일을 유지해줘

## 기술 스택
<!-- 예: React, TypeScript, TailwindCSS -->

## 하지 말아야 할 것
- .env 파일 수정하지 말기
- 불필요한 패키지 추가하지 말기
`.trimStart(),
      explanation: "GEMINI.md는 Gemini에게 내 프로젝트를 소개하는 설명서예요. 프로젝트 폴더에 이 파일을 만들어두면 Gemini가 내 프로젝트 맥락을 이해해요.",
    },
    tips: [
      "Google 계정으로 로그인하면 API 키 없이도 하루 60회 무료로 쓸 수 있어요.",
      "AI Studio(aistudio.google.com)에서 API 키를 발급받으면 더 많이, 더 빠르게 쓸 수 있어요.",
      "GEMINI.md 파일을 프로젝트 폴더에 두면 Gemini가 내 프로젝트 규칙을 기억해요.",
    ],
  },
  {
    tool: "codex-cli",
    name: "Codex CLI",
    emoji: "⚡",
    tagline: "OpenAI의 코드 전문 AI",
    status: "ready",
    prerequisites: [
      {
        name: "Node.js 22+",
        check_command: "node --version",
        install_guide: "nodejs.org에서 LTS 버전을 다운로드하거나, Mac이라면 brew install node를 실행하세요. Codex CLI는 Node.js 22 이상이 필요해요.",
      },
      {
        name: "OpenAI API 키",
        check_command: "echo $OPENAI_API_KEY",
        install_guide: "platform.openai.com에서 API 키를 발급받으세요. 처음엔 무료 크레딧이 주어져요.",
      },
    ],
    steps: {
      mac: [
        {
          command: "npm install -g @openai/codex",
          explanation: "📦 OpenAI가 만든 Codex CLI를 설치해요. 코드 작성에 특화된 AI 터미널 도구예요.",
        },
        {
          command: "export OPENAI_API_KEY=\"여기에-API키-입력\"",
          explanation: "🔑 OpenAI API 키를 터미널에 등록해요. 이 명령어는 현재 터미널 창에서만 유효해요. 영구적으로 저장하려면 ~/.zshrc에 추가하세요.",
          note: "~/.zshrc 파일에 export OPENAI_API_KEY=\"키\" 를 추가하면 터미널 열 때마다 자동 등록돼요.",
        },
        {
          command: "codex",
          explanation: "🚀 Codex CLI를 실행해요! 프로젝트 폴더에서 실행하면 코드를 분석하고 도움을 줘요.",
        },
        {
          command: "codex \"버그 찾아서 고쳐줘\"",
          explanation: "💬 이렇게 바로 명령을 줄 수도 있어요. Codex가 현재 폴더의 코드를 보고 답해줘요.",
        },
      ],
      windows: [
        {
          command: "npm install -g @openai/codex",
          explanation: "📦 OpenAI가 만든 Codex CLI를 설치해요.",
          note: "PowerShell을 관리자 권한으로 실행하세요.",
        },
        {
          command: "$env:OPENAI_API_KEY=\"여기에-API키-입력\"",
          explanation: "🔑 PowerShell에서 API 키를 등록하는 방법이에요. 현재 창에서만 유효해요.",
          note: "영구 등록은 시스템 환경변수 설정에서 OPENAI_API_KEY를 추가하세요.",
        },
        {
          command: "codex",
          explanation: "🚀 Codex CLI를 실행해요! 프로젝트 폴더에서 실행하세요.",
        },
        {
          command: "codex \"버그 찾아서 고쳐줘\"",
          explanation: "💬 바로 명령을 줄 수도 있어요.",
        },
      ],
    },
    tips: [
      "Codex CLI는 코드 수정, 리팩토링, 버그 수정에 특화되어 있어요.",
      "처음 사용하면 OpenAI가 무료 크레딧을 줘요. API 키 발급 후 바로 시작해보세요.",
      "프로젝트 폴더에서 실행해야 현재 코드를 분석할 수 있어요.",
    ],
  },
  {
    tool: "opencode",
    name: "OpenCode",
    emoji: "🔓",
    tagline: "오픈소스 AI 코딩 도우미",
    status: "ready",
    prerequisites: [
      {
        name: "Bun 1.0+",
        check_command: "bun --version",
        install_guide: "bun.sh에서 설치하거나, Mac이라면 brew install oven-sh/bun/bun을 실행하세요. Bun은 빠른 JavaScript 런타임이에요.",
      },
    ],
    steps: {
      mac: [
        {
          command: "curl -fsSL https://bun.sh/install | bash",
          explanation: "🍞 Bun을 설치해요. Bun은 Node.js보다 빠른 JavaScript 런타임이에요. OpenCode가 Bun으로 동작해요.",
          note: "설치 후 터미널을 다시 열거나 source ~/.zshrc를 실행해야 bun 명령어를 쓸 수 있어요.",
        },
        {
          command: "bun install -g opencode-ai",
          explanation: "📦 OpenCode를 전역 설치해요. 오픈소스라서 완전 무료로 사용할 수 있어요!",
        },
        {
          command: "opencode",
          explanation: "🚀 OpenCode를 실행해요! 처음 실행하면 사용할 AI 제공자(Anthropic, OpenAI 등)와 API 키를 선택할 수 있어요.",
          note: "Anthropic, OpenAI, Google 등 여러 AI 제공자를 선택할 수 있어요.",
        },
      ],
      windows: [
        {
          command: "powershell -c \"irm bun.sh/install.ps1 | iex\"",
          explanation: "🍞 Windows에서 Bun을 설치해요. PowerShell에서 실행하세요.",
          note: "설치 후 PowerShell을 다시 열어야 bun 명령어를 쓸 수 있어요.",
        },
        {
          command: "bun install -g opencode-ai",
          explanation: "📦 OpenCode를 전역 설치해요.",
        },
        {
          command: "opencode",
          explanation: "🚀 OpenCode를 실행해요! AI 제공자와 API 키를 선택할 수 있어요.",
        },
      ],
    },
    tips: [
      "OpenCode는 완전 오픈소스예요! GitHub에서 소스코드를 볼 수 있어요.",
      "Anthropic, OpenAI, Google Gemini 등 여러 AI를 골라서 쓸 수 있어요.",
      "자신이 가진 API 키를 그대로 쓰면 돼서 추가 비용이 없어요.",
    ],
  },
]
