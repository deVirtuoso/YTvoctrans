import { URL } from 'url';

/**
 * Translates a single text string using Google's public translation endpoint.
 * @param {string} text - The input text to translate.
 * @param {string} targetLang - The ISO language code for the target language (e.g., 'es', 'hu', 'ru').
 * @param {string} sourceLang - The ISO language code for the source language (defaults to 'auto').
 * @returns {Promise<string>} The translated text.
 */
export async function translateText(text, targetLang, sourceLang = 'auto') {
  if (!text || !text.trim()) return '';
  
  const cleanTarget = targetLang.toLowerCase().split('-')[0]; // convert 'es-US' or 'hu-HU' to 'es' or 'hu'
  const cleanSource = sourceLang.toLowerCase().split('-')[0];
  
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${cleanSource}&tl=${cleanTarget}&dt=t&q=${encodeURIComponent(text)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });
    
    if (!res.ok) {
      throw new Error(`Google Translate HTTP error: ${res.status}`);
    }
    
    const data = await res.json();
    if (data && data[0]) {
      const translatedParts = data[0].map(part => part[0]).filter(Boolean);
      return translatedParts.join('');
    }
    
    throw new Error('Google Translate returned invalid format');
  } catch (error) {
    console.error(`[Translation Error] Failed to translate:`, error);
    // Return original text as a fallback if translation fails
    return text;
  }
}

/**
 * Translates an array of subtitle text segments efficiently.
 * @param {Array<{text: string}>} subs - Array of subtitle objects.
 * @param {string} targetLang - The target language code.
 * @param {string} sourceLang - The source language code.
 * @returns {Promise<Array<{text: string}>>} Subtitle array with translated text.
 */
export async function translateSubtitles(subs, targetLang, sourceLang = 'auto') {
  const result = [];
  // Processes translations sequentially with a small delay to prevent rate limits
  for (const sub of subs) {
    const translatedText = await translateText(sub.text, targetLang, sourceLang);
    result.push({
      ...sub,
      text: translatedText
    });
  }
  return result;
}
