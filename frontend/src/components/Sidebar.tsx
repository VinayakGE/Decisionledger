import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { colors } from "../lib/styles";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import {
  Upload,
  Target,
  GitBranch,
  HelpCircle,
  Zap,
  AlertTriangle,
  CheckSquare,
  Brain,
  Database,
  Settings,
} from "lucide-react";

const nav = [
  { to: "/", label: "Upload", icon: Upload, countKey: null },
  { to: "/sources", label: "Sources", icon: Database, countKey: null },
  { to: "/decisions", label: "Decisions", icon: GitBranch, countKey: "total_decisions" },
  { to: "/goals", label: "Goals", icon: Target, countKey: null },
  { to: "/questions", label: "Open Questions", icon: HelpCircle, countKey: "total_open_questions" },
  { to: "/actions", label: "Action Items", icon: CheckSquare, countKey: "total_action_items" },
  { to: "/constraints", label: "Constraints", icon: AlertTriangle, countKey: null },
  { to: "/insights", label: "Insights", icon: Zap, countKey: null },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  count,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  count?: number | null;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <NavLink
      to={to}
      end={end}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        textDecoration: "none",
        color: isActive ? colors.primary : hovered ? colors.text : colors.textSecondary,
        background: isActive
          ? `${colors.primary}18`
          : hovered
            ? `${colors.primary}0d`
            : "transparent",
        borderLeft: isActive ? `3px solid ${colors.primary}` : "3px solid transparent",
        fontWeight: isActive ? 600 : 400,
        fontSize: 14,
        transition: "all 0.15s",
      })}
    >
      <Icon size={16} />
      <span style={{ flex: 1 }}>{label}</span>
      {count != null && count > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            background: `${colors.primary}22`,
            color: colors.primary,
            borderRadius: 999,
            padding: "1px 7px",
            minWidth: 20,
            textAlign: "center",
          }}
        >
          {count}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const [settingsHovered, setSettingsHovered] = useState(false);
  const { data: insights } = useData(() => api.getInsights());
  const counts: Record<string, number> = {
    total_decisions: insights?.total_decisions ?? 0,
    total_open_questions: insights?.total_open_questions ?? 0,
    total_action_items: insights?.total_action_items ?? 0,
  };
  return (
    <nav
      style={{
        width: 220,
        minHeight: "100vh",
        background: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "24px 0 0",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 20px 24px",
          borderBottom: `1px solid ${colors.border}`,
          marginBottom: 16,
        }}
      >
        <Brain size={22} color={colors.primary} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: colors.text, lineHeight: 1.2 }}>
            Decisionledger
          </div>
          <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.2 }}>
            Decision Intelligence
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {nav.map(({ to, label, icon, countKey }) => (
          <NavItem
            key={to}
            to={to}
            label={label}
            icon={icon}
            end={to === "/"}
            count={countKey ? counts[countKey] : null}
          />
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 8, paddingBottom: 16 }}>
        <NavLink
          to="/settings"
          onMouseEnter={() => setSettingsHovered(true)}
          onMouseLeave={() => setSettingsHovered(false)}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            textDecoration: "none",
            color: isActive ? colors.primary : settingsHovered ? colors.text : colors.textSecondary,
            background: isActive
              ? `${colors.primary}18`
              : settingsHovered
                ? `${colors.primary}0d`
                : "transparent",
            borderLeft: isActive ? `3px solid ${colors.primary}` : "3px solid transparent",
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
            transition: "all 0.15s",
          })}
        >
          <Settings size={16} />
          Settings
        </NavLink>
      </div>
    </nav>
  );
}
