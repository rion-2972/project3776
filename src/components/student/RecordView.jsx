import React, { useState, useEffect } from 'react';
import { BookOpen, Send, Plus } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SUBJECT_GROUPS, TASKS } from '../../utils/constants';
import TimeInput from './TimeInput'; // Import the new component
import { X } from 'lucide-react';

const RecordView = ({ preFillData, onPreFillApplied }) => {
    const { profile, user } = useAuth();
    const { t } = useLanguage();

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
    const [resetTrigger, setResetTrigger] = useState(0); // For resetting TimeInput stopwatch
    const [customDate, setCustomDate] = useState(''); // For optional date selection

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

    // Get user's Math and English level subjects
    const getUserLevelSubjects = () => {
        const mathSubject = profile?.subjects?.find(s => s.startsWith('数学')) || '数学（標準）';
        const englishSubject = profile?.subjects?.find(s => s.startsWith('英語')) || '英語（標準）';
        return [mathSubject, englishSubject];
    };

    const userLevelSubjects = getUserLevelSubjects();

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
            alert(t('addBookFailed'));
        } finally {
            setAddingBook(false);
        }
    };

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!record.subject || !record.selectedItem || !record.duration) {
            alert(t('fillRequired'));
            return;
        }

        setSubmitting(true);
        try {
            const fullContent = record.contentDetails
                ? `${record.selectedItem} ${record.contentDetails}`
                : record.selectedItem;

            const recordData = {
                subject: record.subject,
                content: fullContent,
                duration: Number(record.duration),
                comment: record.comment,
                userName: profile.displayName || 'Unknown',
                userType: profile.type || 'riken'
            };

            // If custom date is specified, use it; otherwise use serverTimestamp
            if (customDate) {
                // Parse the selected date and set time to noon (12:00) to avoid timezone issues
                const dateObj = new Date(customDate);
                dateObj.setHours(12, 0, 0, 0);
                recordData.createdAt = Timestamp.fromDate(dateObj);
                recordData.isManualDate = true;
            } else {
                recordData.createdAt = serverTimestamp();
                recordData.isManualDate = false;
            }

            await addDoc(collection(db, 'users', user.uid, 'studyRecords'), recordData);

            alert(t('recordSaved'));

            setRecord({
                subject: '',
                selectedItem: '',
                contentDetails: '',
                duration: '',
                comment: ''
            });
            setCustomDate(''); // Reset custom date

            // Trigger stopwatch reset in TimeInput
            setResetTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error saving record:', error);
            alert(t('saveFailed'));
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
                    {t('recordStudy')}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Subject Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('subjectLabel')} <span className="text-red-500">{t('required')}</span>
                    </label>

                    <div className="mb-4">
                        <span className="text-xs font-bold text-gray-400 block mb-2">{t('commonSubjects')}</span>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {/* 現代文 */}
                            {SUBJECT_GROUPS.common.includes('現代文') && (
                                <button
                                    type="button"
                                    onClick={() => handleSubjectSelect('現代文')}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium transition ${record.subject === '現代文'
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    現代文
                                </button>
                            )}
                            {/* 古典 */}
                            {SUBJECT_GROUPS.common.includes('古典') && (
                                <button
                                    type="button"
                                    onClick={() => handleSubjectSelect('古典')}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium transition ${record.subject === '古典'
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    古典
                                </button>
                            )}
                            {/* Math level subject */}
                            {userLevelSubjects[0] && (
                                <button
                                    type="button"
                                    onClick={() => handleSubjectSelect(userLevelSubjects[0])}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium transition ${record.subject === userLevelSubjects[0]
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {userLevelSubjects[0].replace(/（.*?）/, '')}
                                </button>
                            )}
                            {/* English level subject */}
                            {userLevelSubjects[1] && (
                                <button
                                    type="button"
                                    onClick={() => handleSubjectSelect(userLevelSubjects[1])}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium transition ${record.subject === userLevelSubjects[1]
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {userLevelSubjects[1].replace(/（.*?）/, '')}
                                </button>
                            )}
                            {/* 地理 */}
                            {SUBJECT_GROUPS.common.includes('地理') && (
                                <button
                                    type="button"
                                    onClick={() => handleSubjectSelect('地理')}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium transition ${record.subject === '地理'
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    地理
                                </button>
                            )}
                            {/* 情報 */}
                            {SUBJECT_GROUPS.common.includes('情報') && (
                                <button
                                    type="button"
                                    onClick={() => handleSubjectSelect('情報')}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium transition ${record.subject === '情報'
                                        ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    情報
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <span className="text-xs font-bold text-gray-400 block mb-2">
                            {profile?.type === 'bunken' ? t('bunkenSubjects') : t('rikenSubjects')}
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
                        {t('contentLabel')} <span className="text-red-500">{t('required')}</span>
                    </label>

                    {!record.subject ? (
                        <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg text-center">
                            {t('selectSubjectFirst')}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in-down">
                            {/* Tasks */}
                            <div>
                                <span className="text-xs font-bold text-gray-400 block mb-2">{t('tasks')}</span>
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
                                    <span className="text-xs font-bold text-gray-400">{t('referenceBookLabel')}（{record.subject.replace(/（.*?）/, '')}）</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddBookModalOpen(true)}
                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                    >
                                        <Plus className="w-3 h-3" />
                                        {t('add')}
                                    </button>
                                </div>

                                {currentSubjectBooks.length === 0 ? (
                                    <p className="text-xs text-gray-400 mb-2">{t('noReferenceBooks')}</p>
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
                                    {t('detailsLabel')}
                                </label>
                                <input
                                    type="text"
                                    name="contentDetails"
                                    value={record.contentDetails}
                                    onChange={handleChange}
                                    placeholder={t('detailsPlaceholder')}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 sm:text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Time Input (Enhanced) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('studyTimeLabel')} <span className="text-red-500">{t('required')}</span>
                    </label>
                    <TimeInput value={record.duration} onChange={handleDurationChange} initialMode={initialMode} resetTrigger={resetTrigger} />
                </div>

                {/* Comment */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('commentLabel')}
                    </label>
                    <textarea
                        name="comment"
                        value={record.comment}
                        onChange={handleChange}
                        placeholder={t('commentPlaceholder')}
                        rows="3"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                {/* Custom Date Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        記録日を変更（オプション）
                    </label>
                    <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        max={(() => {
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            // ローカル時間を使用してタイムゾーン問題を回避
                            const yyyy = yesterday.getFullYear();
                            const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
                            const dd = String(yesterday.getDate()).padStart(2, '0');
                            return `${yyyy}-${mm}-${dd}`;
                        })()}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        何も選択しない場合は、現在の日時で記録されます。過去の日付を選択すると、タイムラインには日付のみが表示されます。
                    </p>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Send className="w-5 h-5" />
                    {submitting ? t('recording') : t('recordButton')}
                </button>
            </form>

            {/* Add Book Modal */}
            {isAddBookModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">{t('addReferenceBook')}</h3>
                            <button
                                onClick={() => setIsAddBookModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            {t('subjectColon')}: <span className="font-semibold text-indigo-600">{record.subject}</span>
                        </p>

                        <form onSubmit={handleAddBook}>
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={newBookName}
                                    onChange={(e) => setNewBookName(e.target.value)}
                                    placeholder={t('bookNamePlaceholder')}
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
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newBookName.trim() || addingBook}
                                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300"
                                >
                                    {t('add')}
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
