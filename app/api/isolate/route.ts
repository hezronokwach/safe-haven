import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get("audio") as Blob;

        if (!audioFile) {
            return NextResponse.json({ error: "No audio provided" }, { status: 400 });
        }

        // 1. ElevenLabs Audio Isolation (Clean the noise)
        // Note: The input audio must be sent as FormData to ElevenLabs
        const isolationForm = new FormData();
        isolationForm.append("audio", audioFile);

        let cleanAudioBuffer: ArrayBuffer;

        // "model_id": "eleven_audio_isolation_v1" is standard
        const isoRes = await fetch("https://api.elevenlabs.io/v1/audio-isolation", {
            method: "POST",
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY || "",
            },
            body: isolationForm,
        });

        if (!isoRes.ok) {
            // Log error but recover
            try {
                const errText = await isoRes.text();
                console.error("ElevenLabs Isolation Failed (Status " + isoRes.status + "):", errText);
            } catch (e) {
                console.error("ElevenLabs Isolation Failed (Status " + isoRes.status + ")");
            }
            console.warn("Falling back to original audio for transcription.");
            cleanAudioBuffer = await audioFile.arrayBuffer();
        } else {
            console.log("Audio Isolation Successful");
            cleanAudioBuffer = await isoRes.arrayBuffer();
        }

        // 2. Gemini STT (Transcription 1.5 Flash)
        const base64Audio = Buffer.from(cleanAudioBuffer).toString("base64");

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/mp3", // Gemini is forgiving on mimeType, mp3 usually works for blobs
                    data: base64Audio
                }
            },
            { text: "Transcribe this audio exactly. Do not add any commentary." }
        ]);

        const text = result.response.text().trim();
        console.log("Transcribed Whisper:", text);

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error("Isolate/Transcribe Error:", error);
        return NextResponse.json({ error: error.message || "Processing failed" }, { status: 500 });
    }
}
