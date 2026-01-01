import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, PenTool, Home, Clock } from 'lucide-react';
import RecordView from './student/RecordView';
import HomeView from './student/HomeView';
import TimelineView from './student/TimelineView';

const StudentApp = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('home'); // record | home | timeline
  const [preFillData, setPreFillData] = useState(null);

  const handleAssignmentClick = (assignment) => {
    setPreFillData({
      subject: assignment.subject,
      task: '課題', // Fixed task type
      contentDetails: assignment.content,
      mode: 'stopwatch'
    });
    setActiveTab('record');
  };

  const clearPreFillData = () => {
    setPreFillData(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/Project3776.png" alt="Project 3776" className="w-8 h-8 rounded-lg" />
            <h1 className="text-lg font-bold text-gray-900">Project 3776</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-gray-900">{profile?.displayName}</div>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              title="ログアウト"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 pb-24">
        {activeTab === 'record' && <RecordView preFillData={preFillData} onPreFillApplied={clearPreFillData} />}
        {activeTab === 'home' && <HomeView onAssignmentClick={handleAssignmentClick} />}
        {activeTab === 'timeline' && <TimelineView />}
      </main>

      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="max-w-md mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('record')}
            className={`flex flex-col items-center justify-center w-full py-3 ${activeTab === 'record' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <PenTool className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">記録する</span>
          </button>

          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center w-full py-3 ${activeTab === 'home' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">ホーム</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex flex-col items-center justify-center w-full py-3 ${activeTab === 'timeline' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Clock className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">タイムライン</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentApp;
