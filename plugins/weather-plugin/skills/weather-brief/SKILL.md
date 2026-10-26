---
name: weather-brief
description: >-
  「오늘 날씨 알려줘」「내일 날씨 브리핑」「토요일 강남역 날씨」「우산 챙겨야 해?」처럼 오늘~6일 뒤 날씨 요약을 원할 때 쓴다.
  플러그인의 weather MCP 서버(Open-Meteo OpenAPI)로 날씨를 받고, outfit-advisor 에이전트로 옷차림 한 줄을 만든 뒤,
  터미널에 보여 주고 카카오톡 나챗방으로 보낸다.
---

# Weather brief (today ~ 6 days ahead)

## 0. Prerequisites
- Weather data: this plugin's MCP tool `get_weather` (server `weather`). No API key needed.
- KakaoTalk: the `KakaotalkChat-MemoChat` tool from the PlayMCP connector linked on claude.ai.
  If it is missing, still do steps 1–3 and tell the user how to connect PlayMCP (see README), then stop.

## 1. Data — call `get_weather`
- Day: `days_ahead` = days from today (오늘 0, 내일 1, 모레 2, or count to the named weekday such as 토요일). Max 6.
  If the user asks beyond 6 days, say only up to 6 days ahead is supported and stop.
- Place (default **부천시**): pass `place` as the user said it, in Korean is fine (부천, 남구로역, 강남역, 해운대).
  If a bare name is ambiguous, add the station/district word (남구로 → 남구로역). Foreign place → also pass `country_code` (e.g. Tokyo → "JP").
- Check the returned `region`. If it is not the area the user meant (wrong city or country), do not use that data — retry once with a more specific name (e.g. "서울 구로구").
- Use only numbers returned by the tool. If the call fails, report the error message and stop. Never guess values.

## 2. Outfit line — delegate to the `outfit-advisor` agent
Pass the JSON from step 1 to the `outfit-advisor` agent and take its single line as `옷차림`.

## 3. Show in terminal (Korean, exactly this shape)
Today:
```
[날씨 브리핑] 부천시 2026-10-26 13:00 기준
- 지금: 구름 조금 18.4°C (체감 17.9°C)
- 오늘: 최고 21°C / 최저 12°C, 강수 10%
- 옷차림: 얇은 가디건 챙기세요
출처: Open-Meteo
```
Future day (no 지금 line):
```
[날씨 브리핑] 남구로역 10/27(화) 예보 · 10/26 14:15 기준
- 내일: 흐림, 최고 17°C / 최저 11°C, 강수 70%
- 옷차림: 자켓 + 우산 꼭 챙기세요
출처: Open-Meteo
```
- Label = the tool's `place`; date = `date` + `weekday`. Time after the label = `observed_at` (when the data was fetched), followed by `기준`.
- Day word on the second line: 내일 (1), 모레 (2), otherwise the weekday (e.g. 토요일).
- Round temperatures to one decimal place (now) and whole numbers (max/min).

## 4. Send to KakaoTalk 나챗방
- Send the same text **once** via `KakaotalkChat-MemoChat`.
- Must start with `[날씨 브리핑]`, include `기준` on the first line, end with `출처: Open-Meteo`, and be **≤ 200 characters**.
  The plugin hook blocks the send otherwise; if blocked, fix the message as the hook says and resend once.
- After sending, tell the user in one Korean line that it was sent.

## Don'ts
- Do not add forecasts beyond 6 days ahead or facts not in the tool output.
- Do not send to anyone other than the user's own 나챗방.
