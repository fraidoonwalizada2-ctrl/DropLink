import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Image,
  Film,
  FileArchive,
  Music,
  FileCode,
  File,
  X,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Download,
  Upload,
} from 'lucide-react';
import type { Transfer } from '@/types/transfer';
import { formatBytes, formatSpeed } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface TransferCardProps {
  transfer: Transfer;
  onCancel?: (id: string) => void;
  className?: string;
}

export const TransferCard: React.FC<TransferCardProps> = ({
  transfer,
  onCancel,
  className,
}) => {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6 text-sky-500 dark:text-sky-400" />;
    if (mimeType.startsWith('video/')) return <Film className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6 text-pink-500 dark:text-pink-400" />;
    if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document'))
      return <FileText className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar'))
      return <FileArchive className="w-6 h-6 text-purple-500 dark:text-purple-400" />;
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html'))
      return <FileCode className="w-6 h-6 text-amber-500 dark:text-amber-400" />;
    return <File className="w-6 h-6 text-slate-400" />;
  };

  const isSending = transfer.direction === 'sending';
  const isCompleted = transfer.status === 'completed';
  const isTransferring = transfer.status === 'transferring';
  const isCancelled = transfer.status === 'cancelled';
  const isFailed = transfer.status === 'failed';

  const getStatusBadge = () => {
    switch (transfer.status) {
      case 'idle':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Waiting for Peer
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            Waiting for P2P connection
          </span>
        );
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/30">
            <Clock className="w-3.5 h-3.5 text-sky-500 animate-spin" />
            Queued
          </span>
        );
      case 'transferring':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/30">
            {isSending ? (
              <Upload className="w-3.5 h-3.5 text-sky-500 animate-bounce" />
            ) : (
              <Download className="w-3.5 h-3.5 text-sky-500 animate-bounce" />
            )}
            {isSending ? 'Sending...' : 'Receiving...'}
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700">
            <Pause className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        'p-5 rounded-3xl border bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xl backdrop-blur-md relative overflow-hidden transition-all',
        isCompleted && 'border-emerald-500/30 dark:border-emerald-500/30',
        isFailed && 'border-red-500/30 dark:border-red-500/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* File Icon & Info */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shrink-0">
            {getFileIcon(transfer.file.type)}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate pr-2" title={transfer.file.name}>
                {transfer.file.name}
              </h4>
              {getStatusBadge()}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>{formatBytes(transfer.file.size)}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                {transfer.senderDevice.name}
                <ArrowRight className="w-3 h-3 text-slate-400" />
                {transfer.receiverDevice.name}
              </span>
            </div>

            {transfer.error && (
              <p className="text-xs text-red-500 font-medium mt-1">
                {transfer.error}
              </p>
            )}
          </div>
        </div>

        {/* Action Button: Download if receiver & completed, Cancel if active, or Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          {!isSending && isCompleted && transfer.downloadUrl && (
            <a
              href={transfer.downloadUrl}
              download={transfer.file.name}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          )}

          {onCancel && (
            <button
              onClick={() => onCancel(transfer.id)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title={isTransferring ? 'Cancel Transfer' : 'Dismiss'}
              aria-label={isTransferring ? 'Cancel transfer' : 'Dismiss'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Real Speed Section */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>
            {transfer.progress}% ({formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.file.size)})
          </span>
          <span>
            {isTransferring && transfer.transferSpeed > 0
              ? formatSpeed(transfer.transferSpeed)
              : isCompleted
              ? 'Complete'
              : isCancelled
              ? 'Cancelled'
              : isFailed
              ? 'Error'
              : transfer.status === 'connecting'
              ? 'Waiting for P2P...'
              : transfer.status === 'idle'
              ? 'Waiting for peer'
              : transfer.status === 'waiting'
              ? 'Queued'
              : '-- MB/s'}
          </span>
        </div>

        {/* Real Progress Track */}
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700/50">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-200',
              isCompleted
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : isFailed
                ? 'bg-red-500'
                : isCancelled
                ? 'bg-slate-400'
                : 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500'
            )}
            style={{ width: `${transfer.progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
};
