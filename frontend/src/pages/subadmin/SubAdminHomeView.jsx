import React from 'react';
import { LogOut, ClipboardList } from 'lucide-react';

const SubAdminHomeView = ({ setView, onLogout, records }) => {
  const totalCount = records?.length || 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const dailyCount = records?.filter((r) => r.date === todayStr).length || 0;
  const pendingCount = (records || []).filter((r) => String(r.status || '').toUpperCase() === 'PENDING').length;

  return (
    <div className="flex flex-col gap-6 pt-4 animate-in slide-in-from-bottom-4 duration-500 text-slate-900">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight">서브 관리자님 환영합니다</h2>
          <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest">Sub Admin Dashboard</p>
        </div>
        <button onClick={onLogout} className="p-2 text-slate-300 hover:text-red-500">
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
            <p className="text-3xl font-black text-blue-400 tracking-tighter">{dailyCount}</p>
          </div>
          <div className="border-l border-white/10 pl-3">
            <p className="text-[11px] font-medium text-slate-400 mb-1">Pending</p>
            <p className="text-3xl font-black text-yellow-400 tracking-tighter">{pendingCount}</p>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      <div className="grid grid-cols-1 gap-3 px-1">
        <button
          onClick={() => setView('subadmin_records')}
          className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-[1.5rem] hover:border-blue-500 active:scale-95 transition-all shadow-sm"
        >
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><ClipboardList size={22} /></div>
          <div className="text-left">
            <div className="font-bold text-sm text-slate-700">승인 목록</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">승인대기/승인완료 조회 · 승인/반려</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default SubAdminHomeView;
