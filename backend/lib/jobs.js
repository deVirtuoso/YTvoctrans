import db from './db';
import { translateText } from './translation';
import { generateTTS } from './tts';

/**
 * Extracts Video ID from a YouTube video URL or timedtext URL.
 * @param {string} urlStr - The input URL.
 * @returns {string} The extracted Video ID or a fallback unique ID.
 */
export function extractVideoId(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.searchParams.has('v')) {
      return url.searchParams.get('v');
    }
    if (url.pathname.includes('/embed/')) {
      return url.pathname.split('/embed/')[1].split('?')[0];
    }
    if (url.searchParams.has('vssId')) {
      const vssId = url.searchParams.get('vssId');
      const parts = vssId.split('.');
      if (parts.length > 1) return parts[1];
    }
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1);
    }
  } catch (e) {
    /* ignore */
  }
  
  // Try regex matching as fallback
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = urlStr.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }

  return 'unknown_video';
}

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

class CaptionUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CaptionUnavailableError';
    this.userFacing = true;
  }
}

/**
 * Builds a candidate timedtext URL with the requested format.
 */
function buildTimedtextUrl(baseUrl, fmt) {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('fmt', fmt);
    return url.toString();
  } catch {
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}fmt=${fmt}`;
  }
}

/**
 * Parses a json3-format timedtext payload into the standard cues array.
 */
function parseJson3Cues(textContent) {
  const captionJson = JSON.parse(textContent);
  const cues = [];
  if (captionJson && Array.isArray(captionJson.events)) {
    for (const event of captionJson.events) {
      if (!event.segs) continue;
      const text = event.segs.map((s) => s.utf8).join('').trim();
      if (!text) continue;
      const t0 = (event.tStartMs || 0) / 1000;
      const duration = (event.dDurationMs || 0) / 1000;
      cues.push({ t0, t1: t0 + duration, text });
    }
  }
  return cues;
}

/**
 * Helper to fetch a timedtext URL and parse it into standard cues array.
 * Tries multiple formats because YouTube sometimes serves 200/empty for one
 * format while another works.
 * @param {string} timedtextUrl - The YouTube timedtext URL.
 * @returns {Promise<Array<{t0: number, t1: number, text: string}>>} Cues array.
 */
async function fetchAndParseTimedtext(timedtextUrl) {
  let lastEmptyStatus = null;
  for (const fmt of TIMEDTEXT_FMTS) {
    const candidateUrl = buildTimedtextUrl(timedtextUrl, fmt);
    console.log(`[Job Worker] Fetching timedtext (fmt=${fmt}): ${candidateUrl}`);
    let res;
    try {
      res = await fetch(candidateUrl, { headers: YT_TIMEDTEXT_HEADERS });
    } catch (err) {
      console.warn(`[Job Worker] Timedtext fetch (fmt=${fmt}) threw: ${err.message}`);
      continue;
    }
    if (!res.ok) {
      console.warn(`[Job Worker] Timedtext fmt=${fmt} returned HTTP ${res.status}`);
      continue;
    }

    const contentType = res.headers.get('content-type') || '';
    const textContent = await res.text();
    console.log(
      `[Job Worker] Timedtext fmt=${fmt} body length: ${textContent.length}, Content-Type: ${contentType}`
    );

    if (!textContent.trim()) {
      lastEmptyStatus = res.status;
      continue;
    }

    if (fmt === 'json3' || contentType.includes('json') || textContent.trim().startsWith('{')) {
      try {
        const cues = parseJson3Cues(textContent);
        if (cues.length > 0) return cues;
      } catch (e) {
        console.warn('[Jobs] Failed to parse timedtext as JSON, will try XML:', e.message);
      }
    }

    const cues = parseXmlCaptions(textContent);
    if (cues.length > 0) return cues;
  }

  if (lastEmptyStatus !== null) {
    throw new CaptionUnavailableError(
      'YouTube returned an empty caption body. This usually means YouTube has restricted server-side caption access for this video. Please pick a different video, or run the translation while signed in to YouTube in your browser.'
    );
  }
  throw new CaptionUnavailableError('Could not download captions for this video.');
}

/**
 * Extracts the ytInitialPlayerResponse JSON object out of a YouTube watch page.
 * Returns the parsed object, or null when not present.
 */
function extractInitialPlayerResponse(html) {
  const idx = html.indexOf('ytInitialPlayerResponse');
  if (idx < 0) return null;
  const objStart = html.indexOf('{', idx);
  if (objStart < 0) return null;
  let depth = 0;
  let end = -1;
  let inStr = false;
  let strCh = '';
  let esc = false;
  for (let i = objStart; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === strCh) { inStr = false; }
      continue;
    }
    if (ch === '"' || ch === '\'') { inStr = true; strCh = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return null;
  try {
    return JSON.parse(html.slice(objStart, end + 1));
  } catch {
    return null;
  }
}

/**
 * Pulls caption tracks from a YouTube playerResponse-like object.
 */
function tracksFromPlayerResponse(pr) {
  const list = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  return Array.isArray(list) ? list : [];
}

/**
 * Tries YouTube's InnerTube /v1/player as a fallback for retrieving the
 * captionTracks list, for cases where the watch page HTML doesn't include
 * one (e.g. Vercel data-center IPs hitting a consent gate).
 */
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
        body: JSON.stringify({
          context: { client },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const tracks = tracksFromPlayerResponse(data);
      if (tracks.length > 0) {
        console.log(
          `[Job Worker] InnerTube ${client.clientName} returned ${tracks.length} caption tracks.`
        );
        return tracks;
      }
    } catch (err) {
      console.warn(`[Job Worker] InnerTube ${client.clientName} threw: ${err.message}`);
    }
  }
  return [];
}

/**
 * Picks the best caption track for the requested source language.
 * Prefers manual tracks over ASR, then a language match, then English, then first.
 */
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

/**
 * Fetches subtitles from YouTube video page as a fallback.
 * @param {string} videoUrl - The YouTube video URL.
 * @param {string} [requestedSrcLang] - The caller's preferred source language.
 * @returns {Promise<Array<{t0: number, t1: number, text: string}>>} The parsed subtitles cues.
 */
async function fetchSubtitlesFromVideoPage(videoUrl, requestedSrcLang) {
  console.log(`[Job Worker] Fetching video page: ${videoUrl}`);
  const res = await fetch(videoUrl, { headers: YT_FETCH_HEADERS });
  if (!res.ok) throw new Error(`Failed to load YouTube video page: ${res.status}`);
  const html = await res.text();
  console.log(`[Job Worker] Video page HTML length: ${html.length}`);

  let tracks = [];
  const pr = extractInitialPlayerResponse(html);
  if (pr) {
    tracks = tracksFromPlayerResponse(pr);
    console.log(`[Job Worker] Player response captionTracks: ${tracks.length}`);
  }

  if (tracks.length === 0) {
    // Some YouTube responses (especially from data-center IPs) bury the watch
    // page behind a consent wall that strips captionTracks. Fall back to
    // YouTube's InnerTube API which is more permissive.
    const videoId = extractVideoId(videoUrl);
    if (videoId && videoId !== 'unknown_video') {
      console.log(`[Job Worker] Watch page has no caption tracks. Trying InnerTube for ${videoId}.`);
      tracks = await fetchCaptionTracksViaInnerTube(videoId);
    }
  }

  if (tracks.length === 0) {
    throw new CaptionUnavailableError(
      'No subtitle tracks are available for this video. This video either has no captions, is private/age-restricted, or YouTube has blocked server-side access. Try a different video.'
    );
  }

  const track = pickBestTrack(tracks, requestedSrcLang);
  console.log(
    `[Job Worker] Selected track: ${track.languageCode} (${track.name?.simpleText || track.kind || 'unknown'})`
  );

  return await fetchAndParseTimedtext(track.baseUrl);
}

/**
 * Parses XML captions (srv1 / srv2 / srv3 fallback).
 * @param {string} xmlText - The raw XML timedtext.
 * @returns {Array<{t0: number, t1: number, text: string}>} The parsed cues.
 */
function parseXmlCaptions(xmlText) {
  const cues = [];
  const regex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    const t0 = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    if (text) {
      cues.push({ t0, t1: t0 + duration, text });
    }
  }
  return cues;
}

/**
 * Core asynchronous translation job execution runner.
 * @param {string} jobId - The unique identifier of this job.
 */
export async function runTranslationJob(jobId, userId = null) {
  try {
    // 1. Fetch job parameters from database
    const jobRes = await db.execute({
      sql: 'SELECT id, source_url, src_lang, tgt_lang, video_id, cues_json FROM jobs WHERE id = ?',
      args: [jobId],
    });

    if (jobRes.rows.length === 0) {
      console.error(`[Job Worker] Job ${jobId} not found in database.`);
      return;
    }

    const job = jobRes.rows[0];
    let cues = [];
    
    console.log(`[Job Worker] Running job ${jobId} with URL: ${job.source_url}`);

    if (job.cues_json) {
      try {
        cues = JSON.parse(job.cues_json);
        console.log(`[Job Worker] Using uploaded cues directly, count: ${cues.length}`);
      } catch (err) {
        console.warn(`[Job Worker] Failed to parse uploaded cues_json: ${err.message}`);
      }
    }

    if (cues.length === 0) {
      try {
        if (job.source_url.includes('/api/timedtext') || job.source_url.includes('timedtext')) {
          cues = await fetchAndParseTimedtext(job.source_url);
        } else {
          cues = await fetchSubtitlesFromVideoPage(job.source_url, job.src_lang);
        }
      } catch (primaryErr) {
        console.warn(`[Job Worker] Primary subtitle extraction failed: ${primaryErr.message}.`);
        if (primaryErr && primaryErr.userFacing) {
          throw primaryErr;
        }
        throw new Error(`Failed to extract subtitles: ${primaryErr.message}`);
      }
    }


    if (cues.length === 0) {
      throw new CaptionUnavailableError(
        'No captions could be extracted from this video. Try a video that has visible subtitles.'
      );
    }

    console.log(`[Job Worker] Parsed ${cues.length} subtitles cues. Starting translation to: ${job.tgt_lang}`);

    // Step 2: Group cues into 60-second buckets (the extension's standard "idx" tiles)
    const buckets = new Map();
    for (const cue of cues) {
      const midpoint = (cue.t0 + cue.t1) / 2;
      const idx = Math.floor(midpoint / 60);
      if (!buckets.has(idx)) {
        buckets.set(idx, []);
      }
      buckets.get(idx).push(cue);
    }

    // Step 3: Process each 60-second tile
    const totalBuckets = buckets.size;
    let processed = 0;

    for (const [idx, bucketCues] of buckets.entries()) {
      console.log(`[Job Worker] Processing tile index ${idx} with ${bucketCues.length} cues`);

      // Translate all cues in this bucket
      const translatedCues = [];
      const translatedTexts = [];
      
      for (const cue of bucketCues) {
        const translated = await translateText(cue.text, job.tgt_lang, job.src_lang);
        translatedCues.push({
          t0: cue.t0,
          t1: cue.t1,
          text: translated
        });
        translatedTexts.push(translated);
      }

      // Generate a single combined audio for the whole 60-second bucket
      const combinedText = translatedTexts.join(' ');
      const audioBuffer = await generateTTS(combinedText, job.tgt_lang);

      // Save translation segment metadata
      await db.execute({
        sql: `
          INSERT INTO translation_segments (job_id, idx, t0, t1, text, subs_json)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          jobId,
          idx,
          idx * 60,
          (idx + 1) * 60,
          combinedText,
          JSON.stringify(translatedCues)
        ]
      });

      // Save audio segment BLOB
      const audioSegmentId = `${jobId}_${idx}`;
      await db.execute({
        sql: 'INSERT INTO audio_segments (id, job_id, idx, audio_data) VALUES (?, ?, ?, ?)',
        args: [
          audioSegmentId,
          jobId,
          idx,
          // LibSQL client handles Uint8Array or Buffer as blob correctly
          new Uint8Array(audioBuffer)
        ]
      });

      processed++;
      const progress = Math.round((processed / totalBuckets) * 100);

      // Update progress in database
      await db.execute({
        sql: 'UPDATE jobs SET progress = ? WHERE id = ?',
        args: [progress, jobId],
      });
    }

    // Complete Job successfully
    await db.execute({
      sql: "UPDATE jobs SET status = 'completed', progress = 100 WHERE id = ?",
      args: [jobId],
    });
    console.log(`[Job Worker] Job ${jobId} completed successfully!`);

  } catch (error) {
    console.error(`[Job Worker] Job ${jobId} failed:`, error);
    await db.execute({
      sql: "UPDATE jobs SET status = 'failed', error = ? WHERE id = ?",
      args: [error.message || String(error), jobId],
    });

    if (userId) {
      try {
        console.log(`[Job Worker] Job ${jobId} failed. Attempting to refund credit for user ${userId}...`);
        const subResult = await db.execute({
          sql: 'SELECT status FROM subscriptions WHERE user_id = ?',
          args: [userId],
        });
        
        let isPro = false;
        if (subResult.rows.length > 0 && subResult.rows[0].status === 'active') {
          isPro = true;
        }

        if (!isPro) {
          const allowanceResult = await db.execute({
            sql: 'SELECT daily_used, monthly_used FROM allowances WHERE user_id = ?',
            args: [userId],
          });

          if (allowanceResult.rows.length > 0) {
            let { daily_used, monthly_used } = allowanceResult.rows[0];
            const newDaily = Math.max(0, daily_used - 1);
            const newMonthly = Math.max(0, monthly_used - 1);

            await db.execute({
              sql: `
                UPDATE allowances 
                SET daily_used = ?, monthly_used = ? 
                WHERE user_id = ?
              `,
              args: [newDaily, newMonthly, userId],
            });
            console.log(`[Job Worker] Successfully refunded 1 credit to user ${userId} for failed job ${jobId}`);
          }
        }
      } catch (refundErr) {
        console.error(`[Job Worker] Failed to refund credit for user ${userId}:`, refundErr);
      }
    }
  }
}
