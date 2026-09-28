import {
  CHUNK_SIZE,
  BUFFER_LOW_THRESHOLD,
  BUFFER_MAX_THRESHOLD,
  getIceServers,
} from '@/lib/constants';
import { signalingService } from './signaling.service';
import { calculateChecksum } from '@/utils/crypto';
import { getLocalDeviceInfo } from '@/utils/deviceInfo';
import type {
  DataChannelControlMessage,
  DataChannelMetaMessage,
} from '@/types/transfer';

export type P2PConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

export type WebRTCEventCallback = (data: any) => void;

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private roomId: string | null = null;
  private localDeviceId: string | null = null;
  private remoteDeviceId: string | null = null;
  private connectionState: P2PConnectionState = 'idle';

  private listeners: Map<string, Set<WebRTCEventCallback>> = new Map();
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private pendingOffer: { offer: RTCSessionDescriptionInit; senderId: string; roomId?: string } | null = null;
  private offerRetryTimer: any = null;

  // Active incoming file transfer assembly
  private currentIncomingMeta: DataChannelMetaMessage | null = null;
  private incomingChunks: ArrayBuffer[] = [];
  private incomingBytesReceived = 0;
  private incomingStartTime = 0;

  // Active outgoing transfer tracking
  private activeOutgoingTransferId: string | null = null;
  private isSendingCancelled = false;

  public initialize(
    roomId: string,
    localDeviceId: string,
    isInitiator: boolean,
    remoteDeviceId?: string
  ): void {
    if (this.isP2PConnected()) {
      console.log('[WebRTC Diagnostic] Already connected via P2P. Skipping initialize.');
      return;
    }

    if (this.offerRetryTimer) {
      clearTimeout(this.offerRetryTimer);
      this.offerRetryTimer = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.roomId = roomId;
    this.localDeviceId = localDeviceId;
    this.remoteDeviceId = remoteDeviceId || null;
    this.setConnectionState('connecting');

    const config: RTCConfiguration = {
      iceServers: getIceServers(),
    };

    console.log('[WebRTC Diagnostic] Initializing RTCPeerConnection with ICE servers:', config.iceServers);
    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onsignalingstatechange = () => {
      console.log(`[WebRTC Diagnostic] Signaling state: ${this.peerConnection?.signalingState}`);
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log(`[WebRTC Diagnostic] ICE gathering state: ${this.peerConnection?.iceGatheringState}`);
    };

    this.peerConnection.onicecandidateerror = (event: any) => {
      console.warn(`[WebRTC Diagnostic] ICE candidate error: code=${event.errorCode}, text=${event.errorText}, hostCandidate=${event.hostCandidate}, url=${event.url}`);
    };

    // Monitor connection states
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`[WebRTC Diagnostic] Connection state changed: ${state}`);
      if (state === 'connected') {
        if (this.dataChannel?.readyState === 'open') {
          this.setConnectionState('connected');
        }
      } else if (state === 'connecting') {
        this.setConnectionState('connecting');
      } else if (state === 'disconnected') {
        this.setConnectionState('disconnected');
      } else if (state === 'failed') {
        console.warn('[WebRTC Diagnostic] ConnectionState failed: Direct P2P packet exchange was blocked.');
        this.setConnectionState('failed');
      } else if (state === 'closed') {
        this.setConnectionState('closed');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log(`[WebRTC Diagnostic] ICE connection state: ${iceState}`);
      if (iceState === 'connected' || iceState === 'completed') {
        if (this.dataChannel?.readyState === 'open') {
          this.setConnectionState('connected');
        }
      } else if (iceState === 'failed') {
        console.warn('[WebRTC Diagnostic] Signaling works, but ICE connectivity failed. NAT/firewall conditions (Symmetric NAT / Carrier Grade NAT) prevent direct UDP connectivity without a TURN relay server.');
        this.setConnectionState('failed');
      }
    };

    // Gather local ICE candidates and send via signaling server
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.roomId && this.localDeviceId) {
        const cand = event.candidate;
        console.log(`[WebRTC Diagnostic] Local ICE Candidate generated: type=${cand.type}, protocol=${cand.protocol}, address=${cand.address || 'hidden'}, port=${cand.port}`);
        signalingService.sendIceCandidate(
          this.roomId,
          cand.toJSON(),
          this.localDeviceId,
          this.remoteDeviceId || undefined
        );
      } else if (!event.candidate) {
        console.log('[WebRTC Diagnostic] Local ICE Gathering Complete.');
      }
    };

    if (isInitiator) {
      console.log('[WebRTC Diagnostic] Device is initiator: creating DataChannel and Offer');
      const channel = this.peerConnection.createDataChannel('droplink-transfer', {
        ordered: true,
      });
      this.setupDataChannel(channel);
      this.createAndSendOffer();

      // Offer retry timer if peer joined during navigation and missed first offer
      this.offerRetryTimer = setTimeout(() => {
        if (this.connectionState === 'connecting' && this.peerConnection?.signalingState === 'have-local-offer') {
          console.log('[WebRTC Diagnostic] Retrying offer send in case peer was navigating...');
          if (this.peerConnection?.localDescription && this.roomId && this.localDeviceId) {
            signalingService.sendOffer(
              this.roomId,
              this.peerConnection.localDescription,
              this.localDeviceId,
              this.remoteDeviceId || undefined
            );
          }
        }
      }, 3500);
    } else {
      console.log('[WebRTC Diagnostic] Device is receiver: listening for ondatachannel');
      this.peerConnection.ondatachannel = (event) => {
        console.log('[WebRTC Diagnostic] ondatachannel event received! DataChannel readyState:', event.channel.readyState);
        this.setupDataChannel(event.channel);
      };

      // Process any offer that arrived before initialize finished
      if (this.pendingOffer) {
        const pending = this.pendingOffer;
        this.pendingOffer = null;
        console.log('[WebRTC Diagnostic] Processing pending offer for receiver...');
        this.handleOffer(pending.offer, pending.senderId, pending.roomId);
      }
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    this.dataChannel.binaryType = 'arraybuffer';
    this.dataChannel.bufferedAmountLowThreshold = BUFFER_LOW_THRESHOLD;

    console.log(`[WebRTC Diagnostic] Setup DataChannel '${channel.label}', readyState: ${channel.readyState}`);

    if (channel.readyState === 'open') {
      console.log('[WebRTC Diagnostic] RTCDataChannel is already open! P2P Ready.');
      this.setConnectionState('connected');
      this.emit('datachannel-open', {});
    }

    this.dataChannel.onopen = () => {
      console.log('[WebRTC Diagnostic] RTCDataChannel onopen fired! P2P Ready.');
      if (this.offerRetryTimer) {
        clearTimeout(this.offerRetryTimer);
        this.offerRetryTimer = null;
      }
      this.setConnectionState('connected');
      this.emit('datachannel-open', {});
    };

    this.dataChannel.onclose = () => {
      console.log('[WebRTC Diagnostic] RTCDataChannel closed.');
      this.setConnectionState('disconnected');
      this.emit('datachannel-close', {});
    };

    this.dataChannel.onerror = (err) => {
      console.error('[WebRTC Diagnostic] RTCDataChannel error:', err);
      this.setConnectionState('failed');
      this.emit('datachannel-error', { error: err });
    };

    this.dataChannel.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };
  }

  private async createAndSendOffer(): Promise<void> {
    if (!this.peerConnection || !this.roomId || !this.localDeviceId) return;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('[WebRTC Diagnostic] Created and set local offer description, sending via signaling...');
      signalingService.sendOffer(
        this.roomId,
        offer,
        this.localDeviceId,
        this.remoteDeviceId || undefined
      );
    } catch (err) {
      console.error('[WebRTC Diagnostic] Failed to create offer:', err);
      this.setConnectionState('failed');
    }
  }

  public async handleOffer(
    offer: RTCSessionDescriptionInit,
    remoteSenderId: string,
    roomId?: string
  ): Promise<void> {
    console.log(`[WebRTC Diagnostic] Received SDP offer from ${remoteSenderId} (SDP length: ${offer.sdp?.length || 0})`);
    this.remoteDeviceId = remoteSenderId;
    if (roomId) this.roomId = roomId;

    if (!this.peerConnection) {
      console.log('[WebRTC Diagnostic] PeerConnection not yet initialized when offer arrived. Staging offer and initializing as receiver now...');
      this.pendingOffer = { offer, senderId: remoteSenderId, roomId };
      const localId = this.localDeviceId || getLocalDeviceInfo().id;
      this.initialize(roomId || this.roomId || '', localId, false, remoteSenderId);
      return;
    }

    try {
      console.log('[WebRTC Diagnostic] Setting remote description (offer)...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`[WebRTC Diagnostic] Remote description set. SignalingState: ${this.peerConnection.signalingState}`);
      await this.flushPendingIceCandidates();

      console.log('[WebRTC Diagnostic] Creating SDP answer...');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log(`[WebRTC Diagnostic] Set local description (answer). SignalingState: ${this.peerConnection.signalingState}`);

      if (this.roomId && this.localDeviceId) {
        console.log(`[WebRTC Diagnostic] Sending SDP answer back to host ${this.remoteDeviceId} via signaling...`);
        signalingService.sendAnswer(
          this.roomId,
          answer,
          this.localDeviceId,
          this.remoteDeviceId
        );
      }
    } catch (err) {
      console.error('[WebRTC Diagnostic] Failed handling offer:', err);
      this.setConnectionState('failed');
    }
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    console.log(`[WebRTC Diagnostic] Received SDP answer (SDP length: ${answer.sdp?.length || 0})`);
    if (!this.peerConnection) {
      console.warn('[WebRTC Diagnostic] Received answer but PeerConnection is null!');
      return;
    }

    try {
      console.log('[WebRTC Diagnostic] Setting remote description (answer)...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`[WebRTC Diagnostic] Remote description (answer) set successfully. SignalingState: ${this.peerConnection.signalingState}`);
      await this.flushPendingIceCandidates();
    } catch (err) {
      console.error('[WebRTC Diagnostic] Failed handling answer:', err);
      this.setConnectionState('failed');
    }
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    const candStr = candidate.candidate || '';
    const candTypeMatch = candStr.match(/typ\s+(\w+)/);
    const candType = candTypeMatch ? candTypeMatch[1] : 'unknown';
    console.log(`[WebRTC Diagnostic] Received Remote ICE Candidate: type=${candType}, candidate=${candStr}`);

    if (
      this.peerConnection &&
      this.peerConnection.remoteDescription &&
      this.peerConnection.remoteDescription.type
    ) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC Diagnostic] Error adding ICE candidate:', err);
      }
    } else {
      console.log(`[WebRTC Diagnostic] Queuing remote ICE candidate (${candType}) until remoteDescription is ready.`);
      this.pendingIceCandidates.push(candidate);
    }
  }

  private async flushPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection) return;

    if (this.pendingIceCandidates.length > 0) {
      console.log(`[WebRTC Diagnostic] Flushing ${this.pendingIceCandidates.length} queued ICE candidate(s)...`);
    }

    while (this.pendingIceCandidates.length > 0) {
      const cand = this.pendingIceCandidates.shift();
      if (cand) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn('[WebRTC Diagnostic] Error adding queued ICE candidate:', err);
        }
      }
    }
  }

  // Handle incoming DataChannel messages (Control JSON string or Binary ArrayBuffer)
  private async handleIncomingData(data: string | ArrayBuffer): Promise<void> {
    if (typeof data === 'string') {
      try {
        const msg: DataChannelControlMessage = JSON.parse(data);

        switch (msg.action) {
          case 'file-meta': {
            console.log(`[WebRTCService] Incoming file start: ${msg.name} (${msg.size} bytes)`);
            this.currentIncomingMeta = msg;
            this.incomingChunks = [];
            this.incomingBytesReceived = 0;
            this.incomingStartTime = Date.now();

            this.emit('file-start', { meta: msg });
            break;
          }

          case 'file-cancel': {
            console.log(`[WebRTCService] Transfer cancelled by peer: ${msg.transferId}`);
            if (this.currentIncomingMeta?.transferId === msg.transferId) {
              this.currentIncomingMeta = null;
              this.incomingChunks = [];
              this.incomingBytesReceived = 0;
            }
            this.emit('file-cancelled', { transferId: msg.transferId });
            break;
          }

          case 'file-received-ack': {
            console.log(`[WebRTCService] Peer acknowledged transfer ${msg.transferId}: ${msg.status}`);
            this.emit('file-ack', { transferId: msg.transferId, status: msg.status });
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('[WebRTCService] Error parsing control message:', err);
      }
    } else if (data instanceof ArrayBuffer) {
      if (!this.currentIncomingMeta) {
        console.warn('[WebRTCService] Received binary chunk without active file metadata header.');
        return;
      }

      this.incomingChunks.push(data);
      this.incomingBytesReceived += data.byteLength;

      const totalBytes = this.currentIncomingMeta.size;
      const progress = Math.min(100, Math.round((this.incomingBytesReceived / totalBytes) * 100));

      const elapsedSec = (Date.now() - this.incomingStartTime) / 1000;
      const speed = elapsedSec > 0 ? this.incomingBytesReceived / elapsedSec : 0;

      this.emit('file-progress', {
        transferId: this.currentIncomingMeta.transferId,
        bytesTransferred: this.incomingBytesReceived,
        totalBytes,
        progress,
        speed,
      });

      // Check for completion
      if (this.incomingBytesReceived >= totalBytes) {
        console.log(`[WebRTCService] Completed receiving all chunks for ${this.currentIncomingMeta.name}. Reconstructing Blob...`);
        const meta = this.currentIncomingMeta;
        const chunks = this.incomingChunks;

        this.currentIncomingMeta = null;
        this.incomingChunks = [];
        this.incomingBytesReceived = 0;

        const blob = new Blob(chunks, { type: meta.mimeType || 'application/octet-stream' });

        if (blob.size !== meta.size) {
          console.error(`[WebRTCService] Integrity error: Expected ${meta.size} bytes, got ${blob.size}`);
          this.sendControlMessage({
            action: 'file-received-ack',
            transferId: meta.transferId,
            status: 'integrity-failed',
            error: 'Size mismatch',
          });
          this.emit('file-integrity-failed', { transferId: meta.transferId });
          return;
        }

        if (meta.checksum) {
          const actualChecksum = await calculateChecksum(blob);
          if (actualChecksum && actualChecksum !== meta.checksum) {
            console.error(`[WebRTCService] Integrity error: Checksum mismatch. Expected ${meta.checksum}, got ${actualChecksum}`);
            this.sendControlMessage({
              action: 'file-received-ack',
              transferId: meta.transferId,
              status: 'integrity-failed',
              error: 'Checksum mismatch',
            });
            this.emit('file-integrity-failed', { transferId: meta.transferId });
            return;
          }
        }

        this.sendControlMessage({
          action: 'file-received-ack',
          transferId: meta.transferId,
          status: 'completed',
        });

        const downloadUrl = URL.createObjectURL(blob);
        this.emit('file-completed', {
          transferId: meta.transferId,
          meta,
          blob,
          downloadUrl,
        });
      }
    }
  }

  public async sendFile(
    transferId: string,
    file: File,
    onProgress: (bytesSent: number, totalBytes: number, speed: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return { success: false, error: 'WebRTC DataChannel is not open.' };
    }

    this.activeOutgoingTransferId = transferId;
    this.isSendingCancelled = false;

    try {
      console.log(`[WebRTCService] Preparing file transfer: ${file.name} (${file.size} bytes)`);

      let checksum = '';
      if (file.size <= 50 * 1024 * 1024) {
        checksum = await calculateChecksum(file);
      }

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const metaMsg: DataChannelMetaMessage = {
        action: 'file-meta',
        transferId,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        totalChunks,
        chunkSize: CHUNK_SIZE,
        checksum,
      };

      this.sendControlMessage(metaMsg);

      let bytesSent = 0;
      let offset = 0;
      const startTime = Date.now();

      while (offset < file.size) {
        if (this.isSendingCancelled || this.activeOutgoingTransferId !== transferId) {
          console.log(`[WebRTCService] File transfer ${transferId} cancelled by sender.`);
          this.sendControlMessage({
            action: 'file-cancel',
            transferId,
            reason: 'Cancelled by sender',
          });
          return { success: false, error: 'Transfer cancelled.' };
        }

        if (this.dataChannel.bufferedAmount > BUFFER_MAX_THRESHOLD) {
          await this.waitForBufferLow();
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const arrayBuffer = await slice.arrayBuffer();

        this.dataChannel.send(arrayBuffer);
        bytesSent += arrayBuffer.byteLength;
        offset += arrayBuffer.byteLength;

        const elapsedSec = (Date.now() - startTime) / 1000;
        const currentSpeed = elapsedSec > 0 ? bytesSent / elapsedSec : 0;

        onProgress(bytesSent, file.size, currentSpeed);
      }

      console.log(`[WebRTCService] Finished sending all chunks for ${file.name}.`);
      this.activeOutgoingTransferId = null;
      return { success: true };
    } catch (err: any) {
      console.error('[WebRTCService] Error sending file:', err);
      this.activeOutgoingTransferId = null;
      return { success: false, error: err.message || 'File transfer error.' };
    }
  }

  public cancelTransfer(transferId: string): void {
    if (this.activeOutgoingTransferId === transferId) {
      this.isSendingCancelled = true;
    }
    this.sendControlMessage({
      action: 'file-cancel',
      transferId,
      reason: 'User cancelled',
    });
  }

  private sendControlMessage(msg: DataChannelControlMessage): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(msg));
    }
  }

  private waitForBufferLow(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.dataChannel || this.dataChannel.bufferedAmount <= BUFFER_LOW_THRESHOLD) {
        resolve();
        return;
      }

      const onLow = () => {
        this.dataChannel?.removeEventListener('bufferedamountlow', onLow);
        resolve();
      };

      this.dataChannel.addEventListener('bufferedamountlow', onLow);
    });
  }

  public closeConnection(): void {
    if (this.offerRetryTimer) {
      clearTimeout(this.offerRetryTimer);
      this.offerRetryTimer = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.setConnectionState('idle');
    this.pendingIceCandidates = [];
    this.pendingOffer = null;
    this.currentIncomingMeta = null;
    this.incomingChunks = [];
    this.activeOutgoingTransferId = null;
  }

  private setConnectionState(state: P2PConnectionState): void {
    this.connectionState = state;
    this.emit('connection-state-change', { state });
  }

  public getConnectionState(): P2PConnectionState {
    return this.connectionState;
  }

  public isP2PConnected(): boolean {
    return this.connectionState === 'connected' && this.dataChannel?.readyState === 'open';
  }

  public on(event: string, callback: WebRTCEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: WebRTCEventCallback): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }
}

export const webRTCService = new WebRTCService();
