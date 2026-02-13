import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Home, Clock, Menu } from 'lucide-react';
import AnalyticsView from './teacher/AnalyticsView';
import TeacherHomeView from './teacher/TeacherHomeView';
import TeacherSidebar from './teacher/TeacherSidebar';
import TeacherSettingsView from './teacher/TeacherSettingsView';
import VersionHistoryView from './shared/VersionHistoryView';
import TimelineView from './student/TimelineView';

const TeacherApp = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('home'); // analytics | home | timeline
  const [activeView, setActiveView] = useState(null); // settings
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarNavigation = (view) => {
    setActiveView(view);
    setActiveTab(null); // タブ選択状態をクリア
  };

  const handleBackToHome = () => {
    setActiveView(null);
    setActiveTab('home'); // デフォルトタブに戻る
  };

  const handleTabChange = (tab) => {
    setActiveView(null); // View選択状態をクリア
    setActiveTab(tab);
  };

  const handleBackToSettings = () => {
    setActiveView('settings');
  };

  // 表示切り替えロジック
  const renderContent = () => {
    // サイドバーのView（設定など）が優先
    if (activeView === 'settings') {
      return <TeacherSettingsView onBack={handleBackToHome} onNavigate={handleSidebarNavigation} />;
    }
    if (activeView === 'versionHistory') {
      return <VersionHistoryView onBack={handleBackToSettings} />;
    }

    // タブごとの表示
    if (activeTab === 'analytics') return <AnalyticsView />;
    if (activeTab === 'home') return <TeacherHomeView />;
    if (activeTab === 'timeline') return <TimelineView />;

    return null;
  };

  const showHeader = !activeView; // サイドバーViewの場合はヘッダーを非表示
  const showBottomNav = !activeView; // サイドバーViewの場合はボトムナビを非表示

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* サイドバー - モバイル: ドロワー, デスクトップ: 常時表示 */}
      <TeacherSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        profile={profile}
        activeTab={activeTab}
        activeView={activeView}
        onTabChange={handleTabChange}
        onNavigate={handleSidebarNavigation}
      />

      {/* モバイルヘッダー */}
      {showHeader && (
        <header className="bg-white shadow-sm sticky top-0 z-10 md:hidden">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* 左: ハンバーガーメニュー */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>

            {/* 中央: ロゴ */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
              <img src="/Project3776.png" alt="Project 3776" className="w-8 h-8 rounded-lg" />
              <h1 className="text-lg font-bold text-gray-900">Project 3776</h1>
            </div>

            {/* 右: バランス用スペース */}
            <div className="w-10"></div>
          </div>
        </header>
      )}

      {/* メインコンテンツ */}
      <main className={`flex-1 w-full ${showBottomNav ? 'max-w-md mx-auto md:max-w-none md:p-8 p-4 pb-24 md:pb-4' : 'md:p-8'}`}>
        {renderContent()}
      </main>

      {/* ボトムタブナビゲーション - モバイルのみ */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe md:hidden">
          <div className="max-w-4xl mx-auto flex justify-around">
            <button
              onClick={() => handleTabChange('analytics')}
              className={`flex flex-col items-center justify-center w-full py-3 ${activeTab === 'analytics' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <BarChart3 className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold">分析</span>
            </button>

            <button
              onClick={() => handleTabChange('home')}
              className={`flex flex-col items-center justify-center w-full py-3 ${activeTab === 'home' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Home className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold">ホーム</span>
            </button>

            <button
              onClick={() => handleTabChange('timeline')}
              className={`flex flex-col items-center justify-center w-full py-3 ${activeTab === 'timeline' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Clock className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold">タイムライン</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherApp;