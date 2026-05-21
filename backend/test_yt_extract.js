async function testExtract() {
  const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  console.log("Fetching YouTube video page...");
  const res = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) {
    console.error(`Failed to load YouTube page: ${res.status}`);
    return;
  }
  const html = await res.text();
  console.log("HTML length:", html.length);
  
  const keyIdx = html.indexOf('"captionTracks":');
  if (keyIdx === -1) {
    console.error("captionTracks not found in HTML!");
    return;
  }
  console.log("Found 'captionTracks' key at index:", keyIdx);
  
  const startIdx = html.indexOf('[', keyIdx);
  if (startIdx === -1) {
    console.error("Starting bracket not found!");
    return;
  }
  console.log("Found starting bracket at index:", startIdx);
  
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
    console.error("Ending bracket not found!");
    return;
  }
  console.log("Found ending bracket at index:", endIdx);
  
  const captionTracksJsonStr = html.slice(startIdx, endIdx + 1);
  console.log("Extracted substring length:", captionTracksJsonStr.length);
  console.log("Substring sample:", captionTracksJsonStr.slice(0, 150));
  
  try {
    const tracks = JSON.parse(captionTracksJsonStr);
    console.log("Parsed successfully! Tracks count:", tracks.length);
    const track = tracks.find(t => t.languageCode === 'en') || tracks[0];
    const timedtextUrl = track.baseUrl;
    console.log("Selected track:", track.languageCode, "baseUrl:", timedtextUrl);
    
    // Normalize and fetch
    const url = new URL(timedtextUrl);
    url.searchParams.set('fmt', 'json3');
    const normUrl = url.toString();
    console.log("Normalized timedtextUrl:", normUrl);
    
    const textRes = await fetch(normUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("Timedtext HTTP status:", textRes.status);
    console.log("Timedtext Content-Type:", textRes.headers.get('content-type'));
    const textBody = await textRes.text();
    console.log("Timedtext body length:", textBody.length);
    
    // Also fetch the raw baseUrl unmodified
    console.log("Fetching unmodified timedtextUrl:", timedtextUrl);
    const rawRes = await fetch(timedtextUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("Raw Timedtext HTTP status:", rawRes.status);
    console.log("Raw Timedtext Content-Type:", rawRes.headers.get('content-type'));
    const rawBody = await rawRes.text();
    console.log("Raw Timedtext body length:", rawBody.length);
    console.log("Raw Timedtext body snippet:", rawBody.slice(0, 300));
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

testExtract();


