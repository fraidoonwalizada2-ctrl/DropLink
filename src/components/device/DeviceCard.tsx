import React from 'react';
import { Smartphone, Monitor, Tablet, HelpCircle, CheckCircle2, WifiOff, Clock } from 'lucide-react';
import type { Device } from '@/types/device';
import { cn } from '@/lib/utils';

interface DeviceCardProps {
  device: Device;
  className?: string;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, className }) => {
  const getDeviceIcon = () => {
    switch (device.type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-sky-500 dark:text-sky-400" />;
      case 'desktop':
        return <Monitor className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-purple-500 dark:text-purple-400" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const statusConfig = {
    connected: {
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
      label: 'Online',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />,
    },
    connecting: {
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse',
      dot: 'bg-amber-500 dark:bg-amber-400',
      label: 'Connecting...',
      icon: <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-spin" />,
    },
    disconnected: {
      color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
      dot: 'bg-slate-400 dark:bg-slate-500',
      label: 'Waiting for device',
      icon: <WifiOff className="w-3.5 h-3.5 text-slate-400" />,
    },
    failed: {
      color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
      dot: 'bg-red-500 dark:bg-red-400',
      label: 'Failed',
      icon: <WifiOff className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />,
    },
    reconnecting: {
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      dot: 'bg-blue-500 dark:bg-blue-400',
      label: 'Reconnecting...',
      icon: <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />,
    },
  };

  const status = statusConfig[device.status] || statusConfig.disconnected;

  return (
    <div
      className={cn(
        'relative flex items-center justify-between p-4 rounded-2xl border transition-all backdrop-blur-md',
        'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-md',
        device.isSelf && 'ring-1 ring-sky-500/40 bg-sky-50/50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800/50',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-inner">
          {getDeviceIcon()}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{device.name}</span>
            {device.isSelf && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-bold">
                This Device
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>{device.os.toUpperCase()}</span>
            <span>•</span>
            <span>{device.browser.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Connection Status Badge */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
          status.color
        )}
      >
        <span className={cn('w-2 h-2 rounded-full', status.dot)} />
        <span>{status.label}</span>
      </div>
    </div>
  );
};
