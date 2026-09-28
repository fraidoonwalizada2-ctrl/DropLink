import React from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, QrCode, FileCheck, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Create a room',
      description: 'Click "Create Room" to generate a temporary, private transfer session code and QR.',
      icon: <PlusCircle className="w-8 h-8 text-sky-400" />,
      badge: 'Step One',
    },
    {
      number: '02',
      title: 'Connect your device',
      description: 'Scan the QR code with your phone or enter the 6-character code on your secondary device.',
      icon: <QrCode className="w-8 h-8 text-indigo-400" />,
      badge: 'Step Two',
    },
    {
      number: '03',
      title: 'Drop and transfer',
      description: 'Drag and drop photos, documents, or videos directly between your paired devices.',
      icon: <FileCheck className="w-8 h-8 text-emerald-400" />,
      badge: 'Step Three',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-12">
        <div className="space-y-4">
          <Badge variant="cyan">SIMPLE WORKFLOW</Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            How DropLink Works
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            Transferring files across your devices takes less than 5 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.4 }}
              className="relative p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-xl backdrop-blur-xl flex flex-col items-center text-center group hover:border-sky-500/50 transition-all"
            >
              {/* Step Number Badge */}
              <div className="absolute top-4 right-4 text-xs font-mono font-bold text-slate-400 dark:text-slate-600 tracking-widest">
                {step.number}
              </div>

              {/* Step Icon */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 mb-6 group-hover:scale-110 transition-transform">
                {step.icon}
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>

              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-600">
                  <ArrowRight className="w-6 h-6" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
