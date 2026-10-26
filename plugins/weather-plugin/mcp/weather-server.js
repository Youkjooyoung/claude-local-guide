#!/usr/bin/env node
/**
 * weather MCP 서버 — Open-Meteo OpenAPI(키 없음)를 감싼 stdio MCP 서버.
 *
 * 외부 패키지 없이 Node 18+ 내장 fetch 와 readline 만 쓴다.
 * 그래서 플러그인을 설치한 사람이 npm install 을 할 필요가 없다.
 *
 * 도구
 *   get_weather(place, days_ahead) — 오늘~6일 뒤 날씨(최고/최저 · 강수확률, 오늘은 현재 날씨 포함)
 *
 * 위치 검색은 Nominatim(OpenStreetMap)을 먼저 쓴다. Open-Meteo 지오코더(GeoNames)는
 * 한국의 구·동·역을 모르기 때문이다. Nominatim 이 실패할 때만 Open-Meteo 지오코더로 넘어간다.
 */

const readline = require('readline');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
// Nominatim 이용 정책: 앱을 알 수 있는 User-Agent 필수, 초당 1회 이하
const USER_AGENT = 'weather-plugin/0.3.0 (+https://github.com/Youkjooyoung/claude-local-guide)';
const DEFAULT_PLACE = '부천시';
const MAX_DAYS_AHEAD = 6; // 7일 넘게는 예보 정확도가 크게 떨어진다
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

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
      'Weather for today up to 6 days ahead via Open-Meteo. `place` accepts the name exactly as the ' +
      'user said it, in Korean or English — city, district, neighborhood, station or landmark ' +
      '(e.g. "부천", "남구로역", "강남역", "해운대"). Check the returned `region` matches the place ' +
      'the user meant. Defaults to 부천시, today.',
    inputSchema: {
      type: 'object',
      properties: {
        place: { type: 'string', description: 'Place name as the user said it, e.g. "남구로역"' },
        country_code: { type: 'string', description: 'ISO country code. Default "KR"; pass e.g. "JP" for Tokyo' },
        days_ahead: {
          type: 'integer', minimum: 0, maximum: MAX_DAYS_AHEAD,
          description: '0 = today (default), 1 = tomorrow, 2 = the day after, ... up to 6',
        },
      },
    },
  },
];

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`${new URL(url).host} 응답 오류 HTTP ${res.status}`);
  return res.json();
}

let lastNominatimAt = 0;

async function searchNominatim(name, cc) {
  // 대기 전에 슬롯을 먼저 잡아야 동시 요청이 같은 시각에 몰리지 않는다
  const slot = Math.max(Date.now(), lastNominatimAt + 1000);
  lastNominatimAt = slot;
  const wait = slot - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  const q = new URLSearchParams({ q: name, format: 'jsonv2', limit: '1', countrycodes: cc.toLowerCase(), 'accept-language': 'ko' });
  const [hit] = await getJson(`${NOMINATIM_URL}?${q}`, { 'User-Agent': USER_AGENT });
  if (!hit) return null;
  // display_name: "남구로역, 구로동로, 가리봉동, 구로2동, 구로구, 서울특별시, 08320, 대한민국"
  const parts = hit.display_name.split(', ').filter((p) => !/^\d{5}$/.test(p));
  return {
    name: parts[0],
    region: parts.slice(1).join(', '),
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
  };
}

async function searchOpenMeteo(name, cc) {
  const geo = await getJson(
    `${GEO_URL}?count=10&language=ko&format=json&countryCode=${cc}&name=${encodeURIComponent(name)}`);
  if (!geo.results || geo.results.length === 0) return null;
  // 동명 마을보다 큰 도시를 고른다 (예: Jeju → 제주시)
  const p = geo.results.reduce((a, b) => ((b.population || 0) > (a.population || 0) ? b : a));
  return {
    name: p.name,
    region: [p.admin1, p.admin2, p.country].filter(Boolean).join(', '),
    latitude: p.latitude,
    longitude: p.longitude,
  };
}

async function findPlace(name, countryCode) {
  name = (name || DEFAULT_PLACE).trim();
  const cc = (countryCode || 'KR').toUpperCase();
  let place = null;
  try {
    place = await searchNominatim(name, cc);
  } catch {
    // Nominatim 장애·차단 시 Open-Meteo 지오코더로 넘어간다
  }
  if (!place) place = await searchOpenMeteo(name, cc);
  if (!place) throw new Error(`"${name}" 을(를) ${cc} 에서 찾지 못했습니다. 더 큰 지역명(구·시)으로 다시 호출하세요.`);
  return place;
}

async function getWeather(args = {}) {
  const i = Number.isInteger(args.days_ahead) ? Math.min(Math.max(args.days_ahead, 0), MAX_DAYS_AHEAD) : 0;
  const place = await findPlace(args.place, args.country_code);

  const q = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: 'auto',
    forecast_days: String(i + 1), // daily[i] = i일 뒤
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code',
  });
  const w = await getJson(`${FORECAST_URL}?${q}`);
  const c = w.current;
  const d = w.daily;

  const result = {
    place: place.name,
    region: place.region,
    days_ahead: i,
    date: d.time[i],
    weekday: WEEKDAYS[new Date(`${d.time[i]}T00:00:00Z`).getUTCDay()],
    observed_at: c.time.replace('T', ' '),
    timezone: w.timezone,
    forecast: {
      condition: WMO[d.weather_code[i]] ?? `코드 ${d.weather_code[i]}`,
      max_c: d.temperature_2m_max[i],
      min_c: d.temperature_2m_min[i],
      rain_chance_pct: d.precipitation_probability_max[i],
      max_wind_kmh: d.wind_speed_10m_max[i],
    },
    source: 'Open-Meteo (open-meteo.com)',
  };
  if (i === 0) {
    result.now = {
      condition: WMO[c.weather_code] ?? `코드 ${c.weather_code}`,
      temp_c: c.temperature_2m,
      feels_like_c: c.apparent_temperature,
      humidity_pct: c.relative_humidity_2m,
      wind_kmh: c.wind_speed_10m,
    };
  }
  return result;
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
          serverInfo: { name: 'weather', version: '0.3.0' },
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
        const data = await getWeather(params.arguments);
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
