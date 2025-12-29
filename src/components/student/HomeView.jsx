import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, CheckCircle, Circle, Plus, Trash2 } from 'lucide-react';

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
    const [myStatus, setMyStatus] = useState({});
    const [isAdding, setIsAdding] = useState(false);
    const [newAssign, setNewAssign] = useState({ subject: '', content: '', dueDate: '' });

    // Fetch Assignments (Global) - In real app, filter by subject match?
    useEffect(() => {
        const q = query(collection(db, 'assignments'), orderBy('dueDate', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter for user's subjects
            const userSubjects = profile?.subjects || [];
            const relevant = data.filter(a => {
                // Filter by subject
                if (!userSubjects.includes(a.subject)) return false;
                // Filter out past due assignments
                if (a.dueDate) {
                    const dueDate = new Date(a.dueDate);
                    if (dueDate < now) return false;
                }
                return true;
            });
            setAssignments(relevant);
        });
        return () => unsubscribe();
    }, [profile]);

    // Fetch My Status
    useEffect(() => {
        const q = query(collection(db, `users/${user.uid}/assignmentStatus`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const statusMap = {};
            snapshot.docs.forEach(doc => {
                statusMap[doc.data().assignmentId] = doc.data().completed;
            });
            setMyStatus(statusMap);
        });
        return () => unsubscribe();
    }, [user]);

    const toggleComplete = async (assignmentId, currentStatus) => {
        const statusRef = doc(db, `users/${user.uid}/assignmentStatus`, assignmentId);
        await setDoc(statusRef, {
            assignmentId,
            completed: !currentStatus,
            updatedAt: serverTimestamp()
        });
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
                        const aCompleted = myStatus[a.id] || false;
                        const bCompleted = myStatus[b.id] || false;
                        if (aCompleted === bCompleted) return 0;
                        return aCompleted ? 1 : -1;
                    }).map(a => (
                        <div key={a.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <button onClick={() => toggleComplete(a.id, myStatus[a.id])}>
                                {myStatus[a.id] ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                            </button>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{a.subject}</span>
                                    {a.dueDate && <span className="text-xs text-gray-400">〆 {a.dueDate}</span>}
                                </div>
                                <div
                                    className={`text-sm font-medium cursor-pointer hover:underline ${myStatus[a.id] ? 'text-gray-400 line-through' : 'text-gray-800'
                                        }`}
                                    onClick={() => onAssignmentClick && onAssignmentClick(a)}
                                >
                                    {a.content}
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>
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
