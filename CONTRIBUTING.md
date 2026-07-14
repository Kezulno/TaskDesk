# Contributing to TaskDeck

TaskDeck에 기여해 주셔서 감사합니다. 작은 범위의 변경과 검증 가능한 설명을 선호합니다.

## 개발 환경

Windows 10/11, Node.js 20 이상, Rust stable, Microsoft C++ Build Tools와 WebView2가 필요합니다.

```powershell
npm install
npm run tauri dev
```

## 변경 절차

1. 기존 issue를 확인하고 큰 변경은 먼저 제안합니다.
2. 기능별로 작은 브랜치와 커밋을 만듭니다.
3. 사용자 입력은 프론트엔드와 Rust 양쪽에서 검증합니다.
4. 범용 shell 실행, 임의 SQL 실행, 비밀 정보나 로컬 절대 경로를 커밋하지 않습니다.
5. UI 변경에는 로딩·빈 상태·오류·키보드 사용성을 함께 확인합니다.

## 제출 전 검사

```powershell
npm run typecheck
npm run lint
npm run format:check
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Pull request에는 변경 이유, 검증 명령과 결과, UI 변경 시 스크린샷을 포함해 주세요. 보안 취약점은 공개 issue 대신 [SECURITY.md](SECURITY.md)의 절차를 따릅니다.
