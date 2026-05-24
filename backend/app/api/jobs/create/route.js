import db from '@/lib/db';
import { validateSession, getSessionIdFromRequest } from '@/lib/auth';
import { extractVideoId, runTranslationJob } from '@/lib/jobs';
import { corsHeaders, handleOptions } from '@/lib/cors';
import { waitUntil } from '@vercel/functions';
import crypto from 'crypto';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function POST(req) {
  const headers = corsHeaders(req);
  const sessionId = getSessionIdFromRequest(req);

  if (!sessionId) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const session = await validateSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ ok: false, error: 'Session invalid or expired' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { source_url, sourceUrl, tgtLang, srcLang, cues } = await req.json();
    const urlToUse = source_url || sourceUrl;

    if (!urlToUse) {
      return new Response(JSON.stringify({ ok: false, error: 'sourceUrl is required' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // 1. Check user entitlement/allowance status
    const subResult = await db.execute({
      sql: 'SELECT status FROM subscriptions WHERE user_id = ?',
      args: [session.user.id],
    });

    let isPro = false;
    if (subResult.rows.length > 0) {
      if (subResult.rows[0].status === 'active') {
        isPro = true;
      }
    }

    if (!isPro) {
      // Fetch user's allowance
      const allowanceResult = await db.execute({
        sql: 'SELECT daily_used, monthly_used, last_used_at FROM allowances WHERE user_id = ?',
        args: [session.user.id],
      });

      if (allowanceResult.rows.length === 0) {
        return new Response(JSON.stringify({ ok: false, error: 'Allowance context not found' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      let { daily_used, monthly_used, last_used_at } = allowanceResult.rows[0];
      const now = new Date();
      const lastUsed = new Date(last_used_at);

      // Check daily reset (different calendar date in YYYY-MM-DD format)
      const nowDateStr = now.toISOString().slice(0, 10);
      const lastDateStr = lastUsed.toISOString().slice(0, 10);

      if (nowDateStr !== lastDateStr) {
        daily_used = 0;
      }

      // Check monthly reset (different calendar month in YYYY-MM format)
      const nowMonthStr = now.toISOString().slice(0, 7);
      const lastMonthStr = lastUsed.toISOString().slice(0, 7);

      if (nowMonthStr !== lastMonthStr) {
        monthly_used = 0;
      }

      // Hard limits: 1 daily, 5 monthly
      if (daily_used >= 1) {
        return new Response(JSON.stringify({ ok: false, error: 'Daily free translation limit reached (1/day). Please upgrade to Pro.' }), {
          status: 403,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      if (monthly_used >= 5) {
        return new Response(JSON.stringify({ ok: false, error: 'Monthly free translation limit reached (5/month). Please upgrade to Pro.' }), {
          status: 403,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Increment allowance usage
      await db.execute({
        sql: `
          UPDATE allowances 
          SET daily_used = ?, monthly_used = ?, last_used_at = ? 
          WHERE user_id = ?
        `,
        args: [daily_used + 1, monthly_used + 1, now.toISOString(), session.user.id],
      });
    }

    // 2. Initialize the translation job
    const jobId = crypto.randomUUID();
    const videoId = extractVideoId(urlToUse);
    const targetLanguage = tgtLang || 'es';
    const sourceLanguage = srcLang || 'auto';
    const cuesJsonStr = cues ? JSON.stringify(cues) : null;

    await db.execute({
      sql: `
        INSERT INTO jobs (id, video_id, source_url, src_lang, tgt_lang, status, progress, cues_json)
        VALUES (?, ?, ?, ?, ?, 'processing', 0, ?)
      `,
      args: [jobId, videoId, urlToUse, sourceLanguage, targetLanguage, cuesJsonStr],
    });


    // 3. Trigger the asynchronous background task on Vercel
    waitUntil(runTranslationJob(jobId, session.user.id));

    return new Response(JSON.stringify({ ok: true, jobId, status: 'processing' }), {
      status: 201,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Jobs Create Error]:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}
