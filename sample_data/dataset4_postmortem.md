# Startup Postmortem: Why We Shut Down Loopback (B2B Feedback SaaS)

*Written 6 months after shutdown. Shared publicly to help other founders.*

## What we built

Loopback was a B2B SaaS tool that helped customer success teams collect, categorise, and route customer feedback internally. We raised $1.2M seed, had 23 paying customers at peak, and shut down after 28 months.

## The decisions that killed us

**User:** Decision 1: We chose not to charge for the first 12 months.

We made this decision in month 2 after an advisor told us "you need to get to 50 customers before you think about pricing." We followed that advice without questioning it. Evidence at the time: every advisor we spoke to said the same thing. Counter-evidence we ignored: two customers told us unsolicited they would pay immediately, one offered $500/month.

The result: we built an audience of users who were allergic to paying. When we introduced pricing at month 13, we lost 60% of our user base. The 40% who stayed became our real customers. We wasted 12 months growing the wrong cohort.

**Assistant:** Decision 2: We built for enterprise too early.

In month 8 we signed our first enterprise pilot (a 2,000-person company). The contract was $60k ARR. We made a collective decision to pivot our roadmap toward enterprise features: SSO, audit logs, admin controls, custom data retention. This consumed 6 months of engineering.

Evidence used to justify this decision: one signed enterprise contract and two more enterprise inbounds.
Evidence we ignored: our 40 existing SMB users were churning at 8%/month. We had a retention problem we refused to name.

The enterprise contracts never closed. The 2,000-person company did an internal tool instead. The two inbounds ghosted us after 4 months of sales cycles. We had spent 6 months building features no one bought.

**User:** Decision 3: We kept the founding team intact too long.

Our CTO was brilliant but stopped shipping in month 14. Code reviews took weeks. PRs sat for days. We had one conversation about it in month 16 that ended without resolution. We made an implicit decision to tolerate the situation rather than address it.

The constraint we acknowledged but didn't act on: replacing a co-founder mid-company is terrifying. The constraint we didn't acknowledge: a non-shipping CTO is a slow-motion company killer.

We finally had the hard conversation in month 22. Eight months too late. By then morale was broken and two engineers had quit.

## What we got right

**Assistant:** We got customer discovery right. We did 200+ customer interviews. We knew exactly what the problem was and who had it. Our NPS was 72 among active users. The product worked.

The failure was entirely strategic and operational, not product-market fit.

## What I'd do differently

**User:** I would have charged from day one. The evidence was there — two customers volunteered to pay. I would have treated that as the signal it was.

I would have defined "enterprise readiness" as a deliberate milestone, not something we drifted into. The constraint should have been: no enterprise deal worth less than $100k ARR, and only after we have 20 retained SMB customers.

I would have addressed the co-founder performance issue in month 15, not month 22. The open question I kept avoiding: "what happens if this doesn't improve?" I never made myself answer it.

## The single thing

**Assistant:** If I could go back, I would enforce one rule: every major decision must have a written down reason and a written down counter-argument. We made all three of our fatal decisions by defaulting to what felt safe, what advisors said, what we hoped would be true. None of them were written down. None had a devil's advocate.

The decisions were made in conversations, not documents. They evaporated. We couldn't learn from them because we couldn't find them.

That's what a tool like DecisionLedger could have changed.
