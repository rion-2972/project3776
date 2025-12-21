import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, collectionGroup, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';

// Native JS date utilities
const formatMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
};

const addMonths = (date, months) => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
};

const startOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

const isSameMonth = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
};

// Mt. Fuji SVG Component
const MtFujiProgress = ({ currentHours, targetHours = 3776, currentMonth, onPrevMonth, onNextMonth, canGoPrev, canGoNext }) => {
    const percentage = Math.min((currentHours / targetHours) * 100, 100);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
                <button
                    onClick={onPrevMonth}
                    disabled={!canGoPrev}
                    className={`p-1 rounded-full hover:bg-gray-100 transition ${!canGoPrev ? 'opacity-30 cursor-not-allowed' : 'text-gray-600'}`}
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">
                    {formatMonth(currentMonth)}の学習進捗
                </h2>
                <button
                    onClick={onNextMonth}
                    disabled={!canGoNext}
                    className={`p-1 rounded-full hover:bg-gray-100 transition ${!canGoNext ? 'opacity-30 cursor-not-allowed' : 'text-gray-600'}`}
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Mt. Fuji Visualization */}
            <div className="flex flex-col items-center">
                <svg width="200" height="150" viewBox="0 0 200 150" className="mb-4">
                    {/* Mountain outline (Simple Trapezoid) */}
                    <defs>
                        <clipPath id="mountainClip">
                            <path d="M 20 150 L 75 40 L 125 40 L 180 150 Z" />
                        </clipPath>
                    </defs>

                    {/* Background mountain (gray) */}
                    <path
                        d="M 20 150 L 75 40 L 125 40 L 180 150 Z"
                        fill="#E5E7EB"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />

                    {/* Snow cap (Simple white top) */}
                    <path
                        d="M 60 70 L 140 70 L 125 40 L 75 40 Z"
                        fill="white"
                        fillOpacity="0.8"
                    />

                    {/* Progress fill (indigo) - rising from bottom */}
                    {/* The fill will cover the snow cap if progress is high enough, indicating completion */}
                    <rect
                        x="0"
                        y={150 - (110 * percentage / 100)}
                        width="200"
                        height={110 * percentage / 100}
                        fill="#4F46E5"
                        clipPath="url(#mountainClip)"
                        fillOpacity="0.9"
                    />
                </svg>

                <div className="text-center">
                    <div className="text-4xl font-bold text-indigo-600">{currentHours.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">/ {targetHours.toLocaleString()} 時間</div>
                    <div className="mt-2 text-lg font-semibold text-gray-700">{percentage.toFixed(1)}% 達成</div>
                </div>
            </div>
        </div>
    );
};

const AnalyticsView = () => {
    const [students, setStudents] = useState([]);
    const [studyRecords, setStudyRecords] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [monthlyTotal, setMonthlyTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Bounds for navigation
    const [earliestRecordDate, setEarliestRecordDate] = useState(null);
    const [latestRecordDate, setLatestRecordDate] = useState(null);

    // Filters
    const [filterType, setFilterType] = useState('all'); // all | bunken | riken
    const [filterSubject, setFilterSubject] = useState('all'); // all | 日本史 | 世界史 | 物理 | 生物

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
                setEarliestRecordDate(
                    earliestSnapshot.docs[0].data().createdAt.toDate()
                );
            }

            // 最新の記録
            const latestQuery = query(
                collectionGroup(db, 'studyRecords'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const latestSnapshot = await getDocs(latestQuery);
            if (!latestSnapshot.empty) {
                setLatestRecordDate(
                    latestSnapshot.docs[0].data().createdAt.toDate()
                );
            }
        } catch (error) {
            console.error('Error fetching bounds:', error);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 生徒一覧（未取得時のみ）
            if (students.length === 0) {
                const studentsQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'student')
                );
                const studentsSnapshot = await getDocs(studentsQuery);
                const studentsData = studentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setStudents(studentsData);
            }

            // Fetch study records for SELECTED month
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);

            const recordsQuery = query(
                collectionGroup(db, 'studyRecords'),
                where('createdAt', '>=', start),
                where('createdAt', '<=', end)
            );
            const recordsSnapshot = await getDocs(recordsQuery);
            const recordsData = recordsSnapshot.docs.map(doc => ({
                id: doc.id,
                userId: doc.ref.parent.parent.id,
                ...doc.data()
            }));
            setStudyRecords(recordsData);

            // Calculate monthly total
            const total = recordsData.reduce((sum, record) => sum + (record.duration || 0), 0) / 60;
            setMonthlyTotal(Math.round(total));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [students.length, currentMonth]);

    useEffect(() => {
        fetchBounds();
    }, [fetchBounds]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const handlePrevMonth = () => {
        setCurrentMonth(prev => addMonths(prev, -1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => addMonths(prev, 1));
    };

    const canGoPrev = earliestRecordDate ? !isSameMonth(currentMonth, earliestRecordDate) && currentMonth > earliestRecordDate : false;
    const canGoNext = latestRecordDate ? !isSameMonth(currentMonth, latestRecordDate) && currentMonth < latestRecordDate : false;

    // Helper: Get student's elective subject
    const getElectiveSubject = (student) => {
        if (!student.subjects) return null;
        const historySubjects = ['日本史', '世界史'];
        const scienceSubjects = ['物理', '生物'];

        const history = student.subjects.find(s => historySubjects.includes(s));
        if (history) return history;

        const science = student.subjects.find(s => scienceSubjects.includes(s));
        if (science) return science;

        return null;
    };

    // Calculate per-student stats
    const getStudentStats = (student) => {
        const studentRecords = studyRecords.filter(r => r.userId === student.id);
        const totalMinutes = studentRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

        // Subject breakdown with percentages
        const subjectBreakdown = {};
        studentRecords.forEach(record => {
            const subject = record.subject || 'その他';
            subjectBreakdown[subject] = (subjectBreakdown[subject] || 0) + (record.duration || 0);
        });

        // Convert to percentages
        const subjectPercentages = {};
        if (totalMinutes > 0) {
            Object.entries(subjectBreakdown).forEach(([subject, minutes]) => {
                subjectPercentages[subject] = ((minutes / totalMinutes) * 100).toFixed(0);
            });
        }

        return {
            totalHours: (totalMinutes / 60).toFixed(1),
            subjectBreakdown,
            subjectPercentages
        };
    };

    // Apply filters
    const filteredStudents = students.filter(student => {
        // Type filter
        if (filterType !== 'all' && student.type !== filterType) return false;

        // Subject filter
        if (filterSubject !== 'all') {
            if (!student.subjects || !student.subjects.includes(filterSubject)) return false;
        }

        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="pb-20">
            {/* Mt. Fuji Progress */}
            <MtFujiProgress
                currentHours={monthlyTotal}
                currentMonth={currentMonth}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
            />

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-700">フィルター</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Type filter */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">文理選択</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">すべて</option>
                            <option value="bunken">文系</option>
                            <option value="riken">理系</option>
                        </select>
                    </div>

                    {/* Subject filter */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">選択科目</label>
                        <select
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">すべて</option>
                            <option value="日本史">日本史</option>
                            <option value="世界史">世界史</option>
                            <option value="物理">物理</option>
                            <option value="生物">生物</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">生徒一覧 ({filteredStudents.length}人)</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left">生徒名</th>
                                <th className="px-4 py-3 text-left">文理</th>
                                <th className="px-4 py-3 text-left">選択科目</th>
                                <th className="px-4 py-3 text-right">今月の時間</th>
                                <th className="px-4 py-3 text-left">今月の科目内訳</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredStudents.map(student => {
                                const stats = getStudentStats(student);
                                const electiveSubject = getElectiveSubject(student);
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {student.displayName || '名前なし'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${student.type === 'bunken'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {student.type === 'bunken' ? '文系' : '理系'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {electiveSubject ? (
                                                <span className="text-sm text-gray-700">{electiveSubject}</span>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-indigo-600">
                                            {stats.totalHours}h
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(stats.subjectPercentages)
                                                    .sort((a, b) => b[1] - a[1])
                                                    .slice(0, 3)
                                                    .map(([subject, percentage]) => (
                                                        <span
                                                            key={subject}
                                                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                                        >
                                                            {subject}: {percentage}%
                                                        </span>
                                                    ))
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredStudents.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        該当する生徒がいません
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsView;
