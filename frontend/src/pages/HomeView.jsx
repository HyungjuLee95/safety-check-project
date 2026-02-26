import React from 'react';
import { LogOut, ClipboardList, ArrowLeft } from 'lucide-react';

const HomeView = ({ user, onStart, onMyRecords, onLogout, stats }) => {
  const totalCount = stats?.total ?? 0;
  const todayCount = stats?.today ?? 0;
  const pendingCount = stats?.pending ?? 0;

  return (
    <div className="flex flex-col gap-6 pt-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            반갑습니다, <br /><span className="text-blue-600">{user.name}</span>님
          </h2>
        </div>
        <button onClick={onLogout} className="p-3 bg-slate-50 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <LogOut size={20} />
        </button>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] font-medium text-slate-400 mb-1">Today Report</p>
            <p className="text-3xl font-black tracking-tighter">{totalCount}</p>
          </div>
          <div className="border-l border-white/10 pl-3">
            <p className="text-[11px] font-medium text-slate-400 mb-1">Today</p>
            <p className="text-3xl font-black text-blue-400 tracking-tighter">{todayCount}</p>
          </div>
          <div className="border-l border-white/10 pl-3">
            <p className="text-[11px] font-medium text-slate-400 mb-1">Pending</p>
            <p className="text-3xl font-black text-yellow-400 tracking-tighter">{pendingCount}</p>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <button className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-300 relative overflow-hidden group cursor-pointer text-left" onClick={onStart}>
        <div className="relative z-10">
          <p className="text-slate-400 text-xs font-medium mb-1">오늘의 할 일</p>
          <h3 className="text-2xl font-bold mb-6">안전 점검 시작하기</h3>

          <div className="flex items-center gap-2 text-sm font-bold text-blue-300 group-hover:translate-x-1 transition-transform">
            <span>Start Inspection</span>
            <ArrowLeft className="rotate-180" size={16} />
          </div>
        </div>
      </button>

      <button onClick={onMyRecords} className="p-5 bg-white rounded-[2rem] border border-slate-100 hover:border-blue-500 transition-all text-left">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-3 text-slate-400">
          <ClipboardList size={20} />
        </div>
        <p className="text-xs text-slate-400 font-bold mb-1">HISTORY</p>
        <p className="text-lg font-black text-slate-800">내 점검 내역</p>
      </button>
    </div>
  );
};

export default HomeView;
