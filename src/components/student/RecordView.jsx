import React, { useState, useEffect } from 'react';
import { BookOpen, Send, Plus } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { SUBJECT_GROUPS, TASKS } from '../../utils/constants';
import TimeInput from './TimeInput'; // Import the new component
import { X } from 'lucide-react';

const RecordView = ({ preFillData, onPreFillApplied }) => {
    const { profile, user } = useAuth();

    // Form State
    const [record, setRecord] = useState({
        subject: '',
        selectedItem: '',
        contentDetails: '',
        duration: '', // Now handled by TimeInput (still numeric minutes)
        comment: ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [initialMode, setInitialMode] = useState('manual'); // For TimeInput

    // Reference Books State
    const [referenceBooks, setReferenceBooks] = useState([]);
    const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
    const [newBookName, setNewBookName] = useState('');
    const [addingBook, setAddingBook] = useState(false);

    // Fetch Reference Books
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'users', user.uid, 'referenceBooks'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const books = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReferenceBooks(books);
        });

        return () => unsubscribe();
    }, [user]);

    // Apply pre-filled data when it changes
    useEffect(() => {
        if (preFillData) {
            setRecord(prev => ({
                ...prev,
                subject: preFillData.subject || '',
                selectedItem: preFillData.task || '',
                contentDetails: preFillData.contentDetails || '',
                comment: '' // Keep comment empty
            }));
            if (preFillData.mode) {
                setInitialMode(preFillData.mode);
            }
            // Notify parent that pre-fill has been applied
            if (onPreFillApplied) {
                onPreFillApplied();
            }
        }
    }, [preFillData, onPreFillApplied]);

    // Helper: Find user's elective subject
    const getElectiveSubject = () => {
        if (!profile?.subjects) return null;
        if (profile.type === 'bunken') {
            return profile.subjects.find(s => SUBJECT_GROUPS.bunkenHistory.includes(s));
        } else {
            return profile.subjects.find(s => SUBJECT_GROUPS.rikenScience.includes(s));
        }
    };

    const elective = getElectiveSubject();

    // Helper: Get specialized subjects list
    const getSpecializedSubjects = () => {
        if (profile?.type === 'bunken') {
            const bases = [...SUBJECT_GROUPS.bunken];
            if (elective) bases.push(elective);
            return bases;
        } else {
            const bases = [...SUBJECT_GROUPS.riken];
            if (elective) bases.push(elective);
            return bases;
        }
    };

    const specializedSubjects = getSpecializedSubjects();

    // Handle Input Change (for text fields)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setRecord(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle Duration Change (from TimeInput)
    const handleDurationChange = (minutes) => {
        setRecord(prev => ({ ...prev, duration: minutes }));
    };

    // Handle Subject Select
    const handleSubjectSelect = (subject) => {
        setRecord(prev => ({
            ...prev,
            subject,
            selectedItem: ''
        }));
    };

    // Handle Content Item Select
    const handleItemSelect = (item) => {
        setRecord(prev => ({ ...prev, selectedItem: item }));
    };

    // Handle Add Book
    const handleAddBook = async (e) => {
        e.preventDefault();
        if (!newBookName.trim() || !record.subject) return;

        setAddingBook(true);
        try {
            await addDoc(collection(db, 'users', user.uid, 'referenceBooks'), {
                name: newBookName,
                subject: record.subject,
                createdAt: serverTimestamp()
            });
            setNewBookName('');
            setIsAddBookModalOpen(false);
        } catch (error) {
            console.error('Error adding book:', error);
            alert('参考書の追加に失敗しました。');
        } finally {
            setAddingBook(false);
        }
    };

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!record.subject || !record.selectedItem || !record.duration) {
            alert('教科、内容、時間を入力してください');
            return;
        }

        setSubmitting(true);
        try {
            const fullContent = record.contentDetails
                ? `${record.selectedItem} ${record.contentDetails}`
                : record.selectedItem;

            await addDoc(collection(db, 'users', user.uid, 'studyRecords'), {
                subject: record.subject,
                content: fullContent,
                duration: Number(record.duration),
                comment: record.comment,
                createdAt: serverTimestamp(),
                userName: profile.displayName || 'Unknown',
                userType: profile.type || 'riken'
            });

            alert('学習記録を保存しました！');

            setRecord({
                subject: '',
                selectedItem: '',
                contentDetails: '',
                duration: '',
                comment: ''
            });
        } catch (error) {
            console.error('Error saving record:', error);
            alert('保存に失敗しました。もう一度お試しください。');
        } finally {
            setSubmitting(false);
        }
    };

    const currentSubjectBooks = referenceBooks.filter(book => book.subject === record.subject);

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-100 bg-indigo-50">
                <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                    <BookOpen className="w-6 h-6" />
                    学習を記録する
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Subject Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        教科 <span className="text-red-500">*</span>
                    </label>

                    <div className="mb-4">
                        <span className="text-xs font-bold text-gray-400 block mb-2">共通科目</span>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {SUBJECT_GROUPS.common.map(sub => (
                                <button
                                    key={sub}
                                    type="button"
                                    onClick={() => handleSubjectSelect(sub)}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium transition ${record.subject === sub
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <span className="text-xs font-bold text-gray-400 block mb-2">
                            {profile?.type === 'bunken' ? '文系科目' : '理系科目'}
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {specializedSubjects.map(sub => (
                                <button
                                    key={sub}
                                    type="button"
                                    onClick={() => handleSubjectSelect(sub)}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium transition ${record.subject === sub
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                        }`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content (Tasks & Books) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        内容 <span className="text-red-500">*</span>
                    </label>

                    {!record.subject ? (
                        <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg text-center">
                            教科を選択すると表示されます
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in-down">
                            {/* Tasks */}
                            <div>
                                <span className="text-xs font-bold text-gray-400 block mb-2">タスク</span>
                                <div className="flex flex-wrap gap-2">
                                    {TASKS.map(task => (
                                        <button
                                            key={task}
                                            type="button"
                                            onClick={() => handleItemSelect(task)}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition ${record.selectedItem === task
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {task}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reference Books */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-400">参考書（{record.subject}）</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddBookModalOpen(true)}
                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                    >
                                        <Plus className="w-3 h-3" />
                                        追加
                                    </button>
                                </div>

                                {currentSubjectBooks.length === 0 ? (
                                    <p className="text-xs text-gray-400 mb-2">登録された参考書はありません</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {currentSubjectBooks.map(book => (
                                            <button
                                                key={book.id}
                                                type="button"
                                                onClick={() => handleItemSelect(book.name)}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium transition ${record.selectedItem === book.name
                                                    ? 'bg-teal-600 text-white shadow-md'
                                                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                                                    }`}
                                            >
                                                {book.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Details Input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">
                                    詳細（ページ数など）
                                </label>
                                <input
                                    type="text"
                                    name="contentDetails"
                                    value={record.contentDetails}
                                    onChange={handleChange}
                                    placeholder="例：P.30〜45"
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 sm:text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Time Input (Enhanced) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        学習時間 <span className="text-red-500">*</span>
                    </label>
                    <TimeInput value={record.duration} onChange={handleDurationChange} initialMode={initialMode} />
                </div>

                {/* Comment */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        ひとこと
                    </label>
                    <textarea
                        name="comment"
                        value={record.comment}
                        onChange={handleChange}
                        placeholder="集中できた！難しかった、など"
                        rows="3"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Send className="w-5 h-5" />
                    {submitting ? '記録中...' : '記録する'}
                </button>
            </form>

            {/* Add Book Modal */}
            {isAddBookModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">参考書を追加</h3>
                            <button
                                onClick={() => setIsAddBookModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            科目: <span className="font-semibold text-indigo-600">{record.subject}</span>
                        </p>

                        <form onSubmit={handleAddBook}>
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={newBookName}
                                    onChange={(e) => setNewBookName(e.target.value)}
                                    placeholder="参考書の名前"
                                    className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddBookModalOpen(false)}
                                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newBookName.trim() || addingBook}
                                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300"
                                >
                                    追加
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecordView;
