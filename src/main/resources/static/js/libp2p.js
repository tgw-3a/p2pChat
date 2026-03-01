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


const CHAT_PROTOCOL = '/chat/1.0.0'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

// 直近で「接続」ボタンを押した相手の PeerId を保持
let targetPeerIdStr = null;
let targetMultiaddrStr = null;
// peerIdStr -> Array<Connection>
const connMap = new Map();
const RELAY_MULTIADDR = process.env.RELAY_MULTIADDR;
const RELAY_PEER_ID = RELAY_MULTIADDR?.match(/\/p2p\/([^/]+)$/)?.[1] ?? null;
// ネットワーク接続可否（offline時は新規接続を拒否）
let allowPeerNetworking = false;
// UI上のオンライン状態（メッセージ送受信許可）
let appOnline = false;
const TRANSPORT_MODE_KEY = "p2pchat.transportMode";
const TRANSPORT_MODES = Object.freeze({
  AUTO: "auto",
  RELAY: "relay",
  WIREGUARD: "wireguard",
});
let transportMode = TRANSPORT_MODES.AUTO;
console.log("📡 RELAY_MULTIADDR at libp2p setup:", RELAY_MULTIADDR);
const App = async () => {
  // chat 画面以外では libp2p を起動しない
  if (document.getElementById('chat-form') == null) {
    console.log('ℹ️ libp2p skipped: chat UI not found on this page');
    return;
  }

  const bootstrapPeers = RELAY_MULTIADDR ? [RELAY_MULTIADDR] : [];
  const libp2p = await createLibp2p({
     addresses: {
       listen: [
         '/webrtc',
 	],
     },
    transports: [
      webSockets({
        filter: filters.dnsWss,
      }),
      webTransport(),
      webRTC(),
       circuitRelayTransport({
         discoverRelays: 1,
       }),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux({ keepAlive: true })],
    connectionManager: {
      autoDial: false,
      minConnections: 0,
    },
    connectionGater: {
      denyDialMultiaddr: async () => !allowPeerNetworking,
      denyDialPeer: async () => !allowPeerNetworking,
      denyOutboundConnection: async () => !allowPeerNetworking,
      denyInboundConnection: async () => !allowPeerNetworking,
    },
    peerDiscovery: bootstrapPeers.length > 0
      ? [
          bootstrap({
            list: bootstrapPeers,
            interval: 30_000
          }),
        ]
      : [],
    services: {
      pubsub: gossipsub(),
      identify: identify(),
      // respond to /ipfs/ping/1.0.0 so remote peers can measure latency
    },
  })


  // 新しいメッセージ受信ハンドラ
  console.log("✅ chat handler registered");
  libp2p.handle(CHAT_PROTOCOL, async ({ stream }) => {
    if (!appOnline) {
      console.log('📴 offline中の受信streamを破棄しました');
      try { await stream.close?.(); } catch (_) {}
      return;
    }

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
          p.className = "chat-line chat-line-peer";
          p.textContent = '[相手] ' + message;
          box.appendChild(p);
        }
      }
    } catch (err) {
      console.error('❌ chat handler error:', err);
    }
  }, {
    runOnLimitedConnection: true,
    runOnTransientConnection: true,
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
    transportModeSelect: () => document.getElementById('transport-mode-select'),
    transportModeNote: () => document.getElementById('transport-mode-note'),
    outputQuery: () => document.getElementById('output'),
  }

  const isRelayAddr = (addr) => typeof addr === "string" && addr.includes("/p2p-circuit");
  const supportsNativeWireGuard = false;

  function normalizeTransportMode(value) {
    if (value === TRANSPORT_MODES.RELAY) return TRANSPORT_MODES.RELAY;
    if (value === TRANSPORT_MODES.WIREGUARD) return TRANSPORT_MODES.WIREGUARD;
    return TRANSPORT_MODES.AUTO;
  }

  function readTransportMode() {
    try {
      return normalizeTransportMode(localStorage.getItem(TRANSPORT_MODE_KEY));
    } catch (_) {
      return TRANSPORT_MODES.AUTO;
    }
  }

  function transportModeLabel(mode) {
    if (mode === TRANSPORT_MODES.RELAY) return "Relay";
    if (mode === TRANSPORT_MODES.WIREGUARD) return "WireGuard/Direct";
    return "Auto";
  }

  function updateTransportModeUI() {
    const select = DOM.transportModeSelect();
    const note = DOM.transportModeNote();
    if (select) {
      select.value = transportMode;
    }
    if (!note) return;
    if (transportMode === TRANSPORT_MODES.RELAY) {
      note.textContent = "Relay: 中継経路を優先し、到達性を重視します。";
      return;
    }
    if (transportMode === TRANSPORT_MODES.WIREGUARD) {
      note.textContent = supportsNativeWireGuard
        ? "WireGuard: 端末VPN経路を優先して中継を回避します。"
        : "WireGuard/Direct: Web版ではWireGuard未対応のためDirect経路として動作します。";
      return;
    }
    note.textContent = "Auto: Relay優先で接続し、状況に応じて到達可能な経路を選びます。";
  }

  function setTransportMode(next, { persist = true, announce = true } = {}) {
    const normalized = normalizeTransportMode(next);
    transportMode = normalized;
    if (persist) {
      try {
        localStorage.setItem(TRANSPORT_MODE_KEY, normalized);
      } catch (_) {}
    }
    updateTransportModeUI();
    if (announce) {
      console.log(`🧭 接続モード: ${transportModeLabel(normalized)}`);
      if (normalized === TRANSPORT_MODES.WIREGUARD && !supportsNativeWireGuard) {
        console.warn("⚠️ Web版ではWireGuardトンネルを直接利用できないため、Directモードとして扱います");
      }
    }
  }

  const relayAllowedByMode = () => transportMode !== TRANSPORT_MODES.WIREGUARD;
  const relayRequiredByMode = () => transportMode === TRANSPORT_MODES.RELAY;
  const directPreferredByMode = () => transportMode === TRANSPORT_MODES.WIREGUARD;

  update(DOM.nodePeerId(), libp2p.peerId.toString())
  update(DOM.nodeStatus(), 'Offline')
  setTransportMode(readTransportMode(), { persist: false, announce: false })

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

    const isRelay = RELAY_PEER_ID != null && RELAY_PEER_ID === idStr;
    if (isRelay) console.log('🛰️ relay peer connected');
  });
  libp2p.addEventListener('peer:disconnect', (e) => {
    const detail = e?.detail;
    const peerId =
      detail?.remotePeer ??
      detail?.peer ??
      detail?.connection?.remotePeer ??
      detail?.detail?.remotePeer ??
      detail?.detail?.peer ??
      null;
    const idStr  = peerId?.toString?.();
    if (idStr) {
      console.log('⚡ peer disconnect', idStr);
      connMap.delete(idStr);          // ← remove stale connections
      if (targetPeerIdStr === idStr) {
        // Keep selected target so sendWithRetry can auto-redial on next send.
        console.log("ℹ️ 選択中peerが切断されました。送信時に自動再接続を試行します");
      }
    } else {
      console.warn('⚡ peer disconnect (detail missing):', e);
      // detailが取れない場合でも現行接続からマップを再構築して整合を取る
      const active = new Set(libp2p.getConnections().map(c => c.remotePeer.toString()));
      for (const peerIdStr of Array.from(connMap.keys())) {
        if (!active.has(peerIdStr)) connMap.delete(peerIdStr);
      }
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
  }, 1000)

  DOM.loggingButtonEnable().onclick = (e) => {
    enable('*,*:debug')
  }
  DOM.loggingButtonDisable().onclick = (e) => {
    disable()
  }

  DOM.connectButton().onclick = async (e) => {
    e.preventDefault()
    if (!appOnline) {
      console.warn("📴 offline中は接続できません");
      return;
    }
    let maddr = multiaddr(DOM.inputMultiaddr().value)
    const inputAddr = DOM.inputMultiaddr().value.trim()
    if (relayRequiredByMode() && !isRelayAddr(inputAddr)) {
      console.warn("⚠️ Relayモードでは relay アドレスのみ接続できます");
      return;
    }
    if (directPreferredByMode() && isRelayAddr(inputAddr)) {
      console.warn("⚠️ WireGuard/Directモードでは relay アドレスを利用しません");
      return;
    }
    const idx = inputAddr.lastIndexOf("/p2p/")
    if (idx !== -1) {
      targetPeerIdStr = inputAddr.slice(idx + 5)
      targetMultiaddrStr = inputAddr
      console.log("🎯 targetPeerId set to", targetPeerIdStr)
    }

    console.log(maddr)
    try {
      await libp2p.dial(maddr)
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes("NO_RESERVATION")) {
        console.warn("⚠️ 相手の Relay 予約が見つかりません。相手にオンライン再登録を依頼してください。");
      }
      console.warn("接続失敗:", msg);
    }
  }

  window.libp2p = libp2p
  window.peerId = libp2p.peerId

  // 新しいメッセージ送信関数: 既存ConnectionのnewStreamを使う
async function sendMessageToPeer(conn, message) {
  if (!appOnline) {
    console.warn('📴 offline中のため送信を中止しました');
    return;
  }

  const streamOptions = {
    runOnLimitedConnection: true,
    runOnTransientConnection: true,
  };

  try {
    console.log('🔍 newStream on', conn.remotePeer.toString())
    let result;
    try {
      result = await conn.newStream(CHAT_PROTOCOL, streamOptions);
    } catch (err) {
      const code = err?.code || "";
      const msg = err?.message || String(err || "");
      const isTransient = code === "ERR_TRANSIENT_CONNECTION" || msg.includes("transient connection");
      if (!isTransient) throw err;
      console.warn('⚠️ conn.newStream は transient 制約で失敗。dialProtocol で再試行します');
      result = await libp2p.dialProtocol(conn.remotePeer, CHAT_PROTOCOL, streamOptions);
    }

    console.log('🧩 newStream result =', result)

    const stream = result?.stream ?? result;
    console.log('🧩 stream object =', stream)

    if (!stream?.sink) throw new Error('no stream.sink')

    await pipe([encoder.encode(message)], stream.sink)
    console.log('✅ sent', message)
  } catch (err) {
    console.error('🚨 newStream failed', err, err.code)
    throw err
  }
}


  // chat-form の送信イベントを処理
  function setupChatForm() {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const box = document.getElementById("chat-box");

    function isTransientError(err) {
      const code = err?.code || "";
      const msg = err?.message || String(err || "");
      return code === "ERR_TRANSIENT_CONNECTION" || msg.includes("transient connection");
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function ensureTargetConnection() {
      if (!targetPeerIdStr) {
        throw new Error("送信先が未選択です");
      }

      const targetPeerId = peerIdFromString(targetPeerIdStr);
      let connections = libp2p.getConnections(targetPeerId);

      if (connections.length === 0 && targetMultiaddrStr) {
        if (relayRequiredByMode() && !isRelayAddr(targetMultiaddrStr)) {
          throw new Error("Relayモードのため relay アドレスが必要です");
        }
        if (directPreferredByMode() && isRelayAddr(targetMultiaddrStr)) {
          throw new Error("WireGuard/Directモードのため relay アドレスでは再接続しません");
        }
        console.log("🔁 targetに再接続を試行:", targetMultiaddrStr);
        await libp2p.dial(multiaddr(targetMultiaddrStr));
        connections = libp2p.getConnections(targetPeerId);
      }

      return connections[0] ?? null;
    }

    async function sendWithRetry(message, maxTry = 4) {
      let lastErr = null;

      for (let i = 0; i < maxTry; i++) {
        const conn = await ensureTargetConnection();
        if (!conn) {
          await sleep(200 * (i + 1));
          continue;
        }

        try {
          await sendMessageToPeer(conn, message);
          return;
        } catch (err) {
          lastErr = err;
          if (!isTransientError(err)) throw err;
          console.warn("⚠️ 接続が一時状態です。再試行します");
          if (targetMultiaddrStr) {
            try {
              await libp2p.dial(multiaddr(targetMultiaddrStr));
            } catch (_) {}
          }
          await sleep(250 * (i + 1));
        }
      }

      throw lastErr ?? new Error("送信先への接続が見つかりません");
    }

    form.addEventListener("submit", async function(e) {
      e.preventDefault();
      const message = input.value.trim();
      if (message !== "") {
        if (!appOnline) {
          console.warn("📴 offline中のため送信できません");
          return;
        }

        input.value = "";

        try {
          await sendWithRetry(message);
          const p = document.createElement("p");
          p.className = "chat-line chat-line-me";
          p.textContent = "[あなた] " + message;
          box.appendChild(p);
        } catch (err) {
          console.error('送信エラー:', err?.message || err);
        }
      }
    });
  }

  setupChatForm();

  // オンラインユーザー読み込みとオンライン・オフライン切り替え処理
  function setupOnlineStatus() {
    let statusTransition = Promise.resolve();
    let onlineHeartbeatTimer = null;
    let lastPublishedOnlineAddr = null;

    const ONLINE_HEARTBEAT_MS = 20_000;

    function setStatusButtonsDisabled(disabled) {
      const onlineBtn = document.getElementById("go-online");
      const offlineBtn = document.getElementById("go-offline");
      if (onlineBtn) onlineBtn.disabled = disabled;
      if (offlineBtn) offlineBtn.disabled = disabled;
    }

    function runStatusTransition(name, task) {
      statusTransition = statusTransition.then(async () => {
        setStatusButtonsDisabled(true);
        try {
          await task();
        } catch (err) {
          console.error(`❌ ${name} 失敗:`, err);
        } finally {
          setStatusButtonsDisabled(false);
        }
      });
      return statusTransition;
    }

    async function closeAllConnections(maxRounds = 5) {
      for (let i = 0; i < maxRounds; i++) {
        const connections = libp2p.getConnections();
        if (connections.length === 0) break;
        await Promise.allSettled(connections.map(c => c.close()));
        await new Promise(r => setTimeout(r, 100));
      }
      connMap.clear();
      targetPeerIdStr = null;
      targetMultiaddrStr = null;
    }

    async function loadOnlineFriends() {
      try {
        const response = await fetch("/api/online");
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok) throw new Error("Failed to load online friends");

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Unexpected response while loading online friends");
        }

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
              targetMultiaddrStr = friend.multiaddr;
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

    async function postOnlinePresence(multiaddr, { quiet = false } = {}) {
      if (!multiaddr) return false;

      try {
        const res = await fetch("/api/online", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: multiaddr,
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return false;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error("HTTP " + res.status + ": " + text);
        }

        return true;
      } catch (err) {
        if (!quiet) {
          console.error("❌ オンライン登録失敗:", err);
        }
        return false;
      }
    }

    function stopOnlineHeartbeat() {
      if (onlineHeartbeatTimer != null) {
        clearInterval(onlineHeartbeatTimer);
        onlineHeartbeatTimer = null;
      }
    }

    function startOnlineHeartbeat() {
      stopOnlineHeartbeat();
      onlineHeartbeatTimer = setInterval(async () => {
        if (!appOnline || !lastPublishedOnlineAddr) return;

        const ok = await postOnlinePresence(lastPublishedOnlineAddr, { quiet: true });
        if (ok) return;

        // Fallback: try to refresh address and publish once more.
        const refreshed = await resolveOnlineAddr(20);
        if (!refreshed) return;
        lastPublishedOnlineAddr = refreshed;
        await postOnlinePresence(refreshed, { quiet: true });
      }, ONLINE_HEARTBEAT_MS);
    }

    async function setOnline(multiaddr) {
      const ok = await postOnlinePresence(multiaddr);
      if (ok) {
        lastPublishedOnlineAddr = multiaddr;
        startOnlineHeartbeat();

        document.getElementById("status-text").textContent = "🟢オンライン";
        document.getElementById("status-text").classList.replace("text-red-600", "text-green-600");
        appOnline = true;
        allowPeerNetworking = true;
        update(DOM.nodeStatus(), 'Online');
        await loadOnlineFriends();
        console.log("🟢 オンライン登録完了:", multiaddr);
      } else {
        stopOnlineHeartbeat();
        lastPublishedOnlineAddr = null;
        appOnline = false;
        allowPeerNetworking = false;
        update(DOM.nodeStatus(), 'Offline');
        try { await closeAllConnections(); } catch (_) {}
      }
    }

    async function setOffline({ notifyServer = true } = {}) {
      stopOnlineHeartbeat();
      lastPublishedOnlineAddr = null;
      appOnline = false;
      allowPeerNetworking = false;
      update(DOM.nodeStatus(), 'Offline');

      try {
        await closeAllConnections();
      } catch (err) {
        console.error("接続クローズ失敗", err);
      }

      let serverNotified = false;

      if (notifyServer) {
        try {
          const res = await fetch("/api/online", {
            method: "DELETE",
          });
          serverNotified = res.ok;
          if (!res.ok) {
            console.warn("⚠️ オフライン通知に失敗:", res.status, await res.text());
          }
        } catch (err) {
          console.warn("⚠️ オフライン通知に失敗(ネットワーク等):", err);
        }
      }

      document.getElementById("status-text").textContent = "🔴オフライン";
      document.getElementById("status-text").classList.replace("text-green-600", "text-red-600");
      if (serverNotified) {
        console.log("🔴 オフライン登録完了");
      } else {
        console.log("🔴 ローカル切断のみ完了（サーバー通知は未完了）");
      }
    }

    function hasRelayConnection() {
      if (!RELAY_PEER_ID) return false;
      try {
        return libp2p.getConnections(peerIdFromString(RELAY_PEER_ID)).length > 0;
      } catch (_) {
        return false;
      }
    }

    async function ensureRelayDial() {
      if (!RELAY_MULTIADDR) return;
      if (!relayAllowedByMode()) return;
      if (hasRelayConnection()) return;
      try {
        await libp2p.dial(multiaddr(RELAY_MULTIADDR));
      } catch (err) {
        console.warn("⚠️ Relay への接続試行に失敗:", err?.message || err);
      }
    }

    function pickDirectOnlineAddr(addrs, notLocal) {
      return addrs.find(a => !isRelayAddr(a) && a.includes("/webrtc") && notLocal(a))
        || addrs.find(a => !isRelayAddr(a) && notLocal(a))
        || addrs.find(a => !isRelayAddr(a))
        || null;
    }

    function pickPreferredOnlineAddr() {
      const addrs = libp2p.getMultiaddrs().map(a => a.toString());
      const isPrivateIpv4 = (a) =>
        a.includes("/ip4/10.") ||
        a.includes("/ip4/127.") ||
        a.includes("/ip4/192.168.") ||
        /\/ip4\/172\.(1[6-9]|2[0-9]|3[0-1])\./.test(a);
      const notLocal = (a) => !a.includes("/ip6/::1/") && !isPrivateIpv4(a);
      const directAddr = pickDirectOnlineAddr(addrs, notLocal);

      if (directPreferredByMode()) {
        return directAddr;
      }

      // When relay is configured, advertise only the address that actually exists
      // in our observed multiaddrs (means reservation is ready).
      if (RELAY_MULTIADDR && relayAllowedByMode()) {
        const myPeerId = libp2p.peerId.toString();
        const reservationReady = RELAY_PEER_ID
          ? addrs.some(a => a.includes(`/p2p/${RELAY_PEER_ID}/p2p-circuit/p2p/${myPeerId}`))
          : addrs.some(a => a.includes("/p2p-circuit/p2p/"));

        if (reservationReady) {
          // Always publish the externally reachable relay hostname, not docker-internal 172.x address.
          return `${RELAY_MULTIADDR}/p2p-circuit/p2p/${myPeerId}`;
        }
        if (!relayRequiredByMode() && directAddr) {
          return directAddr;
        }
        return null;
      }

      return directAddr || addrs[0] || null;
    }

    async function resolveOnlineAddr(maxTry = 120) {
      const relayFallbackAfter = 20; // about 6s (20 * 300ms)

      for (let i = 0; i < maxTry; i++) {
        if (RELAY_MULTIADDR && relayAllowedByMode() && (i === 0 || i % 10 === 0 || !hasRelayConnection())) {
          await ensureRelayDial();
        }
        const addr = pickPreferredOnlineAddr();
        if (addr) return addr;

        // If reservation propagation is slow after coming back online,
        // do not keep the user offline forever. Use relay-based fallback.
        if (RELAY_MULTIADDR && relayAllowedByMode() && i >= relayFallbackAfter && hasRelayConnection()) {
          const fallback = `${RELAY_MULTIADDR}/p2p-circuit/p2p/${libp2p.peerId.toString()}`;
          console.warn("⚠️ Relay予約待ちが長いため、暫定アドレスでオンライン復帰します");
          return fallback;
        }

        await new Promise(r => setTimeout(r, 300));
      }
      return null;
    }

    const runOnlineSetup = () => {
      const modeSelect = DOM.transportModeSelect();
      if (modeSelect) {
        modeSelect.addEventListener("change", (e) => {
          const selected = normalizeTransportMode(e?.target?.value);
          setTransportMode(selected);
          if (appOnline) {
            console.warn("ℹ️ 接続モード変更を反映するにはオフライン→オンラインを実行してください");
          }
        });
      }
      updateTransportModeUI();

      loadOnlineFriends();
      setInterval(loadOnlineFriends, 5000);

      document.getElementById("go-online").addEventListener("click", () => runStatusTransition("オンライン化", async () => {
        console.log("🕐 オンラインボタンが押されました");
        allowPeerNetworking = true;
        update(DOM.nodeStatus(), 'Connecting');
        const addr = await resolveOnlineAddr();
        if (addr) {
          console.log("🔗 Multiaddr 取得成功:", addr);
          await setOnline(addr);
        } else {
          allowPeerNetworking = false;
          update(DOM.nodeStatus(), 'Offline');
          try { await closeAllConnections(); } catch (_) {}
          console.warn("⚠️ Multiaddr が取得できません");
        }
      }));

      document.getElementById("go-offline").addEventListener("click", () => runStatusTransition("オフライン化", () => setOffline()));

      window.addEventListener("offline", () => {
        console.warn("📴 ブラウザがオフラインになったためローカル接続を切断します");
        runStatusTransition("オフライン化(イベント)", () => setOffline({ notifyServer: false }));
      });

      window.addEventListener("beforeunload", () => {
        if (appOnline) {
          navigator.sendBeacon("/api/online/offline-beacon", "offline");
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
    if (!appOnline) {
      console.warn("📴 offline中は接続できません");
      return;
    }
    const p = document.createElement("p");
    p.className = "chat-line chat-line-system";
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
