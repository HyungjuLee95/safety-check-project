import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

// YES/NO 레거시 대응
function normalizeToUiValue(value) {
  if (!value) return value;
  const v = String(value).trim();
  if (v.toUpperCase() === 'YES') return '양호';
  if (v.toUpperCase() === 'NO') return '점검필요';
  return v;
}

function badgeClassForValue(val) {
  const v = normalizeToUiValue(val);
  if (v === '양호') return 'bg-green-500 text-white';
  if (v === '점검필요') return 'bg-red-500 text-white';
  return 'bg-slate-400 text-white'; // 보통
}

function signatureSrc(signatureBase64) {
  if (!signatureBase64) return null;
  const s = String(signatureBase64);
  if (s.startsWith('data:image/')) return s;
  return `data:image/png;base64,${s}`;
}

const AdminRecordDetailView = ({ user, record, onBack, onApprove, onReject }) => {
  const workerSig = signatureSrc(record?.signatureBase64);
  const subSig = signatureSrc(record?.subadminSignatureBase64); // 백엔드가 이 필드를 내려줘야 실제 표시됨

  const normalizedRole = String(user?.role || '').trim().toUpperCase();
  const isSubadmin = normalizedRole === 'SUBADMIN' || normalizedRole === 'SUB_ADMIN';
  const isPending = String(record?.status || '').toUpperCase() === 'PENDING';

  // --- 서명 모달(승인용) ---
  const [openSign, setOpenSign] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const lastPointRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!openSign) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  }, [openSign]);

  const getXY = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const isTouch = !!e.touches?.[0];
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    // CSS로 축소/확대한 캔버스에서도 포인터 좌표를 실제 캔버스 픽셀 좌표로 보정
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const { x, y } = getXY(e);
    lastPointRef.current = { x, y };
    setIsDrawing(true);
  };

  const moveDraw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    const { x, y } = getXY(e);
    const { x: lx, y: ly } = lastPointRef.current;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPointRef.current = { x, y };
  };

  const endDraw = (e) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const approveWithSignature = async () => {
    const c = canvasRef.current;
    if (!c) return;

    // 간단 검증: 완전 흰색이면 서명 없다고 판단(대충)
    // (좀 더 정확한 검증은 픽셀 검사 가능하지만 지금은 가볍게)
    const dataUrl = c.toDataURL('image/png');
    if (!dataUrl || dataUrl.length < 200) {
      alert('서명을 입력해주세요.');
      return;
    }

    if (!onApprove) {
      alert('승인 핸들러가 연결되어 있지 않습니다(App.jsx에서 onApprove 전달 필요)');
      return;
    }

    await onApprove({
      inspectionId: record?.id,
      subadminName: user?.name,
      signatureBase64: dataUrl,
    });

    setOpenSign(false);
  };

  const rejectWithReason = async () => {
    if (!onReject) {
      alert('반려 핸들러가 연결되어 있지 않습니다(App.jsx에서 onReject 전달 필요)');
      return;
    }
    const reason = window.prompt('반려 사유를 입력해주세요(서명 불필요)', '') ?? '';
    await onReject({
      inspectionId: record?.id,
      subadminName: user?.name,
      reason,
    });
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8 overflow-hidden text-slate-900">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">상세 점검 내역</h2>
      </div>

      <div className="bg-slate-900 rounded-[2rem] p-8 text-white mb-6 relative overflow-hidden shadow-xl border-b-4 border-blue-500">
        <p className="text-[10px] text-blue-400 font-black mb-4 uppercase tracking-[0.2em]">
          {record?.date}
        </p>
        <h3 className="text-3xl font-black italic tracking-tighter mb-1">{record?.name}</h3>
        <p className="text-xs font-medium text-slate-400 opacity-80">
          {record?.hospital}
          {record?.equipmentName ? ` · ${record?.equipmentName}` : ''}
          {' · '}
          {record?.workType}
        </p>
        {record?.status && (
          <p className="text-[11px] font-bold text-slate-400 mt-3">상태: {record.status}</p>
        )}

        {/* SUBADMIN 승인/반려 */}
        {isSubadmin && isPending && (
          <div className="mt-5 flex gap-2">
            <button
              onClick={rejectWithReason}
              className="flex-1 py-3 rounded-xl font-black text-xs bg-red-500 text-white active:scale-95"
            >
              반려
            </button>
            <button
              onClick={() => setOpenSign(true)}
              className="flex-1 py-3 rounded-xl font-black text-xs bg-green-500 text-white active:scale-95"
            >
              승인(서명)
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-12">
        {(record?.results || []).map((res, i) => {
          const uiVal = normalizeToUiValue(res.value);
          return (
            <div
              key={i}
              className="p-5 bg-slate-50 rounded-[1.25rem] flex items-center justify-between border border-white shadow-sm"
            >
              <div className="flex-1 pr-4">
                <p className="text-[10px] font-black text-slate-300 mb-1">Q{i + 1}</p>
                <p className="text-sm font-bold text-slate-700 leading-tight">{res.question}</p>

                {normalizeToUiValue(res.value) === '점검필요' && res.comment && (
                  <p className="mt-2 text-[12px] font-bold text-slate-500 whitespace-pre-line">
                    - {res.comment}
                  </p>
                )}
              </div>

              <span
                className={`text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm ${badgeClassForValue(uiVal)}`}
              >
                {uiVal}
              </span>
            </div>
          );
        })}

        {/* Signature 2-column */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {/* Subadmin */}
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-center">
            <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-2 text-slate-400">
              SUB ADMIN
            </p>
            <p className="text-[10px] font-black text-slate-600 mb-3">
              {record?.subadminName || '—'}
            </p>

            {subSig ? (
              <div className="w-full h-24 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <img
                  src={subSig}
                  alt="subadmin signature"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center italic text-slate-300 font-serif">
                [No Signature]
              </div>
            )}
          </div>

          {/* Worker */}
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-center">
            <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-2 text-slate-400">
              WORKER
            </p>
            <p className="text-[10px] font-black text-slate-600 mb-3">
              {record?.userName || record?.name || '—'}
            </p>

            {workerSig ? (
              <div className="w-full h-24 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <img
                  src={workerSig}
                  alt="worker signature"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center italic text-slate-300 font-serif">
                [No Signature]
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 승인 서명 모달 */}
      {openSign && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="w-full max-w-md bg-white rounded-t-[2rem] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-slate-800">승인 서명</p>
                <p className="text-[10px] font-bold text-slate-400">서명 후 “승인 완료” 처리됩니다.</p>
              </div>
              <button
                className="text-slate-400 font-black text-sm"
                onClick={() => setOpenSign(false)}
              >
                닫기
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <canvas
                ref={canvasRef}
                width={320}
                height={180}
                className="w-full rounded-xl bg-white border border-slate-200 touch-none"
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={moveDraw}
                onTouchEnd={endDraw}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={clearCanvas}
                  className="flex-1 py-3 rounded-xl font-black text-xs bg-slate-100 text-slate-700 active:scale-95"
                >
                  지우기
                </button>
                <button
                  onClick={approveWithSignature}
                  className="flex-1 py-3 rounded-xl font-black text-xs bg-green-600 text-white active:scale-95"
                >
                  승인 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRecordDetailView;
