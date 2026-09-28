import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, QrCode, Smartphone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { roomService } from '@/services/room.service';

interface QRCodeDisplayProps {
  roomId: string;
  onCloseRoom?: () => void;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  roomId,
  onCloseRoom,
  className,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = roomService.getRoomShareUrl(roomId);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DropLink Transfer Room',
          text: `Join my DropLink file transfer room: ${roomId}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share dialog
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className={`flex flex-col items-center p-6 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-xl ${className}`}>
      {/* Title Header */}
      <div className="flex items-center gap-2 mb-2">
        <QrCode className="w-5 h-5 text-sky-600 dark:text-sky-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          YOUR TRANSFER ROOM
        </span>
      </div>

      {/* Code Display Badge */}
      <div className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-sky-600 dark:text-sky-400 my-2 px-6 py-2 rounded-2xl bg-sky-500/10 border border-sky-500/30">
        {roomId}
      </div>

      {/* High Definition QR Code Container */}
      <div className="relative my-4 p-4 rounded-2xl bg-white shadow-xl shadow-sky-500/10 flex items-center justify-center border-4 border-sky-500/20 group">
        <QRCodeSVG
          value={shareUrl}
          size={210}
          level="H"
          includeMargin={true}
          imageSettings={{
            src: '/favicon.ico',
            x: undefined,
            y: undefined,
            height: 32,
            width: 32,
            excavate: true,
          }}
        />
        <div className="absolute inset-0 rounded-2xl border-2 border-sky-500/40 pointer-events-none group-hover:border-sky-400 transition-colors" />
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 text-center mb-6 max-w-xs flex items-center justify-center gap-1.5">
        <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
        Scan this QR code with your phone camera or another device.
      </p>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopyCode}
          icon={copiedCode ? <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
        >
          {copiedCode ? 'Code Copied!' : 'Copy Code'}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleShare}
          icon={<Share2 className="w-4 h-4 text-sky-500 dark:text-sky-400" />}
        >
          {copiedLink ? 'Link Copied!' : 'Share Room'}
        </Button>

        {onCloseRoom && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseRoom}
            className="text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
          >
            Close Room
          </Button>
        )}
      </div>

      {/* Shareable Link Bar */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 w-full text-center">
        <span className="text-[11px] text-slate-500 dark:text-slate-500 font-mono flex items-center justify-center gap-1 truncate px-2">
          <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="truncate">{shareUrl}</span>
        </span>
      </div>
    </div>
  );
};
