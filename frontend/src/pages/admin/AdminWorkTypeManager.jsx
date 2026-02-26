import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Briefcase } from 'lucide-react';
import { safetyApi } from '../../services/api';

const AdminWorkTypeManager = ({ user, workTypes, setWorkTypes, onBack }) => {
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const value = newItem.trim();
    if (!value) return;

    const exists = (workTypes || []).some((w) => String(w).trim() === value);
    if (exists) {
      alert('이미 등록된 점검 업무입니다.');
      return;
    }

    setSaving(true);
    try {
      const next = [...(workTypes || []), value];
      await safetyApi.updateWorkTypes(user.name, next);
      setWorkTypes(next);
      setNewItem('');
    } catch (e) {
      console.error(e);
      alert('점검 업무 추가 실패');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (idx) => {
    if (!window.confirm('해당 점검 업무를 삭제할까요?')) return;

    setSaving(true);
    try {
      const next = (workTypes || []).filter((_, i) => i !== idx);
      await safetyApi.updateWorkTypes(user.name, next);
      setWorkTypes(next);
    } catch (e) {
      console.error(e);
      alert('점검 업무 삭제 실패');
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
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">점검 업무 등록</h2>
      </div>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="새 점검 업무 입력 (예: X-ray 설치작업)"
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
        {(workTypes || []).map((workType, i) => (
          <div
            key={`${workType}-${i}`}
            className="p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Briefcase size={16} className="text-blue-500 opacity-50" />
              <p className="text-sm font-black text-slate-700">{workType}</p>
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

        {(workTypes || []).length === 0 && (
          <div className="p-8 bg-slate-50 rounded-[2rem] text-center text-slate-400 font-bold">
            등록된 점검 업무가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWorkTypeManager;
