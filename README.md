# DropLink

> **Move anything. Anywhere.**

DropLink is a public web application that allows anyone to transfer files between two devices (Phone ↔ Computer, Computer ↔ Computer, Phone ↔ Phone) using only a web browser.

No WhatsApp, no Telegram, no Gmail self-emails, no USB cables, no desktop software, no mobile apps, and no user accounts required.

---

## 🚀 Key Features

- ⚡ **Zero Account Setup**: Start transferring immediately without sign-ups or personal identifiers.
- 📱 **Real-Time Room & QR Pairing**: Real 6-character room codes and high-definition vector QR codes linked to live WebSocket rooms.
- 🌐 **Real WebRTC Peer-to-Peer File Transfer**: Files stream directly from device to device via encrypted `RTCDataChannel`. Zero file bytes ever touch the signaling server or cloud storage.
- 📦 **Chunked Streaming & Backpressure**: Streams files in 64 KB slices using `File.slice()` with strict backpressure flow control (`bufferedamountlow` threshold) to support multi-gigabyte transfers without browser memory spikes.
- 🔒 **SHA-256 Integrity Verification**: Cryptographic checksum calculation using the Web Crypto API (`crypto.subtle.digest`) to ensure bit-for-bit file integrity.
- 📂 **Multi-File Queueing & Cancellation**: Queue multiple files sequentially; cancel transfers in-flight from either sender or receiver side.
- 💾 **Native Download**: Download received files with preserved original filenames and MIME types; automatic `URL.revokeObjectURL` memory cleanup.
- 🌗 **Dark / Light Theme**: Fully persistent theme switching with zero page load flash.
- 📱 **Responsive & Mobile-First**: Tested across mobile, tablet, and desktop viewports with native drag-and-drop and mobile file pickers.
- 🎨 **Modern Design**: Futuristic glassmorphic UI, glowing borders, smooth Framer Motion animations.

---

## 🛠️ Architecture & Tech Stack

```text
Device A (Sender)                                  Device B (Receiver)
     │                                                    │
     ├────────── WebSocket Signaling (Handshake) ─────────┤
     │              (Room, SDP Offer/Answer, ICE)         │
     │                                                    │
     ▼                                                    ▼
┌──────────────────────────────────────────────────────────────┐
│          Direct WebRTC P2P DataChannel (RTCDataChannel)       │
│                                                              │
│  1. Send metadata (JSON: id, name, size, type, sha256)        │
│  2. Send 64 KB binary chunks (File.slice() with backpressure) │
│  3. Reconstruct Blob on receiver                             │
│  4. Verify byte count & SHA-256 checksum                     │
│  5. Send ACK / Present Download button                       │
└──────────────────────────────────────────────────────────────┘
```

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion
- **WebRTC Engine**: Native WebRTC `RTCPeerConnection` + `RTCDataChannel` (Ordered, binaryType `arraybuffer`)
- **Backend Signaling**: Node.js + TypeScript + `ws` WebSocket Server (exclusively relays room lifecycle & SDP/ICE signals)
- **Integrity**: Web Crypto API (`SHA-256`)
- **Icons**: Lucide React
- **QR Codes**: `qrcode.react`
- **Routing**: `react-router-dom` v7

---

## ⚙️ Transfer Protocol Specification

1. **Chunking Strategy**:
   - Chunk Size: `64 KB` (`65,536 bytes`) — the optimal safe binary size for WebRTC DataChannels.
   - Sliced dynamically via `File.slice(start, end)` into `ArrayBuffer`.
2. **Backpressure Flow Control**:
   - `bufferedAmountLowThreshold` is set to `256 KB`.
   - If `dataChannel.bufferedAmount` exceeds `1 MB`, chunk transmission pauses asynchronously and awaits the `bufferedamountlow` event before resuming.
3. **Control Messages**:
   - `file-meta`: Sent before binary chunks (contains file ID, name, size, MIME type, SHA-256 checksum).
   - Binary chunks: Sent raw as `ArrayBuffer` payloads.
   - `file-received-ack`: Sent by receiver when all bytes arrive and checksum verifies.
   - `file-cancel`: Emitted if either peer cancels the transfer, instantly halting the stream and resetting buffers.
4. **Integrity Check**:
   - Sender hashes the file with SHA-256 before or during staging.
   - Receiver re-hashes the assembled `Blob` and confirms byte count matches `meta.size`.
   - Any checksum mismatch triggers a transfer error state.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment (Optional)

Copy `.env.example` to `.env` if custom STUN/TURN servers are needed:
```bash
cp .env.example .env
```

### 3. Start Backend Signaling Server

In terminal 1:
```bash
npm run server
```
*Starts Node.js WebSocket signaling server at `ws://localhost:3001`.*

### 4. Start Frontend App

In terminal 2:
```bash
npm run dev
```
*Starts Vite frontend dev server at `http://localhost:5173`.*

---

## 🧪 Testing Real File Transfer

### Testing with 2 Browser Windows (Computer)
1. **Device A**: Open `http://localhost:5173` in Browser 1 (e.g. Chrome) and click **Create Room**.
   - Note the 6-character room code (e.g. `J8F2KX`).
2. **Device B**: Open `http://localhost:5173/join` in Browser 2 (or Incognito / Firefox) and enter the code.
3. **P2P Connection**:
   - Both windows show the peer device card and the badge switches to **"WebRTC: P2P Ready"**.
4. **Send Files**:
   - Drag & drop or browse for files (images, PDFs, videos, zip archives) into Device A's dropzone.
   - Watch the real-time progress bar, transfer percentage, and transfer speed (MB/s).
5. **Receive & Download**:
   - Device B receives the chunks, verifies the SHA-256 checksum, and presents a **Download** button.
   - Click **Download** to save the exact file to disk.

### Testing Across Network (Computer ↔ Phone)
1. Ensure both devices are on the same Wi-Fi network.
2. In `vite.config.ts`, expose the host or run `npm run dev -- --host 0.0.0.0`.
3. Open `http://<YOUR_COMPUTER_IP>:5173` on Computer and create a room.
4. Scan the QR code with your phone camera to join.
5. Transfer files in either direction!

---

## ⚠️ Browser & Network Considerations

- **Symmetric NAT / Firewalls**: WebRTC connects directly via public STUN servers for most home and office networks. In restrictive enterprise/carrier-grade NAT environments, a TURN relay server is required (configurable in `.env`).
- **Mobile Background Tab Throttling**: Mobile browsers (especially iOS Safari and Chrome Android) freeze JavaScript and WebRTC execution when the tab is backgrounded or the screen locks. Keep the DropLink tab active during active transfers.
- **Localhost HTTPS / Secure Contexts**: On `localhost`, Web Crypto API (`crypto.subtle`) is enabled. When deploying to a custom domain or IP over the internet, HTTPS is mandatory for WebRTC and Web Crypto APIs to function.

---

## 📁 Project Structure

```text
server/
├── src/
│   ├── rooms/
│   │   └── roomManager.ts       # Active room tracking & cleanup
│   ├── types/
│   │   └── index.ts             # Backend room, device, and signaling types
│   ├── utils/
│   │   └── codeGenerator.ts     # 6-char safe uppercase room code generator
│   └── server.ts                # WebSocket signaling server (relays offers, answers, ICE)
└── tsconfig.json

src/
├── components/
│   ├── common/                  # AlertBanner, Badge, Button, Card, Modal
│   ├── device/                  # DeviceCard, DeviceList
│   ├── features/                # FeaturesSection
│   ├── how-it-works/            # HowItWorksSection
│   ├── layout/                  # Navbar, Footer, PageContainer
│   ├── privacy/                 # PrivacySection (zero-storage WebRTC disclosures)
│   ├── qr/                      # QRCodeDisplay, QRScannerModal
│   └── transfer/                # DropZone, EmptyTransferState, TransferCard (progress & download)
├── hooks/
│   ├── useRoom.ts               # WebSocket room lifecycle hook
│   ├── useTheme.ts              # Dark/Light theme switching & persistence hook
│   ├── useTransfer.ts           # WebRTC DataChannel file transfer queue hook
│   └── useWebRTC.ts             # WebRTC peer connection orchestration hook
├── lib/
│   ├── constants.ts             # Chunk size, backpressure thresholds, ICE servers
│   └── utils.ts                 # Formatting utilities (file size, speed, dates)
├── pages/
│   ├── AboutPage.tsx
│   ├── CreateRoom.tsx
│   ├── Home.tsx
│   ├── JoinRoom.tsx
│   ├── NotFoundPage.tsx
│   └── RoomPage.tsx             # Interactive P2P transfer room page
├── services/
│   ├── room.service.ts          # Room service interface
│   ├── signaling.service.ts     # Frontend WebSocket signaling client
│   ├── storage.service.ts       # LocalStorage service
│   └── webrtc.service.ts        # RTCPeerConnection & RTCDataChannel streaming engine
├── types/
│   ├── device.ts                # Device metadata types
│   ├── network.ts               # Signaling messages (webrtc-offer, webrtc-answer, webrtc-ice)
│   ├── room.ts                  # Room types
│   └── transfer.ts              # File transfer, meta, chunk & status types
└── utils/
    └── crypto.ts                # SHA-256 Web Crypto checksum calculation
```

---

## 📄 License

MIT
