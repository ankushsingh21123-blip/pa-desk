// Local dev + self-host entry: serves the API and (in production) the built UI.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './server-app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(api);

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist');
  app.use(express.static(dist));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = process.env.PORT || 4174;
app.listen(port, () => console.log(`PA Desk listening on http://localhost:${port}`));
