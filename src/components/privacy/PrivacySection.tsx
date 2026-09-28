import React from 'react';
import { Shield, UserX, Clock, ServerOff, Cpu, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export const PrivacySection: React.FC = () => {
  const privacyPillars = [
    {
      icon: <UserX className="w-6 h-6 text-sky-500 dark:text-sky-400" />,
      title: 'No Account Required',
      description: 'Zero registration, zero password, zero personal identifiers. Start transferring instantly without signing in.',
    },
    {
      icon: <Clock className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />,
      title: 'Temporary Rooms',
      description: 'Transfer sessions auto-expire after inactivity. No persistent tracking or server logs.',
    },
    {
      icon: <ServerOff className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />,
      title: 'No Cloud File Storage',
      description: 'The signaling server helps devices establish the connection but does not receive the file contents.',
    },
    {
      icon: <Cpu className="w-6 h-6 text-purple-500 dark:text-purple-400" />,
      title: 'Peer-to-Peer Architecture',
      description: 'Files are transferred directly between connected devices using WebRTC when a direct connection is possible.',
    },
  ];

  return (
    <section id="privacy" className="py-16 sm:py-24 relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-12">
        <div className="space-y-4">
          <Badge variant="purple" icon={<Shield className="w-3.5 h-3.5" />}>
            PRIVACY FIRST
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Your files stay yours.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Files are transferred directly between connected devices using WebRTC when a direct connection is possible. The signaling server helps devices establish the connection but does not receive the file contents.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {privacyPillars.map((pillar, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xl backdrop-blur-xl hover:border-sky-500/40 transition-colors flex items-start gap-4"
            >
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                {pillar.icon}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{pillar.title}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
