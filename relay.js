// @ts-check
import { createLibp2p } from 'libp2p'
import { autoNAT } from '@libp2p/autonat'
import { identify } from '@libp2p/identify'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { multiaddr } from '@multiformats/multiaddr'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { webSockets } from '@libp2p/websockets'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { tcp } from '@libp2p/tcp'
import { enable, disable } from '@libp2p/logger'
import { circuitRelayServer } from '@libp2p/circuit-relay-v2'
import {
  createEd25519PeerId,
  createFromProtobuf,
  exportToProtobuf
} from '@libp2p/peer-id-factory'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const peerIdPath = path.resolve(__dirname, 'data/peer-id.pb')

async function loadOrCreatePeerId() {
  try {
    const buffer = await fs.readFile(peerIdPath)
    return await createFromProtobuf(buffer)
  } catch {
    const peerId = await createEd25519PeerId()
    const buffer = exportToProtobuf(peerId)
    await fs.writeFile(peerIdPath, buffer)
    return peerId
  }
}

async function main() {
  const peerId = await loadOrCreatePeerId()

  const libp2p = await createLibp2p({
    peerId,
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/9001/ws',
        '/ip4/0.0.0.0/tcp/9002'
      ]
    },
    transports: [webSockets(), tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      denyDialMultiaddr: async () => false
    },
    services: {
      identify: identify(),
      autoNat: autoNAT(),
      relay: circuitRelayServer({
        // allow up to 128 reservations, max 4 per peer, 2‑minute TTL
        reservations: {
          maxReservations: 512,
          maxReservationsPerPeer: 4,
          defaultDuration: 2 * 60_000  // 2 minutes
        }
      }),
      pubsub: gossipsub()
    }
  })

  console.log('PeerID: ', libp2p.peerId.toString())
  console.log('Multiaddrs: ', libp2p.getMultiaddrs())
}

main()
