import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Check } from 'lucide-react';

const TimeInput = ({ value, onChange, initialMode = 'manual' }) => {
    const [mode, setMode] = useState(initialMode); // 'manual' | 'stopwatch'

    // Apply initialMode when it changes (e.g., from assignment click)
    useEffect(() => {
        if (initialMode) {
            setMode(initialMode);
        }
    }, [initialMode]);

    // --- Manual Mode (Drum Roll) States ---
    const [step, setStep] = useState(5); // 1 or 5

    // Committed values (what is sent to parent)
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);

    // Visual/Interactive values (what is shown during scroll)
    const [visualHours, setVisualHours] = useState(0);
    const [visualMinutes, setVisualMinutes] = useState(0);

    // Refs for scroll containers
    const hoursScrollRef = useRef(null);
    const minutesScrollRef = useRef(null);

    // Debounce timers for committing value
    const hoursTimerRef = useRef(null);
    const minutesTimerRef = useRef(null);

    // Flag to ignore scroll events when we programmatic switch input
    const isScrollingProgrammatically = useRef(false);

    // Constants
    const ITEM_HEIGHT = 40;
    //const PADDING = 60; // py-[60px]

    // Generate options
    const hourOptions = Array.from({ length: 6 }, (_, i) => i); // 0-5 hours
    const getMinuteOptions = () => {
        const max = step === 5 ? 55 : 59;
        const options = [];
        for (let i = 0; i <= max; i += step) {
            options.push(i);
        }
        return options;
    };
    const minuteOptions = getMinuteOptions();

    // --- Synchronization Logic ---

    // 1. Initialize local state from prop value
    useEffect(() => {
        const val = Number(value) || 0;
        const h = Math.floor(val / 60);
        const m = val % 60;

        // Only update if different to avoid loops (though safe with primitives)
        if (h !== hours || m !== minutes) {
            setHours(h);
            setVisualHours(h);
            setMinutes(m);
            setVisualMinutes(m);
        }
    }, [value,hours,minutes]);

    // 2. Scroll to position when visual values change (initial load or external update)
    // We use detailed dependency tracking to avoid fighting user scroll
    useEffect(() => {
        if (!hoursScrollRef.current) return;
        // Find index of current hour
        const index = hourOptions.indexOf(visualHours);
        if (index !== -1) {
            const targetScroll = index * ITEM_HEIGHT;
            if (Math.abs(hoursScrollRef.current.scrollTop - targetScroll) > 5) {
                isScrollingProgrammatically.current = true;
                hoursScrollRef.current.scrollTop = targetScroll;
                setTimeout(() => { isScrollingProgrammatically.current = false; }, 100);
            }
        }
    }, [visualHours,hourOptions,ITEM_HEIGHT]); // Dependencies: only when the *intent* changes

    useEffect(() => {
        if (!minutesScrollRef.current) return;
        const index = minuteOptions.indexOf(visualMinutes);
        if (index !== -1) {
            const targetScroll = index * ITEM_HEIGHT;
            if (Math.abs(minutesScrollRef.current.scrollTop - targetScroll) > 5) {
                isScrollingProgrammatically.current = true;
                minutesScrollRef.current.scrollTop = targetScroll;
                setTimeout(() => { isScrollingProgrammatically.current = false; }, 100);
            }
        }
    }, [visualMinutes, step]); // Re-run when step changes too

    // 3. Commit changes to parent (debounced) - handled in scroll handlers

    // --- Scroll Handlers ---

    const handleHoursScroll = () => {
        if (isScrollingProgrammatically.current) return;

        const container = hoursScrollRef.current;
        if (!container) return;

        // Calculate focused item based on scrollTop
        // At scrollTop 0, the first item is centered due to padding
        const scrollTop = container.scrollTop;
        const rawIndex = Math.round(scrollTop / ITEM_HEIGHT);
        const index = Math.max(0, Math.min(rawIndex, hourOptions.length - 1));
        const selected = hourOptions[index];

        // Update visual state immediately
        if (selected !== visualHours) {
            setVisualHours(selected);
        }

        // Debounce commit to parent
        if (hoursTimerRef.current) clearTimeout(hoursTimerRef.current);
        hoursTimerRef.current = setTimeout(() => {
            setHours(selected);
            // Calculate new total
            const newTotal = selected * 60 + visualMinutes; // Use visualMinutes as it might be changing too
            onChange(newTotal);
        }, 150); // Faster debounce for snappier feel
    };

    const handleMinutesScroll = () => {
        if (isScrollingProgrammatically.current) return;

        const container = minutesScrollRef.current;
        if (!container) return;

        const scrollTop = container.scrollTop;
        const rawIndex = Math.round(scrollTop / ITEM_HEIGHT);
        const index = Math.max(0, Math.min(rawIndex, minuteOptions.length - 1));
        const selected = minuteOptions[index];

        if (selected !== visualMinutes) {
            setVisualMinutes(selected);
        }

        if (minutesTimerRef.current) clearTimeout(minutesTimerRef.current);
        minutesTimerRef.current = setTimeout(() => {
            setMinutes(selected);
            const newTotal = visualHours * 60 + selected;
            onChange(newTotal);
        }, 150);
    };

    const handleStepChange = () => {
        const newStep = step === 5 ? 1 : 5;
        setStep(newStep);
        // Logic to snap current minutes to new step is handled by visual recalc or parent update
        // But let's be explicit:
        const newMax = newStep === 5 ? 55 : 59;
        let newMin = visualMinutes;
        if (newMin > newMax) newMin = newMax;
        newMin = Math.round(newMin / newStep) * newStep;

        setVisualMinutes(newMin);
        setMinutes(newMin);
        onChange(visualHours * 60 + newMin);
    };

    // --- Stopwatch Logic (unchanged) ---
    const [isRunning, setIsRunning] = useState(false);
    const [secondsState, setSecondsState] = useState(0); // Renamed to avoid confusion with minutes

    useEffect(() => {
        let interval = null;
        if (isRunning) {
            interval = setInterval(() => {
                setSecondsState(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatStopwatch = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const applyStopwatch = () => {
        const mins = Math.max(1, Math.floor(secondsState / 60));
        onChange(mins);
        setIsRunning(false);
        setSecondsState(0);
        alert(`ストップウォッチの記録（${mins}分）をセットしました`);
        setMode('manual');
    };

    const resetStopwatch = () => {
        setIsRunning(false);
        setSecondsState(0);
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
                            onClick={handleStepChange}
                            className="text-xs font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 px-2 py-1 rounded"
                        >
                            {step}分刻み
                        </button>
                    </div>

                    {/* Dual Drum Roll */}
                    <div className="flex gap-2 justify-center items-center">
                        {/* Hours Picker */}
                        <div className="relative h-40 w-24 overflow-hidden bg-gray-50 rounded-lg border border-gray-200">
                            {/* Fixed center highlight bar - semi-transparent */}
                            <div className="absolute top-1/2 left-0 right-0 h-10 -mt-5 bg-indigo-100 bg-opacity-50 border-t border-b border-indigo-200 pointer-events-none z-10"></div>

                            <div
                                ref={hoursScrollRef}
                                onScroll={handleHoursScroll}
                                className="h-full overflow-y-auto snap-y py-[60px] scrollbar-hide"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {hourOptions.map(h => (
                                    <div
                                        key={h}
                                        className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all ${visualHours === h ? 'font-bold text-indigo-700 text-xl' : 'text-gray-400 text-base'
                                            }`}
                                    >
                                        {h}
                                    </div>
                                ))}
                            </div>
                            <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-400 font-bold pointer-events-none">
                                時間
                            </div>
                        </div>

                        {/* Separator - centered */}
                        <div className="text-2xl font-bold text-gray-400 self-center pb-2">:</div>

                        {/* Minutes Picker */}
                        <div className="relative h-40 w-24 overflow-hidden bg-gray-50 rounded-lg border border-gray-200">
                            {/* Fixed center highlight bar - semi-transparent */}
                            <div className="absolute top-1/2 left-0 right-0 h-10 -mt-5 bg-indigo-100 bg-opacity-50 border-t border-b border-indigo-200 pointer-events-none z-10"></div>

                            <div
                                ref={minutesScrollRef}
                                onScroll={handleMinutesScroll}
                                className="h-full overflow-y-auto snap-y py-[60px] scrollbar-hide"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {minuteOptions.map(m => (
                                    <div
                                        key={m}
                                        className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all ${visualMinutes === m ? 'font-bold text-indigo-700 text-xl' : 'text-gray-400 text-base'
                                            }`}
                                    >
                                        {m}
                                    </div>
                                ))}
                            </div>
                            <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-400 font-bold pointer-events-none">
                                分
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-500">
                        選択中: <span className="font-bold text-gray-900 text-lg">{visualHours}時間 {visualMinutes}分</span>
                        <span className="text-xs text-gray-400 ml-2">（合計 {visualHours * 60 + visualMinutes}分）</span>
                    </div>
                </div>
            ) : (
                <div className="text-center py-4">
                    <div className="text-5xl font-mono font-bold text-gray-900 mb-6 tracking-wider">
                        {formatStopwatch(secondsState)}
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
                            disabled={secondsState === 0 && !isRunning}
                            className="w-16 h-16 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <RotateCcw className="w-6 h-6" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={applyStopwatch}
                        disabled={secondsState < 60}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:bg-gray-300 transition"
                    >
                        <Check className="w-5 h-5" />
                        この時間を入力 ({Math.floor(secondsState / 60)}分)
                    </button>
                    {secondsState > 0 && secondsState < 60 && <p className="text-xs text-red-500 mt-2">※1分以上から記録可能です</p>}
                </div>
            )}

            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </div>
    );
};

export default TimeInput;
