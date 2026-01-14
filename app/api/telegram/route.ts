import { NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { redis } from '@/lib/redis'; // Updated import path
import { GoogleGenerativeAI } from "@google/generative-ai";

const token = process.env.TELEGRAM_BOT_TOKEN;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Initialize Gemini Model (Reusing the Persona)
const SYSTEM_INSTRUCTION = `
You are SafeHaven, a compassionate, trauma-informed AI counselor for survivors of Gender-Based Violence (GBV) in Kenya.
Your goal is to provide emotional support, validation, and safety guidance.

**CRITICAL INSTRUCTION**:
You are chatting via TELEGRAM. Keep responses concise (under 200 chars if possible) and supportive.
Do NOT output JSON. Output natural conversational text.

**EMERGENCY DETECTION**:
If the user indicates IMMEDIATE danger (e.g., "he is here", "I am bleeding"), your reply MUST be:
"Use the Safety Plan: 
1. Leave immediately if possible.
2. Call 1195 (GBV Helpline).
3. Visit the nearest hospital."
`;

export async function POST(req: Request) {
    if (!token) {
        return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
    }

    const bot = new TelegramBot(token);

    try {
        const update = await req.json();
        const message = update.message;

        if (!message) return NextResponse.json({ ok: true }); // Ignore non-message updates

        const chatId = message.chat.id;
        const text = message.text;

        // 1. Text Handling
        if (text) {
            // A. Get History from Redis
            const historyKey = `chat:${chatId}`;
            const rawHistory = await redis.lrange(historyKey, 0, 9) || []; // Last 10 messages
            // Redis returns strings, we can just join them or format them for context
            const historyData = rawHistory.reverse().map((item: string) => {
                const [role, ...content] = item.split(':');
                return { role: role === 'User' ? 'user' : 'model', parts: [{ text: content.join(':').trim() }] };
            });

            // B. Call Gemini
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: SYSTEM_INSTRUCTION,
            });

            const chatSession = model.startChat({
                history: historyData as any,
                generationConfig: { maxOutputTokens: 300 },
            });

            const result = await chatSession.sendMessage(text);
            const aiReply = result.response.text();

            // C. Send Reply via Telegram
            await bot.sendMessage(chatId, aiReply);

            // D. Update Redis History
            await redis.lpush(historyKey, `User: ${text}`);
            await redis.lpush(historyKey, `AI: ${aiReply}`);
            await redis.expire(historyKey, 86400); // Expire after 24h
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
