import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw, PenTool } from 'lucide-react';

const SignatureView = ({ onFinish, onBack }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  const startDrawing = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.nativeEvent.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.nativeEvent.clientY) - rect.top;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.nativeEvent.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.nativeEvent.clientY) - rect.top;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft size={24} /></button>
        <h2 className="text-xl font-bold flex-1 text-center pr-8 tracking-tight">전자 서명</h2>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="relative bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 overflow-hidden flex-1 shadow-inner">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={() => setIsDrawing(false)}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={() => setIsDrawing(false)}
            className="w-full h-full cursor-crosshair touch-none"
          />
          <div className="absolute top-6 left-6 pointer-events-none">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Sign Here</p>
          </div>
          <button
            onClick={() => canvasRef.current.getContext('2d').clearRect(0, 0, 400, 400)}
            className="absolute top-4 right-4 bg-white p-3 rounded-full text-slate-400 shadow-md transition-all active:scale-90"
          >
            <RotateCcw size={18} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 font-medium mt-4 mb-6">위 서명으로 본 점검 내용이 사실임을 확인합니다.</p>
      </div>

      <button
        onClick={() => onFinish(canvasRef.current.toDataURL('image/png'))}
        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all mb-4 flex items-center justify-center gap-2"
      >
        <PenTool size={18} /> 점검 완료 및 전송
      </button>
    </div>
  );
};

export default SignatureView;
