# TaskDeck

TaskDeck은 반복 작업에 필요한 애플리케이션, 웹사이트, 폴더와 파일을 워크스페이스로 묶어 관리하고 순서대로 여는 Windows 우선 데스크톱 앱입니다. 로컬 우선으로 동작하며 별도 계정이나 백엔드 서버가 필요하지 않습니다.

> 현재 버전: `0.1.0` MVP. 중요한 작업 환경에 사용하기 전에 등록된 경로와 실행 순서를 직접 확인하세요.

## 주요 기능

- SQLite에 영구 저장되는 워크스페이스 및 리소스 CRUD
- 애플리케이션, 웹사이트, 폴더, 파일의 개별 실행
- 활성 리소스를 저장된 순서에 맞춰 한 번에 여는 작업 환경 준비
- 실행 간격 설정, 경로 검증, 실패 후 계속 진행되는 결과 보고
- Windows 시작 메뉴, Program Files, 사용자별 Programs 폴더와 설치 정보 레지스트리 기반 앱 검색
- 설치 앱 아이콘 지연 로딩과 실행 파일 중복·보조 도구 필터링
- Windows 탐색기에서 앱, 파일과 폴더를 여러 개 드래그 앤 드롭해 추가
- 개발, AI 개발 도구, AI, 브라우저, 문서·업무, 소통, 파일·클라우드, 유틸리티, 리버싱, 포렌식, 보안, 영상, 메모, 데이터 분야별 앱·웹 카탈로그
- 추천 앱 설치 상태 확인, 공식 사이트 안내 및 작업 공간 추가
- 분야별 웹 도구·문서·학습 사이트와 외부 업로드 개인정보 경고
- 워크스페이스 색상 팔레트, 사용자 지정 색상과 Lucide 아이콘 선택
- 설치 앱 이름·실행 경로·아이콘 자동 입력 및 32/64비트 Windows 호환성 검사
- 선택한 파일 확장자의 Windows 기본 연결 앱 검색 및 등록
- 워크스페이스 템플릿 JSON 가져오기 및 내보내기
- 워크스페이스 즐겨찾기 고정 및 리소스를 포함한 복제
- 전체 리소스 경로 점검과 문제 항목 수정
- 시스템 트레이 최소화 및 Windows 로그인 시 자동 시작
- 기본 다크 모드, 빈 상태·로딩·오류·삭제 확인 UI

## 스크린샷

릴리스 스크린샷은 아직 저장소에 포함되지 않았습니다. 첫 공개 릴리스 전에 다음 화면을 `docs/screenshots`에 추가할 예정입니다.

- 대시보드 및 워크스페이스 카드
- 리소스 관리와 경로 경고
- 작업 환경 준비 진행 및 결과
- 템플릿 가져오기 미리보기

## 기술 스택

- Tauri v2, Rust
- React, TypeScript strict, Vite
- Tailwind CSS, Radix UI 기반 컴포넌트, Lucide React
- Zustand, React Router, React Hook Form, Zod
- SQLite (`rusqlite`, bundled SQLite)

## 지원 운영체제

TaskDeck UI와 데이터 관리는 Tauri가 지원하는 데스크톱 환경에서 빌드할 수 있지만, 리소스 실행과 설치 앱 검색은 Windows 전용으로 구현되어 있습니다. MVP의 공식 지원 대상은 Windows 10 및 Windows 11 x64입니다.

## 사전 요구 사항

- Node.js 20 이상과 npm
- Rust stable (`rustup`, `cargo`, `rustc`)
- Microsoft C++ Build Tools의 Desktop development with C++ 워크로드
- Microsoft Edge WebView2 Runtime

자세한 준비 사항은 [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)를 확인하세요.

## 설치

```powershell
git clone <repository-url>
cd TaskDeck
npm install
```

잠금 파일과 정확히 같은 의존성을 설치하려면 `npm ci`를 사용할 수 있습니다.

## 개발 실행

```powershell
npm run tauri dev
```

프론트엔드만 확인하려면 `npm run dev`를 사용할 수 있지만, Tauri Command가 필요한 데이터베이스·Dialog·실행 기능은 동작하지 않습니다.

## 검사 및 빌드

```powershell
npm run typecheck
npm run lint
npm run format:check
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Windows에서 `npm run tauri build`를 실행하면 기본 설정에 따라 `src-tauri/target/release/bundle` 아래에 MSI/NSIS 설치 파일이 생성됩니다. 코드 서명 인증서는 프로젝트에 포함되어 있지 않으므로 공개 배포 시 별도 서명 절차가 필요합니다.

일반 사용자에게는 관리자 권한 없이 현재 사용자 영역에 설치되는 NSIS `TaskDeck_*_x64-setup.exe` 파일을 배포하는 것을 권장합니다. MSI가 필요하지 않은 경우 다음 명령으로 NSIS 설치 파일만 생성할 수 있습니다.

```powershell
npm run tauri build -- --bundles nsis
```

## 데이터 저장 및 migration

데이터베이스는 Tauri가 제공하는 운영체제별 앱 데이터 디렉터리의 `taskdeck.db`에 생성됩니다. 앱 시작 시 Rust가 테이블과 인덱스를 idempotent하게 적용하고 `PRAGMA foreign_keys = ON`을 확인합니다. 워크스페이스 삭제 시 연결된 리소스는 `ON DELETE CASCADE`로 삭제됩니다.

프론트엔드는 SQL을 직접 실행하지 않으며 구조화된 Tauri Command만 호출합니다.

## 앱 카탈로그 확장

카탈로그는 `src/features/catalog/catalogData.ts`의 카테고리와 앱 데이터로 구성됩니다. 새 분야는 `catalogCategories`에 추가하고 추천 도구는 `catalogApplications`에 공식 `http/https` 주소와 Windows 실행 파일 이름 힌트를 등록합니다. 설치 파일은 TaskDeck이 자동 다운로드하거나 실행하지 않습니다.

## 프로젝트 구조

```text
src/
  app/                    라우팅과 애플리케이션 진입점
  components/             공용 UI와 레이아웃
  features/
    catalog/              분야별 앱 카탈로그 데이터와 공식 사이트 연결
    launcher/             개별 실행과 작업 환경 준비 상태 및 UI
    resources/            리소스 CRUD와 설치 앱 검색
    settings/             실행 간격 설정
    templates/            JSON 가져오기·내보내기
    workspaces/           워크스페이스 CRUD
  pages/                  라우트 페이지
  types/                  공유 TypeScript 타입
src-tauri/
  capabilities/           최소 Tauri 권한
  src/                    SQLite와 Rust Command
```

## 템플릿 JSON

템플릿은 실제 애플리케이션이나 사용자 파일을 포함하지 않고 구성 정보만 저장합니다.

```json
{
  "schemaVersion": 1,
  "name": "Development Starter",
  "description": "Common development tools",
  "author": "TaskDeck User",
  "category": "development",
  "exportedAt": "2026-07-13T00:00:00.000Z",
  "workspace": {
    "name": "개발 작업",
    "description": "개발 환경",
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

가져오기는 schemaVersion 1, 최대 1MB, 최대 200개 리소스만 허용합니다. 알 수 없는 타입과 HTTP/HTTPS가 아닌 웹사이트 URL은 거부합니다. 동일한 워크스페이스 이름은 `(2)`, `(3)` 접미사로 구분됩니다.

## 보안 주의사항

- 프론트엔드에 범용 shell API를 노출하지 않습니다.
- 애플리케이션은 `.exe` 존재 여부를 확인한 뒤 인자 없이 직접 시작합니다.
- 애플리케이션 등록 시 Windows `GetBinaryTypeW`로 실행 형식과 호환성을 확인합니다.
- 파일 기본 앱 검색은 Windows `AssocQueryStringW`를 사용하며 shell이나 레지스트리 전체 검색을 실행하지 않습니다.
- 웹사이트는 HTTP와 HTTPS만 허용하고 폴더·파일은 존재 여부를 먼저 확인합니다.
- 실행 대상은 `cmd.exe`나 PowerShell 명령 문자열에 결합하지 않습니다.
- 가져온 템플릿은 어떤 리소스도 자동 실행하지 않습니다.
- 템플릿에는 사용자 이름 등이 포함된 로컬 경로가 저장될 수 있으므로 공유 전에 확인해야 합니다.
- 공개 배포 파일은 신뢰할 수 있는 코드 서명 인증서로 서명하는 것을 권장합니다.

취약점 신고는 [SECURITY.md](SECURITY.md)를 따라 주세요.

## 로드맵

- 서명된 Windows 설치 파일과 자동 업데이트
- Registry 및 Microsoft Store 앱 탐지 개선
- 드래그 앤 드롭 리소스 정렬
- 템플릿 경로 매핑과 공유용 경로 정리 도구
- 접근성 및 다국어 지원 강화

## 기여

버그 수정과 문서 개선을 환영합니다. 작업을 시작하기 전에 [CONTRIBUTING.md](CONTRIBUTING.md)와 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)를 읽어 주세요.

## 라이선스

TaskDeck은 [MIT License](LICENSE)로 배포됩니다.
