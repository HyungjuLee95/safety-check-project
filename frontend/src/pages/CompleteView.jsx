import React from 'react';
import { Check } from 'lucide-react';

const CompleteView = ({ onDone }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in zoom-in-95 duration-500">
    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-green-200 text-white animate-bounce">
      <Check strokeWidth={3} w-12 h-12 />
    </div>
    <h2 className="text-2xl font-black text-slate-800 mb-2">제출 완료!</h2>
    <p className="text-slate-400 mb-12 text-sm font-medium leading-relaxed">안전 점검 데이터가<br />서버로 안전하게 전송되었습니다.</p>
    <button onClick={onDone} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all hover:bg-slate-200">
      홈으로 돌아가기
    </button>
  </div>
);

export default CompleteView;
