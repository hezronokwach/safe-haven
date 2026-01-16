"use client";

import React, { useEffect, useRef, useState } from 'react';
import { SimliClient } from 'simli-client';
import * as UltravoxClient from 'ultravox-client'; // Namespace import to fix TS resolution

const avatarFaceId = process.env.NEXT_PUBLIC_SIMLI_FACE_ID || '5514e24d-6086-46a3-ace4-6a7264e5cb7c'; // Default or Env

const AvatarInterface: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [status, setStatus] = useState<string>('Initializing...');
    const [simliClient, setSimliClient] = useState<SimliClient | null>(null);
    const [ultravoxSession, setUltravoxSession] = useState<any | null>(null); // Use any to avoid type errors

    useEffect(() => {
        console.log("AvatarInterface mounted.");
        console.log("Video Ref:", videoRef.current);
        console.log("Audio Ref:", audioRef.current);
        console.log("Simli Key Present:", !!process.env.NEXT_PUBLIC_SIMLI_API_KEY);
        console.log("Face ID:", avatarFaceId);

        if (!videoRef.current || !audioRef.current) {
            console.error("Critical: Video or Audio ref is missing!");
            return;
        }

        // 1. Initialize Simli
        const simli = new SimliClient();
        const simliConfig = {
            apiKey: process.env.NEXT_PUBLIC_SIMLI_API_KEY || '',
            faceID: avatarFaceId,
            handleSilence: true,
            videoRef: videoRef.current,
            audioRef: audioRef.current,
        };

        try {
            console.log("Initializing Simli...");
            simli.Initialize(simliConfig as any);
            setSimliClient(simli);
            console.log('Simli Initialized Successfully.');
        } catch (err) {
            console.error("Simli Initialization Failed:", err);
            setStatus("Simli Init Failed");
        }

        // 2. Initialize Ultravox
        const ultravox = new UltravoxClient.UltravoxSession();
        setUltravoxSession(ultravox);

        // Cleanup
        return () => {
            simli.close();
            ultravox.leaveCall();
        };
    }, []);

    // Auto-Start Effect
    useEffect(() => {
        if (simliClient && ultravoxSession && status === "Initializing...") {
            console.log("Auto-starting session...");
            startSession();
        }
    }, [simliClient, ultravoxSession]);

    const startSession = async () => {
        if (!simliClient || !ultravoxSession) return;

        try {
            setStatus('Starting Avatar...');
            await simliClient.start();

            setStatus('Connecting to Agent...');
            // In production, fetch this JOIN_URL from your backend for security!
            // For now, we assume the user might have a hardcoded URL or we use the API Key flow (via direct call if SDK supports)
            // Note: direct 'joinCall' usually needs a Join URL created via API.
            // TEMPORARY: Assuming we have a joinUrl or using a demo capability.
            // IMPORTANT: The user needs to create a call on the server to get a Join URL.
            // For this implementation, we will assume there's an API route `app/api/ultravox/route.ts` we will build next.

            const response = await fetch('/api/ultravox');
            const data = await response.json();

            if (!data.joinUrl) throw new Error('Failed to get Join URL');

            ultravoxSession.joinCall(data.joinUrl);

            ultravoxSession.addEventListener('status', (event: any) => {
                console.log('Ultravox Status:', event);
                setStatus(`Agent: ${ultravoxSession.status}`);
            });

            // 3. THE AUDIO BRIDGE
            // We need to capture the audio track from Ultravox and feed it to Simli
            // Ultravox creates an <audio> element or stream internally usually?
            // Actually, ultravox-client usually handles audio output automatically.
            // We need to intercept it.

            // Check documentation/methods for stream access.
            // Assuming ultravoxSession exposes the remote stream or track event.
            // If not available directly, we might need to rely on Simli listening to system audio (not possible in browser)
            // or AudioContext routing.

            // NOTE: For the purpose of this MVP, we will try to attach to the track event if available.
            // Code below assumes `track-started` or similar pattern from WebRTC.
            ultravoxSession.addEventListener('track_started', (event: any) => {
                console.log("Ultravox Track Started!", event.track.kind);
                if (event.track.kind === 'audio') {
                    console.log('Audio Track received. Setting up AudioContext Bridge...');
                    const stream = new MediaStream([event.track]);

                    // Branch A: Play it (so user hears it) - handled by `audioRef` passed to Simli usually?
                    // Actually Simli handles the audio if we send it data.
                    // Or we let Ultravox play it and Simli just visuals? Simli needs DATA to sync lip.

                    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                    const audioContext = new AudioContextClass();
                    console.log("AudioContext State:", audioContext.state);
                    const source = audioContext.createMediaStreamSource(stream);
                    const processor = audioContext.createScriptProcessor(4096, 1, 1);

                    processor.onaudioprocess = (e) => {
                        // Log once every ~100 chunks to avoid spam, just to prove flow
                        if (Math.random() < 0.01) console.log("Processing Audio Chunk...");

                        const inputData = e.inputBuffer.getChannelData(0);
                        // Convert Float32 to Int16 for Simli
                        const int16Data = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            const s = Math.max(-1, Math.min(1, inputData[i]));
                            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        if (simliClient) {
                            simliClient.sendAudioData(int16Data);
                        }
                    };

                    source.connect(processor);
                    processor.connect(audioContext.destination); // Play audio to user

                    // Resume context if suspended (common browser policy)
                    if (audioContext.state === 'suspended') {
                        audioContext.resume().then(() => console.log("AudioContext Resumed"));
                    }
                }
            });

            ultravoxSession.addEventListener('transcripts', (event: any) => {
                console.log("ULTRAVOX TRANSCRIPT:", ultravoxSession.transcripts);
            });

            ultravoxSession.addEventListener('status', (event: any) => {
                console.warn("ULTRAVOX STATE CHANGE:", ultravoxSession.status);
                setStatus(`Agent: ${ultravoxSession.status}`);
            });

        } catch (error) {
            console.error('Session Error:', error);
            setStatus('Connection Failed');
        }
    };

    const handleDebug = () => {
        if (!ultravoxSession) return;
        console.log("--- DEBUG SNAPSHOT ---");
        console.log("Session Status:", ultravoxSession.status);
        console.log("Transcripts:", ultravoxSession.transcripts);
        console.log("Mic Muted:", ultravoxSession.isMicMuted);
        console.log("Speaker Muted:", ultravoxSession.isSpeakerMuted);
        console.log("Simli Client:", simliClient);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
            {/* Simli Canvas/Video */}
            <div className="relative w-full h-full max-w-4xl max-h-[80vh]">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                ></video>
                <audio ref={audioRef} autoPlay></audio>
            </div>

            {/* Controls */}
            <div className="absolute bottom-10 flex gap-4 items-center">
                <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white">
                    {status}
                </div>
                {/* Debug Button */}
                <button
                    onClick={handleDebug}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-xs"
                >
                    Debug Info
                </button>
                <button
                    onClick={startSession}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-semibold transition"
                >
                    Start Session
                </button>
                <button
                    onClick={onClose}
                    className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition"
                    aria-label="End Call"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
};

export default AvatarInterface;
