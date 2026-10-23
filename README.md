# local-guide — 지역 지침서(프로젝트 CLAUDE.md) 만들기 스킬

Claude가 프로젝트 폴더마다 읽는 `CLAUDE.md`(지역 지침서)를 만들어 주거나, 이미 있는 지침서를 정리해 주는 Claude 스킬입니다.

- 전역 지침(`~/.claude/CLAUDE.md`)과 **겹치는 줄은 빼고**, 그 폴더에서만 필요한 실행 명령·구조·금지 구역·규칙만 짧게 적습니다.
- 그 폴더의 실제 관습이 전역 규칙과 다르면 찾아서 "전역의 X 대신 이 폴더는 Y"라고 적습니다. 예를 들어 전역 지침이 "주석은 이유를 설명할 때만"인데 수업 코드는 단계마다 번호 주석을 다는 경우입니다.
- 코드 저장소뿐 아니라 문서·수업 노트·기획·데이터 폴더도 다룹니다.
- 파일은 사용자가 확인하고 승인한 뒤에만 씁니다.

## 설치

### 1) Claude Code — 플러그인으로 설치 (권장)
터미널에서:
```bash
claude plugin marketplace add Youkjooyoung/claude-local-guide
claude plugin install local-guide@youkjooyoung-skills
```
Claude Code 대화창 안에서는:
```
/plugin marketplace add Youkjooyoung/claude-local-guide
/plugin install local-guide@youkjooyoung-skills
```
설치한 뒤 새 세션을 열거나 `/reload-plugins`를 실행하면 스킬이 켜집니다.

### 2) npx로 설치 (Claude Code 외 다른 에이전트 도구도 지원)
```bash
npx skills add Youkjooyoung/claude-local-guide
```
현재 프로젝트에만 설치됩니다. 모든 프로젝트에서 쓰려면 끝에 `-g`를 붙이세요.

### 3) Claude 앱(데스크톱·웹) — zip 업로드
1. [Releases](../../releases)에서 `local-guide.zip`을 내려받습니다. 또는 `plugins/local-guide/skills/local-guide` 폴더를 직접 zip으로 묶습니다(zip 안의 첫 단계가 `local-guide/SKILL.md`여야 합니다).
2. **설정 → 기능(Capabilities) → 스킬 → 스킬 업로드**에서 zip을 올립니다.

## 사용법
프로젝트 폴더에서 Claude에게 이렇게 말하면 됩니다.
- "이 폴더에 지역지침서 만들어줘"
- "이 프로젝트 CLAUDE.md가 너무 길어. 정리해줘"
- "사업계획서 쓰는 폴더인데 클로드가 지킬 규칙 만들어줘"

플러그인으로 설치했다면 `/local-guide:local-guide`로 직접 부를 수도 있습니다.

### 진행 순서
1. 기존 지침 파일과 전역 지침을 읽습니다.
2. 폴더 유형을 판별합니다(코드 / 문서 / 수업 / 데이터).
3. 파일에서 사실을 모으고, 전역 지침과 충돌하는 관습을 찾습니다.
4. 파일만 봐서는 알 수 없는 것을 최대 3개까지 묻습니다.
5. 초안을 작성하고 스스로 점검합니다.
6. 초안을 보여 드리고 승인을 받은 뒤 파일을 씁니다.

## 업데이트·삭제
```bash
claude plugin marketplace update youkjooyoung-skills
claude plugin update local-guide@youkjooyoung-skills
claude plugin uninstall local-guide@youkjooyoung-skills
```

## 폴더 구조
```
.claude-plugin/marketplace.json        마켓플레이스 목록
plugins/local-guide/
├── .claude-plugin/plugin.json         플러그인 정보
└── skills/local-guide/
    ├── SKILL.md                       스킬 본문
    └── references/
        ├── template.md                지침서 뼈대와 예시
        └── checklist.md               폴더 유형별 확인 항목
```

## 라이선스
MIT
