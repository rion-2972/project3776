import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, CheckCircle, Circle, Plus, Trash2 } from 'lucide-react';

// --- Sub-component: Streak Calendar (Simplified) ---
const StreakCalendar = ({ uid }) => {
    // In a real app, we would query studyRecords for the current month and calculate streaks.
    // For this prototype, I'll show a simple placeholder or "Days in a row" based on recent activity.
    const [streak, setStreak] = useState(0);

    // TODO: Implement actual streak calculation from studyRecords
    useEffect(() => {
        // Mock
        setStreak(3);
    }, []);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Current Streak</h3>
                    <div className="text-3xl font-bold text-indigo-600">{streak} <span className="text-base text-gray-400 font-normal">days</span></div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-full">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
            </div>
            <div className="mt-4 flex justify-between text-xs text-center text-gray-400">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    <div key={day} className={`w-8 h-8 rounded-full flex items-center justify-center ${i < 4 ? 'bg-indigo-100 text-indigo-600 font-bold' : 'bg-gray-100'}`}>
                        {day[0]}
                    </div>
                ))}
            </div>
        </div>
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
            <StreakCalendar uid={user.uid} />
            <AssignmentsSection user={user} profile={profile} onAssignmentClick={onAssignmentClick} />
            <MyPlansSection user={user} profile={profile} />
        </div>
    );
};

export default HomeView;
