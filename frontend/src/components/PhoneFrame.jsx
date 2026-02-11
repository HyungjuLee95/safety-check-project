import React from 'react';

export default function PhoneFrame({ children }) {
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 p-2 font-sans text-slate-900 overflow-hidden">
      <div className="w-full max-w-[430px] bg-white shadow-2xl overflow-hidden relative h-[90vh] sm:h-[812px] flex flex-col rounded-[2.5rem] border-[6px] border-slate-900 ring-4 ring-slate-200">
        {/* 상단 상태 표시줄 */}
        <div className="h-8 bg-white flex justify-between items-center px-8 pt-4 flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-400 font-mono tracking-tighter">
            SAFETY OS v1.0
          </span>
          <div className="flex gap-1.5">
            <div className="w-3 h-1.5 bg-slate-200 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col relative bg-white">
          {children}
        </div>

        {/* 하단 홈 인디케이터 */}
        <div className="h-6 flex justify-center items-center pb-1 flex-shrink-0 bg-white">
          <div className="w-24 h-1 bg-slate-100 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
