"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Define types for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

interface WindowWithSpeech extends Window {
    SpeechRecognition?: { new(): SpeechRecognition };
    webkitSpeechRecognition?: { new(): SpeechRecognition };
}

export interface UseSpeechRecognitionReturn {
    isListening: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    hasRecognitionSupport: boolean;
    error: string | null;
}

export default function useSpeechRecognition(lang: string = "en-US", isDisabled: boolean = false): UseSpeechRecognitionReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use a ref to store the recognition instance
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        if (isDisabled) {
            if (recognitionRef.current && isListening) {
                recognitionRef.current.stop();
                setIsListening(false);
            }
            return;
        }

        const windowWithSpeech = window as unknown as WindowWithSpeech;
        // Check for browser support
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
            setHasRecognitionSupport(true);

            // Initialize recognition instance
            const SpeechRecognitionConstructor =
                windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

            if (!SpeechRecognitionConstructor) return;

            const recognition = new SpeechRecognitionConstructor();
            recognition.continuous = true; // Keep listening even after user pauses
            recognition.interimResults = true; // Show results while speaking
            recognition.lang = lang; // Use dynamic language (e.g., sw-KE)

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let currentTranscript = "";
                for (let i = 0; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        currentTranscript += result[0].transcript;
                    } else {
                        currentTranscript += result[0].transcript;
                    }
                }
                setTranscript(currentTranscript);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                    setError("Microphone access blocked. Please enable permissions.");
                } else if (event.error === 'no-speech') {
                    // Ignore no-speech errors (common in silence)
                } else {
                    setError(`Speech recognition error: ${event.error}`);
                }
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        } else {
            setHasRecognitionSupport(false);
        }

        // Cleanup
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [lang, isDisabled]);

    const startListening = useCallback(() => {
        setError(null);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (err: unknown) {
                const error = err as Error;
                if (error.name === 'InvalidStateError' || error.message?.includes('already started')) {
                    // Ignore "already started" errors, just update state if needed
                    console.log("Speech recognition already active.");
                    setIsListening(true);
                } else {
                    console.error("Error starting recognition", error);
                    setError("Failed to start microphone.");
                }
            }
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                console.log("Stopped recognition manually.");
            } catch (error) {
                console.error("Error stopping recognition:", error);
            }
        }
    }, []);

    const resetTranscript = useCallback(() => {
        setTranscript("");
    }, []);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        resetTranscript,
        hasRecognitionSupport,
        error,
    };
}
