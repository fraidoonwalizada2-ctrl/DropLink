import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, ShieldCheck, ArrowLeftRight } from 'lucide-react';

export const HeroConnectionVisual: React.FC = () => {
  return (
    <div className="relative w-full max-w-2xl mx-auto py-8 px-4">
      {/* Glow background container */}
      <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative flex items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-slate-100 shadow-2xl backdrop-blur-2xl">
        {/* Phone Device Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="flex flex-col items-center gap-2 p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl w-32 sm:w-40 text-center"
        >
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Smartphone className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-white">📱 Phone</span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Online
          </span>
        </motion.div>

        {/* Animated Connection Line & Badge */}
        <div className="flex-1 flex flex-col items-center justify-center relative px-2">
          {/* Top connection label */}
          <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/30 shadow-md mb-2 z-10 whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Connection</span>
          </div>

          {/* Line track */}
          <div className="relative w-full h-1 bg-slate-800 rounded-full overflow-hidden my-1">
            {/* Pulsing glow animation line */}
            <motion.div
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.5,
                ease: 'easeInOut',
              }}
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8]"
            />
          </div>

          {/* Transfer direction indicator */}
          <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] font-mono mt-1">
            <ArrowLeftRight className="w-3 h-3 text-sky-400" />
            <span>P2P DataChannel</span>
          </div>
        </div>

        {/* Computer Device Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="flex flex-col items-center gap-2 p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl w-32 sm:w-40 text-center"
        >
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Monitor className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-white">💻 Computer</span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Online
          </span>
        </motion.div>
      </div>
    </div>
  );
};
