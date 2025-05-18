import { createFromProtobuf } from '@libp2p/peer-id-factory'
import fs from 'fs'

const buf = fs.readFileSync('./data/peerId.pb')
const peerId = await createFromProtobuf(buf)
const multiaddr = `/dns4/relay.o-shake.com/tcp/443/wss/p2p/${peerId.toString()}`
console.log(`RELAY_MULTIADDR=${multiaddr}`)
