import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import Conversation from '../models/Conversation.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ⚠️ IMPORTANT: We are switching to 'gemini-pro' because Google restricts 'flash' for new accounts
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro", 
});

const SYSTEM_PROMPT = `You are an expert AI travel assistant for Indian travelers. 
- Your goal is to provide precise, helpful travel information in a friendly tone.
- Use emojis to make the text visually appealing.
- Provide specific route costs (e.g., Bangalore to Mysore ₹200 by bus).
- Give specific temple/food/place names.
- Keep responses concise and to the point (under 200 words unless asked).
- Do not make up facts; if you don't know, say so.`;

const conversationContexts = new Map();

// --- 1. Streaming Chat Service ---
export const processChatStream = async (message, history = [], userId = null, res) => {
  try {
    const formattedHistory = history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const result = await chat.sendMessageStream(message);
    let fullResponse = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

    if (userId) {
      const userContext = conversationContexts.get(userId) || [];
      userContext.push(
        { role: 'user', content: message },
        { role: 'assistant', content: fullResponse }
      );
      conversationContexts.set(userId, userContext.slice(-20));

      try {
        await Conversation.findOneAndUpdate(
          { userId },
          { 
            $push: { 
              messages: { 
                $each: [
                  { role: 'user', content: message, timestamp: new Date() },
                  { role: 'assistant', content: fullResponse, timestamp: new Date() }
                ]
              } 
            },
            $set: { updatedAt: new Date() }
          },
          { upsert: true, new: true }
        );
      } catch (dbError) {
        console.error('DB Save Error:', dbError);
      }
    }

  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
};

// --- 2. Non-Streaming Chat Service (Backup) ---
export const processChat = async (message, history = [], userId = null) => {
  try {
    const formattedHistory = history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    if (userId) {
      const userContext = conversationContexts.get(userId) || [];
      userContext.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );
      conversationContexts.set(userId, userContext.slice(-20));
    }

    return {
      success: true,
      message: response,
      usage: {
        promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
        completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
      }
    };
  } catch (error) {
    throw new Error(`Gemini API Error: ${error.message}`);
  }
};

export const getGeminiStatus = () => {
  return {
    available: !!process.env.GEMINI_API_KEY,
    model: "gemini-1.5-pro",
  };
};