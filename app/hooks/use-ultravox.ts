import { useState, useRef, useEffect, useCallback } from 'react';
import * as UltravoxClient from 'ultravox-client';

export type UltravoxStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'ERROR';

export interface TranscriptItem {
    text: string;
    speaker: 'user' | 'agent';
    isFinal: boolean;
}

export const useUltravox = () => {
    const [status, setStatus] = useState<UltravoxStatus>('IDLE');
    const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // The session instance
    const sessionRef = useRef<any | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sessionRef.current) {
                console.log("Cleaning up Ultravox session...");
                sessionRef.current.leaveCall();
            }
        };
    }, []);

    const startSession = useCallback(async () => {
        try {
            if (sessionRef.current?.status === 'active') return;

            setStatus('CONNECTING');
            setError(null);

            // 1. Get Join URL from our API
            const response = await fetch('/api/ultravox');
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            const data = await response.json();
            if (!data.joinUrl) throw new Error('No Join URL returned');

            // 2. Initialize Session
            const session = new UltravoxClient.UltravoxSession();
            sessionRef.current = session;

            // 3. Setup Listeners
            session.addEventListener('status', () => {
                console.log("UV Status:", session.status);
                // Map SDK status to our simple status
                if (session.status === 'disconnected') setStatus('IDLE');
                // We keep 'ACTIVE' for our UI even if SDK says 'listening'/'speaking'
            });

            session.addEventListener('transcripts', () => {
                console.log('Transcripts event fired');
                const updated = session.transcripts;
                if (updated && updated.length > 0) {
                    console.log('Raw transcripts:', updated);
                    const formatted: TranscriptItem[] = updated.map((t: any) => ({
                        text: t.text,
                        speaker: t.speaker === 'user' ? 'user' : 'agent',
                        isFinal: t.isFinal
                    }));
                    setTranscripts(formatted);
                }
            });

            // 4. Join Call
            await session.joinCall(data.joinUrl);

            // 5. Mute mic by default (user must click to unmute)
            session.muteMic();

            setStatus('ACTIVE');
            setIsMicMuted(true); // Start muted

        } catch (err: any) {
            console.error("Ultravox Connection Error:", err);
            setError(err.message);
            setStatus('ERROR');
        }
    }, []);

    const endSession = useCallback(async () => {
        if (sessionRef.current) {
            await sessionRef.current.leaveCall();
            sessionRef.current = null;
        }
        setStatus('IDLE');
        setTranscripts([]);
    }, []);

    const toggleMic = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.toggleMicMute();
            setIsMicMuted(sessionRef.current.isMicMuted);
        }
    }, []);

    return {
        status,
        transcripts,
        isMicMuted,
        error,
        startSession,
        endSession,
        toggleMic,
        // Expose raw session for advanced use (like Simli audio bridging)
        session: sessionRef.current
    };
};
