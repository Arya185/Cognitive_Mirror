import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { app } from './src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) res.status(500).send('Server error: could not serve application.');
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cognitive Mirror server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
