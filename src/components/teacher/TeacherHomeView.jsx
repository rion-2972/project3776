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
import { Users, Calendar, BookOpen, TrendingUp, Award } from 'lucide-react';

const TeacherHomeView = () => {
    const [dailyActiveCount, setDailyActiveCount] = useState(0);
    const [weeklyStats, setWeeklyStats] = useState({
        totalHours: 0,
        topStudents: [],
        topSubjects: [],
        avgHoursPerStudent: 0
    });
    const [assignments, setAssignments] = useState([]);
    const [assignmentProgress, setAssignmentProgress] = useState({});
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

            const uniqueUsers = new Set();
            snapshot.docs.forEach(doc => {
                const userId = doc.ref.parent.parent.id;
                uniqueUsers.add(userId);
            });

            setDailyActiveCount(uniqueUsers.size);
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

                let completedCount = 0;
                for (const student of eligibleStudents) {
                    const statusDoc = await getDocs(
                        query(
                            collection(db, `users/${student.id}/assignmentStatus`),
                            where('assignmentId', '==', assignment.id),
                            where('completed', '==', true)
                        )
                    );
                    if (!statusDoc.empty) {
                        completedCount++;
                    }
                }

                progress[assignment.id] = {
                    completed: completedCount,
                    total: eligibleCount
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
                    <div className="bg-indigo-50 p-4 rounded-full">
                        <Users className="w-8 h-8 text-indigo-600" />
                    </div>
                </div>
            </div>

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
                            const progress = assignmentProgress[assignment.id] || { completed: 0, total: 0 };
                            const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

                            return (
                                <div key={assignment.id} className="border border-gray-200 rounded-lg p-3">
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
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherHomeView;
