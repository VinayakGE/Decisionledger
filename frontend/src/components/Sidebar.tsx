import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { colors } from "../lib/styles";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";

const entityNav = [
  { to: "/decisions", label: "Decisions", countKey: "total_decisions" },
  { to: "/goals", label: "Goals", countKey: null },
  { to: "/questions", label: "Questions", countKey: "total_open_questions" },
  { to: "/actions", label: "Actions", countKey: "total_action_items" },
  { to: "/constraints", label: "Constraints", countKey: null },
];

const mainNav = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/upload", label: "Capture" },
  { to: "/sources", label: "Sources" },
];

function NavItem({
  to,
  label,
  end,
  count,
}: {
  to: string;
  label: string;
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
        justifyContent: "space-between",
        padding: "7px 24px",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? colors.primary : hovered ? colors.text : colors.textSecondary,
        background: isActive ? `${colors.primary}0A` : "transparent",
        borderLeft: isActive ? `2px solid ${colors.primary}` : "2px solid transparent",
        letterSpacing: isActive ? "-0.01em" : 0,
        transition: "all 0.12s",
      })}
    >
      <span>{label}</span>
      {count != null && count > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: colors.muted,
            marginRight: 4,
          }}
        >
          {count}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { data: insights } = useData(() => api.getInsights());
  const counts: Record<string, number> = {
    total_decisions: insights?.total_decisions ?? 0,
    total_open_questions: insights?.total_open_questions ?? 0,
    total_action_items: insights?.total_action_items ?? 0,
  };

  return (
    <nav
      style={{
        width: 200,
        minHeight: "100vh",
        background: colors.bg,
        borderRight: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: "28px 24px 24px",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: colors.primary,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: colors.text,
            }}
          >
            Decisionledger
          </span>
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            color: colors.muted,
            marginTop: 4,
            paddingLeft: 14,
          }}
        >
          Decision Intelligence
        </div>
      </div>

      {/* Main nav */}
      <div style={{ paddingTop: 16, paddingBottom: 8 }}>
        {mainNav.map(({ to, label, end }) => (
          <NavItem key={to} to={to} label={label} end={end} />
        ))}
      </div>

      {/* Divider */}
      <div style={{ margin: "8px 24px", borderTop: `1px solid ${colors.border}` }} />

      {/* Entity nav */}
      <div style={{ paddingTop: 8, paddingBottom: 8 }}>
        {entityNav.map(({ to, label, countKey }) => (
          <NavItem key={to} to={to} label={label} count={countKey ? counts[countKey] : null} />
        ))}
      </div>

      {/* Divider */}
      <div style={{ margin: "8px 24px", borderTop: `1px solid ${colors.border}` }} />

      {/* Insights */}
      <div style={{ paddingTop: 8 }}>
        <NavItem to="/insights" label="Insights" />
      </div>

      {/* Bottom — settings */}
      <div
        style={{
          marginTop: "auto",
          borderTop: `1px solid ${colors.border}`,
          paddingTop: 8,
          paddingBottom: 20,
        }}
      >
        <NavItem to="/settings" label="Settings" />
      </div>
    </nav>
  );
}
