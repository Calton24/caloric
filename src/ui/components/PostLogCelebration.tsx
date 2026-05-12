import { Modal, Pressable, StyleSheet, View } from "react-native";
import { TText } from "../primitives/TText";

type PostLogCelebrationProps = {
  visible: boolean;
  message: string;
  sub: string;
  emoji: string;
  microTrigger?: string;
  onDismiss: () => void;
};

/**
 * Lightweight post-save celebration overlay (day-journey copy).
 */
export function PostLogCelebration({
  visible,
  message,
  sub,
  emoji,
  microTrigger,
  onDismiss,
}: PostLogCelebrationProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <TText style={styles.emoji}>{emoji}</TText>
          <TText style={styles.title}>{message}</TText>
          <TText style={styles.sub}>{sub}</TText>
          {microTrigger ? (
            <TText style={styles.micro}>{microTrigger}</TText>
          ) : null}
          <Pressable onPress={onDismiss} style={styles.cta}>
            <TText style={styles.ctaLabel}>Continue</TText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#fff",
  },
  emoji: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.85,
    marginBottom: 12,
  },
  micro: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 16,
  },
  cta: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: "#111",
  },
  ctaLabel: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
