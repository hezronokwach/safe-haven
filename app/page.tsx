"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, VolumeX, ShieldAlert, LogOut, Sun, Moon, Phone, User } from "lucide-react";
import useSpeechRecognition from "./hooks/use-speech-recognition";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function Home() {
  const { isListening, transcript, startListening, stopListening, resetTranscript, error } = useSpeechRecognition();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHelpline, setShowHelpline] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');

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

    // Warm up speech synthesis voices (fixes issue where voices return empty initially)
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    if ("speechSynthesis" in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    }
  }, []);

  // Handle final transcript when listening stops
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      handleUserMessage(transcript);
      resetTranscript();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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



  /**
   * Handles text-to-speech playback using ElevenLabs API with a browser fallback.
   * @param text The text content to be spoken.
   */
  const speakText = async (text: string) => {
    if (isMuted) {
      console.log("Audio is muted, skipping playback.");
      return;
    }

    // FORCE BROWSER TTS (Temporary override for Voice Selection feature)
    const useBrowserTTS = true;

    if (!useBrowserTTS) {
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
        return; // Exit if ElevenLabs succeeded

      } catch (error) {
        console.error("ElevenLabs failed, switching to browser TTS:", error);
      }
    }

    // Browser TTS Fallback (or Primary if useBrowserTTS is true)
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      // Select voice based on preferred gender
      let voices = window.speechSynthesis.getVoices();

      // Retry getting voices if empty (common browser quirk)
      if (voices.length === 0) {
        window.speechSynthesis.getVoices();
        voices = window.speechSynthesis.getVoices();
      }

      console.log("Available voices:", voices.map(v => v.name)); // Debugging

      let preferredVoice: SpeechSynthesisVoice | undefined;

      if (voiceGender === 'male') {
        preferredVoice = voices.find(v =>
          v.name.includes("Male") ||
          v.name.includes("David") ||
          v.name.includes("Microsoft David") ||
          v.name.includes("Google UK English Male")
        );
      } else {
        preferredVoice = voices.find(v =>
          v.name.includes("Female") ||
          v.name.includes("Samantha") ||
          v.name.includes("Zira") ||
          v.name.includes("Microsoft Zira") ||
          v.name.includes("Hazel") ||
          v.name.includes("Google US English")
        );
      }

      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;



      window.speechSynthesis.speak(utterance);
    }
  };

  /**
   * Processes the user's message, sends it to the Gemini API, and handles the response.
   * @param text The user's input text.
   */
  const handleUserMessage = async (text: string) => {
    const userMessage: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare history for context-aware response
      const history = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      // Check for emergency flag from Gemini
      if (data.is_emergency) {
        setShowHelpline(true);
      }

      setMessages((prev) => [
        ...prev,
        { role: "ai", text: data.reply }, // Note: API now returns { reply, is_emergency }
      ]);

      speakText(data.reply);
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

  /**
   * Toggles the application theme between light and dark modes.
   */
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  /**
   * Toggles between Male and Female voices.
   */
  const toggleVoice = () => {
    setVoiceGender(prev => prev === 'female' ? 'male' : 'female');
  };

  /**
   * Panic Button Logic - Immediate redirect + Stop Audio
   */
  const handlePanic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopListening();
    window.location.href = "https://www.google.com";
  }, [stopListening]);

  /**
   * Toggles microphone listening state.
   */
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  /**
   * Toggles audio mute state. Stops any currently playing audio immediately.
   */
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (newMutedState) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-gradient-to-br from-gray-50 via-teal-50/30 to-blue-50/20 transition-colors duration-500 dark:from-gray-900 dark:via-teal-950/20 dark:to-blue-950/10">
      {/* Animated Background Elements */}
      {/* Organic Aurora Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-4 top-0 h-96 w-96 animate-blob rounded-full bg-teal-300 opacity-30 blur-3xl filter transition-opacity duration-500 dark:bg-teal-600 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
        <div className="absolute right-0 top-0 h-96 w-96 animate-blob rounded-full bg-purple-300 opacity-30 blur-3xl filter transition-opacity duration-500 [animation-delay:2s] dark:bg-purple-600 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
        <div className="absolute -bottom-32 left-20 h-96 w-96 animate-blob rounded-full bg-pink-300 opacity-30 blur-3xl filter transition-opacity duration-500 [animation-delay:4s] dark:bg-pink-600 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
      </div>

      {/* Header with Panic Button and Theme Toggle */}
      <header className="fixed top-0 z-50 w-full border-b border-white/20 bg-white/60 backdrop-blur-2xl transition-all duration-500 dark:border-white/10 dark:bg-gray-900/60 shadow-sm hover:bg-white/70 dark:hover:bg-gray-900/70">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:px-6 lg:max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30 ring-2 ring-teal-400/20">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-xl font-bold tracking-tight text-transparent dark:from-teal-400 dark:to-teal-500">
              SafeHaven
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Toggle */}
            <button
              onClick={toggleVoice}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 ${voiceGender === 'male'
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/40 dark:text-pink-300"
                }`}
              aria-label={`Current voice: ${voiceGender}. Click to switch.`}
            >
              <User className="h-3.5 w-3.5" />
              <span>{voiceGender === 'male' ? 'MALE' : 'FEMALE'}</span>
            </button>

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
      <div className="mt-20 mb-32 w-full max-w-md flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:max-w-4xl lg:px-8">
        <div className="space-y-4 lg:space-y-8">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200 animate-fade-in">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span className="font-medium">Microphone Error:</span>
              </div>
              <p className="mt-1 ml-6">{error}</p>
            </div>
          )}

          {messages.length === 0 && !error && (
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
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-md transition-all duration-300 sm:max-w-[75%] ${msg.role === "user"
                  ? "rounded-br-sm bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/20 border border-teal-400/20"
                  : "rounded-bl-sm glass-panel text-gray-800 dark:text-gray-100 shadow-sm"
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
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm glass-panel px-5 py-4 shadow-sm transition-colors duration-300 sm:max-w-[75%]">
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

      {/* Emergency Helpline Button (Floating) */}
      {showHelpline && (
        <div className="fixed bottom-24 right-6 z-[60] animate-float">
          <a
            href="tel:1195"
            className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-4 font-bold text-white shadow-xl shadow-red-600/40 transition-transform hover:scale-105 active:scale-95"
          >
            <Phone className="h-6 w-6 animate-pulse" />
            <span>CALL 1195</span>
          </a>
        </div>
      )}



      {/* Control Panel Footer */}
      <footer className="fixed bottom-0 z-50 w-full border-t border-white/20 bg-white/60 backdrop-blur-2xl transition-all duration-500 dark:border-white/10 dark:bg-gray-900/60 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-4 sm:px-8 lg:max-w-5xl">
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

          {/* Info/Safety Icon - Toggles Helpline */}
          <button
            onClick={() => setShowHelpline(!showHelpline)}
            className={`group flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${showHelpline
              ? "bg-red-100 text-red-600 shadow-inner dark:bg-red-900/30 dark:text-red-400"
              : "bg-gray-100 text-gray-600 shadow-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            aria-label="Toggle emergency helpline"
          >
            <ShieldAlert className="h-6 w-6 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </footer>
    </main>
  );
}
