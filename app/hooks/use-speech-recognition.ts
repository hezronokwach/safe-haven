"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface UseSpeechRecognitionReturn {
    isListening: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    hasRecognitionSupport: boolean;
}

export default function useSpeechRecognition(): UseSpeechRecognitionReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);

    // Use a ref to store the recognition instance to persist it across renders
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Check for browser support
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
            setHasRecognitionSupport(true);

            // Initialize recognition instance
            const SpeechRecognition =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            const recognition = new SpeechRecognition();
            recognition.continuous = true; // Keep listening even after user pauses
            recognition.interimResults = true; // Show results while speaking
            recognition.lang = "en-US"; // Default to English, can be parameterized later

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
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

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
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
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error("Error starting recognition", error);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

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
    };
}
