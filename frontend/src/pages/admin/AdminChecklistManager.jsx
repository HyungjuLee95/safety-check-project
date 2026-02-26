import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { safetyApi } from '../../services/api';

const AdminChecklistManager = ({ user, categories, onBack }) => {
  const [cat, setCat] = useState((categories && categories[0]) || '');
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');


  useEffect(() => {
    if (!cat && categories?.length) {
      setCat(categories[0]);
    }
  }, [categories, cat]);

  useEffect(() => {
    if (!cat) return;
    const load = async () => {
      const data = await safetyApi.getChecklist(cat);
      const list = (data.items || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      // order가 비어있으면 index 기준으로 채우기
      const normalized = list.map((it, i) => ({ ...it, order: it.order ?? (i + 1) }));
      setItems(normalized);
    };
    load();
  }, [cat]);

  const handleSave = async (list) => {
    // 저장 전 항상 order를 1..N으로 재부여해서 "역순/꼬임" 방지
    const ordered = (list || []).map((it, i) => ({ ...it, order: i + 1 }));
    await safetyApi.updateChecklist({ adminName: user.name, workType: cat, items: ordered });
    setItems(ordered);
  };

  const add = () => {
    if (!newItem.trim()) return;
    handleSave([...items, { id: Date.now().toString(), text: newItem, order: items.length + 1 }]);
    setNewItem('');
  };

  const remove = (id) => handleSave(items.filter(i => i.id !== id));

  const move = (idx, dir) => {
    const n = idx + (dir === 'up' ? -1 : 1);
    if (n < 0 || n >= items.length) return;
    const l = [...items];
    [l[idx], l[n]] = [l[n], l[idx]];
    const ordered = l.map((it, i) => ({ ...it, order: i + 1 }));
    handleSave(ordered);
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">체크리스트</h2>
      </div>

      <div className="flex overflow-x-auto gap-2 mb-4 pb-1 no-scrollbar">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-bold transition-all ${cat === c ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="새 항목 입력"
          className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
        />
        <button onClick={add} className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95">
          <Plus size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {(items || []).map((it, idx) => (
            <div key={it.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex gap-3">
                <span className="text-xs font-black text-blue-600">{idx + 1}</span>
                <p className="flex-1 text-sm font-bold text-slate-700 leading-relaxed">{it.text}</p>
                <button onClick={() => remove(it.id)} className="text-slate-200 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-50">
                <button onClick={() => move(idx, 'up')} disabled={idx === 0} className="p-1 rounded bg-slate-50 text-slate-400 disabled:opacity-20">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => move(idx, 'down')} disabled={idx === items.length - 1} className="p-1 rounded bg-slate-50 text-slate-400 disabled:opacity-20">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default AdminChecklistManager;
