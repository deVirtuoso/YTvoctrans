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

/**
 * Normalizes timedtext URL to JSON3 format for easy parsing.
 * @param {string} timedtextUrl - The original timedtext URL.
 * @returns {string} The normalized URL requesting json3 captions.
 */
function normalizeTimedtextUrl(timedtextUrl) {
  try {
    const url = new URL(timedtextUrl);
    url.searchParams.set('fmt', 'json3');
    return url.toString();
  } catch (e) {
    return timedtextUrl;
  }
}

/**
 * Fetches subtitles from YouTube video page as a fallback.
 * @param {string} videoUrl - The YouTube video URL.
 * @returns {Promise<any>} The parsed subtitles JSON.
 */
/**
 * Helper to fetch a timedtext URL and parse it into standard cues array.
 * Robustly handles both JSON3 and XML formats.
 * @param {string} timedtextUrl - The YouTube timedtext URL.
 * @returns {Promise<Array<{t0: number, t1: number, text: string}>>} Cues array.
 */
async function fetchAndParseTimedtext(timedtextUrl) {
  const normalizedUrl = normalizeTimedtextUrl(timedtextUrl);
  console.log(`[Job Worker] Fetching timedtext URL: ${normalizedUrl}`);
  const res = await fetch(normalizedUrl);
  if (!res.ok) throw new Error(`Timedtext fetch failed with status: ${res.status}`);

  const contentType = res.headers.get('content-type') || '';
  const textContent = await res.text();
  console.log(`[Job Worker] Timedtext fetched, length: ${textContent.length}, Content-Type: ${contentType}`);

  if (contentType.includes('json') || textContent.trim().startsWith('{')) {
    try {
      const captionJson = JSON.parse(textContent);
      const cues = [];
      if (captionJson && captionJson.events) {
        for (const event of captionJson.events) {
          if (!event.segs) continue;
          const text = event.segs.map(s => s.utf8).join('').trim();
          if (!text) continue;
          const t0 = (event.tStartMs || 0) / 1000;
          const duration = (event.dDurationMs || 0) / 1000;
          cues.push({
            t0,
            t1: t0 + duration,
            text
          });
        }
      }
      console.log(`[Job Worker] Parsed ${cues.length} cues from JSON timedtext.`);
      return cues;
    } catch (e) {
      console.warn('[Jobs] Failed to parse timedtext as JSON, falling back to XML regex parsing:', e);
    }
  }

  // Fallback to XML parsing
  const cues = parseXmlCaptions(textContent);
  console.log(`[Job Worker] Parsed ${cues.length} cues from XML timedtext.`);
  return cues;
}

/**
 * Fetches subtitles from YouTube video page as a fallback.
 * @param {string} videoUrl - The YouTube video URL.
 * @returns {Promise<Array<{t0: number, t1: number, text: string}>>} The parsed subtitles cues.
 */
async function fetchSubtitlesFromVideoPage(videoUrl) {
  console.log(`[Job Worker] Fetching video page: ${videoUrl}`);
  const res = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`Failed to load YouTube video page: ${res.status}`);
  const html = await res.text();
  console.log(`[Job Worker] Video page HTML length: ${html.length}`);
  
  const keyIdx = html.indexOf('"captionTracks":');
  if (keyIdx === -1) throw new Error('No subtitle track found for this video (no captionTracks key)');
  const startIdx = html.indexOf('[', keyIdx);
  if (startIdx === -1) throw new Error('No subtitle track found for this video (no starting bracket)');
  
  let bracketCount = 0;
  let endIdx = -1;
  for (let i = startIdx; i < html.length; i++) {
    if (html[i] === '[') {
      bracketCount++;
    } else if (html[i] === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        endIdx = i;
        break;
      }
    }
  }
  if (endIdx === -1) throw new Error('No subtitle track found for this video (unmatched brackets)');
  
  const captionTracksJsonStr = html.slice(startIdx, endIdx + 1);
  const tracks = JSON.parse(captionTracksJsonStr);
  console.log(`[Job Worker] Found ${tracks.length} caption tracks in video HTML.`);
  if (!tracks || tracks.length === 0) throw new Error('Empty subtitle tracks on YouTube page');
  
  const track = tracks.find(t => t.languageCode === 'en') || tracks[0];
  const timedtextUrl = track.baseUrl;
  console.log(`[Job Worker] Selected track: ${track.languageCode} (${track.name?.simpleText || 'unknown'}), baseUrl: ${timedtextUrl}`);
  
  return await fetchAndParseTimedtext(timedtextUrl);
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
      // Step 1: Extract captions/subtitles (primary method)
      try {
        if (job.source_url.includes('/api/timedtext') || job.source_url.includes('timedtext')) {
          cues = await fetchAndParseTimedtext(job.source_url);
        } else {
          cues = await fetchSubtitlesFromVideoPage(job.source_url);
        }
      } catch (primaryErr) {
        console.warn(`[Job Worker] Primary subtitle extraction failed: ${primaryErr.message}.`);
        throw new Error(`Failed to extract subtitles: ${primaryErr.message}`);
      }
    }


    if (cues.length === 0) {
      throw new Error('No subtitles could be extracted or parsed');
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
