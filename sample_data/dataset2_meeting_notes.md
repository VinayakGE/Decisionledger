# Product roadmap sync — Nov 14

**Attendees:** Sarah (CEO), Marcus (CTO), Priya (Head of Product)

**User:** Sarah opened by saying we need to decide what Q1 looks like. We have three competing priorities: (1) finishing the mobile app, (2) the enterprise SSO integration that two prospects are blocking on, and (3) the reporting dashboard that current customers keep asking for.

**Assistant:** Marcus said the mobile app is 6 weeks of work minimum, probably 10. SSO is 3 weeks. The reporting dashboard is 4 weeks but has a lot of design uncertainty — we don't actually know what metrics customers want.

**User:** Priya pushed back on the reporting dashboard timeline. She said we did a customer interview last week and every single one of the 8 customers mentioned they can't show ROI to their CFO without better reporting. This is a churn risk, not just a nice-to-have.

**Assistant:** Marcus agreed reporting is important but said we can't do everything. He proposed: SSO first (3 weeks, unblocks two $40k ARR deals), then reporting (4 weeks, retention), mobile gets pushed to Q2.

**User:** Sarah asked if we could do SSO and reporting in parallel if we brought in a contractor. Marcus said yes, but we've never worked with contractors before and ramp time might eat the savings. Sarah said she's willing to try it for reporting since Priya knows exactly what's needed.

**Assistant:** After discussion, the team agreed: Marcus owns SSO delivery by Dec 15. Priya will hire a contractor this week for the reporting dashboard, targeting Jan 10 delivery. Mobile app is officially moved to Q2. Sarah will update the two SSO prospects today.

**User:** One open question: what happens if the contractor doesn't work out? We didn't answer that — Marcus said we'd deal with it if it happens. Priya said we should have a fallback plan but nobody wrote one down.

**Assistant:** Sarah closed by saying she's also worried about the API rate limit issue that's been causing intermittent failures for enterprise customers. That needs to be fixed regardless of roadmap — it's a P0. Marcus said he'll fix it this week in parallel to everything else.

# Architecture review — Nov 16

**User:** Marcus brought up that our current database schema won't scale past about 50k records per customer without serious performance issues. He's been seeing query times creep up in production. We're at 8k records for our largest customer now.

**Assistant:** Priya asked how long we have before it becomes a real problem. Marcus said at current growth rate, roughly 4 months. He wants to start a migration to a partitioned schema now while it's still manageable. The migration would take about 3 weeks and would need a maintenance window.

**User:** Sarah said we can't do a maintenance window during the SSO sprint — enterprise prospects are watching us. She asked if we can defer the migration to February. Marcus said we could but he's uncomfortable with the risk.

**Assistant:** They decided to defer the database migration to February but Marcus will add query optimisation this week as a temporary fix. Sarah acknowledged this is technical debt they're choosing to take on deliberately. Marcus will document the risk.
