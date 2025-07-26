import type { VercelRequest, VercelResponse } from '@vercel/node';
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
    console.error('❌ REDIS_URL not configured');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('REDIS')));
    throw new Error('REDIS_URL not configured');
  }

  console.log('🔄 Connecting to Redis...');
  redisClient = createClient({ 
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
    }
  });

  redisClient.on('error', (err: Error) => {
    console.error('❌ Redis Client Error:', err);
  });

  await redisClient.connect();
  console.log('✅ Connected to Redis successfully');
  return redisClient;
}

function getUserKey(baseKey: string, userId: string): string {
  return `${userId}:${baseKey}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🚀 API called:', req.method, req.url);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.error('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }

  try {
    console.log('📨 Request body:', req.body);
    
    const client = await getRedisClient();
    const { action, key, value, userId } = req.body;

    if (!userId) {
      console.error('❌ Missing userId in request');
      return res.status(400).json({ error: 'userId is required' });
    }

    const userKey = getUserKey(key, userId);
    console.log('🔑 Performing action:', action, 'for key:', userKey);

    switch (action) {
      case 'get':
        const item = await client.get(userKey);
        console.log('📖 Retrieved item:', item ? 'found' : 'not found');
        return res.status(200).json({ data: item ? JSON.parse(item) : null });

      case 'set':
        await client.set(userKey, JSON.stringify(value));
        console.log('💾 Saved item successfully');
        return res.status(200).json({ success: true });

      case 'delete':
        await client.del(userKey);
        console.log('🗑️ Deleted item successfully');
        return res.status(200).json({ success: true });

      case 'clear':
        const promises = Object.values(STORAGE_KEYS).map(storageKey => {
          const clearKey = getUserKey(storageKey, userId);
          return client.del(clearKey);
        });
        await Promise.all(promises);
        console.log('🧹 Cleared all data successfully');
        return res.status(200).json({ success: true });

      default:
        console.error('❌ Invalid action:', action);
        return res.status(400).json({ error: 'Invalid action', received: action });
    }
  } catch (error) {
    console.error('💥 Database API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 