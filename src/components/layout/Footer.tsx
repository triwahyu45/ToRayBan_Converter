'use client';

import React from 'react';
import { Github, ShieldCheck, Sparkles, Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#050608]/90 backdrop-blur-xl mt-auto py-8 text-xs text-slate-400 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Section: Technical Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-white/5">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">100% Client-Side Privacy</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All video and image transcoding occurs in-browser via WebAssembly. Zero files are uploaded to any server.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Layers className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">1376&times;1840 Ray-Ban Meta Standard</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Formats media to exact Luxottica Gen 2 specs with smart center fill, custom crop, or ambient pillarbox.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Instagram Spin View Ready</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Reconstructs QuickTime <code className="text-violet-300">udta/meta/ilst</code> atom trees and EXIF TIFF tags.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright & Repository Attribution */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span className="font-medium text-slate-300">ToRayBan_Converter</span>
            <span className="hidden sm:inline text-slate-600">&bull;</span>
            <span>Client-Side Meta Smart Glasses Media Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://triwahyu45.github.io/ToRayBan_Converter/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none focus:underline font-medium"
            >
              <span>🌐 Live Web</span>
            </a>
            <span className="text-slate-600">&bull;</span>
            <a
              href="https://github.com/triwahyu45/ToRayBan_Converter"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none focus:underline"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Repository</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
