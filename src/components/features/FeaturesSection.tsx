import React from 'react';
import { Gauge, UserX, QrCode, Lock, Laptop, Sparkles } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Gauge className="w-6 h-6 text-sky-500 dark:text-sky-400" />,
      title: 'Fast Transfer',
      description: 'Move files between devices quickly using direct browser connections.',
    },
    {
      icon: <UserX className="w-6 h-6 text-sky-500 dark:text-sky-400" />,
      title: 'No Account',
      description: 'Start immediately. No email required, no passwords to remember.',
    },
    {
      icon: <QrCode className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />,
      title: 'QR Connection',
      description: 'Connect devices easily by pointing your mobile camera at the room QR code.',
    },
    {
      icon: <Lock className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />,
      title: 'Private Rooms',
      description: 'Temporary transfer sessions automatically clean up when you leave.',
    },
    {
      icon: <Laptop className="w-6 h-6 text-purple-500 dark:text-purple-400" />,
      title: 'Cross Platform',
      description: 'Works effortlessly across Phone, tablet and computer browsers.',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-pink-500 dark:text-pink-400" />,
      title: 'Simple',
      description: 'No unnecessary setup, no plugins, no desktop applications.',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-slate-100/50 dark:bg-slate-950/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-12">
        <div className="space-y-4">
          <Badge variant="emerald">BUILT FOR SPEED & SIMPLICITY</Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Designed for Instant Transfers
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            Everything you need to share files between devices, with nothing getting in your way.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 shadow-lg backdrop-blur-xl hover:border-sky-500/40 transition-colors space-y-3"
            >
              <div className="p-3 w-fit rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
