import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search, RotateCcw, ChevronRight } from 'lucide-react';

const SubAdminRecordsView = ({ records, onBack, onDetail }) => {
  const [tab, setTab] = useState('PENDING'); // PENDING | SUBMITTED
  const [searchTerm, setSearchTerm] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const filtered = useMemo(() => {
    const keyword = searchTerm.trim();
    return (records || [])
      .filter(r => String(r.status || '').toUpperCase() === tab)
      .filter(r => {
        const hit =
          !keyword ||
          (r.name || '').includes(keyword) ||
          (r.hospital || '').includes(keyword) ||
          (r.equipmentName || '').includes(keyword) ||
          (r.workType || '').includes(keyword);

        if (!hit) return false;
        if (start && r.date < start) return false;
        if (end && r.date > end) return false;
        return true;
      });
  }, [records, tab, searchTerm, start, end]);

  const tabButtonClass = (key) => {
    const active = tab === key;
    return `flex-1 py-3 rounded-xl font-black text-xs transition-all active:scale-95 ${
      active ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-500 border border-slate-100'
    }`;
  };

  const badge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PENDING') return { text: '승인대기', cls: 'bg-yellow-50 text-yellow-700 border-yellow-100' };
    if (s === 'SUBMITTED') return { text: '승인완료', cls: 'bg-green-50 text-green-700 border-green-100' };
    return { text: s, cls: 'bg-slate-50 text-slate-600 border-slate-100' };
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">승인 목록</h2>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        <button className={tabButtonClass('PENDING')} onClick={() => setTab('PENDING')}>승인 대기</button>
        <button className={tabButtonClass('SUBMITTED')} onClick={() => setTab('SUBMITTED')}>승인 완료</button>
      </div>

      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="이름/장소/장비/작업구분 검색"
            className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-2xl">
          <input type="date" className="flex-1 p-2 bg-white rounded-xl text-[10px] font-bold" value={start} onChange={e => setStart(e.target.value)} />
          <span className="text-slate-300">~</span>
          <input type="date" className="flex-1 p-2 bg-white rounded-xl text-[10px] font-bold" value={end} onChange={e => setEnd(e.target.value)} />
          <button onClick={() => { setStart(''); setEnd(''); }} className="p-2 text-blue-500 active:scale-90"><RotateCcw size={14} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {filtered.map(r => {
          const b = badge(r.status);
          return (
            <div
              key={r.id}
              className="p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm active:scale-95 transition-all"
              onClick={() => onDetail(r)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-slate-800">{r.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {r.hospital}{r.equipmentName ? ` · ${r.equipmentName}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">{r.workType}</p>
                </div>

                <span className={`text-[9px] px-2 py-1 rounded-lg font-black border ${b.cls}`}>
                  {b.text}
                </span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-50 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                <span>{r.date}</span>
                <span className="text-blue-500 font-black flex items-center gap-1">Detail <ChevronRight size={10} /></span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 bg-slate-50 rounded-[2rem] text-center text-slate-400 font-bold">
            {tab === 'PENDING' ? '승인대기 내역이 없습니다.' : '승인완료 내역이 없습니다.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubAdminRecordsView;
