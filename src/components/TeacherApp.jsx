import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, BarChart3, Home, Clock } from 'lucide-react';
import AnalyticsView from './teacher/AnalyticsView';
import TeacherHomeView from './teacher/TeacherHomeView';
import TimelineView from './student/TimelineView';

const TeacherApp = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('home'); // analytics | home | timeline

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex md:flex-col w-72 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <img src="/Project3776.png" alt="Project 3776" className="w-8 h-8 rounded-lg" />
            <h1 className="text-lg font-bold text-gray-900">Project 3776</h1>
          </div>
          <div className="text-sm font-medium text-gray-700">{profile?.displayName}先生</div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            メニュー
          </div>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${activeTab === 'analytics'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-medium">分析</span>
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${activeTab === 'home'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-sm font-medium">ホーム</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${activeTab === 'timeline'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">タイムライン</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 md:hidden">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/Project3776.png" alt="Project 3776" className="w-8 h-8 rounded-lg" />
            <h1 className="text-lg font-bold text-gray-900">Project 3776</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-gray-900">{profile?.displayName}先生</div>
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
      <main className="flex-1 w-full max-w-md mx-auto md:max-w-none md:p-8 p-4 pb-24 md:pb-4">
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'home' && <TeacherHomeView />}
        {activeTab === 'timeline' && <TimelineView />}
      </main>

      {/* Bottom Tab Navigation - Mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe md:hidden">
        <div className="max-w-4xl mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center justify-center w-full py-3 ${activeTab === 'analytics' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <BarChart3 className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">分析</span>
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

export default TeacherApp;