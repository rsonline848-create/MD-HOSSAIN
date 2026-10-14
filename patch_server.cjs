const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importStatement = `import express from "express";\nimport { GoogleGenAI } from "@google/genai";\n`;
code = code.replace(`import express from "express";`, importStatement);

const chatRoute = `
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, contextData } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = \`
You are an intelligent AI assistant for "ML Electric", an electrical shop management software. 
You speak fluent Bengali (and English if requested). 
Your job is to answer questions about the software usage AND the user's business data.

Current Business Data:
\${JSON.stringify(contextData)}

If the user asks about their business (e.g., "আজকের বিক্রি কত?", "বাকি কত?", "সজিব ভাইয়ের মেমো কত?"), use the data above to answer accurately. 
If the user asks how to use the app (e.g., "কীভাবে মেমো বানাব?"), provide clear instructions.
Keep your answers concise, friendly, and formatted nicely.
\`;

      const formattedMessages = messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedMessages,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });

      res.json({ success: true, text: response.text });
    } catch (e: any) {
      console.error("Chat error:", e);
      res.status(500).json({ error: "Failed to process chat message." });
    }
  });

  // Vite middleware for development
`;

code = code.replace(`  // Vite middleware for development`, chatRoute);

fs.writeFileSync('server.ts', code);
