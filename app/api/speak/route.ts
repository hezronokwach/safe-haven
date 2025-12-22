import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            );
        }

        const API_KEY = process.env.ELEVENLABS_API_KEY;
        const VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // Default to a soothing voice if not set

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
