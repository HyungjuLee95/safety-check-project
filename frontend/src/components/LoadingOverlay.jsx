import React from 'react';

export default function LoadingOverlay({ show }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
}
