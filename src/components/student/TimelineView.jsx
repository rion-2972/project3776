import React, { useState, useEffect } from 'react';
import { collectionGroup, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Clock, User } from 'lucide-react';

const TimelineView = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // collectionGroup queries all collections with the same name 'studyRecords' 
        // regardless of where they are in the hierarchy (i.e. under any user)
        const q = query(
            collectionGroup(db, 'studyRecords'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRecords = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRecords(fetchedRecords);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching timeline:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4 px-2">みんなの学習記録</h2>

            {records.length === 0 ? (
                <div className="bg-white p-8 rounded-xl text-center text-gray-500">
                    まだ記録がありません。一番乗りで記録しましょう！
                </div>
            ) : (
                records.map(record => (
                    <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">
                                        {record.userName || 'Unknown User'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {record.userType === 'bunken' ? '文系' : record.userType === 'riken' ? '理系' : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                {formatTime(record.createdAt)}
                            </div>
                        </div>

                        <div className="pl-10">
                            <div className="flex flex-wrap gap-2 mb-2">
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded">
                                    {record.subject}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                    {record.duration}分
                                </span>
                            </div>

                            <p className="text-gray-800 font-medium text-sm mb-1">{record.content}</p>

                            {record.comment && (
                                <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded relative">
                                    <span className="text-gray-300 absolute -top-2 left-2 text-2xl font-serif">"</span>
                                    <p className="px-2">{record.comment}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default TimelineView;
