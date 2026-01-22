import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Calendar, CheckCircle, Circle, Plus, Trash2, Edit, AlertTriangle, History } from 'lucide-react';
import { SUBJECT_ORDER } from '../../utils/constants';

// --- Sub-component: Daily Study Hours ---
const DailyStudyHours = ({ uid }) => {
    const { t } = useLanguage();
    const [todayMinutes, setTodayMinutes] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentViewMonth, setCurrentViewMonth] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});

    // Fetch today's study hours
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, `users/${uid}/studyRecords`),
            where('createdAt', '>=', today)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const totalMinutes = snapshot.docs.reduce((sum, doc) => {
                return sum + (doc.data().duration || 0);
            }, 0);
            setTodayMinutes(totalMinutes);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching today\'s study hours:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [uid]);

    // Fetch monthly data when calendar is shown
    useEffect(() => {
        if (!showCalendar) return;

        const start = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth(), 1);
        const end = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() + 1, 0, 23, 59, 59);

        const q = query(
            collection(db, `users/${uid}/studyRecords`),
            where('createdAt', '>=', start),
            where('createdAt', '<=', end)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dailyData = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt.toDate();
                const dateKey = date.getDate();
                dailyData[dateKey] = (dailyData[dateKey] || 0) + (data.duration || 0);
            });
            setMonthlyData(dailyData);
        });

        return () => unsubscribe();
    }, [uid, showCalendar, currentViewMonth]);

    const formatTime = (minutes) => {
        if (minutes < 60) {
            return `${minutes}${t('minutes')}`;
        } else {
            return `${(minutes / 60).toFixed(1)}${t('hours')}`;
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        // Empty cells before first day
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        return days;
    };

    const goToPrevMonth = () => {
        setCurrentViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    return (
        <>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">{t('todayStudyTime')}</h3>
                        <div className="text-3xl font-bold text-indigo-600">
                            {loading ? '...' : formatTime(todayMinutes)}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="bg-indigo-50 p-3 rounded-full hover:bg-indigo-100 transition"
                    >
                        <Calendar className="w-6 h-6 text-indigo-600" />
                    </button>
                </div>
            </div>

            {/* Calendar Modal/View */}
            {showCalendar && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h3 className="font-bold text-gray-900">
                            {currentViewMonth.getFullYear()}年{currentViewMonth.getMonth() + 1}月
                        </h3>
                        <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                            <div key={day} className="text-center text-xs font-bold text-gray-500 p-2">
                                {day}
                            </div>
                        ))}
                        {getDaysInMonth(currentViewMonth).map((day, index) => (
                            <div
                                key={index}
                                className={`text-center p-2 rounded ${day ? 'hover:bg-gray-50' : ''
                                    }`}
                            >
                                {day && (
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{day}</div>
                                        {monthlyData[day] ? (
                                            <div className="text-[10px] font-bold text-indigo-600">
                                                {monthlyData[day] < 60
                                                    ? `${monthlyData[day]}分`
                                                    : `${(monthlyData[day] / 60).toFixed(1)}h`}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-gray-300">-</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};


// --- Sub-component: Shared Assignments ---
const AssignmentsSection = ({ user, profile, onAssignmentClick }) => {
    const { t } = useLanguage();
    const [assignments, setAssignments] = useState([]);
    const [pastAssignments, setPastAssignments] = useState([]);
    const [myStatus, setMyStatus] = useState({});
    const [isAdding, setIsAdding] = useState(false);
    const [newAssign, setNewAssign] = useState({ subject: '', content: '', dueDate: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ subject: '', content: '', dueDate: '' });

    // Helper: Get tomorrow's date in YYYY-MM-DD format (local time)
    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd}`;
    };

    const minDate = getMinDate();

    // Helper: Check if a date string (YYYY-MM-DD) is tomorrow
    const isDueTomorrow = (dueDateString) => {
        if (!dueDateString) return false;
        return dueDateString === minDate;
    };

    const [showPastAssignments, setShowPastAssignments] = useState(false);
    const [burningId, setBurningId] = useState(null);


    // Fetch Assignments (Global) - In real app, filter by subject match?
    useEffect(() => {
        const q = query(collection(db, 'assignments'), orderBy('dueDate', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter for user's subjects
            const userSubjects = profile?.subjects || [];
            const current = [];
            const past = [];

            data.forEach(a => {
                // Filter by subject - '英論' is visible to all students
                if (!userSubjects.includes(a.subject) && a.subject !== '英論') return;

                if (a.dueDate) {
                    const dueDate = new Date(a.dueDate);
                    // Past assignments: oneWeekAgo <= dueDate < now
                    if (dueDate >= oneWeekAgo && dueDate < now) {
                        past.push(a);
                    }
                    // Current assignments: dueDate >= now
                    else if (dueDate >= now) {
                        current.push(a);
                    }
                } else {
                    // No due date, treat as current
                    current.push(a);
                }
            });

            setAssignments(current);
            setPastAssignments(past);
        });
        return () => unsubscribe();
    }, [profile]);

    // Fetch My Status (including updatedAt for deadline completion check)
    useEffect(() => {
        const q = query(collection(db, `users/${user.uid}/assignmentStatus`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const statusMap = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                statusMap[data.assignmentId] = {
                    completed: data.completed,
                    updatedAt: data.updatedAt
                };
            });
            setMyStatus(statusMap);
        });
        return () => unsubscribe();
    }, [user]);

    // Helper function to check if assignment was completed within deadline
    const isCompletedWithinDeadline = (assignment, statusData) => {
        if (!statusData || !statusData.completed) return false;
        if (!assignment.dueDate || !statusData.updatedAt) return false;

        const deadline = new Date(assignment.dueDate);
        deadline.setHours(23, 59, 59, 999); // End of deadline day

        const completedAt = statusData.updatedAt.toDate();
        return completedAt <= deadline;
    };

    const toggleComplete = async (assignmentId, currentStatus) => {
        const statusRef = doc(db, `users/${user.uid}/assignmentStatus`, assignmentId);
        await setDoc(statusRef, {
            assignmentId,
            completed: !currentStatus,
            updatedAt: serverTimestamp()
        });
    };

    // Handle toggle with burning animation
    const handleToggleComplete = async (assignmentId, currentStatus) => {
        // Only animate when completing a task (not when uncompleting)
        if (!currentStatus) {
            setBurningId(assignmentId);

            // Spawn emoji particles
            const taskElement = document.querySelector(`[data-assignment-id="${assignmentId}"]`);
            if (taskElement) {
                const rect = taskElement.getBoundingClientRect();
                const particleCount = 5;

                for (let i = 0; i < particleCount; i++) {
                    const emoji = document.createElement('div');
                    emoji.className = 'fire-emoji';
                    emoji.textContent = '🔥';
                    emoji.style.left = `${rect.left + (rect.width * (0.2 + i * 0.15))}px`;
                    emoji.style.top = `${rect.top + rect.height / 2}px`;
                    emoji.style.animationDelay = `${i * 0.1}s`;
                    document.body.appendChild(emoji);

                    // Remove emoji after animation completes
                    setTimeout(() => emoji.remove(), 1000 + i * 100);
                }
            }

            // Wait for animation to complete (increased to 1s)
            setTimeout(async () => {
                await toggleComplete(assignmentId, currentStatus);
                setBurningId(null);
            }, 1000);
        } else {
            // Immediately toggle if uncompleting
            await toggleComplete(assignmentId, currentStatus);
        }
    };



    // Format date for display (YYYY-MM-DD format)
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newAssign.subject || !newAssign.content || !newAssign.dueDate) {
            alert('この項目を入力してください。');
            return;
        }
        await addDoc(collection(db, 'assignments'), {
            ...newAssign,
            createdBy: user.uid,
            createdAt: serverTimestamp()
        });
        setIsAdding(false);
        setNewAssign({ subject: '', content: '', dueDate: '' });
    };

    const handleEditStart = (assignment) => {
        setEditingId(assignment.id);
        setEditForm({
            subject: assignment.subject,
            content: assignment.content,
            dueDate: assignment.dueDate || ''
        });
    };

    const handleEditSave = async (assignmentId) => {
        if (window.confirm('この課題を編集しますか？')) {
            const assignRef = doc(db, 'assignments', assignmentId);
            await updateDoc(assignRef, {
                ...editForm,
                updatedAt: serverTimestamp()
            });
            setEditingId(null);
        }
    };

    const handleDelete = async (assignmentId) => {
        if (window.confirm('この課題を削除しますか？\nこの操作は取り消せません。')) {
            await deleteDoc(doc(db, 'assignments', assignmentId));
        }
    };

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">{t('classAssignments')}</h2>
                <button onClick={() => setIsAdding(!isAdding)} className="text-indigo-600 text-sm font-bold flex items-center gap-1">
                    <Plus className="w-4 h-4" /> {t('add')}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-lg mb-4">
                    <select
                        className="block w-full mb-2 p-2 rounded border-gray-300 text-sm"
                        value={newAssign.subject}
                        onChange={e => setNewAssign({ ...newAssign, subject: e.target.value })}
                        required
                    >
                        <option value="">{t('selectSubject')}</option>
                        {(() => {
                            // Helper function to get sort index
                            const getSubjectOrderIndex = (subject) => {
                                const normalized = subject.replace(/（.*?）/, '');
                                const index = SUBJECT_ORDER.indexOf(normalized);
                                return index !== -1 ? index : 999;
                            };

                            // Combine user subjects with 英論 and sort
                            const allSubjects = [...(profile?.subjects || []), '英論'];
                            const sortedSubjects = allSubjects.sort((a, b) =>
                                getSubjectOrderIndex(a) - getSubjectOrderIndex(b)
                            );

                            return sortedSubjects.map(s => <option key={s} value={s}>{s}</option>);
                        })()}
                    </select>
                    <input
                        className="block w-full mb-2 p-2 rounded border-gray-300 text-sm"
                        placeholder={t('assignmentContent')}
                        value={newAssign.content}
                        onChange={e => setNewAssign({ ...newAssign, content: e.target.value })}
                        required
                    />
                    <input
                        type="date"
                        className="block w-full mb-2 p-2 rounded border-gray-300 text-sm"
                        value={newAssign.dueDate}
                        min={minDate}
                        onChange={e => setNewAssign({ ...newAssign, dueDate: e.target.value })}
                        required
                    />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-bold">{t('addAssignment')}</button>
                </form>
            )}

            <div className="space-y-2">
                {assignments.length === 0 ? <p className="text-sm text-gray-400">{t('noAssignments')}</p> :
                    // Sort: uncompleted first, completed last
                    [...assignments].sort((a, b) => {
                        const aCompleted = myStatus[a.id]?.completed || false;
                        const bCompleted = myStatus[b.id]?.completed || false;
                        if (aCompleted === bCompleted) return 0;
                        return aCompleted ? 1 : -1;
                    }).map(a => (
                        <div key={a.id} data-assignment-id={a.id} className={`flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm ${burningId === a.id ? 'burning-task' : ''}`}>
                            <button onClick={() => handleToggleComplete(a.id, myStatus[a.id]?.completed)}>
                                {myStatus[a.id]?.completed ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : isDueTomorrow(a.dueDate) ? (
                                    <div className="relative group">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                                            明日締切
                                        </span>
                                    </div>
                                ) : (
                                    <Circle className="w-5 h-5 text-gray-300" />
                                )}
                            </button>
                            <div className="flex-1">
                                {editingId === a.id ? (
                                    // Edit Mode
                                    <div className="space-y-2">
                                        <select
                                            className="block w-full p-2 rounded border-gray-300 text-sm"
                                            value={editForm.subject}
                                            onChange={e => setEditForm({ ...editForm, subject: e.target.value })}
                                        >
                                            <option value="">{t('selectSubject')}</option>
                                            {(() => {
                                                const getSubjectOrderIndex = (subject) => {
                                                    const normalized = subject.replace(/（.*?）/, '');
                                                    const index = SUBJECT_ORDER.indexOf(normalized);
                                                    return index !== -1 ? index : 999;
                                                };
                                                const allSubjects = [...(profile?.subjects || []), '英論'];
                                                const sortedSubjects = allSubjects.sort((a, b) =>
                                                    getSubjectOrderIndex(a) - getSubjectOrderIndex(b)
                                                );
                                                return sortedSubjects.map(s => <option key={s} value={s}>{s}</option>);
                                            })()}
                                        </select>
                                        <input
                                            className="block w-full p-2 rounded border-gray-300 text-sm"
                                            placeholder={t('assignmentContent')}
                                            value={editForm.content}
                                            onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="block w-full p-2 rounded border-gray-300 text-sm"
                                            value={editForm.dueDate}
                                            min={minDate}
                                            onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditSave(a.id)}
                                                className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm font-bold"
                                            >
                                                {t('save')}
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded text-sm font-bold"
                                            >
                                                {t('cancel')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // Display Mode
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{a.subject}</span>
                                            {a.dueDate && <span className="text-xs text-gray-400">〆 {formatDate(a.dueDate)}</span>}
                                        </div>
                                        <div
                                            className={`text-sm font-medium cursor-pointer hover:underline ${myStatus[a.id]?.completed ? 'text-gray-400 line-through' : 'text-gray-800'
                                                }`}
                                            onClick={() => onAssignmentClick && onAssignmentClick(a)}
                                        >
                                            {a.content}
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Edit/Delete buttons for author only */}
                            {a.createdBy === user.uid && editingId !== a.id && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEditStart(a)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 transition"
                                        title="編集"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(a.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 transition"
                                        title="削除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                }
            </div>

            {/* Past Assignments Section */}
            {pastAssignments.length > 0 && (
                <div className="mt-4">
                    <button
                        onClick={() => setShowPastAssignments(!showPastAssignments)}
                        className="w-full text-sm text-indigo-600 font-bold py-2 px-4 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition"
                    >
                        {showPastAssignments ? t('hidePastAssignments') : t('showPastAssignments')}
                    </button>

                    {showPastAssignments && (
                        <div className="mt-3 space-y-2">
                            {[...pastAssignments].sort((a, b) => {
                                // Sort by due date descending (most recent first)
                                const aDate = a.dueDate ? new Date(a.dueDate) : new Date(0);
                                const bDate = b.dueDate ? new Date(b.dueDate) : new Date(0);
                                return bDate - aDate;
                            }).map(a => {
                                const statusData = myStatus[a.id];
                                const completedWithinDeadline = isCompletedWithinDeadline(a, statusData);

                                return (
                                    <div key={a.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200">
                                        {/* Read-only completion indicator */}
                                        <div>
                                            {completedWithinDeadline ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{a.subject}</span>
                                                {a.dueDate && <span className="text-xs text-gray-400">〆 {formatDate(a.dueDate)}</span>}
                                            </div>
                                            <div className={`text-sm font-medium ${completedWithinDeadline ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                                {a.content}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Sub-component: Daily Routines ---
const DailyRoutinesSection = ({ user }) => {
    const { t } = useLanguage();
    const [routines, setRoutines] = useState([]);
    const [newRoutine, setNewRoutine] = useState('');
    const [showHistory, setShowHistory] = useState(null);

    // Get today's date in YYYY-MM-DD format
    const getTodayString = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    useEffect(() => {
        const q = query(collection(db, `users/${user.uid}/dailyRoutines`), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRoutines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newRoutine.trim()) return;
        await addDoc(collection(db, `users/${user.uid}/dailyRoutines`), {
            content: newRoutine,
            completedDates: [],
            createdAt: serverTimestamp()
        });
        setNewRoutine('');
    };

    const toggleComplete = async (routine) => {
        const today = getTodayString();
        const completedDates = routine.completedDates || [];
        const isCompleted = completedDates.includes(today);

        let newCompletedDates;
        if (isCompleted) {
            // Remove today from the list
            newCompletedDates = completedDates.filter(date => date !== today);
        } else {
            // Add today to the list
            newCompletedDates = [...completedDates, today];
        }

        await setDoc(doc(db, `users/${user.uid}/dailyRoutines`, routine.id), {
            ...routine,
            completedDates: newCompletedDates
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('deleteDailyRoutineConfirm'))) {
            await deleteDoc(doc(db, `users/${user.uid}/dailyRoutines`, id));
        }
    };

    const isCompletedToday = (routine) => {
        const today = getTodayString();
        return (routine.completedDates || []).includes(today);
    };

    // Format history dates for display
    const formatHistoryDates = (dates) => {
        if (!dates || dates.length === 0) return [];
        // Sort dates in descending order (most recent first)
        return [...dates].sort((a, b) => b.localeCompare(a));
    };

    return (
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('dailyRoutines')}</h2>

            {/* Add Routine Form */}
            <form onSubmit={handleAdd} className="bg-white p-3 rounded-lg border border-gray-200 mb-4 text-sm">
                <input
                    className="w-full p-2 border rounded mb-2"
                    placeholder={t('dailyRoutineContent')}
                    value={newRoutine}
                    onChange={e => setNewRoutine(e.target.value)}
                    required
                />
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded font-medium text-xs">
                    {t('addDailyRoutine')}
                </button>
            </form>

            {/* Routines List */}
            <div className="space-y-2">
                {routines.length === 0 ? (
                    <p className="text-sm text-gray-400">{t('noDailyRoutines')}</p>
                ) : (
                    routines.map(routine => {
                        const completedToday = isCompletedToday(routine);
                        const historyDates = formatHistoryDates(routine.completedDates);

                        return (
                            <div key={routine.id}>
                                <div className="bg-white p-3 rounded-lg border-l-4 border-l-green-500 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <button onClick={() => toggleComplete(routine)}>
                                            {completedToday ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-gray-300" />
                                            )}
                                        </button>
                                        <div className="flex-1">
                                            <div className={`text-sm font-medium ${completedToday ? 'text-gray-400 line-through' : 'text-gray-800'
                                                }`}>
                                                {routine.content}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setShowHistory(showHistory === routine.id ? null : routine.id)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 transition"
                                            title={t('viewHistory')}
                                        >
                                            <History className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(routine.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* History Display */}
                                {showHistory === routine.id && (
                                    <div className="mt-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <h4 className="text-xs font-bold text-gray-700 mb-2">{t('completionHistory')}</h4>
                                        {historyDates.length === 0 ? (
                                            <p className="text-xs text-gray-400">まだ実施履歴がありません</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {historyDates.map(date => (
                                                    <span
                                                        key={date}
                                                        className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
                                                    >
                                                        {date}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// --- Sub-component: My Plans ---
const MyPlansSection = ({ user, profile }) => {
    const { t } = useLanguage();
    const [plans, setPlans] = useState([]);
    const [newPlan, setNewPlan] = useState({ date: '', subject: '', content: '' });

    useEffect(() => {
        const q = query(collection(db, `users/${user.uid}/myPlans`), orderBy('date', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newPlan.date || !newPlan.subject || !newPlan.content) return;
        await addDoc(collection(db, `users/${user.uid}/myPlans`), {
            ...newPlan,
            completed: false,
            createdAt: serverTimestamp()
        });
        setNewPlan({ date: '', subject: '', content: '' });
    };

    const toggleComplete = async (plan) => {
        await setDoc(doc(db, `users/${user.uid}/myPlans`, plan.id), {
            ...plan,
            completed: !plan.completed
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('削除しますか？')) {
            await deleteDoc(doc(db, `users/${user.uid}/myPlans`, id));
        }
    }

    return (
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('myPlans')}</h2>

            {/* Add Plan Form */}
            <form onSubmit={handleAdd} className="bg-white p-3 rounded-lg border border-gray-200 mb-4 text-sm">
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                        type="date"
                        className="p-2 border rounded"
                        value={newPlan.date}
                        onChange={e => setNewPlan({ ...newPlan, date: e.target.value })}
                        required
                    />
                    <select
                        className="p-2 border rounded"
                        value={newPlan.subject}
                        onChange={e => setNewPlan({ ...newPlan, subject: e.target.value })}
                        required
                    >
                        <option value="">{t('planSubject')}</option>
                        {profile?.subjects?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <input
                    className="w-full p-2 border rounded mb-2"
                    placeholder={t('planContent')}
                    value={newPlan.content}
                    onChange={e => setNewPlan({ ...newPlan, content: e.target.value })}
                    required
                />
                <button type="submit" className="w-full bg-gray-800 text-white py-2 rounded font-medium text-xs">{t('addToPlan')}</button>
            </form>

            <div className="space-y-2">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-white p-3 rounded-lg border-l-4 border-l-indigo-500 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => toggleComplete(plan)}>
                                {plan.completed ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                            </button>
                            <div>
                                <div className="text-xs text-gray-400 flex gap-2">
                                    <span>{plan.date}</span>
                                    <span className="font-bold text-indigo-600">{plan.subject}</span>
                                </div>
                                <div className={`text-sm font-medium ${plan.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {plan.content}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(plan.id)} className="text-gray-300 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HomeView = ({ onAssignmentClick }) => {
    const { user, profile } = useAuth();

    return (
        <div className="pb-20 md:pb-0">
            <DailyStudyHours uid={user.uid} />

            {/* Mobile: 課題 → 日課 → マイプラン (縦並び) */}
            {/* PC: 左列(課題、マイプラン) / 右列(日課) */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
                {/* 課題: Mobile(1番目), PC(左上) */}
                <div className="order-1 md:order-1">
                    <AssignmentsSection user={user} profile={profile} onAssignmentClick={onAssignmentClick} />
                </div>

                {/* 日課: Mobile(2番目), PC(右上 - row-span-2で2行分) */}
                <div className="order-2 md:order-2 md:row-span-2">
                    <DailyRoutinesSection user={user} />
                </div>

                {/* マイプラン: Mobile(3番目), PC(左下) */}
                <div className="order-3 md:order-3">
                    <MyPlansSection user={user} profile={profile} />
                </div>
            </div>
        </div>
    );
};

export default HomeView;
