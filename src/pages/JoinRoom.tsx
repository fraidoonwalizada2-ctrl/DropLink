import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, ArrowRight, Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { QRScannerModal } from '@/components/qr/QRScannerModal';
import { isValidRoomCode } from '@/utils/validators';
import { useRoom } from '@/hooks/useRoom';

export const JoinRoom: React.FC = () => {
  const { roomId: urlRoomId } = useParams<{ roomId?: string }>();
  const [roomCode, setRoomCode] = useState(urlRoomId ? urlRoomId.toUpperCase() : '');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const navigate = useNavigate();

  const { joinExistingRoom, loading, error, errorType } = useRoom();

  // If room code comes from URL parameter (e.g. QR scan join link), auto-attempt join
  useEffect(() => {
    if (urlRoomId && isValidRoomCode(urlRoomId)) {
      handleJoinCode(urlRoomId);
    }
  }, [urlRoomId]);

  const handleJoinCode = async (codeToJoin: string) => {
    const cleanCode = codeToJoin.trim().toUpperCase();
    if (!cleanCode || !isValidRoomCode(cleanCode)) {
      return;
    }
    const joinedRoom = await joinExistingRoom(cleanCode);
    if (joinedRoom) {
      navigate(`/room/${cleanCode}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoinCode(roomCode);
  };

  const handleQRScanSuccess = (code: string) => {
    setRoomCode(code);
    handleJoinCode(code);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl space-y-8 text-center"
      >
        <div className="flex justify-center">
          <Badge variant="purple" icon={<QrCode className="w-3.5 h-3.5" />}>
            PAIRING DEVICE
          </Badge>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Join a Transfer Room
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Enter a 6-character room code or scan the QR code displayed on the host device.
          </p>
        </div>

        {/* Code Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">
              Room Code (6 Characters)
            </label>
            <input
              type="text"
              maxLength={6}
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
              }}
              placeholder="e.g. A7K9PX"
              className="w-full uppercase font-mono tracking-widest text-center text-2xl px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-extrabold shadow-inner"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error} {errorType ? `(${errorType})` : ''}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            disabled={!roomCode.trim() || roomCode.trim().length !== 6}
            className="w-full justify-center text-base py-3.5"
            icon={<ArrowRight className="w-5 h-5" />}
          >
            Join Room
          </Button>
        </form>

        {/* Divider */}
        <div className="relative py-2 max-w-md mx-auto">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-3 font-mono text-slate-400">
              OR SCAN QR CODE
            </span>
          </div>
        </div>

        {/* Scan QR Code Trigger */}
        <div className="max-w-md mx-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsScannerOpen(true)}
            className="w-full justify-center border-slate-300 dark:border-slate-700 hover:border-sky-500/50"
            icon={<Camera className="w-4 h-4 text-sky-500 dark:text-sky-400" />}
          >
            Scan QR Code
          </Button>
        </div>
      </motion.div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />
    </div>
  );
};
