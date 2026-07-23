# TaskDeck

[한국어](README.md) | [English](README.en.md)

> 자주 쓰는 앱과 사이트를 작업별로 모아 한 번에 여세요.

TaskDeck은 앱, 웹사이트, 폴더, 파일을 하나의 **작업 공간**으로 정리해 주는 Windows용 데스크톱 앱입니다. 예를 들어 `개발`, `포렌식 분석`, `영상 편집` 작업 공간을 만들고 필요한 도구를 원하는 순서대로 열 수 있습니다.

계정 가입이나 별도 서버가 필요하지 않으며, 모든 작업 공간 정보는 내 컴퓨터에 저장됩니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
![Platform](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4)
![Version](https://img.shields.io/badge/version-0.1.0-22c55e)
![Language](https://img.shields.io/badge/UI-한국어%20%7C%20English-f59e0b)

## 바로 설치하기

Windows 10/11 64비트에서 사용할 수 있습니다.

### [TaskDeck 0.1.0 EXE 설치 파일 받기](https://github.com/Kezulno/TaskDesk/releases/download/v0.1.0/TaskDeck_0.1.0_x64-setup.exe)

대부분의 사용자는 위 EXE 파일을 받으면 됩니다.

- [MSI 설치 파일 받기](https://github.com/Kezulno/TaskDesk/releases/download/v0.1.0/TaskDeck_0.1.0_x64_en-US.msi) — 회사나 기관의 관리 배포용
- [모든 버전과 업데이트 내용 보기](https://github.com/Kezulno/TaskDesk/releases)

> 다운로드 링크는 GitHub에 `v0.1.0` Release와 설치 파일이 공개된 후 작동합니다. 현재 설치 파일은 코드 서명 전 개발 버전이므로 Windows SmartScreen 안내가 나타날 수 있습니다.

## 이렇게 시작하세요

1. TaskDeck을 설치하고 실행합니다.
2. **새 작업 공간**을 눌러 작업 이름과 색상, 아이콘을 정합니다.
3. **리소스 추가**에서 앱, 웹사이트, 폴더 또는 파일을 등록합니다.
4. 각 항목의 위·아래 버튼으로 열리는 순서를 정합니다.
5. **작업 환경 열기**를 누르면 활성화된 항목이 순서대로 열립니다.

개별 항목의 **실행** 버튼을 누르거나 카드를 두 번 클릭해 하나만 열 수도 있습니다.

## 이런 작업에 유용합니다

| 작업 공간 예시 | 함께 등록할 항목                                         |
| -------------- | -------------------------------------------------------- |
| 개발           | VS Code, Docker Desktop, GitHub, API 문서, 프로젝트 폴더 |
| 보안·포렌식    | Autopsy, Wireshark, CyberChef, 분석 도구와 증거 폴더     |
| AI 작업        | ChatGPT, Claude, Copilot, 로컬 AI 도구와 프롬프트 문서   |
| 영상 편집      | 편집 프로그램, 음원·소스 폴더, 참고 사이트               |
| 공부·메모      | 노트 앱, 강의 사이트, 자료 폴더와 문서                   |

## 주요 기능

### 작업 공간 관리

- 이름, 설명, 색상, 아이콘 설정
- 즐겨찾기 고정과 작업 공간 복제
- 앱·사이트·폴더·파일을 작업 공간별로 관리
- JSON 템플릿으로 작업 구성을 백업하거나 공유

### 앱을 편하게 추가

- Windows 시작 메뉴와 Program Files에서 설치된 앱 검색
- `.exe` 파일을 직접 선택해 추가
- 탐색기에서 앱, 파일, 폴더를 끌어다 놓아 추가
- 개발, AI, 보안, 영상, 메모 등 분야별 추천 앱과 사이트 제공
- 실행 파일에서 이름과 아이콘을 가능한 범위에서 자동으로 가져오기

### 안전한 실행

- 실행 전에 앱·파일·폴더가 실제로 있는지 확인
- 웹사이트는 `http://`와 `https://` 주소만 허용
- 문제가 있는 항목은 경고로 표시하고 실행하지 않음
- 여러 항목 중 하나가 실패해도 다음 항목은 계속 실행
- 명령 프롬프트나 PowerShell 문자열을 만들어 실행하지 않음

### 내 환경에 맞게 설정

- 한국어와 English 전환
- 리소스가 열리는 간격 조절
- 창을 닫을 때 시스템 트레이로 최소화
- Windows 로그인 시 TaskDeck 자동 시작
- 기본 다크 모드

## 앱이 검색되지 않을 때

일부 앱은 Windows의 설치 방식 때문에 자동 검색되지 않을 수 있습니다.

- Microsoft Store 보호 경로에 설치된 앱
- 설치 정보가 없는 포터블 앱
- 네트워크 드라이브에 있는 앱
- 전용 런처를 통해 실행되는 일부 앱

이 경우 **리소스 추가 → 직접 추가**에서 실행 파일을 선택하거나, 탐색기에서 `.exe` 파일을 TaskDeck 창으로 끌어다 놓으세요. 웹사이트 주소도 직접 입력할 수 있습니다.

## 언어 변경

왼쪽 메뉴의 **설정 → 언어**에서 `한국어` 또는 `English`를 선택할 수 있습니다. 선택한 언어는 앱을 다시 실행해도 유지됩니다.

## 템플릿 가져오기와 공유

대시보드의 **템플릿 가져오기**로 다른 사람이 만든 작업 구성을 불러올 수 있습니다. 워크스페이스 화면에서는 현재 구성을 JSON 파일로 내보낼 수 있습니다.

- 템플릿은 앱이나 파일 자체가 아니라 이름과 경로 같은 구성 정보만 저장합니다.
- 가져온 리소스는 자동으로 실행되지 않습니다.
- 다른 컴퓨터에 존재하지 않는 경로도 저장되며 `경로 확인 필요`로 표시됩니다.
- 로컬 경로에 사용자 이름 등 개인정보가 포함될 수 있으므로 공유 전에 내용을 확인하세요.

<details>
<summary>템플릿 JSON 예시 보기</summary>

```json
{
  "schemaVersion": 1,
  "name": "Development Starter",
  "description": "Common development tools",
  "author": "TaskDeck User",
  "category": "development",
  "exportedAt": "2026-07-13T00:00:00.000Z",
  "workspace": {
    "name": "Development",
    "description": "Local development workspace",
    "icon": "code",
    "color": "#6366f1"
  },
  "resources": [
    {
      "type": "website",
      "name": "Documentation",
      "target": "https://example.com/docs",
      "icon": null,
      "description": null,
      "launchOrder": 0,
      "isEnabled": true
    }
  ]
}
```

</details>

## 자주 묻는 질문

### 앱이나 파일이 자동으로 실행되나요?

아닙니다. 사용자가 **실행** 또는 **작업 환경 열기**를 눌렀을 때만 실행됩니다. 템플릿과 추천 카탈로그를 열어 보는 것만으로 앱이 설치되거나 실행되지는 않습니다.

### 내 작업 정보가 서버로 전송되나요?

TaskDeck은 별도 백엔드 서버나 로그인을 사용하지 않습니다. 작업 공간, 리소스, 설정은 운영체제의 TaskDeck 앱 데이터 폴더에 있는 로컬 SQLite 데이터베이스에 저장됩니다.

### 설치된 앱을 전부 찾을 수 있나요?

Windows 앱마다 설치 방식이 달라 100% 탐지는 어렵습니다. 찾지 못한 앱은 실행 파일을 직접 선택하거나 드래그 앤 드롭으로 추가할 수 있습니다.

### 삭제한 작업 공간의 리소스는 어떻게 되나요?

작업 공간을 삭제하면 연결된 TaskDeck 리소스 정보도 함께 삭제됩니다. 실제 앱이나 사용자 파일은 삭제하지 않습니다.

## 개발자를 위한 안내

### 기술 스택

- Tauri v2, Rust
- React, TypeScript strict, Vite
- Tailwind CSS, Radix UI, Lucide React
- Zustand, React Router, React Hook Form, Zod
- SQLite (`rusqlite`, bundled SQLite)

### 개발 환경 준비

- Node.js 20 이상과 npm
- Rust stable (`rustup`, `cargo`, `rustc`)
- Microsoft C++ Build Tools의 **Desktop development with C++** 워크로드
- Microsoft Edge WebView2 Runtime

자세한 준비 사항은 [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)를 확인하세요.

```powershell
git clone https://github.com/Kezulno/TaskDesk.git
cd TaskDesk
npm install
npm run tauri dev
```

`npm run dev`는 브라우저 화면만 실행합니다. 데이터베이스, 파일 선택, 앱 검색과 실행을 확인하려면 반드시 `npm run tauri dev`를 사용하세요.

### 검사와 설치 파일 빌드

```powershell
npm run format:check
npm run typecheck
npm run lint
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

생성된 설치 파일은 다음 폴더에서 찾을 수 있습니다.

```text
src-tauri/target/release/bundle/nsis
src-tauri/target/release/bundle/msi
```

NSIS 설치 파일만 만들려면 `npm run tauri build -- --bundles nsis`를 실행하세요.

### 프로젝트 구조

```text
src/
  app/                    라우팅과 앱 시작점
  components/             공용 UI와 레이아웃
  features/
    catalog/              분야별 앱·사이트 카탈로그
    i18n/                 한국어·영어 번역
    launcher/             개별·일괄 실행
    resources/            리소스 관리, 앱 검색, 경로 검증
    settings/             실행 간격, 트레이, 자동 시작, 언어
    templates/            JSON 가져오기·내보내기
    workspaces/           작업 공간 관리
  pages/                  화면별 페이지
src-tauri/
  capabilities/           Tauri 권한
  src/                    SQLite, 검증, 검색 및 실행 Command
```

## 보안과 개인정보

- 프론트엔드에 범용 shell 실행 기능을 제공하지 않습니다.
- 실행 경로를 `cmd.exe`나 PowerShell 명령 문자열에 결합하지 않습니다.
- 웹사이트는 HTTP/HTTPS만 허용합니다.
- JSON 파일을 명령이나 스크립트로 해석하지 않습니다.
- 설치 파일은 아직 코드 서명되지 않았습니다.

보안 문제를 발견했다면 공개 이슈를 작성하기 전에 [SECURITY.md](SECURITY.md)의 신고 방법을 확인해 주세요.

## 현재 알려진 제한 사항

- 일부 Microsoft Store/UWP 앱과 특수 런처는 자동 탐지나 실행이 제한될 수 있습니다.
- 앱 이름과 아이콘 품질은 설치 프로그램과 바로가기 정보에 따라 달라집니다.
- 일부 Windows 및 Rust 상세 오류는 운영체제가 제공한 원문으로 표시될 수 있습니다.
- 코드 서명과 자동 업데이트는 아직 제공하지 않습니다.

## 앞으로 추가할 기능

- 코드 서명된 설치 파일과 자동 업데이트
- Microsoft Store 앱 탐지 개선
- 컴퓨터마다 다른 템플릿 경로를 쉽게 다시 연결하는 기능
- 드래그 앤 드롭 순서 변경과 실행 프로필
- 추가 언어와 접근성 개선

## 기여하기

버그 수정, 번역, 문서와 카탈로그 개선을 환영합니다. 시작하기 전에 [CONTRIBUTING.md](CONTRIBUTING.md)와 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)를 읽어 주세요.

## English

TaskDeck is a Windows-first, local-first workspace launcher for organizing applications, websites, folders, and files. Create a workspace, add the tools you need, arrange their order, and open your work environment with one action. No account or backend server is required. You can switch the interface to English under **Settings → Language**.

## 라이선스

TaskDeck은 [MIT License](LICENSE)로 배포됩니다.
