import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import type { Device } from '@/types/device';
import { DeviceCard } from './DeviceCard';

interface DeviceListProps {
  devices: Device[];
  isWaitingForPeer?: boolean;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  isWaitingForPeer = true,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          CONNECTED DEVICES ({devices.length})
        </h3>
        <span className="text-xs text-slate-500 font-mono">Real-Time Channel</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}

        {isWaitingForPeer && (
          <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <Smartphone className="w-5 h-5 text-slate-400 dark:text-slate-500 animate-pulse" />
              </div>
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Waiting for 2nd Device...</span>
                <p className="text-xs text-slate-500 mt-0.5">Scan QR code or enter code</p>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          </div>
        )}
      </div>
    </div>
  );
};
