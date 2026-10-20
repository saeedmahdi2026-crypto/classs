import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-800/60 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-400">
          English Masterclass
        </span>
        <span className="text-slate-500">
          © {new Date().getFullYear()} All rights reserved.
        </span>
      </div>
    </footer>
  );
};
