/**
 * Manual smoke-test for the updated caption extraction logic in lib/jobs.js.
 *
 * Run with: node test_yt_extract.js [videoUrl]
 *
 * Re-implements just enough of the extraction surface (without the DB / TTS /
 * translation deps) so that we can validate it end-to-end against a real
 * YouTube URL.
 */

const YT_DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const YT_FETCH_HEADERS = {
  'User-Agent': YT_DESKTOP_UA,
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+050; SOCS=CAI',
};

const YT_TIMEDTEXT_HEADERS = {
  'User-Agent': YT_DESKTOP_UA,
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.youtube.com/',
  'Origin': 'https://www.youtube.com',
};

const TIMEDTEXT_FMTS = ['json3', 'srv3', 'srv1', 'vtt'];

function extractVideoId(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.searchParams.has('v')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
  } catch {}
  return null;
}

function extractInitialPlayerResponse(html) {
  const idx = html.indexOf('ytInitialPlayerResponse');
  if (idx < 0) return null;
  const objStart = html.indexOf('{', idx);
  if (objStart < 0) return null;
  let depth = 0, end = -1, inStr = false, strCh = '', esc = false;
  for (let i = objStart; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === strCh) inStr = false;
      continue;
    }
    if (ch === '"' || ch === '\'') { inStr = true; strCh = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (!depth) { end = i; break; } }
  }
  if (end < 0) return null;
  try { return JSON.parse(html.slice(objStart, end + 1)); } catch { return null; }
}

function tracksFromPlayerResponse(pr) {
  const list = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  return Array.isArray(list) ? list : [];
}

async function fetchCaptionTracksViaInnerTube(videoId) {
  const clients = [
    { clientName: 'WEB', clientVersion: '2.20250101.00.00', hl: 'en', gl: 'US' },
    { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', hl: 'en', gl: 'US' },
    { clientName: 'IOS', clientVersion: '19.45.4', deviceMake: 'Apple', deviceModel: 'iPhone16,2' },
    { clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 30, hl: 'en', gl: 'US' },
  ];
  for (const client of clients) {
    try {
      const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': YT_DESKTOP_UA,
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://www.youtube.com',
          'Referer': 'https://www.youtube.com/',
        },
        body: JSON.stringify({ context: { client }, videoId, contentCheckOk: true, racyCheckOk: true }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const tracks = tracksFromPlayerResponse(data);
      if (tracks.length > 0) {
        console.log(`InnerTube ${client.clientName}: ${tracks.length} tracks`);
        return tracks;
      }
    } catch (e) {
      console.warn(`InnerTube ${client.clientName} err: ${e.message}`);
    }
  }
  return [];
}

function pickBestTrack(tracks, requestedSrcLang) {
  if (!tracks.length) return null;
  const wantLang = (requestedSrcLang || '').toLowerCase().split('-')[0];
  const score = (t) => {
    let s = 0;
    const lang = (t.languageCode || '').toLowerCase().split('-')[0];
    if (t.kind !== 'asr') s += 10;
    if (wantLang && lang === wantLang) s += 5;
    if (lang === 'en') s += 1;
    return s;
  };
  return [...tracks].sort((a, b) => score(b) - score(a))[0];
}

function buildTimedtextUrl(baseUrl, fmt) {
  try { const u = new URL(baseUrl); u.searchParams.set('fmt', fmt); return u.toString(); }
  catch { return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}fmt=${fmt}`; }
}

function parseJson3Cues(textContent) {
  const j = JSON.parse(textContent);
  const cues = [];
  for (const event of j?.events || []) {
    if (!event.segs) continue;
    const text = event.segs.map((s) => s.utf8).join('').trim();
    if (!text) continue;
    const t0 = (event.tStartMs || 0) / 1000;
    cues.push({ t0, t1: t0 + (event.dDurationMs || 0) / 1000, text });
  }
  return cues;
}

async function fetchAndParseTimedtext(baseUrl) {
  let lastEmpty = null;
  for (const fmt of TIMEDTEXT_FMTS) {
    const url = buildTimedtextUrl(baseUrl, fmt);
    let res;
    try { res = await fetch(url, { headers: YT_TIMEDTEXT_HEADERS }); }
    catch (e) { console.warn(`fetch ${fmt} threw: ${e.message}`); continue; }
    if (!res.ok) { console.warn(`fmt=${fmt} HTTP ${res.status}`); continue; }
    const body = await res.text();
    console.log(`fmt=${fmt} body len=${body.length}`);
    if (!body.trim()) { lastEmpty = res.status; continue; }
    if (fmt === 'json3' || body.trim().startsWith('{')) {
      try { const c = parseJson3Cues(body); if (c.length) return c; } catch {}
    }
  }
  if (lastEmpty !== null) {
    throw new Error('USER_FACING: YouTube returned empty caption body (locked-down track).');
  }
  throw new Error('USER_FACING: Could not download captions.');
}

async function go() {
  const videoUrl = process.argv[2] || 'https://www.youtube.com/watch?v=qtzOCxA_WoA';
  console.log('Testing', videoUrl);
  const res = await fetch(videoUrl, { headers: YT_FETCH_HEADERS });
  console.log('watch page status:', res.status);
  const html = await res.text();
  console.log('watch page len:', html.length);

  const pr = extractInitialPlayerResponse(html);
  let tracks = tracksFromPlayerResponse(pr);
  console.log('tracks from watch HTML:', tracks.length);

  if (!tracks.length) {
    const vid = extractVideoId(videoUrl);
    if (vid) tracks = await fetchCaptionTracksViaInnerTube(vid);
  }

  if (!tracks.length) {
    console.error('RESULT: USER_FACING: No tracks. Surface caption-unavailable error.');
    return;
  }

  const track = pickBestTrack(tracks, 'auto');
  console.log('Picked:', track.languageCode, track.kind || 'manual', track.name?.simpleText);
  try {
    const cues = await fetchAndParseTimedtext(track.baseUrl);
    console.log('RESULT: success — cues:', cues.length, 'first:', cues[0]);
  } catch (e) {
    console.error('RESULT:', e.message);
  }
}

go().catch((e) => { console.error('crash:', e); process.exit(1); });
