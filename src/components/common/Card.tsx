import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glow = false,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'relative rounded-2xl p-6 transition-all duration-300 backdrop-blur-xl',
        'bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80',
        'shadow-xl shadow-slate-900/5 dark:shadow-black/40',
        glow && 'glow-cyan',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
