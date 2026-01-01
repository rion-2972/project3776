import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, CheckCircle, Circle, Plus, Trash2, Edit } from 'lucide-react';

// --- Sub-component: Daily Study Hours ---
const DailyStudyHours = ({ uid }) => {
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
            return `${minutes}分`;
        } else {
            return `${(minutes / 60).toFixed(1)}時間`;
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
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">今日の学習時間</h3>
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
    const [assignments, setAssignments] = useState([]);
    const [pastAssignments, setPastAssignments] = useState([]);
    const [myStatus, setMyStatus] = useState({});
    const [isAdding, setIsAdding] = useState(false);
    const [newAssign, setNewAssign] = useState({ subject: '', content: '', dueDate: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ subject: '', content: '', dueDate: '' });
    const [showPastAssignments, setShowPastAssignments] = useState(false);

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
                // Filter by subject
                if (!userSubjects.includes(a.subject)) return;
                
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
    
    // Format date for display (YYYY-MM-DD format)
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newAssign.subject || !newAssign.content) return;
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
                <h2 className="text-lg font-bold text-gray-900">クラスの課題</h2>
                <button onClick={() => setIsAdding(!isAdding)} className="text-indigo-600 text-sm font-bold flex items-center gap-1">
                    <Plus className="w-4 h-4" /> 追加
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
                        <option value="">科目を選択</option>
                        {profile?.subjects?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input
                        className="block w-full mb-2 p-2 rounded border-gray-300 text-sm"
                        placeholder="課題内容"
                        value={newAssign.content}
                        onChange={e => setNewAssign({ ...newAssign, content: e.target.value })}
                        required
                    />
                    <input
                        type="date"
                        className="block w-full mb-2 p-2 rounded border-gray-300 text-sm"
                        value={newAssign.dueDate}
                        onChange={e => setNewAssign({ ...newAssign, dueDate: e.target.value })}
                    />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-bold">追加する</button>
                </form>
            )}

            <div className="space-y-2">
                {assignments.length === 0 ? <p className="text-sm text-gray-400">課題はありません</p> :
                    // Sort: uncompleted first, completed last
                    [...assignments].sort((a, b) => {
                        const aCompleted = myStatus[a.id]?.completed || false;
                        const bCompleted = myStatus[b.id]?.completed || false;
                        if (aCompleted === bCompleted) return 0;
                        return aCompleted ? 1 : -1;
                    }).map(a => (
                        <div key={a.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <button onClick={() => toggleComplete(a.id, myStatus[a.id]?.completed)}>
                                {myStatus[a.id]?.completed ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
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
                                            <option value="">科目を選択</option>
                                            {profile?.subjects?.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <input
                                            className="block w-full p-2 rounded border-gray-300 text-sm"
                                            placeholder="課題内容"
                                            value={editForm.content}
                                            onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="block w-full p-2 rounded border-gray-300 text-sm"
                                            value={editForm.dueDate}
                                            onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditSave(a.id)}
                                                className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm font-bold"
                                            >
                                                保存
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded text-sm font-bold"
                                            >
                                                キャンセル
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
                        {showPastAssignments ? '過去の課題を非表示にする' : '過去の課題を確認する'}
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

// --- Sub-component: My Plans ---
const MyPlansSection = ({ user, profile }) => {
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
            <h2 className="text-lg font-bold text-gray-900 mb-2">マイプラン</h2>

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
                        <option value="">科目</option>
                        {profile?.subjects?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <input
                    className="w-full p-2 border rounded mb-2"
                    placeholder="やることを入力"
                    value={newPlan.content}
                    onChange={e => setNewPlan({ ...newPlan, content: e.target.value })}
                    required
                />
                <button type="submit" className="w-full bg-gray-800 text-white py-2 rounded font-medium text-xs">プランに追加</button>
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
        <div className="pb-20">
            <DailyStudyHours uid={user.uid} />
            <AssignmentsSection user={user} profile={profile} onAssignmentClick={onAssignmentClick} />
            <MyPlansSection user={user} profile={profile} />
        </div>
    );
};

export default HomeView;
