import express from 'express';
import path from 'path';
import 'dotenv/config';
import { parseQuestionsWithGemini, parseAnswerKeyWithGemini, generateExamFeedbackWithGemini } from './server/geminiHandler';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// The Gemini endpoints spend a server-side API key, so they must not be
// public. Verify the caller's Supabase session and role on the server;
// hiding buttons in the UI (Task 2.2) is not a security boundary.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function authorizeGeminiRequest(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
  rpcName: 'is_admin' | 'is_allowed'
): Promise<void> {
  const header = req.header('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!supabaseUrl || !supabaseAnonKey || !token) {
    res.status(401).json({ success: false, error: 'Cần đăng nhập bằng tài khoản được cấp quyền.' });
    return;
  }
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.rpc(rpcName);
    if (error) throw error;
    if (!data) {
      res.status(403).json({ success: false, error: 'Tài khoản không có quyền dùng chức năng này.' });
      return;
    }
    next();
  } catch (error) {
    console.error('Could not authorize Gemini request:', error);
    res.status(503).json({ success: false, error: 'Không thể xác minh quyền truy cập. Hãy thử lại sau.' });
  }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  void authorizeGeminiRequest(req, res, next, 'is_admin');
}

function requireAllowed(req: express.Request, res: express.Response, next: express.NextFunction): void {
  void authorizeGeminiRequest(req, res, next, 'is_allowed');
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API route for parsing HSA exam questions via Gemini 3.8 Flash
app.post('/api/gemini/parse-questions', requireAdmin, async (req, res) => {
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
app.post('/api/gemini/parse-answer-key', requireAdmin, async (req, res) => {
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
app.post('/api/gemini/exam-feedback', requireAllowed, async (req, res) => {
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
