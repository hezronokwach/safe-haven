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

    // Use Server-Side TTS (ElevenLabs)
    // Pass the selected gender so the server can pick the correct Voice ID
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          gender: voiceGender
        }),
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
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-gray-50 transition-colors duration-500 dark:bg-[#0f1419]">
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
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl shadow-sm" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', boxShadow: '0 8px 16px rgba(79, 158, 143, 0.2)' }}>
              <ShieldAlert className="h-5 w-5 text-white animate-sway" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-teal-800 dark:text-teal-400 transition-colors">
                SafeHaven
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Confidential Support</p>
            </div>
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
              className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-all duration-200 hover:scale-110 active:scale-95 dark:bg-gray-800 dark:text-gray-300"
              aria-label="Toggle theme"
            >
              <div className="relative h-5 w-5">
                {!mounted ? (
                  <Moon className="h-5 w-5 absolute inset-0" />
                ) : isDarkMode ? (
                  <Sun className="h-5 w-5 absolute inset-0 animate-fade-in" />
                ) : (
                  <Moon className="h-5 w-5 absolute inset-0 animate-fade-in" />
                )}
              </div>
            </button>

            {/* Panic Button */}
            <button
              onClick={handlePanic}
              className="group relative overflow-hidden flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #d73a3a 0%, #b91c1c 100%)', boxShadow: '0 8px 16px rgba(215, 58, 58, 0.25)' }}
              aria-label="Quick exit to safe website"
            >
              <div className="absolute inset-0 translate-x-full group-hover:translate-x-0 transition-transform duration-300" style={{ background: 'rgba(0, 0, 0, 0.1)' }}></div>
              <LogOut className="h-4 w-4 relative transition-transform group-hover:translate-x-0.5" />
              <span className="hidden sm:inline relative">EXIT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Chat Display Area */}
      <div className="mt-20 mb-32 w-full max-w-md flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:max-w-4xl lg:px-8">
        <div className="space-y-4 lg:space-y-8">
          {error && (
            <div className="rounded-xl p-4 text-sm animate-fade-in" style={{ backgroundColor: 'rgba(215, 58, 58, 0.08)', borderLeft: '4px solid var(--error)', color: 'var(--error)' }}>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span className="font-medium">Microphone Error:</span>
              </div>
              <p className="mt-2 ml-6 text-sm opacity-90">{error}</p>
            </div>
          )}

          {messages.length === 0 && !error && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-gentle-float" style={{ background: 'radial-gradient(circle, rgba(79, 158, 143, 0.2) 0%, transparent 70%)', width: '120px', height: '120px' }}></div>
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', boxShadow: '0 20px 40px rgba(79, 158, 143, 0.25)' }}>
                  <Mic className="h-12 w-12 text-white animate-sway" />
                </div>
              </div>
              <div className="space-y-3 px-6">
                <h2 className="text-3xl font-light text-gray-800 dark:text-gray-100 transition-colors">
                  Welcome to SafeHaven
                </h2>
                <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400 transition-colors">
                  A safe, confidential space where you can share your thoughts and feelings. Tap the microphone below to begin.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full px-6 py-3 animate-pulse-soft" style={{ backgroundColor: 'var(--primary-lighter)', color: 'var(--primary-dark)' }}>
                <div className="h-2 w-2 rounded-full animate-pulse-soft" style={{ backgroundColor: 'var(--primary)' }}></div>
                <span className="text-sm font-medium">
                  End-to-end Private & Secure
                </span>
              </div>
            </div>
          )}

          {/* Message Bubbles */}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-md transition-all duration-300 sm:max-w-[75%] ${msg.role === "user"
                  ? "rounded-br-sm bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/20 border border-teal-400/20"
                  : "rounded-bl-sm glass-panel text-gray-800 dark:text-gray-100 shadow-sm"
                  }`}
                style={{
                  background: msg.role === "user"
                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)'
                    : 'var(--bg-light-secondary)',
                  color: msg.role === "user" ? 'white' : 'var(--text-light)',
                  boxShadow: msg.role === "user"
                    ? '0 6px 20px rgba(79, 158, 143, 0.15)'
                    : '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}
              >
                <p className="text-base leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}

          {/* Live Transcript (Ghost Message) */}
          {isListening && transcript && (
            <div className="flex animate-fade-in justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-none px-5 py-4 text-white sm:max-w-[70%]" style={{ background: 'linear-gradient(135deg, rgba(79, 158, 143, 0.9) 0%, rgba(109, 184, 165, 0.9) 100%)', backdropFilter: 'blur(8px)' }}>
                <p className="text-base leading-relaxed opacity-95">
                  {transcript}
                  <span className="animate-typing ml-1 inline-block">●</span>
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
                  <span className="text-sm" style={{ color: 'var(--text-light-secondary)' }}>
                    SafeHaven is listening...
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
            className="group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              backgroundColor: isMuted ? 'rgba(217, 119, 122, 0.15)' : 'var(--bg-light-secondary)',
              color: isMuted ? 'var(--accent)' : 'var(--text-light)',
              boxShadow: isMuted ? '0 4px 12px rgba(217, 119, 122, 0.1)' : 'none'
            }}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? (
              <VolumeX className="h-6 w-6 transition-transform group-hover:scale-110" />
            ) : (
              <Volume2 className="h-6 w-6 transition-transform group-hover:scale-110" />
            )}
          </button>

          {/* Microphone Button - Center */}
          <button
            onClick={toggleListening}
            className={`group relative flex h-20 w-20 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${isListening
              ? "animate-pulse"
              : "hover:shadow-lg"
              }`}
            style={{
              background: isListening
                ? 'linear-gradient(135deg, var(--error) 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
              boxShadow: isListening
                ? '0 12px 32px rgba(215, 58, 58, 0.3)'
                : '0 12px 32px rgba(79, 158, 143, 0.2)'
            }}
            aria-label={isListening ? "Stop recording" : "Start recording"}
          >
            {isListening && (
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(255, 255, 255, 0.3)' }}></div>
            )}
            {isListening ? (
              <MicOff className="relative h-9 w-9 text-white transition-transform group-hover:scale-110" />
            ) : (
              <Mic className="relative h-9 w-9 text-white transition-transform group-hover:scale-110" />
            )}
          </button>

          {/* Info/Safety Icon - Toggles Helpline */}
          <button
            onClick={() => setShowHelpline(!showHelpline)}
            className="group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              backgroundColor: showHelpline ? 'rgba(215, 58, 58, 0.15)' : 'var(--bg-light-secondary)',
              color: showHelpline ? 'var(--error)' : 'var(--text-light)',
              boxShadow: showHelpline ? '0 4px 12px rgba(215, 58, 58, 0.1)' : 'none'
            }}
            aria-label="Toggle emergency helpline"
          >
            <ShieldAlert className="h-6 w-6 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </footer>
    </main>
  );
}
