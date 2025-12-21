import React, { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    getDocs,
    collectionGroup,
    orderBy,
    onSnapshot,
    limit
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
    const [earliestRecordDate, setEarliestRecordDate] = useState(null);
    const [latestRecordDate, setLatestRecordDate] = useState(null);

    // ==== fetch bounds ====
    const fetchBounds = useCallback(async () => {
        try {
            // 最古の記録
            const earliestQuery = query(
                collectionGroup(db, 'studyRecords'),
                orderBy('createdAt', 'asc'),
                limit(1)
            );
            const earliestSnapshot = await getDocs(earliestQuery);
            if (!earliestSnapshot.empty) {
                setEarliestRecordDate(earliestSnapshot.docs[0].data().createdAt.toDate());
            }

            // 最新の記録
            const latestQuery = query(
                collectionGroup(db, 'studyRecords'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const latestSnapshot = await getDocs(latestQuery);
            if (!latestSnapshot.empty) {
                setLatestRecordDate(latestSnapshot.docs[0].data().createdAt.toDate());
            }
        } catch (error) {
            console.error('Error fetching bounds:', error);
        }
    }, []);

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
    }, [students]);

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

    // ==== useEffect ====
    useEffect(() => {
        fetchBounds();
    }, [fetchBounds]);

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
            {/* ここに既存の UI をそのまま */}
        </div>
    );
};

export default TeacherHomeView;
