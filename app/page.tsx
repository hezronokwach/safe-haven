"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, ShieldAlert, LogOut, Sun, Moon } from "lucide-react";
import useSpeechRecognition from "./hooks/use-speech-recognition";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function Home() {
  const { isListening, transcript, startListening, stopListening, resetTranscript, hasRecognitionSupport } = useSpeechRecognition();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Audio playback ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize theme after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  // Handle final transcript when listening stops
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      handleUserMessage(transcript);
      resetTranscript();
    }
  }, [isListening, transcript, resetTranscript]);

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speakText = async (text: string) => {
    if (isMuted) {
      console.log("Audio is muted, skipping playback.");
      return;
    }

    console.log("Generating speech for:", text);

    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("TTS API Error:", err);
        throw new Error("Failed to generate speech");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();

    } catch (error) {
      console.error("ElevenLabs failed, switching to browser TTS:", error);

      // Fallback to browser Web Speech API
      if ("speechSynthesis" in window) {
        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Try to select a female voice (prefer soothing/soft)
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
          v.name.includes("Female") ||
          v.name.includes("Samantha") ||
          v.name.includes("Google US English")
        );

        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.rate = 0.9; // Slightly slower for calming effect
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleUserMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Format history for Gemini (excluding the latest message which is sent as 'message')
      // Gemini expects role: 'user' | 'model'
      const history = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: "ai", text: data.response },
      ]);

      // Play audio response
      speakText(data.response);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "I'm having trouble connecting right now. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  // Panic Button Logic - Immediate redirect + Stop Audio
  const handlePanic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopListening();
    window.location.href = "https://www.google.com";
  };

  // Toggle microphone
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Toggle mute mode
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-gradient-to-br from-gray-50 via-teal-50/30 to-blue-50/20 transition-colors duration-500 dark:from-gray-900 dark:via-teal-950/20 dark:to-blue-950/10">
      {/* Animated Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Floating gradient orbs */}
        <div className="absolute -left-20 top-20 h-72 w-72 animate-pulse rounded-full bg-gradient-to-br from-teal-400/20 to-blue-400/20 blur-3xl"></div>
        <div className="absolute -right-20 top-40 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 blur-3xl [animation-delay:1s]"></div>
        <div className="absolute bottom-20 left-1/3 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-cyan-400/15 to-teal-400/15 blur-3xl [animation-delay:2s]"></div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* Header with Panic Button and Theme Toggle */}
      <header className="fixed top-0 z-50 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:border-gray-700/50 dark:bg-gray-800/80">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30 ring-2 ring-teal-400/20">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-xl font-bold tracking-tight text-transparent dark:from-teal-400 dark:to-teal-500">
              SafeHaven
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 shadow-sm transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <Moon className="h-4 w-4" />
              ) : isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Panic Button */}
            <button
              onClick={handlePanic}
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-600/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-red-600/40 active:scale-95"
              aria-label="Quick exit to safe website"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              <span className="hidden sm:inline">QUICK EXIT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Chat Display Area */}
      <div className="mt-20 mb-32 w-full max-w-md flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                {/* Animated pulse rings */}
                <div className="absolute inset-0 animate-ping rounded-full bg-teal-400 opacity-20"></div>
                <div className="absolute inset-0 animate-pulse rounded-full bg-teal-400 opacity-30"></div>
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-2xl shadow-teal-500/40">
                  <Mic className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="space-y-2 px-6">
                <h2 className="text-2xl font-semibold text-gray-800 transition-colors duration-300 dark:text-gray-100">
                  Welcome to SafeHaven
                </h2>
                <p className="text-base text-gray-600 transition-colors duration-300 dark:text-gray-400">
                  A safe space for you. Tap the microphone below to start a confidential conversation.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 transition-colors duration-300 dark:bg-teal-900/30">
                <div className="h-2 w-2 animate-pulse rounded-full bg-teal-600"></div>
                <span className="text-sm font-medium text-teal-700 transition-colors duration-300 dark:text-teal-400">
                  Private & Secure
                </span>
              </div>
            </div>
          )}

          {/* Message Bubbles */}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"
                }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md transition-all duration-300 sm:max-w-[75%] ${msg.role === "user"
                  ? "rounded-br-sm bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-teal-500/20"
                  : "rounded-bl-sm bg-white text-gray-800 shadow-gray-200/50 dark:bg-gray-800 dark:text-gray-100 dark:shadow-gray-900/50"
                  }`}
              >
                <p className="text-base leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}

          {/* Live Transcript (Ghost Message) */}
          {isListening && transcript && (
            <div className="flex animate-fade-in justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-teal-500/70 to-teal-600/70 px-4 py-3 text-white shadow-md shadow-teal-500/10 backdrop-blur-sm transition-all duration-300 sm:max-w-[75%]">
                <p className="text-base leading-relaxed opacity-90">
                  {transcript}
                  <span className="animate-pulse">|</span>
                </p>
              </div>
            </div>
          )}

          {/* Thinking State */}
          {isLoading && (
            <div className="flex animate-fade-in justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-md transition-colors duration-300 dark:bg-gray-800 sm:max-w-[75%]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-teal-600"></div>
                  </div>
                  <span className="text-sm text-gray-500 transition-colors duration-300 dark:text-gray-400">
                    SafeHaven is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel Footer */}
      <footer className="fixed bottom-0 z-50 w-full border-t border-gray-200 bg-white/95 backdrop-blur-sm transition-colors duration-300 dark:border-gray-700 dark:bg-gray-800/95">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-4 sm:px-8">
          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className={`group flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${isMuted
              ? "bg-orange-100 text-orange-600 shadow-lg shadow-orange-500/20 dark:bg-orange-900/40 dark:text-orange-400"
              : "bg-gray-100 text-gray-600 shadow-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? (
              <VolumeX className="h-6 w-6 transition-transform group-hover:scale-110" />
            ) : (
              <Volume2 className="h-6 w-6 transition-transform group-hover:scale-110" />
            )}
          </button>

          {/* Microphone Button */}
          <button
            onClick={toggleListening}
            className={`group relative flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${isListening
              ? "animate-pulse bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/50"
              : "bg-gradient-to-br from-teal-500 to-teal-600 shadow-teal-500/40 hover:from-teal-600 hover:to-teal-700 hover:shadow-teal-500/60"
              }`}
            aria-label={isListening ? "Stop recording" : "Start recording"}
          >
            {isListening && (
              <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-75"></div>
            )}
            {isListening ? (
              <MicOff className="relative h-8 w-8 text-white transition-transform group-hover:scale-110" />
            ) : (
              <Mic className="relative h-8 w-8 text-white transition-transform group-hover:scale-110" />
            )}
          </button>

          {/* Info/Safety Icon */}
          <button
            className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600 shadow-md transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            aria-label="Safety information"
          >
            <ShieldAlert className="h-6 w-6 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </footer>
    </main>
  );
}
