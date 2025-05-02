// @ts-check
import { createLibp2p } from 'libp2p'
import { identify } from '@libp2p/identify'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { multiaddr } from '@multiformats/multiaddr'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { circuitRelayTransport, circuitRelayServer } from '@libp2p/circuit-relay-v2'
import { enable, disable } from '@libp2p/logger'
import { update, getPeerTypes, getAddresses, collectPeerDetails } from './utils'
import * as filters from '@libp2p/websockets/filters'
import { bootstrap } from '@libp2p/bootstrap'
import { pipe } from 'it-pipe'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { peerIdFromString } from '@libp2p/peer-id'
// ping responder
import { ping } from '@libp2p/ping'


const CHAT_PROTOCOL = '/chat/1.0.0'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

// 直近で「接続」ボタンを押した相手の PeerId を保持
let targetPeerIdStr = null;
// peerIdStr -> Array<Connection>
const connMap = new Map();

const App = async () => {
  const libp2p = await createLibp2p({
     addresses: {
       listen: [
         '/webrtc',
       ],
     },
    transports: [
      webSockets({
        filter: filters.all,
      }),
      webTransport(),
      webRTC(),
       circuitRelayTransport({
         discoverRelays: 1,
       }),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux({ keepAlive: true })],
    connectionGater: {
      denyDialMultiaddr: async () => false,
    },
    peerDiscovery: [
      bootstrap({
        list: [
          typeof RELAY_MULTIADDR !== 'undefined' ? RELAY_MULTIADDR : ''
        ],
        interval: 30_000
      }),
    ],
    services: {
      pubsub: gossipsub(),
      identify: identify(),
      // respond to /ipfs/ping/1.0.0 so remote peers can measure latency
      ping: ping(),
    },
  })


  // 新しいメッセージ受信ハンドラ
  console.log("✅ chat handler registered");
  libp2p.handle(CHAT_PROTOCOL, async ({ stream }) => {
    try {
      for await (const part of stream.source) {
        if (part == null) continue;
        console.log('🛠 raw chunk', part);

        // --- robust, recursive part → string conversion ---
        let data = part;

        // Case 1: it’s a Uint8ArrayList/BufferList that supports subarray()/slice()
        if (data?.subarray && typeof data.subarray === 'function' && !(data instanceof Uint8Array)) {
          data = data.subarray();         // Uint8Array
        } else if (data?.slice && typeof data.slice === 'function' && data.bufs) {
          // BufferList (it-buf/buffer‑list)
          data = data.slice();            // Uint8Array
        } else {
          // Generic unwrapping of common {value|data} wrappers
          while (
            data &&
            typeof data === 'object' &&
            !ArrayBuffer.isView(data) &&
            !(data instanceof Uint8Array)
          ) {
            if ('value' in data) { data = data.value; continue; }
            if ('data'  in data) { data = data.data;  continue; }
            break;
          }
        }

        let message = '';
        if (data instanceof Uint8Array) {
          message = uint8ArrayToString(data).trim();
        } else if (ArrayBuffer.isView(data)) {
          message = uint8ArrayToString(
            new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          ).trim();
        } else if (typeof data === 'string') {
          message = data.trim();
        } else {
          message = String(data).trim();
        }

        // JSON payload support
        if (message.startsWith('{') && message.endsWith('}')) {
          try {
            const obj = JSON.parse(message);
            if (typeof obj.text === 'string') message = obj.text;
          } catch {/* ignore */}
        }
        if (!message) continue;

        console.log('📥 受信メッセージ:', message);

        const box = document.getElementById('chat-box');
        if (box) {
          const p = document.createElement('p');
          p.textContent = '[相手] ' + message;
          box.appendChild(p);
        }
      }
    } catch (err) {
      console.error('❌ chat handler error:', err);
    }
  });

  // Start the libp2p node so handlers and transports are active
  await libp2p.start();

  globalThis.libp2p = libp2p

  const DOM = {
    nodePeerId: () => document.getElementById('output-node-peer-id'),
    nodeStatus: () => document.getElementById('output-node-status'),
    nodePeerCount: () => document.getElementById('output-peer-count'),
    nodePeerTypes: () => document.getElementById('output-peer-types'),
    nodePeerDetails: () => document.getElementById('output-peer-details'),
    nodeAddressCount: () => document.getElementById('output-address-count'),
    nodeAddresses: () => document.getElementById('output-addresses'),

    inputMultiaddr: () => document.getElementById('input-multiaddr'),
    connectButton: () => document.getElementById('button-connect'),
    loggingButtonEnable: () => document.getElementById('button-logging-enable'),
    loggingButtonDisable: () => document.getElementById('button-logging-disable'),
    outputQuery: () => document.getElementById('output'),
  }

  update(DOM.nodePeerId(), libp2p.peerId.toString())
  update(DOM.nodeStatus(), 'Online')

  libp2p.addEventListener('peer:connect', (e) => {
    /** @type {import('@libp2p/interface-connection').Connection | null} */
    let conn = null;

    // v0.x sends Connection in detail, but some transports may emit just PeerId
    if (e?.detail?.remotePeer) {
      conn = e.detail;
    } else if (e?.detail?.toString) {
      // detail is PeerId; pick first connection to that peer
      const conns = libp2p.getConnections(e.detail);
      if (conns.length > 0) conn = conns[0];
    }
    if (!conn) {
      console.warn('peer:connect but no Connection object:', e);
      return;
    }

    const idStr = conn.remotePeer.toString();
    console.log('🔗 peer connect', idStr);

    if (!connMap.has(idStr)) connMap.set(idStr, []);
    connMap.get(idStr).push(conn);

    if (!targetPeerIdStr) {
      targetPeerIdStr = idStr;
      console.log('🎯 auto‑selected targetPeerIdStr =', targetPeerIdStr);
    }
  });
  libp2p.addEventListener('peer:disconnect', (e) => {
    const peerId = e?.detail?.remotePeer ?? e?.detail?.peer ?? null;
    const idStr  = peerId?.toString?.();
    if (idStr) {
      console.log('⚡ peer disconnect', idStr);
      connMap.delete(idStr);          // ← remove stale connections
      if (targetPeerIdStr === idStr) targetPeerIdStr = null;  // reset auto‑target if needed
    } else {
      console.warn('⚡ peer disconnect (detail missing):', e);
    }
  });

  setInterval(() => {
    update(DOM.nodePeerCount(), libp2p.getConnections().length)
    update(DOM.nodePeerTypes(), getPeerTypes(libp2p))
    update(DOM.nodeAddressCount(), libp2p.getMultiaddrs().length)
    update(DOM.nodeAddresses(), getAddresses(libp2p))
    const details = collectPeerDetails(libp2p)
    const container = DOM.nodePeerDetails()
    if (container) {
      container.innerHTML = ""
      details.forEach(d => {
        const li = document.createElement("li")
        // Peer ID
        const code = document.createElement("code")
        code.textContent = d.id
        li.appendChild(code)
        // Sub-list of addresses
        const subUl = document.createElement("ul")
        subUl.classList.add("pl-6")
        d.addrs.forEach(addr => {
          const subLi = document.createElement("li")
          subLi.classList.add("break-all", "text-sm")
          subLi.textContent = addr
          // Copy button
          const btn = document.createElement("button")
          btn.classList.add("bg-teal-500", "hover:bg-teal-700", "text-white", "px-2", "mx-2", "rounded", "focus:outline-none", "focus:shadow-outline")
          btn.textContent = "Copy"
          btn.onclick = () => navigator.clipboard.writeText(addr)
          subLi.prepend(btn)
          subUl.appendChild(subLi)
        })
        li.appendChild(subUl)
        container.appendChild(li)
      })
    }
  })

  DOM.loggingButtonEnable().onclick = (e) => {
    enable('*,*:debug')
  }
  DOM.loggingButtonDisable().onclick = (e) => {
    disable()
  }

  DOM.connectButton().onclick = async (e) => {
    e.preventDefault()
    let maddr = multiaddr(DOM.inputMultiaddr().value)

    console.log(maddr)
    try {
      await libp2p.dial(maddr)
    } catch (e) {
      console.log(e)
    }
  }

  window.libp2p = libp2p
  window.peerId = libp2p.peerId

  // 新しいメッセージ送信関数: 既存ConnectionのnewStreamを使う
async function sendMessageToPeer(conn, message) {
  try {
    console.log('🔍 newStream on', conn.remotePeer.toString())
    const result = await conn.newStream(CHAT_PROTOCOL);

    console.log('🧩 newStream result =', result)

    const stream = result?.stream ?? result;
    console.log('🧩 stream object =', stream)

    if (!stream?.sink) throw new Error('no stream.sink')

    await pipe([encoder.encode(message)], stream.sink)
    console.log('✅ sent', message)
  } catch (err) {
    console.error('🚨 newStream failed', err, err.code)
  }
}


  // chat-form の送信イベントを処理
  function setupChatForm() {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const box = document.getElementById("chat-box");

    form.addEventListener("submit", async function(e) {
      e.preventDefault();
      const message = input.value.trim();
      if (message !== "") {
        const p = document.createElement("p");
        p.textContent = "[あなた] " + message;
        box.appendChild(p);
        input.value = "";

        // --- 送信先 Connection を決定 (双方が connect 済み前提) ---
        const connections = libp2p.getConnections();
        let conn = null;

        // 1) 事前にクリックして保存してある targetPeerIdStr で直接探す
        if (targetPeerIdStr) {
          conn = connections.find(c => c.remotePeer.toString() === targetPeerIdStr);
        }

        // 2) target が無い／見つからなかった場合、/chat/1.0.0 をアドバタイズしている peer を探す
        if (!conn) {
          for (const c of connections) {
            const pb = await libp2p.peerStore.protoBook.get(c.remotePeer);
            if (pb?.protocols?.includes(CHAT_PROTOCOL)) {
              conn = c;
              targetPeerIdStr = c.remotePeer.toString();   // 今後のために覚えておく
              break;
            }
          }
        }

        // 3) 見つからなければ諦める（自動ダイヤルは行わない）
        if (!conn) {
          console.warn('送信可能な接続が見つかりません');
          return;
        }

        try {
          await sendMessageToPeer(conn, message);
        } catch (err) {
          console.error('送信エラー:', err);
        }
      }
    });
  }

  setupChatForm();

  // オンラインユーザー読み込みとオンライン・オフライン切り替え処理
  function setupOnlineStatus() {
    async function loadOnlineFriends() {
      try {
        const response = await fetch("/api/online");
        if (!response.ok) throw new Error("Failed to load online friends");

        const friends = await response.json();
        const ul = document.getElementById("online-friends-list");
        ul.innerHTML = "";

        friends.forEach(friend => {
          const li = document.createElement("li");
          const button = document.createElement("button");
          button.textContent = friend.name;
          button.onclick = () => {
            // multiaddr を input にセットして Connect ボタンを押す
            const input = document.getElementById("input-multiaddr");
            input.value = friend.multiaddr;
            // Multiaddr から PeerId 部分を抜き出して保存
            const idx = friend.multiaddr.lastIndexOf("/p2p/");
            if (idx !== -1) {
              targetPeerIdStr = friend.multiaddr.slice(idx + 5);
              console.log("🎯 targetPeerId set to", targetPeerIdStr);
            }
            document.getElementById("button-connect").click();
          };
          li.appendChild(button);
          ul.appendChild(li);
        });
      } catch (error) {
        console.error("Error fetching online friends:", error);
      }
    }

    let isOnline = false;

    async function setOnline(multiaddr) {
      try {
        const res = await fetch("/api/online", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: multiaddr,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error("HTTP " + res.status + ": " + text);
        }

        document.getElementById("status-text").textContent = "🟢オンライン";
        document.getElementById("status-text").classList.replace("text-red-600", "text-green-600");
        isOnline = true;
        console.log("🟢 オンライン登録完了:", multiaddr);
      } catch (err) {
        console.error("❌ オンライン登録失敗:", err);
      }
    }

    async function setOffline() {
      try {
        await fetch("/api/online", {
          method: "DELETE",
        });
        document.getElementById("status-text").textContent = "🔴オフライン";
        document.getElementById("status-text").classList.replace("text-green-600", "text-red-600");
        isOnline = false;
        console.log("🔴 オフライン登録完了");
      } catch (err) {
        console.error("オフライン登録失敗", err);
      }
    }

    const runOnlineSetup = () => {
      loadOnlineFriends();
      setInterval(loadOnlineFriends, 5000);

      document.getElementById("go-online").addEventListener("click", async () => {
        console.log("🕐 オンラインボタンが押されました");
        setTimeout(async () => {
          const addr = libp2p.getMultiaddrs()[0]?.toString();
          if (addr) {
            console.log("🔗 Multiaddr 取得成功:", addr);
            await setOnline(addr);
          } else {
            console.warn("⚠️ Multiaddr がまだ取得できません");
          }
        }, 200);       // ← small delay for address propagation
      });

      document.getElementById("go-offline").addEventListener("click", setOffline);

      window.addEventListener("beforeunload", () => {
        if (isOnline) {
          const addr = libp2p.getMultiaddrs()[0]?.toString();
          if (addr) {
            navigator.sendBeacon("/api/online", addr);
          }
        }
      });
    }

    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", runOnlineSetup);
    } else {
      runOnlineSetup();
    }
  }

  setupOnlineStatus();

  function connectTo(peerId) {
    const p = document.createElement("p");
    p.textContent = "[接続] " + peerId + " に接続しました。";
    document.getElementById("chat-box").appendChild(p);

    if (libp2p) {
      libp2p.dial(peerId).then(() => {
        console.log("接続成功:", peerId);
      }).catch(err => {
        console.error("接続失敗:", err);
      });
    }
  }

  window.connectTo = connectTo;
}

App().catch((err) => {
  console.error(err)
})
