import { useState, useEffect, useRef } from 'react';
import type { Room } from '@/types/room';
import type { ServerMessage } from '@/types/network';
import { webRTCService, type P2PConnectionState } from '@/services/webrtc.service';
import { signalingService } from '@/services/signaling.service';
import { getLocalDeviceInfo } from '@/utils/deviceInfo';

export function useWebRTC(room: Room | null) {
  const [p2pState, setP2pState] = useState<P2PConnectionState>(webRTCService.getConnectionState());
  const [connectionType, setConnectionType] = useState<'DIRECT' | 'STUN' | 'TURN RELAY' | null>(
    webRTCService.getSelectedConnectionType()
  );
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const localDevice = getLocalDeviceInfo();
  const hasInitiatedRef = useRef(false);

  useEffect(() => {
    const handleStateChange = (data: { state: P2PConnectionState }) => {
      setP2pState(data.state);
      if (data.state === 'connected') {
        setFailureMessage(null);
      }
    };

    const handleTypeDetected = (data: { connectionType: 'DIRECT' | 'STUN' | 'TURN RELAY' }) => {
      setConnectionType(data.connectionType);
    };

    const handleFailed = (data: { message?: string }) => {
      setFailureMessage(data.message || 'Could not establish a direct connection. Please check your network or try again.');
    };

    webRTCService.on('connection-state-change', handleStateChange);
    webRTCService.on('connection-type-detected', handleTypeDetected);
    webRTCService.on('connection-failed', handleFailed);

    return () => {
      webRTCService.off('connection-state-change', handleStateChange);
      webRTCService.off('connection-type-detected', handleTypeDetected);
      webRTCService.off('connection-failed', handleFailed);
    };
  }, []);

  // Listen for WebRTC signaling messages
  useEffect(() => {
    const handleOffer = (msg: ServerMessage) => {
      const { sdp, senderId, roomId } = msg.payload || {};
      if (sdp && senderId !== localDevice.id) {
        console.log('[useWebRTC] Received WebRTC offer from peer');
        webRTCService.handleOffer(sdp, senderId, roomId);
      }
    };

    const handleAnswer = (msg: ServerMessage) => {
      const { sdp, senderId } = msg.payload || {};
      if (sdp && senderId !== localDevice.id) {
        console.log('[useWebRTC] Received WebRTC answer from peer');
        webRTCService.handleAnswer(sdp);
      }
    };

    const handleIceCandidate = (msg: ServerMessage) => {
      const { candidate, senderId } = msg.payload || {};
      if (candidate && senderId !== localDevice.id) {
        webRTCService.handleIceCandidate(candidate);
      }
    };

    signalingService.on('webrtc-offer', handleOffer);
    signalingService.on('webrtc-answer', handleAnswer);
    signalingService.on('webrtc-ice', handleIceCandidate);

    return () => {
      signalingService.off('webrtc-offer', handleOffer);
      signalingService.off('webrtc-answer', handleAnswer);
      signalingService.off('webrtc-ice', handleIceCandidate);
    };
  }, [localDevice.id]);

  // Initiate WebRTC connection when 2 devices are connected in room
  useEffect(() => {
    if (!room || room.status !== 'connected' || room.connectedDevices.length < 2) {
      hasInitiatedRef.current = false;
      return;
    }

    if (hasInitiatedRef.current) return;

    const hostId = room.hostDeviceId || room.hostDevice?.id;
    const isHost = hostId === localDevice.id;
    const remotePeer = room.connectedDevices.find((d) => d.id !== localDevice.id);

    console.log(`[useWebRTC] Room has 2 devices. IsHost: ${isHost}. Initializing WebRTC...`);
    hasInitiatedRef.current = true;

    webRTCService.initialize(room.id, localDevice.id, isHost, remotePeer?.id);
  }, [room, localDevice.id]);

  return {
    p2pState,
    isP2PConnected: p2pState === 'connected',
    connectionType,
    failureMessage,
  };
}
