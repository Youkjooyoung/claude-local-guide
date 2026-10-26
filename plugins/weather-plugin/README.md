# weather-plugin
오늘 날씨 브리핑 → 터미널 · 카카오톡 나챗방 Claude Code 플러그인

---

### 깃허브
https://github.com/Youkjooyoung/claude-local-guide/tree/main/plugins/weather-plugin

### 플러그인 이름
`weather-plugin` (장터: `youkjooyoung-skills`)

### 플러그인 설명
「오늘 날씨 브리핑」이라고 말하면 **Open-Meteo OpenAPI**로 오늘 날씨를 받아 옷차림 한 줄과 함께 터미널에 보여 주고, **카카오톡 나챗방**으로도 보냅니다.

| 구성 | 파일 | 하는 일 |
|---|---|---|
| OpenAPI | Open-Meteo Geocoding · Forecast | 도시 → 좌표 → 현재·오늘 날씨 (API 키 없음) |
| MCP | `.mcp.json`, `mcp/weather-server.js` | 직접 만든 MCP 서버. 도구 `get_weather(city)`. 외부 패키지 없이 Node 내장 `fetch`만 사용 |
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
사용자: 오늘 부천 날씨 브리핑해줘

[날씨 브리핑] 부천시 2026-10-26 14:00 기준
- 지금: 대체로 맑음 18.9°C (체감 18.5°C)
- 오늘: 최고 19°C / 최저 13°C, 강수 57%
- 옷차림: 얇은 가디건 + 접이식 우산 챙기세요
출처: Open-Meteo

카카오톡 나챗방으로 보냈습니다.
```
다른 말로도 됩니다: "서울 날씨 어때?", "제주 날씨 알려주고 카톡으로 보내줘", "오늘 우산 챙겨야 해?"

훅이 막는 경우(예: 200자 초과):
```
PreToolUse:mcp__claude_ai_PlayMCP__KakaotalkChat-MemoChat hook: 메시지가 274자입니다. 200자 이내로 줄이세요.
고쳐서 다시 보내세요.
```

---

## 주의
- 숫자는 Open-Meteo 응답에 있는 것만 씁니다. 응답이 없으면 지어내지 않고 오류를 알립니다.
- 날씨 데이터: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).

## 라이선스
MIT
