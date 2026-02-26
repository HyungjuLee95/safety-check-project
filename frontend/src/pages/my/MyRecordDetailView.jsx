import React from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { normalizeToUiValue, statusLabel, badgeClassForValue, signatureSrc } from '../../utils/inspectionFormat';

const MyRecordDetailView = ({ detail, onBack, onEdit }) => {
  const latest = detail?.latestRevision;
  const answers = latest?.answers || [];
  const improveCount = answers.filter(a => a.normalized === 'IMPROVE' || normalizeToUiValue(a.value) === '점검필요').length;
  const sig = signatureSrc(latest?.signatureBase64);

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8 overflow-hidden text-slate-900">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">내 점검 상세</h2>
      </div>

      <div className="bg-slate-900 rounded-[2rem] p-7 text-white mb-4 relative overflow-hidden shadow-xl border-b-4 border-blue-500">
        <p className="text-[10px] text-blue-400 font-black mb-3 uppercase tracking-[0.2em]">{detail?.date}</p>
        <h3 className="text-2xl font-black tracking-tighter mb-1">{detail?.hospital}</h3>
        <p className="text-xs font-medium text-slate-300">{detail?.equipmentName || '장비명 없음'} · {detail?.workType}</p>
        <p className="text-[11px] font-bold text-slate-400 mt-3">상태: {statusLabel(detail?.status)} · 개선필요 {improveCount}건</p>

        {String(detail?.status || '').toUpperCase() === 'REJECTED' && !!detail?.rejectReason && (
          <div className="mt-3 rounded-xl bg-red-500/15 border border-red-300/40 p-3">
            <p className="text-[11px] font-black text-red-200">반려 사유</p>
            <p className="text-xs font-bold text-red-100 mt-1 whitespace-pre-line">{detail.rejectReason}</p>
          </div>
        )}

        <button
          onClick={onEdit}
          disabled={detail?.status === 'CANCELLED'}
          className="absolute right-5 top-5 bg-white/10 border border-white/10 px-3 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 active:scale-95 disabled:opacity-30"
        >
          <Edit2 size={14} /> 수정하기
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-12">
        {answers.map((res, i) => {
          const uiVal = normalizeToUiValue(res.value);
          const showComment = uiVal === '점검필요';
          return (
            <div key={i} className="p-5 bg-slate-50 rounded-[1.25rem] border border-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 pr-4">
                  <p className="text-[10px] font-black text-slate-300 mb-1">Q{i + 1}</p>
                  <p className="text-sm font-bold text-slate-700 leading-tight">{res.question}</p>
                  {showComment && (
                    <p className="mt-2 text-[12px] font-bold text-slate-500 whitespace-pre-line">
                      - {res.comment || '(내용 없음)'}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm ${badgeClassForValue(uiVal)}`}>
                  {uiVal}
                </span>
              </div>
            </div>
          );
        })}

        <div className="mt-8 p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
          <p className="text-[9px] font-black tracking-[0.3em] uppercase mb-4 text-slate-400">Electronic Signature</p>

          {sig ? (
            <div className="w-full flex justify-center">
              <img
                src={sig}
                alt="signature"
                className="max-h-40 w-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
              />
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center italic text-slate-300 font-serif">
              [No Signature]
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyRecordDetailView;
