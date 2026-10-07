import express from 'express';
import path from 'path';
import 'dotenv/config';
import { parseQuestionsWithGemini, parseAnswerKeyWithGemini, generateExamFeedbackWithGemini } from './server/geminiHandler';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API route for parsing HSA exam questions via Gemini 3.8 Flash
app.post('/api/gemini/parse-questions', async (req, res) => {
  const abortController = new AbortController();
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.on('close', () => {
    if (!res.writableEnded) abortController.abort();
  });

  const sendEvent = (event: unknown) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const payload = req.body;
    await parseQuestionsWithGemini(payload, {
      signal: abortController.signal,
      retryChunk: payload.retryChunk,
      onChunk: sendEvent,
    });
    res.end();
  } catch (err: any) {
    console.error('Lỗi Gemini API:', err);
    sendEvent({ error: err.message || 'Lỗi xử lý câu hỏi với Gemini', done: true });
    res.end();
  }
});

// API route for parsing answer keys
app.post('/api/gemini/parse-answer-key', async (req, res) => {
  try {
    const payload = req.body;
    const answerKey = await parseAnswerKeyWithGemini(payload);
    res.json({ success: true, answerKey });
  } catch (err: any) {
    console.error('Lỗi Gemini API bảng đáp án:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi đọc bảng đáp án' });
  }
});

// API route for generating authentic exam feedback
app.post('/api/gemini/exam-feedback', async (req, res) => {
  try {
    const payload = req.body;
    const feedback = await generateExamFeedbackWithGemini(payload);
    res.json({ success: true, feedback });
  } catch (err: any) {
    console.error('Lỗi Gemini feedback:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi tạo nhận xét AI' });
  }
});

// Serve static frontend in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`HSA Prep App server running on port ${PORT}`);
});
