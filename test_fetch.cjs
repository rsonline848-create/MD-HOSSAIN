const { GoogleGenAI } = require("@google/genai");
console.log("Instantiating...");
const ai = new GoogleGenAI({ apiKey: "test" });
ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'hello',
}).catch(e => console.log(e.message));
