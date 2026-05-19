const path = require('path');
// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Start the express server
const app = require('../server');

async function testUpload() {
  const port = process.env.PORT || 5001;
  const baseURL = `http://localhost:${port}`;
  console.log(`Booted server. Testing against ${baseURL}...`);

  // Wait 3 seconds for mongoose to connect
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // 1. Login
    console.log('🔄 Logging in...');
    const loginRes = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ali.khan@example.com',
        password: 'password123'
      })
    });

    const loginData = await loginRes.json();
    console.log('Login response:', loginData);
    const token = loginData.token;

    if (!token) {
      console.error('❌ Failed to login');
      process.exit(1);
    }

    // 2. Upload Profile Picture
    console.log('🔄 Uploading profile pic...');
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const blob = new Blob([Buffer.from(pngBase64, 'base64')], { type: 'image/png' });

    const form = new FormData();
    form.append('profilePic', blob, 'test_image.png');

    const uploadRes = await fetch(`${baseURL}/api/auth/upload/profile-pic`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    const uploadData = await uploadRes.json();
    console.log('✅ Response Status:', uploadRes.status);
    console.log('✅ Response Body:', JSON.stringify(uploadData, null, 2));

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    process.exit(0);
  }
}

testUpload();
