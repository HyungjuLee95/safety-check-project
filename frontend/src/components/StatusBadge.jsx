import React from 'react';

function toImgSrc(signatureBase64) {
  if (!signatureBase64) return null;
  const s = String(signatureBase64);
  if (s.startsWith('data:image/')) return s;
  // 혹시 서버가 순수 base64만 주는 경우 대비
  return `data:image/png;base64,${s}`;
}

export default function SignatureImageBox({ signatureBase64 }) {
  const src = toImgSrc(signatureBase64);

  return (
    <div className="mt-8 p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
      <p className="text-[9px] font-black tracking-[0.3em] uppercase mb-4 text-slate-400">
        Electronic Signature
      </p>

      {src ? (
        <div className="w-full flex justify-center">
          <img
            src={src}
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
  );
}
