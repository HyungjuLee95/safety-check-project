import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search, Download, RotateCcw, ChevronRight } from 'lucide-react';
import { safetyApi } from '../../services/api';

const STATUS_TABS = [
  { key: 'ALL', label: '전체' },
  { key: 'PENDING', label: '승인대기' },
  { key: 'SUBMITTED', label: '승인완료' },
  { key: 'REJECTED', label: '반려' },
];

const normalizeStatus = (raw) => {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return '';
  if (s === 'PENDING') return 'PENDING';
  if (s === 'SUBMIT' || s === 'SUBMITTED' || s === 'APPROVED') return 'SUBMITTED';
  if (s === 'REJECT' || s === 'REJECTED') return 'REJECTED';
  if (s === 'CANCELLED') return 'CANCELLED';
  return s;
};

const statusLabel = (raw) => {
  const s = normalizeStatus(raw);
  if (s === 'PENDING') return '승인 대기';
  if (s === 'SUBMITTED') return '승인 완료';
  if (s === 'REJECTED') return '반려';
  if (s === 'CANCELLED') return '취소';
  return '';
};

const AdminRecordsView = ({ user, records, onBack, onDetail }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [tab, setTab] = useState('ALL');

  const handleExport = async () => {
    try {
      await safetyApi.exportInspections({
        admin_name: user.name,
        start_date: start || '2000-01-01',
        end_date: end || '2099-12-31',
        requester_role: user?.role,
        requester_categories: (user?.categories || []).join(','),
      });
    } catch (err) {
      alert('다운로드 실패');
    }
  };

  const filtered = useMemo(() => {
    return (records || []).filter((r) => {
      const keyword = searchTerm.trim();
      const hit =
        !keyword ||
        (r.name || '').includes(keyword) ||
        (r.hospital || '').includes(keyword) ||
        (r.equipmentName || '').includes(keyword) ||
        (r.workType || '').includes(keyword);

      if (!hit) return false;
      if (start && r.date < start) return false;
      if (end && r.date > end) return false;
      if (tab !== 'ALL' && normalizeStatus(r.status) !== tab) return false;
      return true;
    });
  }, [records, searchTerm, start, end, tab]);

  const getImproveCount = (r) => {
    const direct = r?.improveCount ?? r?.improve_count ?? r?.improveNeededCount ?? r?.improve_needed_count;
    if (Number.isFinite(direct)) return direct;
    const answers = Array.isArray(r?.answers) ? r.answers : [];
    const hasNeed = answers.some((a) => String(a?.value || '').trim() === '점검필요');
    return hasNeed ? 1 : 0;
  };

  const tabButtonClass = (key) => {
    const active = tab === key;
    return `flex-1 py-2 rounded-xl font-black text-[11px] transition-all active:scale-95 ${
      active ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-500 border border-slate-100'
    }`;
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">점검 기록</h2>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          {STATUS_TABS.map((item) => (
            <button key={item.key} className={tabButtonClass(item.key)} onClick={() => setTab(item.key)}>{item.label}</button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="이름/장소/장비/작업구분 검색"
            className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-2xl">
          <input type="date" className="flex-1 p-2 bg-white rounded-xl text-[10px] font-bold" value={start} onChange={(e) => setStart(e.target.value)} />
          <span className="text-slate-300">~</span>
          <input type="date" className="flex-1 p-2 bg-white rounded-xl text-[10px] font-bold" value={end} onChange={(e) => setEnd(e.target.value)} />
          <button onClick={() => { setStart(''); setEnd(''); }} className="p-2 text-blue-500 active:scale-90"><RotateCcw size={14} /></button>
        </div>

        <button onClick={handleExport} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
          <Download size={16} /> PDF 다운로드
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {filtered.map((r) => {
          const improveCount = getImproveCount(r);
          const hasIssue = improveCount > 0;
          const label = statusLabel(r.status);

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

                <div className="flex flex-col items-end gap-1">
                  <div className="relative">
                    <span className="text-[9px] px-2 py-1 bg-green-50 text-green-600 rounded-lg font-black border border-green-100">
                      {r.resultCount} 통과
                    </span>

                    {hasIssue && (
                      <span
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-white"
                        title="점검 필요 항목 있음"
                      />
                    )}
                  </div>

                  {!!label && (
                    <span className="text-[9px] text-slate-500 font-extrabold">
                      {label}
                    </span>
                  )}
                </div>
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
            조회된 점검 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRecordsView;
