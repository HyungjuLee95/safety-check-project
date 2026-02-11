import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, X, CheckCircle2 } from 'lucide-react';
import { safetyApi } from '../services/api';
import { normalizeToUiValue } from '../utils/inspectionFormat';

const InspectionView = ({ workType, setup, onBack, onFinish, initialAnswers }) => {
  const [items, setItems] = useState([]);
  const [results, setResults] = useState([]); // [{value:'양호|보통|점검필요', comment:''}] or null
  const [isLoading, setIsLoading] = useState(true);
  const itemRefs = useRef([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await safetyApi.getChecklist(workType);
        const list = data.items || [];
        setItems(list);

        if (initialAnswers && Array.isArray(initialAnswers) && initialAnswers.length > 0) {
          const map = new Map(initialAnswers.map(a => [String(a.itemId), a]));
          const initial = list.map(it => {
            const found = map.get(String(it.id));
            if (!found) return null;
            return { value: normalizeToUiValue(found.value), comment: found.comment || "" };
          });
          setResults(initial);
        } else {
          setResults(Array(list.length).fill(null));
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [workType]); // eslint-disable-line

  const setValue = (idx, val) => {
    setResults(prev => {
      const next = [...prev];
      const cur = next[idx] || { value: null, comment: "" };
      next[idx] = { ...cur, value: val };
      if (val !== '점검필요') next[idx].comment = "";
      return next;
    });
  };

  const setComment = (idx, comment) => {
    setResults(prev => {
      const next = [...prev];
      const cur = next[idx] || { value: null, comment: "" };
      next[idx] = { ...cur, comment };
      return next;
    });
  };

  const canProceed = () => results.every(r => r && r.value);

  const validateBeforeNext = () => {
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r || !r.value) continue;
      if (r.value === '점검필요' && !String(r.comment || '').trim()) {
        alert("점검 필요 내용을 기재해주세요");
        const el = itemRefs.current[i];
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
    }
    return true;
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center font-bold text-slate-300">로딩 중...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 text-slate-400 active:scale-90"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold tracking-tight">점검표 작성</h2>
        <div className="w-10"></div>
      </div>

      <div className="mb-6 p-5 bg-slate-900 rounded-[2rem] text-white shadow-xl flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{setup.workType}</p>
          <p className="text-sm font-bold">{setup.hospital}</p>
          <p className="text-[11px] font-bold text-slate-300">장비: {setup.equipmentName}</p>
        </div>
        <div className="relative z-10 text-right">
          <p className="text-[10px] text-slate-400 font-medium mb-0.5">Date</p>
          <p className="text-xs font-bold">{setup.date.replace(/-/g, '.')}</p>
        </div>
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-24 pr-1">
        {items.map((item, idx) => {
          const r = results[idx];
          const selected = r?.value;

          return (
            <div key={item.id} className="bg-white p-2 rounded-2xl border border-slate-100" ref={(el) => (itemRefs.current[idx] = el)}>
              <div className="flex gap-3 mb-3 pl-1">
                <span className="flex-shrink-0 w-5 h-5 rounded bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center font-bold mt-0.5">{idx + 1}</span>
                <p className="text-sm font-semibold text-slate-800 leading-snug">{item.text}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setValue(idx, '양호')}
                  className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${selected === '양호' ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <Check size={14} /> 양호
                </button>

                <button
                  onClick={() => setValue(idx, '보통')}
                  className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${selected === '보통' ? 'bg-slate-400 border-slate-400 text-white shadow-md shadow-slate-200' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <CheckCircle2 size={14} /> 보통
                </button>

                <button
                  onClick={() => setValue(idx, '점검필요')}
                  className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${selected === '점검필요' ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-200' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <X size={14} /> 점검필요
                </button>
              </div>

              {selected === '점검필요' && (
                <div className="mt-3">
                  <textarea
                    value={r?.comment || ''}
                    onChange={(e) => setComment(idx, e.target.value)}
                    placeholder="점검 필요 내용을 작성해주세요"
                    className="w-full min-h-[72px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300 placeholder:font-normal resize-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-6 pt-6 bg-gradient-to-t from-white via-white to-transparent">
        <button
          onClick={() => {
            if (!canProceed()) return;
            if (!validateBeforeNext()) return;

            const payload = items.map((item, idx) => ({
              itemId: item.id,
              question: item.text,
              value: results[idx].value,
              comment: results[idx].value === '점검필요' ? (results[idx].comment || '') : ''
            }));
            onFinish(payload);
          }}
          disabled={!canProceed()}
          className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all ${canProceed() ? 'bg-slate-900 text-white active:scale-95' : 'bg-slate-200 text-slate-400'}`}
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
};

export default InspectionView;
