import express from 'express';
import cors from 'cors';
import retiredDatabase from './dist/api/database.js';
import dailyWeight from './dist/api/weight.js';

const app = express();
const port = 3001;
app.use(cors());
app.use(express.json());
// ponytail: the local legacy route is retired just like the deployed handler.
app.all('/api/database', retiredDatabase);
app.all('/api/weight', dailyWeight);
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'API server is running' });
});
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
