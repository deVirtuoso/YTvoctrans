import db from '@/lib/db';
import { validateSession, getSessionIdFromRequest } from '@/lib/auth';
import { corsHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function GET(req) {
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

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return new Response(JSON.stringify({ ok: false, error: 'jobId parameter is required' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Fetch the Job record
    const jobRes = await db.execute({
      sql: 'SELECT id, video_id, source_url, src_lang, tgt_lang, status, progress, error FROM jobs WHERE id = ?',
      args: [jobId],
    });

    if (jobRes.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Job not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const job = jobRes.rows[0];

    // 2. If completed, assemble segments
    let segments = [];
    if (job.status === 'completed') {
      const segmentsRes = await db.execute({
        sql: 'SELECT idx, t0, t1, text, subs_json FROM translation_segments WHERE job_id = ? ORDER BY idx ASC',
        args: [jobId],
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://y-tvoctrans.vercel.app';

      segments = segmentsRes.rows.map(row => {
        let subs = [];
        try {
          subs = JSON.parse(row.subs_json);
        } catch (e) {
          /* ignore */
        }

        return {
          idx: row.idx,
          t0: row.t0,
          t1: row.t1,
          audio: `${appUrl}/api/audio/${jobId}_${row.idx}.mp3`,
          subs: subs,
          videoId: job.video_id,
          srcLang: job.src_lang,
          tgtLang: job.tgt_lang,
        };
      });
    }

    return new Response(
      JSON.stringify({
        jobId: job.id,
        videoId: job.video_id,
        sourceUrl: job.source_url,
        srcLang: job.src_lang,
        tgtLang: job.tgt_lang,
        status: job.status,
        progress: job.progress,
        error: job.error,
        segments: segments,
      }),
      {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Jobs Status Error]:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}
