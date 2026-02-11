import React, { useState } from 'react';
import { ArrowLeft, Plus, MapPin, Trash2 } from 'lucide-react';
import { safetyApi } from '../../services/api';

const AdminLocationManager = ({ user, hospitals, setHospitals, onBack }) => {
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const name = newItem.trim();
    if (!name) return;

    // 중복 방지(대소문자/공백 무시)
    const exists = (hospitals || []).some((h) => String(h).trim() === name);
    if (exists) {
      alert('이미 등록된 장소입니다.');
      return;
    }

    setSaving(true);
    try {
      const next = [...(hospitals || []), name];
      await safetyApi.updateHospitals(user.name, next);
      setHospitals(next);
      setNewItem('');
    } catch (e) {
      console.error(e);
      alert('장소 추가 실패');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (idx) => {
    if (!window.confirm('해당 장소를 삭제할까요?')) return;

    setSaving(true);
    try {
      const next = (hospitals || []).filter((_, i) => i !== idx);
      await safetyApi.updateHospitals(user.name, next);
      setHospitals(next);
    } catch (e) {
      console.error(e);
      alert('장소 삭제 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">장소 관리</h2>
      </div>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="새 병원명 입력"
          className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          disabled={saving}
        />
        <button
          onClick={add}
          disabled={saving || !newItem.trim()}
          className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 disabled:opacity-40"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {(hospitals || []).map((h, i) => (
          <div
            key={`${h}-${i}`}
            className="p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-blue-500 opacity-50" />
              <p className="text-sm font-black text-slate-700">{h}</p>
            </div>

            <button
              onClick={() => remove(i)}
              disabled={saving}
              className="text-slate-200 hover:text-red-500 disabled:opacity-30"
              title="삭제"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {(hospitals || []).length === 0 && (
          <div className="p-8 bg-slate-50 rounded-[2rem] text-center text-slate-400 font-bold">
            등록된 장소가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLocationManager;
