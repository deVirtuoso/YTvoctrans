import fs from 'fs';
import path from 'path';

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
 * Generates an MP3 file of the text in the target language and saves it to the output file.
 * @param {string} text - The text to synthesize.
 * @param {string} targetLang - The target language ISO code.
 * @param {string} outputPath - The filesystem path to save the generated MP3.
 * @returns {Promise<void>}
 */
export async function generateTTS(text, targetLang, outputPath) {
  if (!text || !text.trim()) {
    // Write an empty mp3 file or just create a 0-byte file
    await fs.promises.writeFile(outputPath, Buffer.alloc(0));
    return;
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

  // Concatenate all buffers and write the resulting MP3 file
  const finalBuffer = Buffer.concat(audioBuffers);
  
  // Ensure the output folder exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  await fs.promises.writeFile(outputPath, finalBuffer);
}
