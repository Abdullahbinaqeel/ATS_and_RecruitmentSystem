const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Testing Cloudinary config...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);

cloudinary.api.ping()
  .then(res => {
    console.log('✅ Cloudinary ping success:', res);
  })
  .catch(err => {
    console.error('❌ Cloudinary ping failed:', err);
  });
