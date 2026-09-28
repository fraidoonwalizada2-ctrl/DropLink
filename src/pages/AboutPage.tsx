import React from 'react';
import { motion } from 'framer-motion';
import { Share2, Shield, Globe, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-16 px-4 space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex justify-center">
          <Badge variant="cyan" icon={<Share2 className="w-3.5 h-3.5" />}>
            ABOUT THE ARCHITECTURE
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {APP_NAME}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 font-medium max-w-xl mx-auto">
          {APP_TAGLINE}
        </p>
      </motion.div>

      <div className="p-8 sm:p-10 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl space-y-8">
        <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            Product Mission
          </h3>
          <p>
            DropLink solves the everyday friction of moving files between a mobile phone and computer. Traditional methods force users to send files to themselves via WhatsApp, Telegram, or Gmail, install bulky desktop clients, or look for USB cables.
          </p>
          <p>
            DropLink turns any web browser into a high-speed file transfer terminal with zero account setup, zero cloud storage footprint, and zero app installations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Globe className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              WebRTC Peer Mesh
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Files travel directly over WebRTC RTCDataChannels without touching cloud disk storage.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Shield className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              Zero Storage Philosophy
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Temporary rooms clean up automatically after transfers complete or devices disconnect.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Architecture Specs
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> React 19 + TypeScript
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tailwind CSS + Framer Motion
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Modular Services Architecture
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Progressive Web App Ready
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
