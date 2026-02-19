import React, { useState } from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';

const LoginView = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');

  const canSubmit = name.trim() && phoneLast4.length === 4;

  return (
    <div className="flex flex-col h-full justify-center px-4 animate-in fade-in duration-700">
      <div className="text-center mb-10">
        <div className="inline-flex bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-[2rem] shadow-xl shadow-blue-200 mb-6">
          <ShieldCheck className="text-white w-12 h-12" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-black tracking-tighter text-slate-800 leading-tight">안전 점검 시스템</h1>
        <p className="text-slate-400 text-sm mt-2 font-medium tracking-tight">이름 + 휴대폰 뒷번호 4자리로 로그인</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Name</label>
          <input
            type="text"
            placeholder="성함을 입력하세요 (예: 홍길동)"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-center font-bold text-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:font-normal"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Phone Last 4</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="휴대폰 뒷번호 4자리"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-center font-bold text-lg tracking-[0.4em] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:font-normal"
            value={phoneLast4}
            onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={e => e.key === 'Enter' && canSubmit && onLogin(name, phoneLast4)}
          />
        </div>

        <button
          onClick={() => onLogin(name, phoneLast4)}
          disabled={!canSubmit}
          className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          접속하기 <ChevronRight size={20} className="opacity-50" />
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-300 font-bold mt-8">SAFETY FIRST • ZERO ACCIDENT</p>
    </div>
  );
};

export default LoginView;
