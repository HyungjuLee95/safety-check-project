import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, ChevronRight } from 'lucide-react';
import { statusLabel } from '../../utils/inspectionFormat';

const MyRecordsView = ({ records, onBack, onRefresh, onDetail }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const filtered = (records || []).filter(r => {
    if (start && r.date < start) return false;
    if (end && r.date > end) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">내 점검 내역</h2>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-2xl">
          <input type="date" className="flex-1 p-2 bg-white rounded-xl text-[10px] font-bold" value={start} onChange={e => setStart(e.target.value)} />
          <span className="text-slate-300">~</span>
          <input type="date" className="flex-1 p-2 bg-white rounded-xl text-[10px] font-bold" value={end} onChange={e => setEnd(e.target.value)} />
          <button onClick={() => { setStart(''); setEnd(''); }} className="p-2 text-blue-500 active:scale-90"><RotateCcw size={14} /></button>
        </div>

        <button onClick={onRefresh} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
          <RotateCcw size={16} /> 새로고침
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {filtered.map((r) => (
          <div
            key={r.id || `${r.date}-${r.hospital}-${r.equipmentName}`}
            className="p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm active:scale-95 transition-all"
            onClick={() => onDetail({ date: r.date, hospital: r.hospital, equipmentName: r.equipmentName })}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-slate-800">{r.date}</p>
                <p className="text-[10px] text-slate-400 font-medium">{r.hospital} · {r.equipmentName || '장비명 없음'}</p>
              </div>
              <span className={`text-[9px] px-2 py-1 rounded-lg font-black border ${r.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                {statusLabel(r.status)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-50 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              <span>개선필요 {r.improveCount ?? 0}건</span>
              <span className="text-blue-500 font-black flex items-center gap-1">Detail <ChevronRight size={10} /></span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 bg-slate-50 rounded-[2rem] text-center text-slate-400 font-bold">
            조회된 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRecordsView;
