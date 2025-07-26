import fetch from 'node-fetch';

async function testApi() {
  const baseUrl = 'http://localhost:3001/api/database';
  
  console.log('🧪 Testing local API...');
  
  try {
    console.log('📡 Testing GET operation...');
    const getResponse = await fetch(baseUrl, {
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
    
    console.log('GET Status:', getResponse.status);
    const getData = await getResponse.json();
    console.log('GET Response:', getData);
    
    console.log('\n📡 Testing SET operation...');
    const setResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'set',
        key: 'gym-app-theme',
        value: 'dark',
        userId: 'test-user'
      })
    });
    
    console.log('SET Status:', setResponse.status);
    const setData = await setResponse.json();
    console.log('SET Response:', setData);
    
    console.log('\n📡 Testing GET operation again...');
    const getResponse2 = await fetch(baseUrl, {
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
    
    console.log('GET Status:', getResponse2.status);
    const getData2 = await getResponse2.json();
    console.log('GET Response:', getData2);
    
    console.log('\n🎉 API test completed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testApi(); 