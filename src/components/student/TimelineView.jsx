import React, { useState, useEffect, useMemo } from 'react';
import { collectionGroup, collection, query, orderBy, limit, onSnapshot, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Clock, User, Flame } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import MtFujiProgress from '../shared/MtFujiProgress';

// === リアクション絵文字の定義 ===
const REACTION_EMOJIS = [
    { emoji: '🔥', label: 'ヤバい！' },
    { emoji: '👏', label: 'お疲れ！' },
    { emoji: '👀', label: '見てるぞ' },
    { emoji: '💪', label: 'ナイス！' },
];

// === 集中度スタンプの定義 ===
const FOCUS_LEVELS = {
    high: { emoji: '🔥', label: '超集中', color: 'bg-orange-50 text-orange-700' },
    normal: { emoji: '👍', label: '普通', color: 'bg-blue-50 text-blue-700' },
    low: { emoji: '💦', label: 'いまいち', color: 'bg-gray-100 text-gray-600' },
};

// === スケルトンローディングコンポーネント ===
const SkeletonCard = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse">
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="space-y-1.5">
                    <div className="w-20 h-3.5 bg-gray-200 rounded" />
                </div>
            </div>
            <div className="w-16 h-3 bg-gray-100 rounded" />
        </div>
        <div className="pl-10 space-y-2">
            <div className="flex gap-2">
                <div className="w-14 h-6 bg-indigo-100 rounded" />
                <div className="w-16 h-6 bg-gray-200 rounded" />
            </div>
            <div className="w-3/4 h-3.5 bg-gray-100 rounded" />
        </div>
    </div>
);

// === リアクションバーコンポーネント ===
const ReactionBar = ({ recordId, recordUserId, currentUserId, currentUserName }) => {
    const [reactions, setReactions] = useState([]);
    const [showPicker, setShowPicker] = useState(false);

    // リアクションをリアルタイム購読
    useEffect(() => {
        const q = query(collection(db, 'reactions', recordId, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setReactions(data);
        });
        return () => unsubscribe();
    }, [recordId]);

    // 絵文字ごとにグループ化
    const groupedReactions = useMemo(() => {
        const map = {};
        reactions.forEach(r => {
            if (!map[r.emoji]) map[r.emoji] = [];
            map[r.emoji].push(r);
        });
        return map;
    }, [reactions]);

    // 自分が押したリアクション
    const myReaction = reactions.find(r => r.id === currentUserId);

    const handleReaction = async (emoji) => {
        const reactionRef = doc(db, 'reactions', recordId, 'users', currentUserId);

        if (myReaction?.emoji === emoji) {
            // 同じ絵文字を再タップ → 取り消し
            await deleteDoc(reactionRef);
        } else {
            // 新しいリアクションをセット
            await setDoc(reactionRef, {
                emoji,
                userName: currentUserName || 'Unknown',
                createdAt: new Date()
            });
        }
        setShowPicker(false);
    };

    return (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
            {/* 既存のリアクション表示 */}
            {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-150 ${users.some(u => u.id === currentUserId)
                        ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    title={users.map(u => u.userName).join(', ')}
                >
                    <span>{emoji}</span>
                    <span>{users.length}</span>
                </button>
            ))}

            {/* (+) ピッカートグル */}
            <div className="relative">
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 text-xs transition"
                    title="リアクションを追加"
                >
                    +
                </button>
                {showPicker && (
                    <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white border border-gray-200 shadow-lg rounded-full px-2 py-1.5 z-20 reaction-picker-enter">
                        {REACTION_EMOJIS.map(({ emoji, label }) => (
                            <button
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                className={`text-lg hover:scale-125 transition-transform ${myReaction?.emoji === emoji ? 'scale-110' : ''
                                    }`}
                                title={label}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// === メインの TimelineView ===
const TimelineView = () => {
    const { user, profile } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthlyTotalHours, setMonthlyTotalHours] = useState(0);
    const [currentMonth] = useState(new Date());
    const [streaks, setStreaks] = useState({}); // { userId: 連続日数 }

    // 今月のクラス全体の総学習時間を取得
    useEffect(() => {
        const now = currentMonth;
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const q = query(
            collectionGroup(db, 'studyRecords'),
            where('createdAt', '>=', start),
            where('createdAt', '<=', end)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const totalMinutes = snapshot.docs.reduce((sum, d) => {
                return sum + (d.data().duration || 0);
            }, 0);
            setMonthlyTotalHours(Math.round(totalMinutes / 60));
        }, (error) => {
            console.error('クラス全体の学習時間取得エラー:', error);
        });

        return () => unsubscribe();
    }, [currentMonth]);

    // タイムラインの学習記録を取得
    useEffect(() => {
        const q = query(
            collectionGroup(db, 'studyRecords'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRecords = snapshot.docs.map(d => ({
                id: d.id,
                userId: d.ref.parent.parent?.id || '',
                ...d.data()
            }));
            setRecords(fetchedRecords);
            setLoading(false);

            // ストリーク計算用データを集約
            computeStreaks(fetchedRecords);
        }, (error) => {
            console.error("Error fetching timeline:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ストリーク（連続学習日数）を計算
    const computeStreaks = (allRecords) => {
        // ユーザーごとにレコードをグループ化し、日付セットを作成
        const userDates = {};
        allRecords.forEach(r => {
            if (!r.createdAt || !r.userId) return;
            const date = r.createdAt.toDate();
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            if (!userDates[r.userId]) userDates[r.userId] = new Set();
            userDates[r.userId].add(dateKey);
        });

        const today = new Date();
        const newStreaks = {};

        Object.entries(userDates).forEach(([userId, dateSet]) => {
            let streak = 0;
            // 今日から過去に遡って連続日数を数える
            // 今日の記録がなくても、昨日まで続いていればカウント
            for (let i = 0; i <= 60; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                if (dateSet.has(key)) {
                    streak++;
                } else {
                    // 今日の記録がない場合、i=0 はスキップして昨日から確認
                    if (i === 0) continue;
                    break;
                }
            }
            if (streak >= 2) newStreaks[userId] = streak;
        });

        setStreaks(newStreaks);
    };

    // 日付ごとにレコードをグループ化
    const groupedRecords = useMemo(() => {
        const groups = [];
        let currentGroup = null;
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

        records.forEach(record => {
            if (!record.createdAt) return;
            const date = record.createdAt.toDate();
            const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

            let label;
            if (dateKey === todayKey) {
                label = '今日';
            } else if (dateKey === yesterdayKey) {
                label = '昨日';
            } else {
                label = date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
            }

            if (!currentGroup || currentGroup.dateKey !== dateKey) {
                currentGroup = { dateKey, label, records: [] };
                groups.push(currentGroup);
            }
            currentGroup.records.push(record);
        });

        return groups;
    }, [records]);

    const formatTime = (timestamp, isManualDate) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();

        if (isManualDate) {
            return date.toLocaleString('ja-JP', { month: 'short', day: 'numeric' });
        }

        return date.toLocaleString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (minutes) => {
        if (!minutes) return '0分';
        if (minutes < 60) {
            return `${minutes}分`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return remainingMinutes > 0
                ? `${hours}時間${remainingMinutes}分`
                : `${hours}時間`;
        }
    };

    // スケルトンローディング
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse p-6">
                    <div className="h-40 bg-gray-100 rounded-lg" />
                </div>
                <div className="w-48 h-6 bg-gray-200 rounded ml-2 animate-pulse" />
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 富士山進捗表示 */}
            <MtFujiProgress
                currentHours={monthlyTotalHours}
                targetHours={3776}
                currentMonth={currentMonth}
            />

            <h2 className="text-xl font-bold text-gray-900 mb-4 px-2">みんなの学習記録</h2>

            {records.length === 0 ? (
                <div className="bg-white p-8 rounded-xl text-center text-gray-500">
                    まだ記録がありません。一番乗りで記録しましょう！
                </div>
            ) : (
                groupedRecords.map(group => (
                    <div key={group.dateKey}>
                        {/* 日付セパレーター */}
                        <div className="flex items-center gap-3 px-2 mb-3 mt-4 first:mt-0">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                {group.label}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        <div className="space-y-3">
                            {group.records.map((record, recordIndex) => (
                                <div
                                    key={record.id}
                                    id={recordIndex === 0 && group === groupedRecords[0] ? 'tour-reaction-bar' : undefined}
                                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-indigo-500">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-gray-900 text-sm">
                                                    {record.userName || 'Unknown User'}
                                                </span>
                                                {/* ストリークバッジ */}
                                                {streaks[record.userId] && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black">
                                                        <Flame className="w-3 h-3" />
                                                        {streaks[record.userId]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(record.createdAt, record.isManualDate)}
                                        </div>
                                    </div>

                                    <div className="pl-10">
                                        <div className="flex flex-wrap gap-2 mb-1.5">
                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">
                                                {record.subject?.replace(/（.*?）/, '')}
                                            </span>
                                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg">
                                                {formatDuration(record.duration)}
                                            </span>
                                            {/* 集中度スタンプ */}
                                            {record.focusLevel && FOCUS_LEVELS[record.focusLevel] && (
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 ${FOCUS_LEVELS[record.focusLevel].color}`}>
                                                    <span>{FOCUS_LEVELS[record.focusLevel].emoji}</span>
                                                    <span>{FOCUS_LEVELS[record.focusLevel].label}</span>
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-gray-800 font-medium text-sm mb-1">{record.content}</p>

                                        {record.comment && (
                                            <div className="mt-1.5 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg relative">
                                                <span className="text-gray-300 absolute -top-2 left-2 text-2xl font-serif">"</span>
                                                <p className="px-2">{record.comment}</p>
                                            </div>
                                        )}

                                        {/* リアクションバー */}
                                        <ReactionBar
                                            recordId={record.id}
                                            recordUserId={record.userId}
                                            currentUserId={user?.uid}
                                            currentUserName={profile?.displayName}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default TimelineView;
