import { useState, useEffect, useCallback, useRef } from 'react';
import type { Room } from '@/types/room';
import type { ServerMessage } from '@/types/network';
import { roomService } from '@/services/room.service';
import { signalingService } from '@/services/signaling.service';
import { getLocalDeviceInfo } from '@/utils/deviceInfo';

export function useRoom(initialRoomId?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);

  const localDevice = getLocalDeviceInfo();
  const roomIdRef = useRef<string | undefined>(initialRoomId);
  roomIdRef.current = room?.id || initialRoomId;

  // Real-time event handlers
  useEffect(() => {
    const handleDeviceJoined = (msg: ServerMessage) => {
      const { device, room: updatedRoom } = msg.payload || {};
      if (updatedRoom) {
        setRoom(updatedRoom);
      }
      if (device) {
        setNotification({
          title: 'Device Connected',
          message: `${device.name} joined the room.`,
        });
        setTimeout(() => setNotification(null), 4000);
      }
    };

    const handleDeviceLeft = (msg: ServerMessage) => {
      const { room: updatedRoom } = msg.payload || {};
      if (updatedRoom) {
        setRoom(updatedRoom);
      }
      setNotification({
        title: 'Device Disconnected',
        message: 'A device left the room.',
      });
      setTimeout(() => setNotification(null), 4000);
    };

    const handleRoomClosed = (msg: ServerMessage) => {
      const { reason } = msg.payload || {};
      setRoom(null);
      setErrorType('ROOM_CLOSED');
      setError(reason || 'The room has been closed.');
    };

    const handleRoomExpired = () => {
      setRoom(null);
      setErrorType('ROOM_EXPIRED');
      setError('This transfer room has expired.');
    };

    signalingService.on('device-joined', handleDeviceJoined);
    signalingService.on('device-left', handleDeviceLeft);
    signalingService.on('room-closed', handleRoomClosed);
    signalingService.on('room-expired', handleRoomExpired);

    return () => {
      signalingService.off('device-joined', handleDeviceJoined);
      signalingService.off('device-left', handleDeviceLeft);
      signalingService.off('room-closed', handleRoomClosed);
      signalingService.off('room-expired', handleRoomExpired);
    };
  }, []);

  const createNewRoom = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorType(null);

    const result = await roomService.createRoom();

    if (result.success && result.room) {
      setRoom(result.room);
      setLoading(false);
      return result.room;
    } else {
      setError(result.error || 'Failed to create room');
      setErrorType(result.errorType || 'CREATE_FAILED');
      setLoading(false);
      return null;
    }
  }, []);

  const joinExistingRoom = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    setErrorType(null);

    const result = await roomService.joinRoom(code);

    if (result.success && result.room) {
      setRoom(result.room);
      setLoading(false);
      return result.room;
    } else {
      setError(result.error || 'Failed to join room');
      setErrorType(result.errorType || 'JOIN_FAILED');
      setLoading(false);
      return null;
    }
  }, []);

  const leaveCurrentRoom = useCallback(() => {
    if (room) {
      roomService.leaveRoom(room.id, localDevice.id);
      setRoom(null);
    }
  }, [room, localDevice.id]);

  const closeCurrentRoom = useCallback(() => {
    if (room) {
      roomService.closeRoom(room.id, localDevice.id);
      setRoom(null);
    }
  }, [room, localDevice.id]);

  return {
    room,
    setRoom,
    loading,
    error,
    errorType,
    notification,
    createNewRoom,
    joinExistingRoom,
    leaveCurrentRoom,
    closeCurrentRoom,
  };
}
