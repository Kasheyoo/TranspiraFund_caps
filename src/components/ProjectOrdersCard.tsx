import { StyleSheet, Text, View } from "react-native";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { COLORS } from "../constants";
import type {
  ProjectOrderRecord,
  SuspensionOrderRecord,
  TimeExtensionRecord,
} from "../types";

interface Props {
  resumeOrder?: ProjectOrderRecord | null;
  validationOrder?: ProjectOrderRecord | null;
  suspensionOrder?: SuspensionOrderRecord | null;
  timeExtension?: TimeExtensionRecord | null;
}

const PLACEHOLDER = "—";
const NOT_ISSUED = "Not yet issued";

const fmt = (v?: string | number | null): string => {
  if (v === undefined || v === null || v === "") return PLACEHOLDER;
  return String(v);
};

const formatDate = (raw?: string | null): string => {
  if (!raw) return PLACEHOLDER;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface SectionProps {
  title: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  isEmpty: boolean;
  isLast?: boolean;
  children?: React.ReactNode;
}

const Section = ({
  title,
  icon,
  iconColor,
  iconBg,
  isEmpty,
  isLast,
  children,
}: SectionProps) => (
  <View style={[S.block, isLast && S.blockLast]}>
    <View style={S.headerRow}>
      <View style={[S.iconBox, { backgroundColor: iconBg }]}>
        <FontAwesome5 name={icon} size={10} color={iconColor} />
      </View>
      <Text style={S.headerText}>{title}</Text>
    </View>
    {isEmpty ? (
      <Text style={S.empty}>{NOT_ISSUED}</Text>
    ) : (
      <View style={S.grid}>{children}</View>
    )}
  </View>
);

const Cell = ({ label, value }: { label: string; value: string }) => (
  <View style={S.cell}>
    <Text style={S.cellLabel}>{label}</Text>
    <Text style={S.cellValue}>{value}</Text>
  </View>
);

export const ProjectOrdersCard = ({
  resumeOrder,
  validationOrder,
  suspensionOrder,
  timeExtension,
}: Props) => {
  const resumeEmpty =
    !resumeOrder || (!resumeOrder.number && !resumeOrder.date);
  const validationEmpty =
    !validationOrder || (!validationOrder.number && !validationOrder.date);
  const suspensionEmpty =
    !suspensionOrder ||
    (!suspensionOrder.number &&
      !suspensionOrder.date &&
      !suspensionOrder.reason);
  const timeExtEmpty =
    !timeExtension ||
    ((timeExtension.days === undefined || timeExtension.days === null) &&
      !timeExtension.reason);

  return (
    <View style={S.card}>
      <Text style={S.cardLabel}>PROJECT ORDERS</Text>

      <Section
        title="RESUME ORDER"
        icon="play"
        iconColor={COLORS.success}
        iconBg={COLORS.successSoft}
        isEmpty={resumeEmpty}
      >
        <Cell label="Order Number" value={fmt(resumeOrder?.number)} />
        <Cell label="Order Date" value={formatDate(resumeOrder?.date)} />
      </Section>

      <Section
        title="VALIDATION ORDER"
        icon="clipboard-check"
        iconColor={COLORS.primary}
        iconBg={COLORS.primarySoft}
        isEmpty={validationEmpty}
      >
        <Cell label="Order Number" value={fmt(validationOrder?.number)} />
        <Cell label="Order Date" value={formatDate(validationOrder?.date)} />
      </Section>

      <Section
        title="SUSPENSION ORDER"
        icon="pause"
        iconColor={COLORS.error}
        iconBg={COLORS.errorSoft}
        isEmpty={suspensionEmpty}
      >
        <Cell label="Order Number" value={fmt(suspensionOrder?.number)} />
        <Cell label="Order Date" value={formatDate(suspensionOrder?.date)} />
        <Cell label="Reason" value={fmt(suspensionOrder?.reason)} />
      </Section>

      <Section
        title="TIME EXTENSION"
        icon="clock"
        iconColor={COLORS.warning}
        iconBg={COLORS.warningSoft}
        isEmpty={timeExtEmpty}
        isLast
      >
        <Cell
          label="Days"
          value={
            timeExtension?.days !== undefined && timeExtension?.days !== null
              ? `${timeExtension.days} day${timeExtension.days !== 1 ? "s" : ""}`
              : PLACEHOLDER
          }
        />
        <Cell label="Reason" value={fmt(timeExtension?.reason)} />
      </Section>
    </View>
  );
};

const S = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.textTertiary,
    letterSpacing: 1,
    marginBottom: 14,
  },
  block: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  blockLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: { flex: 1, minWidth: "45%", gap: 4 },
  cellLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cellValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  empty: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontStyle: "italic",
    paddingLeft: 38,
  },
});
