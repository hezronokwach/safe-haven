"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, ShieldAlert, LogOut, Sun, Moon, Phone } from "lucide-react";
import { useHume } from "../hooks/use-hume";

export default function HumePage() {
    const { status, messages, error, startSession, endSession, toggleMic, toggleSpeaker, isMicMuted, isSpeakerMuted } = useHume();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showHelpline, setShowHelpline] = useState(false);

    // Initialize theme
    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
        setIsDarkMode(shouldBeDark);
        document.documentElement.classList.toggle("dark", shouldBeDark);
    }, []);

    // Auto-start Hume session
    useEffect(() => {
        if (status === 'IDLE') {
            startSession();
        }
    }, [status, startSession]);

    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        document.documentElement.classList.toggle("dark", newTheme);
        localStorage.setItem("theme", newTheme ? "dark" : "light");
    };

    const handlePanic = () => {
        window.location.href = "https://www.google.com";
    };

    return (
        <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-gray-50 transition-colors duration-500 dark:bg-[#0f1419]">
            {/* Animated Background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-4 top-0 h-96 w-96 animate-blob rounded-full bg-teal-300 opacity-30 blur-3xl filter transition-opacity duration-500 dark:bg-teal-600 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
                <div className="absolute right-0 top-0 h-96 w-96 animate-blob rounded-full bg-purple-300 opacity-30 blur-3xl filter transition-opacity duration-500 [animation-delay:2s] dark:bg-purple-600 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
                <div className="absolute -bottom-32 left-20 h-96 w-96 animate-blob rounded-full bg-pink-300 opacity-30 blur-3xl filter transition-opacity duration-500 [animation-delay:4s] dark:bg-pink-600 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 z-50 w-full border-b border-white/20 bg-white/60 backdrop-blur-2xl transition-all duration-500 dark:border-white/10 dark:bg-gray-900/60 shadow-sm">
                <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:px-6 lg:max-w-5xl">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl shadow-sm" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', boxShadow: '0 8px 16px rgba(79, 158, 143, 0.2)' }}>
                            <ShieldAlert className="h-5 w-5 text-white animate-sway" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold text-teal-800 dark:text-teal-400 transition-colors">
                                SafeHaven Empathic
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Powered by Hume AI</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-all duration-200 hover:scale-110 active:scale-95 dark:bg-gray-800 dark:text-gray-300"
                            aria-label="Toggle theme"
                        >
                            {!mounted ? (
                                <Moon className="h-5 w-5" />
                            ) : isDarkMode ? (
                                <Sun className="h-5 w-5" />
                            ) : (
                                <Moon className="h-5 w-5" />
                            )}
                        </button>

                        <button
                            onClick={handlePanic}
                            className="group relative overflow-hidden flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #d73a3a 0%, #b91c1c 100%)', boxShadow: '0 8px 16px rgba(215, 58, 58, 0.25)' }}
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">EXIT</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Chat Display */}
            <div className="mt-20 mb-32 w-full max-w-md flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:max-w-4xl lg:px-8">
                <div className="space-y-4 lg:space-y-8">
                    {error && (
                        <div className="rounded-xl p-4 text-sm animate-fade-in" style={{ backgroundColor: 'rgba(215, 58, 58, 0.08)', borderLeft: '4px solid var(--error)', color: 'var(--error)' }}>
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" />
                                <span className="font-medium">Connection Error:</span>
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
                                    Welcome to SafeHaven Empathic
                                </h2>
                                <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400 transition-colors">
                                    Powered by Hume AI's emotion-aware voice. Tap the microphone to begin.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 rounded-full px-6 py-3 animate-pulse-soft" style={{ backgroundColor: 'var(--primary-lighter)', color: 'var(--primary-dark)' }}>
                                <div className="h-2 w-2 rounded-full animate-pulse-soft" style={{ backgroundColor: 'var(--primary)' }}></div>
                                <span className="text-sm font-medium">Status: {status}</span>
                            </div>
                        </div>
                    )}

                    {/* Message Bubbles */}
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-md transition-all duration-300 sm:max-w-[75%] ${msg.role === "user"
                                        ? "rounded-br-sm bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg"
                                        : "rounded-bl-sm glass-panel text-gray-800 dark:text-gray-100 shadow-sm"
                                    }`}
                                style={{
                                    background: msg.role === "user"
                                        ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)'
                                        : 'var(--bg-light-secondary)',
                                    color: msg.role === "user" ? 'white' : 'var(--text-light)',
                                }}
                            >
                                <p className="text-base leading-relaxed">{msg.text}</p>
                            </div>
                        </div>
                    ))}

                    {/* Thinking State */}
                    {status === 'CONNECTING' && (
                        <div className="flex animate-fade-in justify-start">
                            <div className="max-w-[85%] rounded-2xl rounded-bl-sm glass-panel px-5 py-4 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-teal-600"></div>
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.15s]"></div>
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.3s]"></div>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Connecting...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Emergency Helpline */}
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
                    <div className="flex items-center gap-3">
                        {/* Speaker/Mute Toggle */}
                        <button
                            onClick={toggleSpeaker}
                            className="group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                            style={{
                                backgroundColor: isSpeakerMuted ? 'rgba(217, 119, 122, 0.15)' : 'var(--bg-light-secondary)',
                                color: isSpeakerMuted ? 'var(--accent)' : 'var(--text-light)',
                                boxShadow: isSpeakerMuted ? '0 4px 12px rgba(217, 119, 122, 0.1)' : 'none'
                            }}
                            aria-label={isSpeakerMuted ? "Unmute audio" : "Mute audio"}
                        >
                            {isSpeakerMuted ? (
                                <VolumeX className="h-6 w-6 transition-transform group-hover:scale-110" />
                            ) : (
                                <Volume2 className="h-6 w-6 transition-transform group-hover:scale-110" />
                            )}
                        </button>
                    </div>

                    {/* Microphone Button - Center */}
                    <button
                        onClick={toggleMic}
                        className={`group relative flex h-20 w-20 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${!isMicMuted ? "animate-pulse" : ""
                            }`}
                        style={{
                            background: !isMicMuted
                                ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)'
                                : 'linear-gradient(135deg, var(--error) 0%, #b91c1c 100%)',
                            boxShadow: !isMicMuted
                                ? '0 12px 32px rgba(79, 158, 143, 0.2)'
                                : '0 12px 32px rgba(215, 58, 58, 0.3)'
                        }}
                        aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                    >
                        {!isMicMuted && (
                            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(255, 255, 255, 0.3)' }}></div>
                        )}
                        {isMicMuted ? (
                            <MicOff className="relative h-9 w-9 text-white transition-transform group-hover:scale-110" />
                        ) : (
                            <Mic className="relative h-9 w-9 text-white transition-transform group-hover:scale-110" />
                        )}
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Emergency Helpline Toggle */}
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
                </div>
            </footer>
        </main>
    );
}
