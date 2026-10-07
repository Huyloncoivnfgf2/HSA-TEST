import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import 'dotenv/config';
import { parseQuestionsWithGemini, parseAnswerKeyWithGemini, generateExamFeedbackWithGemini } from './server/geminiHandler';

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/gemini/parse-questions', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const abortController = new AbortController();
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.on('close', () => {
          if (!res.writableEnded) abortController.abort();
        });

        const sendEvent = (event: unknown) => {
          if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        try {
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const bodyStr = Buffer.concat(buffers).toString('utf-8');
          const payload = JSON.parse(bodyStr);

          await parseQuestionsWithGemini(payload, {
            signal: abortController.signal,
            retryChunk: payload.retryChunk,
            onChunk: sendEvent,
          });
          res.end();
        } catch (err: any) {
          console.error('Gemini parse error:', err);
          sendEvent({ error: err.message || 'Lỗi xử lý AI', done: true });
          res.end();
        }
      });

      server.middlewares.use('/api/gemini/parse-answer-key', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const bodyStr = Buffer.concat(buffers).toString('utf-8');
          const payload = JSON.parse(bodyStr);

          const answerKey = await parseAnswerKeyWithGemini(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, answerKey }));
        } catch (err: any) {
          console.error('Gemini answer key parse error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message || 'Lỗi đọc bảng đáp án' }));
        }
      });

      server.middlewares.use('/api/gemini/exam-feedback', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const bodyStr = Buffer.concat(buffers).toString('utf-8');
          const payload = JSON.parse(bodyStr);

          const feedback = await generateExamFeedbackWithGemini(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, feedback }));
        } catch (err: any) {
          console.error('Gemini feedback error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message || 'Lỗi tạo nhận xét AI' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
