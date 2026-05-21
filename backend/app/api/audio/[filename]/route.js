import db from '@/lib/db';
import { corsHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function GET(req, { params }) {
  const headers = corsHeaders(req);
  const { filename } = params;

  if (!filename) {
    return new Response('Filename is required', { status: 400, headers });
  }

  try {
    // Parse jobId and idx from filename (e.g. jobId_idx.mp3)
    const nameParts = filename.split('_');
    if (nameParts.length < 2) {
      return new Response('Invalid filename format', { status: 400, headers });
    }

    const jobId = nameParts[0];
    const idxWithExt = nameParts[1];
    const idx = parseInt(idxWithExt.split('.')[0], 10);

    if (isNaN(idx)) {
      return new Response('Invalid filename segment index', { status: 400, headers });
    }

    // Query database for BLOB audio data
    const result = await db.execute({
      sql: 'SELECT audio_data FROM audio_segments WHERE job_id = ? AND idx = ?',
      args: [jobId, idx],
    });

    if (result.rows.length === 0) {
      return new Response('Audio file not found', { status: 404, headers });
    }

    // Retrieve the base64 or array buffer BLOB data
    const row = result.rows[0];
    const audioData = row.audio_data;

    let buffer;
    if (typeof audioData === 'string') {
      // If retrieved as a string, check if it's base64 encoded
      buffer = Buffer.from(audioData, 'base64');
    } else if (audioData instanceof ArrayBuffer) {
      buffer = Buffer.from(audioData);
    } else if (Buffer.isBuffer(audioData)) {
      buffer = audioData;
    } else if (audioData?.type === 'Buffer' && Array.isArray(audioData.data)) {
      buffer = Buffer.from(audioData.data);
    } else {
      // Fallback
      buffer = Buffer.from(Object.values(audioData));
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Audio Serving Error]:', error);
    return new Response('Internal Server Error', { status: 500, headers });
  }
}
