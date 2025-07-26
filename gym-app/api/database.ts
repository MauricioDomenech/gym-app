import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from 'redis';

const STORAGE_KEYS = {
  WORKOUT_PROGRESS: 'gym-app-workout-progress',
  SHOPPING_LISTS: 'gym-app-shopping-lists',
  THEME: 'gym-app-theme',
  TABLE_COLUMNS: 'gym-app-table-columns',
  CURRENT_WEEK: 'gym-app-current-week',
  CURRENT_DAY: 'gym-app-current-day',
} as const;

let redisClient: any = null;

async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL not configured');
  }

  redisClient = createClient({ 
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
    }
  });

  redisClient.on('error', (err: Error) => {
    console.error('Redis Client Error:', err);
  });

  await redisClient.connect();
  return redisClient;
}

function getUserKey(baseKey: string, userId: string): string {
  return `${userId}:${baseKey}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const client = await getRedisClient();
    const { action, key, value, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const userKey = getUserKey(key, userId);

    switch (action) {
      case 'get':
        const item = await client.get(userKey);
        return res.status(200).json({ data: item ? JSON.parse(item) : null });

      case 'set':
        await client.set(userKey, JSON.stringify(value));
        return res.status(200).json({ success: true });

      case 'delete':
        await client.del(userKey);
        return res.status(200).json({ success: true });

      case 'clear':
        const promises = Object.values(STORAGE_KEYS).map(storageKey => {
          const clearKey = getUserKey(storageKey, userId);
          return client.del(clearKey);
        });
        await Promise.all(promises);
        return res.status(200).json({ success: true });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Database API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 