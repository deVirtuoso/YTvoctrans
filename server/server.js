import express from 'express';
import cors from 'cors';
import path from 'path';
import { createJob, getJob } from './jobs-manager.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all origins to allow Chrome Extension background scripts to query it
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve the synthesized MP3 audio segments
const AUDIO_DIR = path.resolve('public/audio');
app.use('/audio', express.static(AUDIO_DIR));

// Endpoint to start a translation and voice synthesis job
app.post('/jobs', (req, res) => {
  const { source_url, sourceUrl, tgtLang, srcLang } = req.body;
  const urlToUse = source_url || sourceUrl;

  if (!urlToUse) {
    console.error('[Server] POST /jobs: Missing source_url');
    return res.status(400).json({ error: 'source_url or sourceUrl is required' });
  }

  console.log(`[Server] POST /jobs: received request for url=${urlToUse}, tgtLang=${tgtLang || 'es'}, srcLang=${srcLang || 'auto'}`);

  try {
    const jobId = createJob(urlToUse, tgtLang || 'es', srcLang || 'auto');
    res.status(201).json({ jobId, status: 'processing' });
  } catch (error) {
    console.error('[Server] POST /jobs: error starting job', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Endpoint to poll translation and voice synthesis job progress/results
app.get('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = getJob(jobId);
    if (!job) {
      console.warn(`[Server] GET /jobs/${jobId}: Job not found`);
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Log occasionally when completed or when error occurs
    if (job.status === 'completed' || job.status === 'failed') {
      console.log(`[Server] GET /jobs/${jobId}: status=${job.status}, progress=${job.progress}%`);
    }
    
    res.json(job);
  } catch (error) {
    console.error(`[Server] GET /jobs/${jobId}: error retrieving job`, error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start express server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`TranslateTube Voice Translation Lite Backend Service`);
  console.log(`Running on http://localhost:${PORT}`);
  console.log(`Audio static path: ${AUDIO_DIR}`);
  console.log(`==================================================`);
});
