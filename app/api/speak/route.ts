import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        // Determine Voice ID based on gender
        const { text, gender } = await req.json();
        const API_KEY = process.env.ELEVENLABS_API_KEY;

        let VOICE_ID = process.env.ELEVENLABS_VOICE_ID_FEMALE; // Default to Female
        if (gender === 'male' && process.env.ELEVENLABS_VOICE_ID_MALE) {
            VOICE_ID = process.env.ELEVENLABS_VOICE_ID_MALE;
        }

        // Fallback for missing env vars
        if (!VOICE_ID) {
            VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Hardcoded fallback (Rachel)
        }

        if (!API_KEY) {
            return NextResponse.json(
                { error: "ElevenLabs API key not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": API_KEY,
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_turbo_v2_5", // Low latency model
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("ElevenLabs API Error:", errorData);
            return NextResponse.json(
                { error: "Failed to generate speech" },
                { status: response.status }
            );
        }

        const audioBuffer = await response.arrayBuffer();

        // Return audio stream
        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
            },
        });
    } catch (error) {
        console.error("Speech generation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
