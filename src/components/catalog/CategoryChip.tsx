import { palette, radius, spacing, typography } from "@/theme";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface CategoryChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function CategoryChip({
  label,
  selected = false,
  onPress,
}: CategoryChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: palette.muted,
    marginRight: spacing.xs,
  },
  chipSelected: {
    backgroundColor: palette.primary,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: palette.text,
  },
  labelSelected: {
    color: palette.surface,
  },
});

export default CategoryChip;
