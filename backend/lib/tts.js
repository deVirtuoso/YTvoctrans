/**
 * Splits text into chunks of less than 200 characters, trying to split at natural boundaries (spaces, punctuation).
 * @param {string} text - The input text.
 * @returns {string[]} An array of text chunks.
 */
function splitTextIntoChunks(text, maxLength = 180) {
  if (text.length <= maxLength) return [text];
  
  const chunks = [];
  let currentChunk = '';
  const words = text.split(/\s+/);
  
  for (const word of words) {
    if ((currentChunk + ' ' + word).trim().length > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = word;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + word : word;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Generates an MP3 buffer of the text in the target language.
 * @param {string} text - The text to synthesize.
 * @param {string} targetLang - The target language ISO code.
 * @returns {Promise<Buffer>} The synthesized MP3 audio data.
 */
export async function generateTTS(text, targetLang) {
  if (!text || !text.trim()) {
    return Buffer.alloc(0);
  }

  const cleanTarget = targetLang.toLowerCase().split('-')[0];
  const chunks = splitTextIntoChunks(text);
  const audioBuffers = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${cleanTarget}&client=tw-ob`;
    
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!res.ok) {
        throw new Error(`Google TTS HTTP error: ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
      
      // Small defensive delay between chunk requests to avoid potential rate limit blocks
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    } catch (error) {
      console.error(`[TTS Error] Failed to generate TTS for chunk "${chunk}":`, error);
      throw error;
    }
  }

  return Buffer.concat(audioBuffers);
}
