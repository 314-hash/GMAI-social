import express from 'express';
import Gun from 'gun';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Serve production static build if dist exists
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.use(express.static(__dirname));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'GameMind AI ($GMAI) Chatroom Relay',
    network: 'Sidra Chain (97453)',
    timestamp: Date.now(),
  });
});

// SPA fallback for frontend client routing (compatible with Express 4 and Express 5)
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.url.startsWith('/gun') || req.url.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      // If dist hasn't been built yet, serve root index.html
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

// Start Express server
const server = app.listen(port, () => {
  console.log(`====================================================`);
  console.log(`🎮 GameMind AI ($GMAI) Gun.js Relay Server Active`);
  console.log(`🌐 Server Port: ${port}`);
  console.log(`⚡ Gun Endpoint: http://localhost:${port}/gun`);
  console.log(`⛓️  Blockchain: Sidra Chain (Chain ID: 97453)`);
  console.log(`🪙 Token: GameMind AI ($GMAI)`);
  console.log(`====================================================`);
});

// Initialize Gun Relay with Radisk storage engine
Gun({
  web: server,
  radisk: true,
  localStorage: false,
});
