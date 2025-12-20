import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Check } from 'lucide-react';

const TimeInput = ({ value, onChange }) => {
    const [mode, setMode] = useState('manual'); // 'manual' | 'stopwatch'

    // --- Manual Mode (Drum Roll) States ---
    const [step, setStep] = useState(5); // 1 or 5
    // Generate options based on step
    const getOptions = () => {
        const options = [];
        for (let i = 0; i <= 300; i += step) {
            if (i > 0) options.push(i);
        }
        return options;
    };
    const options = getOptions();

    // Scroll to selected value on mount/update
    const scrollRef = useRef(null);

    // --- Stopwatch Mode States ---
    const [isRunning, setIsRunning] = useState(false);
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        let interval = null;
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatStopwatch = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const applyStopwatch = () => {
        const mins = Math.max(1, Math.floor(seconds / 60)); // Minimum 1 min
        onChange(mins);
        setIsRunning(false);
        setSeconds(0);
        alert(`ストップウォッチの記録（${mins}分）をセットしました`);
        setMode('manual'); // Switch back to manual to show the value
    };

    const resetStopwatch = () => {
        setIsRunning(false);
        setSeconds(0);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            {/* Tab Switcher */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${mode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    手動入力
                </button>
                <button
                    type="button"
                    onClick={() => setMode('stopwatch')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${mode === 'stopwatch' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    ストップウォッチ
                </button>
            </div>

            {mode === 'manual' ? (
                <div className="text-center">
                    <div className="flex justify-end mb-2">
                        <button
                            type="button"
                            onClick={() => setStep(prev => prev === 5 ? 1 : 5)}
                            className="text-xs font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 px-2 py-1 rounded"
                        >
                            {step}分刻み
                        </button>
                    </div>

                    <div className="relative h-40 overflow-hidden bg-gray-50 rounded-lg border border-gray-200">
                        {/* Highlight Bar */}
                        <div className="absolute top-1/2 left-0 right-0 h-10 -mt-5 bg-indigo-100 border-t border-b border-indigo-200 pointer-events-none z-0"></div>

                        <div className="h-full overflow-y-auto snap-y snap-mandatory py-[60px]" ref={scrollRef}>
                            {options.map(opt => (
                                <div
                                    key={opt}
                                    onClick={() => onChange(opt)}
                                    className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-colors z-10 relative ${Number(value) === opt ? 'font-bold text-indigo-700 text-xl' : 'text-gray-400'
                                        }`}
                                >
                                    {opt} 分
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        現在: <span className="font-bold text-gray-900">{value || 0}</span> 分
                    </div>
                </div>
            ) : (
                <div className="text-center py-4">
                    <div className="text-5xl font-mono font-bold text-gray-900 mb-6 tracking-wider">
                        {formatStopwatch(seconds)}
                    </div>

                    <div className="flex justify-center gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setIsRunning(!isRunning)}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition shadow-lg ${isRunning
                                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                        >
                            {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>

                        <button
                            type="button"
                            onClick={resetStopwatch}
                            disabled={seconds === 0 && !isRunning}
                            className="w-16 h-16 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <RotateCcw className="w-6 h-6" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={applyStopwatch}
                        disabled={seconds < 60} // Require at least 1 min
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:bg-gray-300 transition"
                    >
                        <Check className="w-5 h-5" />
                        この時間を入力 ({Math.floor(seconds / 60)}分)
                    </button>
                    {seconds > 0 && seconds < 60 && <p className="text-xs text-red-500 mt-2">※1分以上から記録可能です</p>}
                </div>
            )}
        </div>
    );
};

export default TimeInput;
