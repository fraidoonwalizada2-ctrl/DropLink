import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, ShieldCheck, Smartphone, Info, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useRoom } from '@/hooks/useRoom';

export const CreateRoom: React.FC = () => {
  const navigate = useNavigate();
  const { createNewRoom, loading, error, errorType } = useRoom();

  const handleCreateRoom = async () => {
    const createdRoom = await createNewRoom();
    if (createdRoom) {
      navigate(`/room/${createdRoom.id}`, { state: { room: createdRoom } });
    }
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
          <Badge variant="cyan" icon={<Sparkles className="w-3.5 h-3.5" />}>
            REAL-TIME TRANSFER SESSION
          </Badge>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create Transfer Room
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Create a temporary room and connect another device.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-200 block">Instant QR Pairing</span>
              <span className="text-slate-500 dark:text-slate-400">Scan code with any mobile camera</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-200 block">Zero Registration</span>
              <span className="text-slate-500 dark:text-slate-400">No account or setup required</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error} {errorType ? `(${errorType})` : ''}</span>
          </div>
        )}

        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            isLoading={loading}
            onClick={handleCreateRoom}
            className="w-full sm:w-auto min-w-[260px] py-4 text-base justify-center shadow-xl shadow-sky-500/20"
            icon={<PlusCircle className="w-5 h-5" />}
          >
            Create Room
          </Button>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-500 flex items-center justify-center gap-1.5">
          <Info className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
          <span>Creates a real temporary room on the Node.js signaling server.</span>
        </div>
      </motion.div>
    </div>
  );
};
