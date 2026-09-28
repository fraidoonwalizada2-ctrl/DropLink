import React from 'react';
import { Smartphone, QrCode, WifiOff, FileUp } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface EmptyTransferStateProps {
  onShowQR?: () => void;
  hasConnectedPeer?: boolean;
  className?: string;
}

export const EmptyTransferState: React.FC<EmptyTransferStateProps> = ({
  onShowQR,
  hasConnectedPeer = false,
  className,
}) => {
  return (
    <div
      className={`p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-4 backdrop-blur-xl ${className || ''}`}
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
          {hasConnectedPeer ? (
            <FileUp className="w-8 h-8 text-sky-500" />
          ) : (
            <WifiOff className="w-8 h-8 text-amber-400" />
          )}
        </div>
        {!hasConnectedPeer && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg">
            <Smartphone className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {hasConnectedPeer ? 'No transfers yet' : 'No device connected'}
        </h4>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {hasConnectedPeer
            ? 'Drop files above or click Choose Files to transfer directly to the connected device.'
            : (
              <>
                Open <span className="font-semibold text-sky-500 dark:text-sky-400">DropLink</span> on another device (phone, tablet or computer) and scan this room's QR code.
              </>
            )}
        </p>
      </div>

      {!hasConnectedPeer && onShowQR && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onShowQR}
          icon={<QrCode className="w-4 h-4 text-sky-500 dark:text-sky-400" />}
        >
          View Room QR Code
        </Button>
      )}
    </div>
  );
};
