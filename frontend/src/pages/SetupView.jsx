import React, { useState } from 'react';
import { ArrowLeft, MapPin, Settings, Calendar } from 'lucide-react';

const SetupView = ({ hospitals, workTypes, onNext, onBack }) => {
  const [hospital, setHospital] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [workType, setWorkType] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-3 -ml-3 text-slate-400 hover:text-slate-600"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold flex-1 text-center pr-6 tracking-tight">작업 정보 입력</h2>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto pr-1 pb-4">
        <section>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 px-1">
            <MapPin size={14} className="text-blue-500" /> 작업 장소
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {hospitals.map(h => (
              <button
                key={h}
                onClick={() => setHospital(h)}
                className={`p-4 rounded-2xl text-xs font-bold transition-all border ${hospital === h ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
              >
                {h}
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 px-1">
            <Settings size={14} className="text-blue-500" /> 장비명
          </label>
          <input
            type="text"
            value={equipmentName}
            onChange={e => setEquipmentName(e.target.value)}
            placeholder="장비명을 입력하세요 (예: CT-1호기)"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300 placeholder:font-normal"
          />
        </section>

        <section>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 px-1">
            <Settings size={14} className="text-blue-500" /> 작업 구분
          </label>
          <select
            value={workType}
            onChange={e => setWorkType(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
          >
            <option value="">선택해주세요</option>
            {workTypes.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </section>

        <section>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3 px-1">
            <Calendar size={14} className="text-blue-500" /> 점검 일자
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm"
          />
        </section>
      </div>

      <button
        onClick={() => onNext({ hospital, equipmentName, workType, date })}
        disabled={!hospital || !workType || !equipmentName.trim()}
        className="w-full py-4 rounded-2xl font-bold text-white bg-slate-900 shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-30 disabled:shadow-none transition-all mt-4"
      >
        체크리스트 생성하기
      </button>
    </div>
  );
};

export default SetupView;
