import { palette, spacing, typography } from "@/theme";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  dense?: boolean;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  dense = false,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, dense && styles.denseContainer]}>
      <View>
        <Text style={[styles.title, dense && styles.denseTitle]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, dense && styles.denseSubtitle]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  denseContainer: {
    paddingHorizontal: 0,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
    color: palette.text,
  },
  denseTitle: {
    fontSize: typography.subtitle,
  },
  subtitle: {
    marginTop: 4,
    fontSize: typography.body,
    color: palette.textMuted,
  },
  denseSubtitle: {
    fontSize: typography.caption,
  },
  action: {
    fontSize: typography.body,
    fontWeight: "600",
    color: palette.primary,
  },
});

export default SectionHeader;
