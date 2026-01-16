import React from 'react';
import { useUltravox } from '@/app/hooks/use-ultravox';

const UltravoxTest: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { status, transcripts, error, startSession, endSession } = useUltravox();

    const handleStart = async () => {
        await startSession();
    };

    const handleEnd = () => {
        endSession();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 text-white flex flex-col items-center justify-center z-50">
            <h2 className="text-2xl font-bold mb-4">Ultravox Audio Test ("Voice Only")</h2>

            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md h-96 overflow-y-auto mb-6 border border-gray-700">
                {transcripts.length === 0 ? (
                    <p className="text-gray-500 italic text-center mt-10">Transcripts will appear here...</p>
                ) : (
                    transcripts.map((t, i) => (
                        <div key={i} className="mb-2 p-2 bg-gray-700 rounded">{t}</div>
                    ))
                )}
            </div>

            <div className="text-xl mb-6 font-mono text-emerald-400">
                Status: {status}
                {error && <div className="text-red-400 text-sm mt-2">Error: {error}</div>}
            </div>

            <div className="flex gap-4">
                {status === 'IDLE' || status === 'ERROR' ? (
                    <button
                        onClick={handleStart}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full font-bold text-lg"
                    >
                        Start Voice Call
                    </button>
                ) : (
                    <button
                        onClick={handleEnd}
                        className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-bold text-lg"
                    >
                        End Call
                    </button>
                )}
                <button onClick={onClose} className="text-gray-400 hover:text-white mt-4">Close</button>
            </div>
        </div>
    );
};

export default UltravoxTest;
