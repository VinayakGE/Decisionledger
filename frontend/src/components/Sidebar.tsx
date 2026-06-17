import React from "react";
import { NavLink } from "react-router-dom";
import { colors } from "../lib/styles";
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
} from "lucide-react";

const nav = [
  { to: "/", label: "Upload", icon: Upload },
  { to: "/sources", label: "Sources", icon: Database },
  { to: "/decisions", label: "Decisions", icon: GitBranch },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/questions", label: "Open Questions", icon: HelpCircle },
  { to: "/actions", label: "Action Items", icon: CheckSquare },
  { to: "/constraints", label: "Constraints", icon: AlertTriangle },
  { to: "/insights", label: "Insights", icon: Zap },
];

export function Sidebar() {
  return (
    <nav
      style={{
        width: 220,
        minHeight: "100vh",
        background: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
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
        <span style={{ fontWeight: 700, fontSize: 15, color: colors.text }}>Brain Audit</span>
      </div>
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            textDecoration: "none",
            color: isActive ? colors.primary : colors.textSecondary,
            background: isActive ? `${colors.primary}18` : "transparent",
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
            transition: "all 0.15s",
          })}
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
