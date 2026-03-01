import React, { useMemo, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GlassPanel } from "./src/components/GlassPanel";
import { palette } from "./src/theme/palette";

const heroImage =
  "https://images.unsplash.com/photo-1493244040629-496f6d136cc3?auto=format&fit=crop&w=1400&q=80";

const seedMessages = [
  { from: "friend", body: "今日の接続テストどう？" },
  { from: "me", body: "安定してきた。Relay fallbackも動いたよ。" },
  { from: "friend", body: "いいね。次はTailscaleモード設計しよう。" },
];

const onlineFriends = ["test1", "test2", "pi-node", "mac-main"];
type TransportMode = "auto" | "relay" | "wireguard";

function AppScreen() {
  const [online, setOnline] = useState(false);
  const [message, setMessage] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode>("auto");

  const statusText = useMemo(() => (online ? "オンライン" : "オフライン"), [online]);
  const statusColor = online ? palette.success : palette.danger;
  const transportHint = useMemo(() => {
    if (transportMode === "relay") return "Relay固定: 到達性を優先";
    if (transportMode === "wireguard") return "WireGuard優先: 端末VPN経路を優先";
    return "Auto: Direct優先、不可時Relay fallback";
  }, [transportMode]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      <ImageBackground source={{ uri: heroImage }} style={styles.background} imageStyle={styles.bgImage}>
        <LinearGradient
          colors={["rgba(6,15,30,0.68)", "rgba(7,21,43,0.92)"]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.brand}>p2pChat Native</Text>
            <View style={styles.headerRight}>
              <Ionicons name="shield-checkmark-outline" size={18} color={palette.textSecondary} />
              <Text style={styles.headerRightText}>E2E</Text>
            </View>
          </View>

          <GlassPanel style={styles.heroPanel} blurIntensity={32}>
            <Text style={styles.heroTitle}>Eagle Ridge Room</Text>
            <Text style={styles.heroSubtitle}>Relay + Direct P2P Preview</Text>
            <View style={styles.heroMetrics}>
              <Metric icon="radio-outline" label="接続" value={online ? "Live" : "Idle"} />
              <Metric icon="git-network-outline" label="Peer" value="4" />
              <Metric icon="time-outline" label="遅延" value="92ms" />
            </View>
          </GlassPanel>

          <View style={styles.row}>
            <Pressable
              style={[styles.toggle, online ? styles.toggleOff : styles.toggleOn]}
              onPress={() => setOnline(true)}
            >
              <Text style={styles.toggleText}>オンラインになる</Text>
            </Pressable>
            <Pressable
              style={[styles.toggle, online ? styles.toggleOffDanger : styles.toggleOff]}
              onPress={() => setOnline(false)}
            >
              <Text style={styles.toggleText}>オフラインにする</Text>
            </Pressable>
          </View>

          <Text style={styles.status}>
            ステータス: <Text style={{ color: statusColor }}>{statusText}</Text>
          </Text>

          <GlassPanel style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>接続モード</Text>
              <Text style={styles.sectionHint}>{transportHint}</Text>
            </View>
            <View style={styles.transportRow}>
              <Pressable
                style={[styles.transportBtn, transportMode === "auto" && styles.transportBtnActive]}
                onPress={() => setTransportMode("auto")}
              >
                <Text style={styles.transportBtnText}>Auto</Text>
              </Pressable>
              <Pressable
                style={[styles.transportBtn, transportMode === "relay" && styles.transportBtnActive]}
                onPress={() => setTransportMode("relay")}
              >
                <Text style={styles.transportBtnText}>Relay</Text>
              </Pressable>
              <Pressable
                style={[styles.transportBtn, transportMode === "wireguard" && styles.transportBtnActive]}
                onPress={() => setTransportMode("wireguard")}
              >
                <Text style={styles.transportBtnText}>WireGuard</Text>
              </Pressable>
            </View>
          </GlassPanel>

          <GlassPanel style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>オンラインの友達</Text>
              <Text style={styles.sectionHint}>自動更新</Text>
            </View>
            <View style={styles.friendWrap}>
              {onlineFriends.map((name) => (
                <View key={name} style={styles.friendChip}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.friendText}>{name}</Text>
                </View>
              ))}
            </View>
          </GlassPanel>

          <GlassPanel style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>メッセージ</Text>
              <Text style={styles.sectionHint}>P2P stream</Text>
            </View>

            {seedMessages.map((m, i) => (
              <View key={`${m.from}-${i}`} style={[styles.msg, m.from === "me" ? styles.msgMe : styles.msgPeer]}>
                <Text style={styles.msgLabel}>{m.from === "me" ? "あなた" : "相手"}</Text>
                <Text style={styles.msgBody}>{m.body}</Text>
              </View>
            ))}

            <View style={styles.inputRow}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="メッセージを入力"
                placeholderTextColor="rgba(244,247,255,0.4)"
                style={styles.input}
              />
              <Pressable style={styles.sendBtn}>
                <Ionicons name="paper-plane" size={16} color="#0A1A31" />
              </Pressable>
            </View>
          </GlassPanel>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

function Metric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={16} color={palette.textSecondary} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.night900,
  },
  background: {
    flex: 1,
  },
  bgImage: {
    opacity: 0.44,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  brand: {
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.3,
    fontFamily: "Avenir Next",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerRightText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    fontFamily: "Avenir Next",
  },
  heroPanel: {
    minHeight: 176,
  },
  heroTitle: {
    color: palette.textPrimary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: 0.2,
    fontFamily: "Avenir Next",
  },
  heroSubtitle: {
    color: palette.textSecondary,
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Avenir Next",
  },
  heroMetrics: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.stroke,
    backgroundColor: "rgba(6, 18, 35, 0.35)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 2,
  },
  metricLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    fontFamily: "Avenir Next",
  },
  metricValue: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Avenir Next",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  toggle: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleOn: {
    backgroundColor: "rgba(53, 218, 168, 0.88)",
  },
  toggleOff: {
    backgroundColor: "rgba(122, 140, 168, 0.45)",
  },
  toggleOffDanger: {
    backgroundColor: "rgba(244, 114, 182, 0.28)",
  },
  toggleText: {
    color: "#F4F7FF",
    fontWeight: "700",
    fontSize: 14,
    fontFamily: "Avenir Next",
  },
  status: {
    color: palette.textSecondary,
    fontSize: 14,
    fontFamily: "Avenir Next",
  },
  transportRow: {
    flexDirection: "row",
    gap: 8,
  },
  transportBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.stroke,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(11, 25, 45, 0.48)",
  },
  transportBtnActive: {
    borderColor: palette.accent,
    backgroundColor: "rgba(75, 160, 238, 0.28)",
  },
  transportBtnText: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Avenir Next",
  },
  section: {
    paddingBottom: 14,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Avenir Next",
  },
  sectionHint: {
    color: palette.textSecondary,
    fontSize: 12,
    fontFamily: "Avenir Next",
  },
  friendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  friendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: palette.stroke,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(8, 22, 40, 0.44)",
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  friendText: {
    color: palette.textPrimary,
    fontSize: 13,
    fontFamily: "Avenir Next",
  },
  msg: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  msgPeer: {
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(12,27,49,0.54)",
  },
  msgMe: {
    borderColor: palette.accentMuted,
    backgroundColor: "rgba(42,87,135,0.42)",
    alignSelf: "flex-end",
    maxWidth: "90%",
  },
  msgLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    marginBottom: 2,
    fontFamily: "Avenir Next",
  },
  msgBody: {
    color: palette.textPrimary,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Avenir Next",
  },
  inputRow: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.stroke,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: palette.textPrimary,
    backgroundColor: "rgba(9, 21, 37, 0.45)",
    fontFamily: "Avenir Next",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.accent,
  },
});
