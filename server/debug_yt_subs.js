import { URL } from 'url';

async function debugSubs() {
  const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const res = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`Failed to load YouTube video page: ${res.status}`);
  const html = await res.text();
  
  const keyIdx = html.indexOf('"captionTracks":');
  if (keyIdx === -1) {
    console.log("No captionTracks key found!");
    return;
  }
  const startIdx = html.indexOf('[', keyIdx);
  if (startIdx === -1) {
    console.log("No starting bracket for captionTracks!");
    return;
  }
  
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
  if (endIdx === -1) {
    console.log("Unmatched brackets!");
    return;
  }
  
  const captionTracksJsonStr = html.slice(startIdx, endIdx + 1);
  const tracks = JSON.parse(captionTracksJsonStr);
  console.log("Found captionTracks:", JSON.stringify(tracks, null, 2));
  
  const track = tracks.find(t => t.languageCode === 'en') || tracks[0];
  console.log("Selected track:", track);
  
  const unsignedUrl = "https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en&fmt=json3";
  console.log("Fetching unsignedUrl:", unsignedUrl);
  
  const unsignedRes = await fetch(unsignedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.youtube.com/',
      'Accept': '*/*'
    }
  });
  console.log("Unsigned status:", unsignedRes.status);
  console.log("Unsigned Content-Type:", unsignedRes.headers.get('content-type'));
  const unsignedText = await unsignedRes.text();
  console.log("Unsigned length:", unsignedText.length);
  console.log("Unsigned first 200 chars:", unsignedText.slice(0, 200));
}

debugSubs().catch(console.error);
