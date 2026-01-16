import { NextResponse } from 'next/server';

const ULTRAVOX_API_KEY = process.env.NEXT_PUBLIC_ULTRAVOX_API_KEY; // Ideally use a private key on server
// NOTE: For hackathon speed, if you used a Public key pattern, use it. 
// But standard practice is to keep the key private if it has creation rights.

const SYSTEM_PROMPT = `
You are SafeHaven, a compassionate, trauma-informed AI counselor.
Your goal is to provide emotional support and safety guidance.

INSTRUCTIONS:
- Speak naturally with a warm, soothing voice.
- Start directly with "Hello, I am SafeHaven. I am here to listen."
- DO NOT use action descriptors like "(Phone rings)" or "*nods*".  
- DO NOT narrate your actions. Only speak the dialogue.
- Keep sentences short and concise.
`;

export async function GET() {
    if (!ULTRAVOX_API_KEY) {
        return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    }

    try {
        const agentId = process.env.NEXT_PUBLIC_ULTRAVOX_AGENT_ID;

        let apiUrl = 'https://api.ultravox.ai/api/calls';
        let body: any = {
            systemPrompt: SYSTEM_PROMPT,
            model: 'fixie-ai/ultravox-v0.7',
            voice: 'Paulina',
            temperature: 0.7
        };

        // NOTE: We are intentionally ignoring the Agent ID for now to force the "Ephemeral" mode.
        // This is because the "Agent" endpoint does NOT support overriding the 'systemPrompt' in the body,
        // which caused the 500 Error and prevented us from fixing the "JSON speaking" issue.
        const useAgentId = false; // Force false

        // If Agent ID exists, use the "Create Call for Agent" endpoint
        if (agentId && useAgentId) {
            console.log(`Using Agent ID: ${agentId}`);
            apiUrl = `https://api.ultravox.ai/api/agents/${agentId}/calls`;
            // Force override system prompt to ensure conversational output (fix JSON issue)
            body = {
                // systemPrompt: SYSTEM_PROMPT // <--- THIS CAUSED THE ERROR
            };
        } else {
            console.log('Using System Prompt (Ephemeral Agent)');
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'X-API-Key': process.env.NEXT_PUBLIC_ULTRAVOX_API_KEY!,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ultravox API Error: ${errorText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Ultravox Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
