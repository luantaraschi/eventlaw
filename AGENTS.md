# eventlaw contributor context

Read these files completely before making changes:

1. `SESSION.md` — current phase, validation gates, limitations, and next actions.
2. `DECISIONS.md` — accepted design constraints and their rationale.
3. `docs/spec.md` — normative finite-trace semantics.
4. the latest file under `docs/log/` — chronological evidence and checks.

Project constraints:

- Codex owns routine command execution, staging, commits, pushes, and PR creation
  when they are normal steps within work requested by Luan; do not hand terminal
  work back to him or wait for a separate Git authorization. Inspect the exact
  diff first, preserve the configured `Luan Taraschi` Git identity, and never add
  Codex attribution or a generated co-author. Rewriting history, force-pushing,
  and other destructive Git operations still require specific approval.
- The package stays `private: true` until the user explicitly approves publication.
- The main `eventlaw` entry has no runtime dependencies.
- `fast-check` remains optional and isolated at `eventlaw/fast-check`.
- Law ASTs contain data, not JavaScript predicate functions.
- Time is explicit; never read the wall clock in the semantic core.
- A violation observed by an online monitor is terminal.
- Describe monitoring memory per operator. Never call the whole monitor bounded
  while an exact `atMostOnce` law remains unbounded.
- Never add implicit eviction to uniqueness. Retention must be represented in the
  law AST through an explicit semantic policy.
- New behavior needs tests, spec updates when semantics change, and a work-log entry.

Before handing off, run:

```bash
npm run check
npm run format:check
npm audit --audit-level=low
```

Then update `SESSION.md` so the next session can continue without reconstructing
the conversation.
