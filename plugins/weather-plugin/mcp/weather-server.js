#!/usr/bin/env node
/**
 * weather MCP 서버 — Open-Meteo OpenAPI(키 없음)를 감싼 stdio MCP 서버.
 *
 * 외부 패키지 없이 Node 18+ 내장 fetch 와 readline 만 쓴다.
 * 그래서 플러그인을 설치한 사람이 npm install 을 할 필요가 없다.
 *
 * 도구
 *   get_weather(city) — 오늘 날씨(현재 · 최고/최저 · 강수확률)를 돌려준다.
 */

const readline = require('readline');

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_CITY = 'Bucheon';

// WMO 날씨 코드 → 한국어 (https://open-meteo.com/en/docs 의 표)
const WMO = {
  0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
  45: '안개', 48: '서리 안개',
  51: '약한 이슬비', 53: '이슬비', 55: '강한 이슬비',
  56: '약한 어는 이슬비', 57: '어는 이슬비',
  61: '약한 비', 63: '비', 65: '강한 비',
  66: '약한 어는 비', 67: '어는 비',
  71: '약한 눈', 73: '눈', 75: '강한 눈', 77: '싸락눈',
  80: '약한 소나기', 81: '소나기', 82: '강한 소나기',
  85: '약한 눈 소나기', 86: '강한 눈 소나기',
  95: '뇌우', 96: '우박 동반 뇌우', 99: '강한 우박 동반 뇌우',
};

const TOOLS = [
  {
    name: 'get_weather',
    description:
      "Today's weather for a city via Open-Meteo. Pass the city name in English romanization " +
      '(e.g. "Seoul", "Bucheon", "Busan", "Jeju City"). Korean script is rejected because the ' +
      'geocoder matches it poorly. Defaults to Bucheon.',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name in English, e.g. "Bucheon"' },
      },
    },
  },
];

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Open-Meteo 응답 오류 HTTP ${res.status}`);
  return res.json();
}

async function getWeather(city) {
  city = (city || DEFAULT_CITY).trim();
  if (/[ㄱ-힝]/.test(city)) {
    throw new Error(`도시명 "${city}" 은(는) 한글입니다. 영문 이름(예: Bucheon)으로 다시 호출하세요.`);
  }

  const geo = await getJson(`${GEO_URL}?count=10&language=ko&format=json&name=${encodeURIComponent(city)}`);
  if (!geo.results || geo.results.length === 0) {
    throw new Error(`"${city}" 을(를) 찾지 못했습니다. 철자를 확인하세요.`);
  }
  // 동명 소도시보다 큰 도시를 고른다 (예: Jeju → 에티오피아가 아니라 제주시)
  const place = geo.results.reduce((a, b) => ((b.population || 0) > (a.population || 0) ? b : a));

  const q = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: 'auto',
    forecast_days: '1',
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
  });
  const w = await getJson(`${FORECAST_URL}?${q}`);
  const c = w.current;
  const d = w.daily;

  return {
    city: place.name,
    region: [place.admin1, place.country].filter(Boolean).join(', '),
    observed_at: c.time.replace('T', ' '),
    timezone: w.timezone,
    now: {
      condition: WMO[c.weather_code] ?? `코드 ${c.weather_code}`,
      temp_c: c.temperature_2m,
      feels_like_c: c.apparent_temperature,
      humidity_pct: c.relative_humidity_2m,
      wind_kmh: c.wind_speed_10m,
    },
    today: {
      condition: WMO[d.weather_code[0]] ?? `코드 ${d.weather_code[0]}`,
      max_c: d.temperature_2m_max[0],
      min_c: d.temperature_2m_min[0],
      rain_chance_pct: d.precipitation_probability_max[0],
    },
    source: 'Open-Meteo (open-meteo.com)',
  };
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function handle(req) {
  const { id, method, params } = req;
  if (id === undefined) return; // notification (notifications/initialized 등)

  switch (method) {
    case 'initialize':
      return send({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'weather', version: '0.1.0' },
        },
      });
    case 'ping':
      return send({ jsonrpc: '2.0', id, result: {} });
    case 'tools/list':
      return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    case 'tools/call': {
      if (params?.name !== 'get_weather') {
        return send({ jsonrpc: '2.0', id, error: { code: -32602, message: `알 수 없는 도구: ${params?.name}` } });
      }
      try {
        const data = await getWeather(params.arguments?.city);
        return send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] } });
      } catch (e) {
        // 도구 실패는 isError 로 돌려줘야 모델이 메시지를 읽고 다시 시도한다
        return send({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: e.message }] } });
      }
    }
    default:
      return send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let req;
  try { req = JSON.parse(line); } catch {
    return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
  }
  handle(req);
});
