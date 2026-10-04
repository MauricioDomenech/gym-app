import type { VercelRequest, VercelResponse } from '@vercel/node';

// ponytail: the retired API has no database client or data operations.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({ error: 'legacy_api_retired' });
}
