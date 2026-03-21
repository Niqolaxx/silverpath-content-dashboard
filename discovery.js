const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    // There isn't a direct "listModels" in the standard SDK easily accessible without an authenticated client, 
    // but we can try common ones or use the REST API via fetch.
    
    console.log("Testing common 2026 identifiers...");
    const modelsToTest = ["gemini-3-flash-preview", "gemini-3.1-flash", "gemini-3.0-flash", "gemini-2.0-flash-001"];
    
    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        await model.generateContent("test");
        console.log(`✅ ${modelName} is AVAILABLE`);
      } catch (e) {
        console.log(`❌ ${modelName} failed: ${e.message}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

listModels();
