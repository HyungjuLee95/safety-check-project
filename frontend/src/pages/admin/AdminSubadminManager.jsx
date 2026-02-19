import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

const emptyForm = { name: '', phoneLast4: '', categories: [] };

const AdminSubadminManager = ({ categories, subadmins, onRefresh, onBack, onCreate, onUpdate, onDelete }) => {
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const categoryOptions = useMemo(() => categories || [], [categories]);

  useEffect(() => {
    onRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCategory = (target, cat) => {
    const setFn = target === 'create' ? setCreateForm : setEditForm;
    const form = target === 'create' ? createForm : editForm;
    const has = form.categories.includes(cat);
    setFn({
      ...form,
      categories: has ? form.categories.filter((c) => c !== cat) : [...form.categories, cat],
    });
  };

  const submitCreate = async () => {
    if (!createForm.name.trim() || createForm.phoneLast4.length !== 4) {
      alert('이름과 휴대폰 뒷번호 4자리를 입력해주세요.');
      return;
    }
    await onCreate(createForm);
    setCreateForm(emptyForm);
  };

  const submitUpdate = async () => {
    if (!editingId) return;
    if (!editForm.name.trim() || editForm.phoneLast4.length !== 4) {
      alert('이름과 휴대폰 뒷번호 4자리를 입력해주세요.');
      return;
    }
    await onUpdate(editingId, editForm);
    setEditingId(null);
    setEditForm(emptyForm);
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">서브관리자 권한 관리</h2>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4 space-y-3">
        <input
          className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold"
          placeholder="이름"
          value={createForm.name}
          onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
        />
        <input
          className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold"
          placeholder="핸드폰 뒷자리 4자리"
          value={createForm.phoneLast4}
          onChange={(e) => setCreateForm({ ...createForm, phoneLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
        />
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory('create', cat)}
              className={`px-3 py-2 rounded-full text-[11px] font-bold ${createForm.categories.includes(cat) ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button onClick={submitCreate} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold flex justify-center gap-2"><Plus size={16} />서브관리자 등록</button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {(subadmins || []).map((s) => {
          const isEditing = editingId === s.id;
          const form = isEditing ? editForm : s;
          return (
            <div key={s.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
              <input
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold"
                value={form.name || ''}
                disabled={!isEditing}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <input
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold"
                value={form.phoneLast4 || ''}
                disabled={!isEditing}
                onChange={(e) => setEditForm({ ...editForm, phoneLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => isEditing && toggleCategory('edit', cat)}
                    className={`px-3 py-2 rounded-full text-[11px] font-bold ${form.categories?.includes(cat) ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'} ${!isEditing ? 'opacity-60' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setEditingId(s.id);
                      setEditForm({ name: s.name || '', phoneLast4: s.phoneLast4 || '', categories: s.categories || [] });
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-white font-bold"
                  >수정</button>
                ) : (
                  <button onClick={submitUpdate} className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold flex justify-center gap-2"><Save size={16} />저장</button>
                )}
                <button onClick={() => onDelete(s.id)} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-bold"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSubadminManager;
