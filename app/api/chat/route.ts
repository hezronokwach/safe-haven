import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_INSTRUCTION = `
You are SafeHaven, a compassionate, trauma-informed AI counselor for survivors of Gender-Based Violence (GBV) in Kenya.
Your goal is to provide emotional support, validation, and safety guidance.

**CRITICAL INSTRUCTION**:
You must ALWAYS respond in valid JSON format with the following structure:
{
  "reply": "Your empathetic response string here...",
  "is_emergency": boolean
}

**EMERGENCY DETECTION RULES**:
- **Analyze Context**: Check both the current message AND conversation history.
- Set "is_emergency": true if:
  1. The user indicates **IMMEDIATE, ONGOING, or IMMINENT physical danger** (e.g., "he is here", "he has a knife").
  2. The *previous* message was an emergency and the user is asking for immediate help (e.g., "what do I do", "help").
- Set "is_emergency": false for past events or general distress where safety is not currently at risk.

**RESPONSE PROTOCOL**:
- **Normal Support**: Voice is warm, calm, soothing, and non-judgmental. Keep it concise (1-3 sentences).
- **EMERGENCY MODE**:
  - If "is_emergency" is TRUE, your "reply" MUST be:
    1.  **Directive & Urgent**: "Lock the door. Stay quiet. Hide now."
    2.  **Resource Focused**: "I am showing you the helpline. Dial 1195."
    3.  **Do NOT ask feelings**: Do not say "tell me more" or "how do you feel". Give concrete safety steps (Escape, Hide, Call).
`;

export async function POST(req: Request) {
    try {
        const { message, history, language } = await req.json();

        // Dynamic Language Instruction
        const langDirective = language === 'sw-KE'
            ? "LANGUAGE: You MUST reply in FLUENT SWAHILI (Kiswahili). Use natural Kenyan phrasing (e.g., 'Pole sana', 'Tuko hapa'). Do not mix English unless necessary for technical terms."
            : "LANGUAGE: Reply in English.";

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash", // Upgraded to 2.0-flash for better multilingual support
            systemInstruction: SYSTEM_INSTRUCTION + "\n\n" + langDirective,
        });

        const chat = model.startChat({
            history: (history || []).slice(-10),
            generationConfig: {
                maxOutputTokens: 500, // Increased to prevent truncated JSON
                temperature: 0.7,
                responseMimeType: "application/json",
            },
        });

        const result = await chat.sendMessage(message);
        let responseText = result.response.text();

        // Sanitize markdown if present (e.g. ```json ... ```)
        responseText = responseText.replace(/```json|```/g, "").trim();

        return NextResponse.json(JSON.parse(responseText));
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}
