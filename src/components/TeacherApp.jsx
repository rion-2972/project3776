import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const TeacherApp = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Project 3776</h1>
              <p className="text-sm text-gray-600">教員画面</p>
              <p className="text-sm text-gray-600">ようこそ、{profile?.displayName}先生</p>
            </div>
            <button 
              onClick={signOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              ログアウト
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <p className="text-gray-600">教員用アプリを構築中です...</p>
        </div>
      </div>
    </div>
  );
};

export default TeacherApp;