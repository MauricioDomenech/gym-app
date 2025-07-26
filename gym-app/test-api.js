const fetch = require('node-fetch');

async function testApi() {
  const baseUrl = 'http://localhost:3000/api/database';
  
  console.log('🧪 Testing API...');
  
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get',
        key: 'gym-app-theme',
        userId: 'test-user'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    
    const data = await response.text();
    console.log('Response:', data);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testApi(); 