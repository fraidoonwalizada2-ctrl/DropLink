import { useState, useCallback, useEffect, useRef } from 'react';
import type { Transfer, FileMetadata, DataChannelMetaMessage } from '@/types/transfer';
import type { Device } from '@/types/device';
import { getLocalDeviceInfo } from '@/utils/deviceInfo';
import { webRTCService } from '@/services/webrtc.service';

export function useTransfer(
  connectedPeerDevice?: Device | null,
  isP2PConnected: boolean = false
) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const isSendingActiveRef = useRef(false);
  const localDevice = getLocalDeviceInfo();

  // Listen to incoming file events from WebRTC DataChannel
  useEffect(() => {
    const handleFileStart = ({ meta }: { meta: DataChannelMetaMessage }) => {
      const incomingTransfer: Transfer = {
        id: meta.transferId,
        file: {
          id: 'file_' + meta.transferId,
          name: meta.name,
          size: meta.size,
          type: meta.mimeType,
          totalChunks: meta.totalChunks,
          chunkSize: meta.chunkSize,
          checksum: meta.checksum,
        },
        senderDevice: connectedPeerDevice || {
          id: 'remote_peer',
          name: 'Remote Device',
          type: 'unknown',
          os: 'unknown',
          browser: 'unknown',
          isSelf: false,
          status: 'connected',
          joinedAt: Date.now(),
        },
        receiverDevice: localDevice,
        direction: 'receiving',
        status: 'transferring',
        progress: 0,
        bytesTransferred: 0,
        transferSpeed: 0,
        startedAt: Date.now(),
      };

      setTransfers((prev) => [incomingTransfer, ...prev]);
    };

    const handleFileProgress = ({
      transferId,
      bytesTransferred,
      progress,
      speed,
    }: {
      transferId: string;
      bytesTransferred: number;
      progress: number;
      speed: number;
    }) => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? {
                ...t,
                bytesTransferred,
                progress,
                transferSpeed: speed,
                status: 'transferring',
              }
            : t
        )
      );
    };

    const handleFileCompleted = ({
      transferId,
      blob,
      downloadUrl,
    }: {
      transferId: string;
      blob: Blob;
      downloadUrl: string;
    }) => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? {
                ...t,
                status: 'completed',
                progress: 100,
                bytesTransferred: t.file.size,
                transferSpeed: 0,
                completedAt: Date.now(),
                blob,
                downloadUrl,
              }
            : t
        )
      );
    };

    const handleFileIntegrityFailed = ({ transferId }: { transferId: string }) => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? {
                ...t,
                status: 'failed',
                error: 'Transfer failed: file integrity check failed.',
                transferSpeed: 0,
              }
            : t
        )
      );
    };

    const handleFileCancelled = ({ transferId }: { transferId: string }) => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? {
                ...t,
                status: 'cancelled',
                transferSpeed: 0,
              }
            : t
        )
      );
    };

    webRTCService.on('file-start', handleFileStart);
    webRTCService.on('file-progress', handleFileProgress);
    webRTCService.on('file-completed', handleFileCompleted);
    webRTCService.on('file-integrity-failed', handleFileIntegrityFailed);
    webRTCService.on('file-cancelled', handleFileCancelled);

    return () => {
      webRTCService.off('file-start', handleFileStart);
      webRTCService.off('file-progress', handleFileProgress);
      webRTCService.off('file-completed', handleFileCompleted);
      webRTCService.off('file-integrity-failed', handleFileIntegrityFailed);
      webRTCService.off('file-cancelled', handleFileCancelled);
    };
  }, [connectedPeerDevice, localDevice]);

  // When P2P connects, promote any staged 'idle' or 'connecting' transfers to 'waiting'
  useEffect(() => {
    if (isP2PConnected) {
      setTransfers((prev) =>
        prev.map((t) => {
          if (
            t.direction === 'sending' &&
            (t.status === 'idle' || t.status === 'connecting')
          ) {
            return {
              ...t,
              status: 'waiting',
              receiverDevice: connectedPeerDevice || t.receiverDevice,
            };
          }
          return t;
        })
      );
    }
  }, [isP2PConnected, connectedPeerDevice]);

  // Process outgoing file queue sequentially
  useEffect(() => {
    const processQueue = async () => {
      if (isSendingActiveRef.current) return;
      if (!isP2PConnected && !webRTCService.isP2PConnected()) return;

      const nextPendingTransfer = transfers.find(
        (t) =>
          t.direction === 'sending' &&
          (t.status === 'idle' || t.status === 'waiting' || t.status === 'connecting') &&
          t.rawFile
      );

      if (!nextPendingTransfer || !nextPendingTransfer.rawFile) return;

      isSendingActiveRef.current = true;
      const transferId = nextPendingTransfer.id;
      const file = nextPendingTransfer.rawFile;

      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? { ...t, status: 'transferring', startedAt: Date.now() }
            : t
        )
      );

      const result = await webRTCService.sendFile(
        transferId,
        file,
        (bytesSent, totalBytes, speed) => {
          const progress = Math.min(100, Math.round((bytesSent / totalBytes) * 100));
          setTransfers((prev) =>
            prev.map((t) =>
              t.id === transferId
                ? {
                    ...t,
                    bytesTransferred: bytesSent,
                    progress,
                    transferSpeed: speed,
                  }
                : t
            )
          );
        }
      );

      if (result.success) {
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === transferId
              ? {
                  ...t,
                  status: 'completed',
                  progress: 100,
                  bytesTransferred: file.size,
                  transferSpeed: 0,
                  completedAt: Date.now(),
                }
              : t
          )
        );
      } else {
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === transferId
              ? {
                  ...t,
                  status: t.status === 'cancelled' ? 'cancelled' : 'failed',
                  error: result.error || 'Transfer failed.',
                  transferSpeed: 0,
                }
              : t
          )
        );
      }

      isSendingActiveRef.current = false;
    };

    processQueue();
  }, [transfers, isP2PConnected]);

  const addFilesToTransfer = useCallback(
    (files: File[]) => {
      const isConnected = isP2PConnected || webRTCService.isP2PConnected();

      let initialStatus: Transfer['status'] = 'idle';
      if (isConnected) {
        initialStatus = 'waiting';
      } else if (connectedPeerDevice) {
        initialStatus = 'connecting';
      } else {
        initialStatus = 'idle';
      }

      const newTransfers: Transfer[] = files.map((file) => {
        const fileMeta: FileMetadata = {
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
        };

        return {
          id: 'tr_' + Math.random().toString(36).substring(2, 9),
          file: fileMeta,
          senderDevice: localDevice,
          receiverDevice: connectedPeerDevice || {
            id: 'peer_waiting',
            name: 'Waiting Device...',
            type: 'unknown',
            os: 'unknown',
            browser: 'unknown',
            isSelf: false,
            status: 'disconnected',
            joinedAt: Date.now(),
          },
          direction: 'sending',
          status: initialStatus,
          progress: 0,
          bytesTransferred: 0,
          transferSpeed: 0,
          rawFile: file,
        };
      });

      setTransfers((prev) => [...prev, ...newTransfers]);
    },
    [connectedPeerDevice, localDevice, isP2PConnected]
  );

  const cancelTransfer = useCallback((transferId: string) => {
    webRTCService.cancelTransfer(transferId);
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'cancelled',
              transferSpeed: 0,
            }
          : t
      )
    );
  }, []);

  const removeTransfer = useCallback((transferId: string) => {
    setTransfers((prev) => {
      const target = prev.find((t) => t.id === transferId);
      if (target?.downloadUrl) {
        URL.revokeObjectURL(target.downloadUrl);
      }
      return prev.filter((t) => t.id !== transferId);
    });
  }, []);

  const clearAllTransfers = useCallback(() => {
    setTransfers((prev) => {
      prev.forEach((t) => {
        if (t.downloadUrl) {
          URL.revokeObjectURL(t.downloadUrl);
        }
      });
      return [];
    });
  }, []);

  return {
    transfers,
    addFilesToTransfer,
    cancelTransfer,
    removeTransfer,
    clearAllTransfers,
  };
}
