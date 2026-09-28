import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Clock,
  LogOut,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowLeft,
  Check,
  CheckCircle2,
  Wifi,
} from 'lucide-react';
import type { Room } from '@/types/room';
import { useRoom } from '@/hooks/useRoom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useTransfer } from '@/hooks/useTransfer';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { AlertBanner } from '@/components/common/AlertBanner';
import { QRCodeDisplay } from '@/components/qr/QRCodeDisplay';
import { DeviceList } from '@/components/device/DeviceList';
import { DropZone } from '@/components/transfer/DropZone';
import { TransferCard } from '@/components/transfer/TransferCard';
import { EmptyTransferState } from '@/components/transfer/EmptyTransferState';
import { Modal } from '@/components/common/Modal';
import { roomService } from '@/services/room.service';

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialRoom = (location.state as { room?: Room } | undefined)?.room || null;
  const cleanRoomId = (roomId || '').toUpperCase();

  const {
    room,
    loading,
    error,
    notification,
    joinExistingRoom,
    leaveCurrentRoom,
    closeCurrentRoom,
  } = useRoom(cleanRoomId, initialRoom);

  // WebRTC P2P Peer Connection hook
  const { p2pState, isP2PConnected } = useWebRTC(room);

  // Identify remote peer device
  const remotePeer = room?.connectedDevices?.find((d) => !d.isSelf) || null;

  // Real File Transfer Queue hook - accepts isP2PConnected to process queue immediately upon connection
  const { transfers, addFilesToTransfer, cancelTransfer, removeTransfer } = useTransfer(remotePeer, isP2PConnected);

  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Prevent browser from navigating away if a file is dropped outside the DropZone
  useEffect(() => {
    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDrag);
    window.addEventListener('drop', preventDrag);
    return () => {
      window.removeEventListener('dragover', preventDrag);
      window.removeEventListener('drop', preventDrag);
    };
  }, []);

  // Auto-join room on WebSocket backend if not yet joined
  useEffect(() => {
    if (cleanRoomId && cleanRoomId.length === 6 && !room && !loading && !error) {
      joinExistingRoom(cleanRoomId);
    }
  }, [cleanRoomId, room, loading, error, joinExistingRoom]);

  const handleLeaveOrClose = () => {
    if (room?.connectedDevices?.[0]?.isSelf) {
      closeCurrentRoom();
    } else {
      leaveCurrentRoom();
    }
    navigate('/');
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(cleanRoomId);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShareLink = async () => {
    const shareUrl = roomService.getRoomShareUrl(cleanRoomId);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DropLink Transfer Room',
          text: `Join my DropLink file transfer room: ${cleanRoomId}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedNotice(true);
        setTimeout(() => setCopiedNotice(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const isConnectedWithPeer = (room?.connectedDevices?.length || 0) >= 2;

  const renderP2PBadge = () => {
    if (isP2PConnected) {
      return (
        <Badge variant="emerald" icon={<Wifi className="w-3 h-3 text-emerald-500" />}>
          WebRTC: P2P Ready
        </Badge>
      );
    }
    if (p2pState === 'connecting') {
      return (
        <Badge variant="amber" icon={<Clock className="w-3 h-3 text-amber-500 animate-spin" />}>
          WebRTC: Connecting P2P...
        </Badge>
      );
    }
    if (p2pState === 'failed') {
      return (
        <Badge variant="slate" icon={<AlertTriangle className="w-3 h-3 text-red-500" />}>
          WebRTC: Connection Failed
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-4 sm:py-8">
      {/* Real-time Notification Banner */}
      {notification && (
        <AlertBanner
          type="info"
          title={notification.title}
          message={notification.message}
          className="mb-4 animate-bounce"
        />
      )}

      {/* Error state */}
      {error && (
        <AlertBanner
          type="error"
          title="Room Status Notice"
          message={error}
          actionHint="Return to Home to create or join another active room."
          className="mb-4"
        />
      )}

      {/* WebRTC Failure Warning */}
      {p2pState === 'failed' && (
        <AlertBanner
          type="warning"
          title="Direct P2P Connection Blocked"
          message="A direct WebRTC peer connection could not be established. This usually happens under restrictive corporate firewalls or symmetric NATs that require a TURN relay server."
          actionHint="Configure VITE_TURN_SERVER_URL in .env if testing across restrictive firewalls."
          className="mb-4"
        />
      )}

      {/* Main Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              DROP_LINK ROOM
            </span>

            {/* Room ID Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-mono font-bold text-lg">
              <span>{cleanRoomId}</span>
              <button
                onClick={handleCopyCode}
                className="p-1 rounded hover:bg-sky-500/20 text-sky-600 dark:text-sky-300 transition-colors"
                title="Copy Room Code"
              >
                {copiedNotice ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Device connection status badge */}
            {isConnectedWithPeer ? (
              <Badge variant="emerald" icon={<CheckCircle2 className="w-3 h-3" />}>
                2 Devices Connected
              </Badge>
            ) : (
              <Badge variant="amber" icon={<Clock className="w-3 h-3" />}>
                Waiting for device...
              </Badge>
            )}

            {/* WebRTC P2P status badge */}
            {renderP2PBadge()}
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {isP2PConnected
              ? 'Direct WebRTC peer connection established. Drop files below to transfer peer-to-peer.'
              : isConnectedWithPeer
              ? 'Devices connected via signaling. Negotiating direct WebRTC peer connection...'
              : `Share code ${cleanRoomId} or scan QR on your second device to connect.`}
          </p>
        </div>

        {/* Dashboard Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShareLink}
            icon={<Share2 className="w-4 h-4 text-sky-500 dark:text-sky-400" />}
          >
            {copiedNotice ? 'Link Copied!' : 'Share Room'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowQRModal(true)}
            icon={<Sparkles className="w-4 h-4 text-sky-500 dark:text-sky-400" />}
          >
            Show QR Code
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeaveOrClose}
            className="text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
            icon={<LogOut className="w-4 h-4" />}
          >
            Leave Room
          </Button>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side (QR Code & Device Connection UI) */}
        <div className="lg:col-span-5 space-y-6">
          <QRCodeDisplay
            roomId={cleanRoomId}
            onCloseRoom={handleLeaveOrClose}
          />

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl">
            <DeviceList
              devices={room?.connectedDevices || []}
              isWaitingForPeer={!isConnectedWithPeer}
            />
          </div>
        </div>

        {/* Right Side (Transfer Area & Queue) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                FILE TRANSFER ZONE
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {isP2PConnected ? 'RTCDataChannel: 64 KB Chunks' : 'P2P Transfer Pending'}
              </span>
            </div>

            <DropZone
              onFilesSelected={addFilesToTransfer}
              isP2PConnected={isP2PConnected}
              p2pState={p2pState}
            />
            {!isP2PConnected && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">
                {isConnectedWithPeer
                  ? 'P2P connecting: Files added now will queue and transfer automatically once connected.'
                  : 'Add files anytime. They will queue and transfer automatically once a peer connects.'}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                TRANSFERS ({transfers.length})
              </h3>
              {transfers.length > 0 && (
                <span className="text-xs text-slate-500 font-mono">
                  {transfers.filter((t) => t.status === 'completed').length} / {transfers.length} completed
                </span>
              )}
            </div>

            {transfers.length === 0 ? (
              <EmptyTransferState
                onShowQR={() => setShowQRModal(true)}
                hasConnectedPeer={isConnectedWithPeer}
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {transfers.map((tr) => (
                    <TransferCard
                      key={tr.id}
                      transfer={tr}
                      onCancel={tr.status === 'transferring' || tr.status === 'waiting' ? cancelTransfer : removeTransfer}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Room QR Code"
        description="Scan with phone camera or QR reader to connect instantly."
      >
        <QRCodeDisplay roomId={cleanRoomId} onCloseRoom={() => setShowQRModal(false)} />
      </Modal>
    </div>
  );
};
