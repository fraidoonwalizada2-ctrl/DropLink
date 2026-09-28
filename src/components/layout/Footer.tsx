import React from 'react';
import { Link } from 'react-router-dom';
import { Share2, Shield, Globe, Lock, Cpu } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/60 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
                <Share2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                {APP_NAME}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium max-w-sm">
              {APP_TAGLINE}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed max-w-md">
              Direct device-to-device browser transfers without cloud storage, account registration, cables, or third-party messaging apps.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <Globe className="w-3 h-3 text-sky-500" /> WebRTC Architecture
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <Lock className="w-3 h-3 text-emerald-500" /> Zero Storage
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <Cpu className="w-3 h-3 text-purple-500" /> PWA Ready
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Quick Actions
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/create" className="hover:text-sky-500 transition-colors">
                  Create Transfer Room
                </Link>
              </li>
              <li>
                <Link to="/join" className="hover:text-sky-500 transition-colors">
                  Join with Room Code
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-sky-500 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-sky-500 transition-colors">
                  Privacy Guarantees
                </a>
              </li>
            </ul>
          </div>

          {/* Technology & Architecture */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Architecture & Stack
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 font-mono text-xs">
              <li>React + TypeScript</li>
              <li>Tailwind CSS + Framer Motion</li>
              <li>Vite + Modular Services</li>
              <li>WebSocket & WebRTC Mesh</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} DropLink. Built with clean modular architecture.
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>DropLink Real-Time P2P Room System</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
