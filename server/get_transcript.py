import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def main():
    if len(sys.argv) < 2:
        sys.stdout.buffer.write(json.dumps({"error": "Missing video ID"}).encode('utf-8'))
        sys.exit(1)
        
    video_id = sys.argv[1]
    languages = ['en']
    if len(sys.argv) > 2:
        languages = [sys.argv[2]]
        
    try:
        api = YouTubeTranscriptApi()
        transcript_obj = None
        
        try:
            t_list = api.list(video_id)
            try:
                transcript_obj = t_list.find_transcript(languages)
            except Exception:
                for t in t_list:
                    transcript_obj = t
                    break
        except Exception:
            try:
                transcript_obj = api.fetch(video_id)
            except Exception as e:
                raise Exception(f"Failed to fetch transcript: {str(e)}")
                
        if transcript_obj is None:
            raise Exception("No transcript found")
            
        if hasattr(transcript_obj, 'fetch'):
            cues = transcript_obj.fetch()
        else:
            cues = transcript_obj
            
        # Convert custom structures to standard serializable dictionaries
        serialized_cues = []
        for cue in cues:
            serialized_cues.append({
                "text": cue.text if hasattr(cue, 'text') else cue.get('text', ''),
                "start": cue.start if hasattr(cue, 'start') else cue.get('start', 0.0),
                "duration": cue.duration if hasattr(cue, 'duration') else cue.get('duration', 0.0)
            })
            
        sys.stdout.buffer.write(json.dumps(serialized_cues, ensure_ascii=False).encode('utf-8'))
    except Exception as e:
        error_info = {"error": str(e)}
        sys.stdout.buffer.write(json.dumps(error_info).encode('utf-8'))
        sys.exit(1)

if __name__ == "__main__":
    main()
