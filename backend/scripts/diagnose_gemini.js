const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { generateNextPracticeMessage } = require('../utils/gemini');

async function diagnoseGemini() {
  console.log('Testing Gemini API integration...');
  console.log('API Key defined:', !!process.env.GEMINI_API_KEY);

  try {
    const systemPrompt = "You are a friendly AI greeting the user.";
    console.log('Calling generateNextPracticeMessage...');
    const result = await generateNextPracticeMessage(systemPrompt, []);
    console.log('✅ Success! Result:', result);
  } catch (error) {
    console.error('❌ Failed calling Gemini API!');
    console.error(error);
  }
}

diagnoseGemini();
