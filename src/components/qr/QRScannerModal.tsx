import React, { useState } from 'react';
import { Camera, QrCode, ArrowRight, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim().length === 6) {
      onScanSuccess(manualCode.trim().toUpperCase());
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan Room QR Code"
      description="Point your device camera at the DropLink QR code on another device screen."
    >
      <div className="space-y-6">
        {/* Camera Viewport Simulation Frame */}
        <div className="relative aspect-square w-full max-w-xs mx-auto rounded-2xl bg-slate-900 dark:bg-slate-950 border-2 border-dashed border-sky-500/50 flex flex-col items-center justify-center p-6 text-center overflow-hidden shadow-inner">
          {/* Corner Guides */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-sky-400" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-sky-400" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-sky-400" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-sky-400" />

          {/* Laser scanning animation bar */}
          {scanning && (
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-[0_0_15px_#38bdf8]" />
          )}

          <div className="p-4 rounded-full bg-sky-500/10 text-sky-400 mb-3 border border-sky-500/20">
            <Camera className="w-8 h-8" />
          </div>

          <h4 className="text-sm font-semibold text-slate-100">
            {scanning ? 'Requesting Camera Access...' : 'Camera Ready for Scanning'}
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Camera scanner is active. You can also enter the 6-character code manually below.
          </p>

          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setScanning(!scanning)}
            icon={<QrCode className="w-4 h-4 text-sky-400" />}
          >
            {scanning ? 'Pause Scanner' : 'Enable Camera'}
          </Button>
        </div>

        {/* Manual Code Fallback */}
        <form onSubmit={handleManualSubmit} className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Or enter 6-character room code manually:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7X9P2"
              className="flex-1 uppercase font-mono tracking-widest text-center text-lg px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-bold"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={manualCode.trim().length !== 6}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Join
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>Camera stream is processed entirely locally in your browser.</span>
        </div>
      </div>
    </Modal>
  );
};
