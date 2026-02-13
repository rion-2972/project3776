import React from 'react';
import { useEffectContext } from '../../contexts/EffectContext';
import { ArrowLeft, Check, Flame, Sparkles } from 'lucide-react';

const EffectSettings = ({ onBack }) => {
    const { effect: currentEffect, changeEffect, loading } = useEffectContext();

    const effects = [
        {
            id: 'burning',
            name: '燃焼（推奨）',
            nameEn: 'Burning',
            description: 'タスク完了時に炎のエフェクトが表示されます',
            icon: Flame
        },
        {
            id: 'pop_explosion',
            name: 'ポップな爆発（非推奨/フリーズします）',
            nameEn: 'Pop Explosion',
            description: 'タスク完了時に豪華なアニメーションが表示されます',
            icon: Sparkles
        }
    ];

    const handleEffectChange = async (effectId) => {
        try {
            await changeEffect(effectId);
        } catch (error) {
            console.error('Error updating effect:', error);
            alert('エフェクトの更新に失敗しました');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">エフェクト設定</h1>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 pt-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {effects.map((effect, index) => (
                        <button
                            key={effect.id}
                            onClick={() => handleEffectChange(effect.id)}
                            className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition ${index < effects.length - 1 ? 'border-b border-gray-100' : ''
                                } ${currentEffect === effect.id ? 'bg-indigo-50' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${currentEffect === effect.id ? 'bg-indigo-100' : 'bg-gray-100'
                                    }`}>
                                    <effect.icon className={`w-5 h-5 ${currentEffect === effect.id ? 'text-indigo-600' : 'text-gray-600'
                                        }`} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium text-gray-900">
                                        {effect.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {effect.description}
                                    </span>
                                </div>
                            </div>
                            {currentEffect === effect.id && (
                                <Check className="w-5 h-5 text-indigo-600" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EffectSettings;
