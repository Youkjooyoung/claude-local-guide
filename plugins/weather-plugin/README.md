# weather-plugin
오늘·내일 날씨 브리핑 → 터미널 · 카카오톡 나챗방 Claude Code 플러그인

---

### 깃허브
https://github.com/Youkjooyoung/claude-local-guide/tree/main/plugins/weather-plugin

### 플러그인 이름
`weather-plugin` (장터: `youkjooyoung-skills`)

### 플러그인 설명
오늘·내일 날씨를 옷차림 조언과 함께 요약해 터미널과 **카카오톡 나챗방**으로 보내는 날씨 브리핑 플러그인입니다. 날씨는 **Open-Meteo OpenAPI**에서 받습니다.

| 구성 | 파일 | 하는 일 |
|---|---|---|
| OpenAPI | Nominatim(OpenStreetMap) · Open-Meteo Forecast | 장소(한글 가능) → 좌표 → 오늘~6일 뒤 날씨 (API 키 없음) |
| MCP | `.mcp.json`, `mcp/weather-server.js` | 직접 만든 MCP 서버. 도구 `get_weather(place, days_ahead)`. 외부 패키지 없이 Node 내장 `fetch`만 사용 |
| MCP | PlayMCP `KakaotalkChat-MemoChat` | 결과를 카카오톡 나챗방으로 전송 |
| Skill | `skills/weather-brief/SKILL.md` | 날씨 조회 → 옷차림 → 터미널 출력 → 나챗방 전송 순서 |
| Agent | `agents/outfit-advisor.md` | 날씨 수치만 보고 옷차림·우산 조언 한 줄 |
| Hook | `hooks/check-weather-message.js` | 나챗방 전송 직전 `[날씨 브리핑]` 메시지 검사 — 200자 · 기준 시각 · 출처 |

### 플러그인 설치 명령어
Claude Code 대화창에서:
```
/plugin marketplace add Youkjooyoung/claude-local-guide
/plugin install weather-plugin@youkjooyoung-skills
```
터미널에서:
```bash
claude plugin marketplace add Youkjooyoung/claude-local-guide
claude plugin install weather-plugin@youkjooyoung-skills
```
설치한 뒤 Claude Code를 다시 시작하면 `/mcp`에 `plugin:weather-plugin:weather` 서버가 보입니다.

**전제조건**
1. **Node.js 18 이상** — MCP 서버와 훅을 실행합니다.
2. **카카오톡 나챗방(선택)** — [PlayMCP](https://playmcp.kakao.com/mcp/1) 도구함에 `카카오톡 나챗방`을 담고, [claude.ai 커넥터](https://claude.ai/customize/connectors)에 PlayMCP를 연결합니다. 같은 계정이면 Claude Code `/mcp`에 `claude.ai PlayMCP`로 뜹니다. 연결하지 않으면 터미널 출력까지만 합니다.

### 플러그인 사용 예시
```
사용자: 남구로 내일 날씨 브리핑해줘

[날씨 브리핑] 구로구 남구로역 10/27(화) 예보 · 10/26 14:15 기준
- 내일: 대체로 맑음, 최고 16°C / 최저 5°C, 강수 0%
- 옷차림: 일교차가 커요, 트렌치코트에 두꺼운 니트 겹쳐 입으세요
출처: Open-Meteo

카카오톡 나챗방으로 위 브리핑을 보냈습니다. 우산은 챙기지 않아도 됩니다.
```
다른 말로도 됩니다: "오늘 부천 날씨 브리핑해줘", "토요일 강남역 날씨 어때?", "모레 해운대 날씨 카톡으로 보내줘", "오늘 우산 챙겨야 해?"

- 시·구·동·역 이름을 한글로 그대로 찾습니다(Nominatim). 못 찾으면 Open-Meteo 지오코더로 다시 찾습니다.
- 오늘부터 6일 뒤까지 지원합니다(7일이 넘으면 예보 정확도가 크게 떨어집니다).

훅이 막는 경우(예: 200자 초과):
```
PreToolUse:mcp__claude_ai_PlayMCP__KakaotalkChat-MemoChat hook: 메시지가 274자입니다. 200자 이내로 줄이세요.
고쳐서 다시 보내세요.
```

---

## 주의
- 숫자는 Open-Meteo 응답에 있는 것만 씁니다. 응답이 없으면 지어내지 않고 오류를 알립니다.
- 날씨 데이터: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). 위치 검색: [OpenStreetMap Nominatim](https://nominatim.org/) (ODbL, 초당 1회 제한을 지킵니다).

## 라이선스
MIT
