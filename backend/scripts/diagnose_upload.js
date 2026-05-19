async function runDiagnostics() {
  const baseURL = 'http://localhost:5001';
  console.log(`Starting diagnostics against ${baseURL}...`);

  try {
    // 1. Authenticate
    console.log('🔄 Logging in as candidate...');
    const loginRes = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ali.khan@example.com',
        password: 'password123'
      })
    });

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Logged in successfully. Token length:', token ? token.length : 0);

    if (!token) {
      console.error('❌ No token returned! Login response:', loginData);
      return;
    }

    // 2. Create a dummy test image
    // A tiny 1x1 transparent PNG in base64
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const blob = new Blob([Buffer.from(pngBase64, 'base64')], { type: 'image/png' });

    // 3. Prepare FormData
    const form = new FormData();
    form.append('profilePic', blob, 'test_image.png');

    // 4. Send upload request
    console.log('🔄 Sending profile pic upload request...');
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

  } catch (error) {
    console.error('❌ Diagnostics failed:', error.message);
  }
}

runDiagnostics();
