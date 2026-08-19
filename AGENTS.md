# eventlaw contributor context

Read these files completely before making changes:

1. `SESSION.md` — current phase, validation gates, limitations, and next actions.
2. `DECISIONS.md` — accepted design constraints and their rationale.
3. `docs/spec.md` — normative finite-trace semantics.
4. the latest file under `docs/log/` — chronological evidence and checks.

Project constraints:

- Codex must never create or amend a Git commit, directly or through another
  tool. Only Luan authors commits. Leave changes unstaged and provide a suggested
  commit message when useful.
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
