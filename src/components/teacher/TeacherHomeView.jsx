import React, { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    getDocs,
    collectionGroup,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, Calendar, BookOpen, TrendingUp, Award, X } from 'lucide-react';

// --- Sub-component: Daily Aggregated Study Hours ---
const DailyAggregatedStudyHours = () => {
    const [todayTotalMinutes, setTodayTotalMinutes] = useState(0);
    const [todayActiveCount, setTodayActiveCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentViewMonth, setCurrentViewMonth] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedDateStudents, setSelectedDateStudents] = useState([]);
    const [showStudentModal, setShowStudentModal] = useState(false);

    // Fetch today's aggregated study hours
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const q = query(
            collectionGroup(db, 'studyRecords'),
            where('createdAt', '>=', today)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const totalMinutes = snapshot.docs.reduce((sum, doc) => {
                return sum + (doc.data().duration || 0);
            }, 0);

            const uniqueUsers = new Set();
            snapshot.docs.forEach(doc => {
                const userId = doc.ref.parent.parent.id;
                uniqueUsers.add(userId);
            });

            setTodayTotalMinutes(totalMinutes);
            setTodayActiveCount(uniqueUsers.size);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching today\'s aggregated study hours:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch monthly data when calendar is shown
    useEffect(() => {
        if (!showCalendar) return;

        const start = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth(), 1);
        const end = new Date(currentViewMonth.getFullYear(), currentViewMonth.getMonth() + 1, 0, 23, 59, 59);

        const q = query(
            collectionGroup(db, 'studyRecords'),
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
    }, [showCalendar, currentViewMonth]);

    // Fetch student details for selected date
    const fetchStudentDetailsForDate = async (day) => {
        const year = currentViewMonth.getFullYear();
        const month = currentViewMonth.getMonth();
        const dateStart = new Date(year, month, day, 0, 0, 0);
        const dateEnd = new Date(year, month, day, 23, 59, 59);

        const q = query(
            collectionGroup(db, 'studyRecords'),
            where('createdAt', '>=', dateStart),
            where('createdAt', '<=', dateEnd)
        );

        const snapshot = await getDocs(q);
        const studentData = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const userId = doc.ref.parent.parent.id;

            if (!studentData[userId]) {
                studentData[userId] = {
                    userId,
                    userName: data.userName || '不明',
                    totalMinutes: 0
                };
            }
            studentData[userId].totalMinutes += (data.duration || 0);
        });

        const studentsList = Object.values(studentData).sort((a, b) => b.totalMinutes - a.totalMinutes);
        setSelectedDateStudents(studentsList);
        setSelectedDate(day);
        setShowStudentModal(true);
    };

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
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                            今日の総学習時間
                        </h3>
                        <div className="text-3xl font-bold text-indigo-600">
                            {loading ? '...' : formatTime(todayTotalMinutes)}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {todayActiveCount}人が記録
                        </p>
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-4">
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
                                className={`text-center p-2 rounded ${day && monthlyData[day]
                                    ? 'hover:bg-indigo-50 cursor-pointer transition'
                                    : day ? 'hover:bg-gray-50' : ''
                                    }`}
                                onClick={() => day && monthlyData[day] && fetchStudentDetailsForDate(day)}
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

            {/* Student Details Modal */}
            {showStudentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">
                                {currentViewMonth.getMonth() + 1}月{selectedDate}日の学習記録
                            </h3>
                            <button
                                onClick={() => setShowStudentModal(false)}
                                className="p-1 hover:bg-gray-100 rounded transition"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                            {selectedDateStudents.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">記録がありません</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedDateStudents.map((student, index) => (
                                        <div
                                            key={student.userId}
                                            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {student.userName}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-indigo-600">
                                                {formatTime(student.totalMinutes)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const TeacherHomeView = () => {
    const [dailyActiveCount, setDailyActiveCount] = useState(0);
    const [dailyActiveStudents, setDailyActiveStudents] = useState([]);
    const [showActiveStudentsModal, setShowActiveStudentsModal] = useState(false);
    const [weeklyStats, setWeeklyStats] = useState({
        totalHours: 0,
        topStudents: [],
        topSubjects: [],
        avgHoursPerStudent: 0
    });
    const [assignments, setAssignments] = useState([]);
    const [assignmentProgress, setAssignmentProgress] = useState({});
    const [expandedAssignments, setExpandedAssignments] = useState(new Set());
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);



    // ==== fetch students ====
    const fetchStudents = useCallback(async () => {
        try {
            if (students.length === 0) {
                const q = query(collection(db, 'users'), where('role', '==', 'student'));
                const snapshot = await getDocs(q);
                const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStudents(studentsData);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    }, [students.length]);

    // ==== fetch daily active ====
    const fetchDailyActive = useCallback(async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const q = query(collectionGroup(db, 'studyRecords'), where('createdAt', '>=', today));
            const snapshot = await getDocs(q);

            const userDataMap = {};
            snapshot.docs.forEach(doc => {
                const userId = doc.ref.parent.parent.id;
                const data = doc.data();
                if (!userDataMap[userId]) {
                    userDataMap[userId] = {
                        userId,
                        userName: data.userName || '不明',
                        totalMinutes: 0
                    };
                }
                userDataMap[userId].totalMinutes += (data.duration || 0);
            });

            const studentsList = Object.values(userDataMap).sort((a, b) => b.totalMinutes - a.totalMinutes);

            setDailyActiveCount(studentsList.length);
            setDailyActiveStudents(studentsList);
        } catch (error) {
            console.error('Error fetching daily active:', error);
        }
    }, []);

    // ==== fetch weekly stats ====
    const fetchWeeklyStats = useCallback(async () => {
        try {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const q = query(collectionGroup(db, 'studyRecords'), where('createdAt', '>=', weekAgo));
            const snapshot = await getDocs(q);
            const records = snapshot.docs.map(doc => ({
                userId: doc.ref.parent.parent.id,
                ...doc.data()
            }));

            const totalMinutes = records.reduce((sum, r) => sum + (r.duration || 0), 0);
            const totalHours = totalMinutes / 60;

            const studentHours = {};
            records.forEach(r => {
                studentHours[r.userId] = (studentHours[r.userId] || 0) + (r.duration || 0);
            });
            const topStudents = Object.entries(studentHours)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([userId, minutes]) => ({
                    userId,
                    userName: records.find(r => r.userId === userId)?.userName || '不明',
                    hours: (minutes / 60).toFixed(1)
                }));

            const subjectHours = {};
            records.forEach(r => {
                const subject = r.subject || 'その他';
                subjectHours[subject] = (subjectHours[subject] || 0) + (r.duration || 0);
            });
            const topSubjects = Object.entries(subjectHours)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([subject, minutes]) => ({
                    subject,
                    hours: (minutes / 60).toFixed(1)
                }));

            const uniqueStudents = new Set(records.map(r => r.userId));
            const avgHours = uniqueStudents.size > 0 ? totalHours / uniqueStudents.size : 0;

            setWeeklyStats({
                totalHours: totalHours.toFixed(1),
                topStudents,
                topSubjects,
                avgHoursPerStudent: avgHours.toFixed(1)
            });
        } catch (error) {
            console.error('Error fetching weekly stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // ==== fetch assignment progress ====
    const fetchAssignmentProgress = useCallback(async (assignmentsList) => {
        try {
            const progress = {};
            for (const assignment of assignmentsList) {
                const eligibleStudents = students.filter(s =>
                    s.subjects && s.subjects.includes(assignment.subject)
                );
                const eligibleCount = eligibleStudents.length;

                const completedStudentsList = [];
                for (const student of eligibleStudents) {
                    const statusDoc = await getDocs(
                        query(
                            collection(db, `users/${student.id}/assignmentStatus`),
                            where('assignmentId', '==', assignment.id),
                            where('completed', '==', true)
                        )
                    );
                    if (!statusDoc.empty) {
                        completedStudentsList.push(student);
                    }
                }

                // Identify non-completed students
                const completedIds = new Set(completedStudentsList.map(s => s.id));
                const notCompletedStudentsList = eligibleStudents.filter(s => !completedIds.has(s.id));

                progress[assignment.id] = {
                    completed: completedStudentsList.length,
                    total: eligibleCount,
                    completedStudents: completedStudentsList,
                    notCompletedStudents: notCompletedStudentsList
                };
            }
            setAssignmentProgress(progress);
        } catch (error) {
            console.error('Error fetching assignment progress:', error);
        }
    }, [students]);

    // ==== fetch assignments ====
    const fetchAssignments = useCallback(() => {
        const q = query(collection(db, 'assignments'), orderBy('dueDate', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(a => {
                    if (!a.dueDate) return true;
                    const dueDate = new Date(a.dueDate);
                    return dueDate >= now;
                });
            setAssignments(data);
            fetchAssignmentProgress(data);
        });
        return unsubscribe;
    }, [fetchAssignmentProgress]);

    // ==== useEffect ====

    useEffect(() => {
        fetchStudents();
        fetchDailyActive();
        fetchWeeklyStats();
        const unsubscribe = fetchAssignments();
        return () => unsubscribe && unsubscribe();
    }, [fetchStudents, fetchDailyActive, fetchWeeklyStats, fetchAssignments]);

    const formatTime = (minutes) => {
        if (minutes < 60) {
            return `${minutes}分`;
        } else {
            return `${(minutes / 60).toFixed(1)}時間`;
        }
    };

    const toggleAssignmentExpand = (assignmentId) => {
        setExpandedAssignments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(assignmentId)) {
                newSet.delete(assignmentId);
            } else {
                newSet.add(assignmentId);
            }
            return newSet;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="pb-20 space-y-6">
            {/* Daily Active Count */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                            今日の記録者数
                        </h3>
                        <div className="text-4xl font-bold text-indigo-600">
                            {dailyActiveCount} <span className="text-lg text-gray-400 font-normal">人</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowActiveStudentsModal(true)}
                        className="bg-indigo-50 p-4 rounded-full hover:bg-indigo-100 transition cursor-pointer"
                        title="記録者一覧を表示"
                    >
                        <Users className="w-8 h-8 text-indigo-600" />
                    </button>
                </div>
            </div>

            {/* Daily Active Students Modal */}
            {showActiveStudentsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">今日の記録者一覧</h3>
                            <button
                                onClick={() => setShowActiveStudentsModal(false)}
                                className="p-1 hover:bg-gray-100 rounded transition"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                            {dailyActiveStudents.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">記録者がいません</p>
                            ) : (
                                <div className="space-y-2">
                                    {dailyActiveStudents.map((student, index) => (
                                        <div
                                            key={student.userId}
                                            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {student.userName}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-indigo-600">
                                                {formatTime(student.totalMinutes)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Aggregated Study Hours with Calendar */}
            <DailyAggregatedStudyHours />

            {/* Weekly Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <h3 className="font-bold text-gray-900">先週のサマリー</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Total Hours */}
                    <div className="bg-indigo-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-600">総学習時間</span>
                        </div>
                        <div className="text-2xl font-bold text-indigo-700">
                            {weeklyStats.totalHours}h
                        </div>
                    </div>

                    {/* Average per student */}
                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-bold text-green-600">平均/人</span>
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                            {weeklyStats.avgHoursPerStudent}h
                        </div>
                    </div>
                </div>

                {/* Top Students */}
                <div className="mt-4">
                    <h4 className="text-xs font-bold text-gray-500 mb-2">最も活発な生徒</h4>
                    <div className="space-y-2">
                        {weeklyStats.topStudents.map((student, index) => (
                            <div key={student.userId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                                    <span className="text-sm font-medium text-gray-900">{student.userName}</span>
                                </div>
                                <span className="text-sm font-bold text-indigo-600">{student.hours}h</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Subjects */}
                <div className="mt-4">
                    <h4 className="text-xs font-bold text-gray-500 mb-2">人気の科目</h4>
                    <div className="flex flex-wrap gap-2">
                        {weeklyStats.topSubjects.map((item, index) => (
                            <div key={item.subject} className="bg-purple-50 px-3 py-2 rounded-lg">
                                <span className="text-xs text-purple-600 font-bold">#{index + 1}</span>
                                <span className="text-sm font-medium text-purple-900 ml-2">{item.subject}</span>
                                <span className="text-xs text-purple-600 ml-2">({item.hours}h)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Assignments Progress */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-gray-500" />
                    <h3 className="font-bold text-gray-900">課題進捗</h3>
                </div>

                <div className="space-y-3">
                    {assignments.length === 0 ? (
                        <p className="text-sm text-gray-400">課題はありません</p>
                    ) : (
                        assignments.map(assignment => {
                            const progress = assignmentProgress[assignment.id] || { completed: 0, total: 0, completedStudents: [], notCompletedStudents: [] };
                            const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
                            const isExpanded = expandedAssignments.has(assignment.id);

                            return (
                                <div
                                    key={assignment.id}
                                    className={`border border-gray-200 rounded-lg p-3 transition-all ${isExpanded ? 'bg-gray-50 ring-2 ring-indigo-100' : 'bg-white'}`}
                                >
                                    <div
                                        className="cursor-pointer"
                                        onClick={() => toggleAssignmentExpand(assignment.id)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    {assignment.subject}
                                                </span>
                                                {assignment.dueDate && (
                                                    <span className="text-xs text-gray-400 ml-2">
                                                        〆 {assignment.dueDate}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-gray-900">
                                                    {progress.completed} / {progress.total}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {percentage.toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-800 font-medium mb-2">
                                            {assignment.content}
                                        </div>
                                        {/* Progress bar */}
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-1 mb-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <span className="text-xs font-bold text-gray-600">達成者 ({progress.completedStudents?.length || 0})</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {progress.completedStudents?.length > 0 ? (
                                                        progress.completedStudents.map(s => (
                                                            <div key={s.id} className="text-xs text-gray-700 bg-white p-1.5 rounded border border-gray-100">
                                                                {s.displayName || s.userName || '名前なし'}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-xs text-gray-400 italic">なし</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1 mb-2">
                                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                                    <span className="text-xs font-bold text-gray-600">未達成者 ({progress.notCompletedStudents?.length || 0})</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {progress.notCompletedStudents?.length > 0 ? (
                                                        progress.notCompletedStudents.map(s => (
                                                            <div key={s.id} className="text-xs text-gray-700 bg-white p-1.5 rounded border border-gray-100">
                                                                {s.displayName || s.userName || '名前なし'}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-xs text-gray-400 italic">なし</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherHomeView;
