import fs from 'fs/promises'
import { createFromProtobuf } from '@libp2p/peer-id-factory'

const host = process.env.RELAY_PUBLIC_HOST || 'relay.o-shake.com'
const peerIdPath = './data/peerId.pb'

const buf = await fs.readFile(peerIdPath)
const peerId = await createFromProtobuf(buf)

// Cloudflare公開は 443/wss を使う
console.log(`RELAY_MULTIADDR=/dns4/${host}/tcp/443/wss/p2p/${peerId.toString()}`)
