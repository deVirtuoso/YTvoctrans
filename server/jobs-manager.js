import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { translateText } from './translation-engine.js';
import { generateTTS } from './tts-engine.js';

const execAsync = promisify(exec);

const jobs = new Map();
const AUDIO_DIR = path.resolve('public/audio');

// Ensure audio output directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

/**
 * Extracts Video ID from a YouTube video URL or timedtext URL.
 * @param {string} urlStr - The input URL.
 * @returns {string} The extracted Video ID or a fallback unique ID.
 */
function extractVideoId(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.searchParams.has('v')) {
      return url.searchParams.get('v');
    }
    if (url.pathname.includes('/embed/')) {
      return url.pathname.split('/embed/')[1].split('?')[0];
    }
    if (url.searchParams.has('vssId')) {
      // Sometimes timedtext URL contains vssId like "en.dQw4w9WgXcQ"
      const vssId = url.searchParams.get('vssId');
      const parts = vssId.split('.');
      if (parts.length > 1) return parts[1];
    }
    // Check if it's short link
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1);
    }
  } catch (e) {
    /* ignore */
  }
  return crypto.randomUUID();
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
async function fetchSubtitlesFromVideoPage(videoUrl) {
  const res = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`Failed to load YouTube video page: ${res.status}`);
  const html = await res.text();
  
  // Find timedtext baseUrl with robust balanced-bracket scanning
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
  if (!tracks || tracks.length === 0) throw new Error('Empty subtitle tracks on YouTube page');
  
  // Use first track or try to find english
  const track = tracks.find(t => t.languageCode === 'en') || tracks[0];
  const timedtextUrl = normalizeTimedtextUrl(track.baseUrl);
  
  const captionRes = await fetch(timedtextUrl);
  if (!captionRes.ok) throw new Error(`Failed to fetch caption data: ${captionRes.status}`);
  return await captionRes.json();
}

/**
 * Parses XML captions (srv1 / srv2 / srv3 fallback).
 * @param {string} xmlText - The raw XML timedtext.
 * @returns {Array<{t0: number, t1: number, text: string}>} The parsed cues.
 */
function parseXmlCaptions(xmlText) {
  const cues = [];
  // Basic regex parser for XML tags <text start="1.5" dur="2.1">hello</text>
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
 * Fetches subtitles from YouTube video page using the Python fallback scraper.
 * @param {string} videoId - The YouTube Video ID.
 * @param {string} lang - The language to request.
 * @returns {Promise<Array<{t0: number, t1: number, text: string}>>} Cues array.
 */
async function fetchSubtitlesViaPythonFallback(videoId, lang = 'en') {
  console.log(`[Job Manager] Attempting python fallback for videoId: ${videoId}, lang: ${lang}`);
  const scriptPath = path.resolve('get_transcript.py');
  
  // Sanitize inputs
  const safeVideoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeLang = lang.replace(/[^a-zA-Z0-9-]/g, '');
  
  const cmd = `python "${scriptPath}" "${safeVideoId}" "${safeLang}"`;
  
  try {
    const { stdout } = await execAsync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    
    return parsed.map(item => ({
      t0: item.start,
      t1: item.start + item.duration,
      text: item.text
    }));
  } catch (error) {
    console.error(`[Job Manager] Python fallback failed:`, error);
    throw error;
  }
}

/**
 * Core asynchronous translation job execution runner.
 * @param {string} jobId - The unique identifier of this job.
 */
async function runTranslationJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    let captionJson = null;
    let cues = [];
    
    console.log(`[Job Manager] Running job ${jobId} with URL: ${job.sourceUrl}`);

    // Step 1: Extract captions/subtitles (primary method)
    try {
      if (job.sourceUrl.includes('/api/timedtext') || job.sourceUrl.includes('timedtext')) {
        const normalizedUrl = normalizeTimedtextUrl(job.sourceUrl);
        const res = await fetch(normalizedUrl);
        if (!res.ok) throw new Error(`Timedtext fetch failed: ${res.status}`);
        
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          captionJson = await res.json();
        } else {
          const xmlText = await res.text();
          cues = parseXmlCaptions(xmlText);
        }
      } else {
        // Treat as a regular YouTube video URL and crawl/extract captions
        captionJson = await fetchSubtitlesFromVideoPage(job.sourceUrl);
      }

      // If we have json3 captions, convert them to unified cues
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
    } catch (primaryErr) {
      console.warn(`[Job Manager] Primary subtitle extraction failed: ${primaryErr.message}. Trying python fallback...`);
    }

    // Step 1b: Fallback to Python subtitles scraper if primary method failed to return any cues
    if (cues.length === 0) {
      try {
        cues = await fetchSubtitlesViaPythonFallback(job.videoId, job.srcLang || 'en');
      } catch (fallbackErr) {
        throw new Error(`Failed to extract subtitles. Primary method error: ${primaryErr ? primaryErr.message : 'Check server logs'}. Python fallback error: ${fallbackErr.message}`);
      }
    }

    if (cues.length === 0) {
      throw new Error('No subtitles could be extracted or parsed');
    }

    console.log(`[Job Manager] Parsed ${cues.length} subtitles cues. Starting translation to: ${job.tgtLang}`);

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
    const segments = [];
    const totalBuckets = buckets.size;
    let processed = 0;

    for (const [idx, bucketCues] of buckets.entries()) {
      console.log(`[Job Manager] Processing tile index ${idx} with ${bucketCues.length} cues`);

      // Translate all cues in this bucket
      const translatedCues = [];
      const translatedTexts = [];
      
      for (const cue of bucketCues) {
        const translated = await translateText(cue.text, job.tgtLang, job.srcLang);
        translatedCues.push({
          t0: cue.t0,
          t1: cue.t1,
          text: translated
        });
        translatedTexts.push(translated);
      }

      // Generate a single combined audio for the whole 60-second bucket
      const combinedText = translatedTexts.join(' ');
      const audioFilename = `${jobId}_${idx}.mp3`;
      const audioPath = path.join(AUDIO_DIR, audioFilename);
      
      await generateTTS(combinedText, job.tgtLang, audioPath);

      segments.push({
        idx: idx,
        t0: idx * 60,
        t1: (idx + 1) * 60,
        audio: `http://localhost:4000/audio/${audioFilename}`,
        subs: translatedCues,
        videId: job.videoId,
        videoId: job.videoId,
        srcLang: job.srcLang,
        tgtLang: job.tgtLang
      });

      processed++;
      job.progress = Math.round((processed / totalBuckets) * 100);
      jobs.set(jobId, { ...job });
    }

    // Complete Job successfully
    job.status = 'completed';
    job.progress = 100;
    job.segments = segments;
    jobs.set(jobId, { ...job });
    console.log(`[Job Manager] Job ${jobId} completed successfully!`);

  } catch (error) {
    console.error(`[Job Manager] Job ${jobId} failed:`, error);
    job.status = 'failed';
    job.error = error.message || String(error);
    jobs.set(jobId, { ...job });
  }
}

/**
 * Creates a new translation job.
 * @param {string} sourceUrl - Timedtext URL or YouTube Video page URL.
 * @param {string} tgtLang - Target language (defaults to 'es').
 * @param {string} srcLang - Source language (defaults to 'auto').
 * @returns {string} Unique Job ID.
 */
export function createJob(sourceUrl, tgtLang = 'es', srcLang = 'auto') {
  const jobId = crypto.randomUUID();
  const videoId = extractVideoId(sourceUrl);
  
  const job = {
    jobId,
    videoId,
    sourceUrl,
    srcLang,
    tgtLang,
    status: 'processing',
    progress: 0,
    segments: [],
    error: null,
    createdAt: Date.now()
  };

  jobs.set(jobId, job);
  
  // Kick off job execution asynchronously
  runTranslationJob(jobId);

  return jobId;
}

/**
 * Retrieves the status and results of a translation job.
 * @param {string} jobId - The job identifier.
 * @returns {any | null} The job object or null if not found.
 */
export function getJob(jobId) {
  return jobs.get(jobId) || null;
}
