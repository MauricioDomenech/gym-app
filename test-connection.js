import { createClient } from 'redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

async function testRedisConnection() {
  console.log('🧪 Testing Redis connection...');
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ REDIS_URL not configured');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('REDIS')));
    return;
  }

  console.log('🔗 Redis URL:', redisUrl.replace(/\/\/.*@/, '//***:***@'));

  try {
    console.log('🔄 Connecting to Redis...');
    const client = createClient({ 
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    client.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    await client.connect();
    console.log('✅ Connected to Redis successfully');

    console.log('🧪 Testing basic operations...');
    
    await client.set('test-key', 'test-value');
    console.log('✅ Set operation successful');
    
    const value = await client.get('test-key');
    console.log('✅ Get operation successful, value:', value);
    
    await client.del('test-key');
    console.log('✅ Delete operation successful');
    
    await client.disconnect();
    console.log('✅ Disconnected from Redis');
    console.log('🎉 All tests passed! Redis connection is working correctly.');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
}

testRedisConnection(); 