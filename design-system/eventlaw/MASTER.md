# Eventlaw website design system

Last reviewed: 2026-08-19

## Product and page job

Eventlaw is a TypeScript library for expressing executable temporal laws once,
then running the same JSON-safe definition against generated inputs, recorded
traces, and live streams.

The website must help an event-driven TypeScript developer understand that idea
in under 30 seconds, prove it with a real browser demo, and make the research
preview boundary explicit before sending them to GitHub.

## Visual direction

The visual metaphor is a **temporal law laboratory**: precise, dark, calm, and
instrument-like. It should feel like a trustworthy developer tool rather than a
dashboard template or a marketing landing-page kit.

- Use asymmetry, rule lines, state labels, and a single diagnostic surface.
- Use the approved violet-to-teal `law` gradient as a signal, not as decoration.
- Prefer square or lightly rounded geometry. Avoid floating glass cards, large
  shadows, decorative blobs, and repeated feature-card grids.
- The signature interaction is the Trace Lab, which executes the repository's
  real verifier and counterexample minimizer in the browser.
- Do not reproduce Lull's light editorial paper, serif prose, indigo palette, or
  notebook-like layout. The shared principle is only: explain a real problem and
  let the visitor run the real code.

## Tokens

### Color

Dark is the authored default. Light mode keeps the same semantic hierarchy and
may follow the operating-system preference or the visitor's saved choice.

| Role          | Dark      | Light     |
| ------------- | --------- | --------- |
| Canvas        | `#071412` | `#f4f8f6` |
| Raised canvas | `#0b1d1a` | `#ffffff` |
| Code surface  | `#06100f` | `#eaf1ee` |
| Strong text   | `#eef8f4` | `#10201c` |
| Muted text    | `#9db0aa` | `#53645f` |
| Hairline      | `#27413a` | `#c8d5d0` |
| Violet        | `#8f70ff` | `#6347db` |
| Teal          | `#50e3c2` | `#087d69` |
| Pass          | `#58d68d` | `#167343` |
| Fail          | `#ff7c72` | `#b92d2b` |
| Pending       | `#f4c95d` | `#8a5a00` |

All body text and controls must reach WCAG AA contrast. Never encode pass, fail,
or pending through color alone; pair color with a label and symbol.

### Type

- Display and body: platform sans stack (`Inter`, `Segoe UI`, system fallbacks).
- Code and data: platform monospace (`JetBrains Mono`, `SFMono-Regular`,
  `Cascadia Code`, `Consolas`, fallbacks).
- One `h1`; headings use tight tracking and sentence case.
- Body line-height: 1.6. Code line-height: 1.65.
- Use `clamp()` for the hero heading, with a practical maximum near 72px.

### Space and geometry

- Four-pixel base scale; primary rhythm: 8, 12, 16, 24, 32, 48, 72, 112.
- Content width: 1180px, with at least 20px mobile gutters.
- Controls: minimum 44px hit target.
- Corner radii: 0, 4, 8, and 14px only. The Trace Lab may use 18px as the
  singular large container.
- Shadows are reserved for the sticky header; hierarchy otherwise comes from
  surface color and borders.

## Layout

1. Sticky, compact header with wordmark, section links, GitHub, and theme toggle.
2. Asymmetric hero: thesis and calls to action on the left; executable law
   specimen on the right. The fold must preview the Trace Lab.
3. Trace Lab: one law, three scenarios, input events, report, and minimized
   counterexample. This is the primary proof, not an ornamental mock-up.
4. A connected horizontal rail for Generated / Recorded / Live. It must read as
   one definition travelling through three modes, not three unrelated cards.
5. Portable-definition section with real TypeScript and a concise JSON-safe AST
   explanation.
6. Adapter and research-preview boundaries.
7. Final GitHub call to action and compact footer.

## Interaction

- Buttons use visible hover, active, and `:focus-visible` states.
- Scenario tabs implement `aria-selected`; the report uses `aria-live="polite"`.
- Theme preference is stored locally and system preference is honored initially.
- Copy controls report success without changing layout.
- Motion is limited to the trace cursor, result reveal, and small control state
  changes (120–220ms). Respect `prefers-reduced-motion: reduce`.
- Do not animate layout continuously or use scroll-driven spectacle.

## Responsive behavior

- 320–479px: single column, no horizontal page overflow, stacked actions, Trace
  Lab events and report arranged vertically.
- 480–767px: same reading order with more generous gutters.
- 768–1023px: two-column hero where viable; Trace Lab remains readable without
  shrinking code below 13px.
- 1024px and above: full asymmetric hero and side-by-side Trace Lab panes.
- Navigation collapses nonessential section links before the GitHub and theme
  controls become cramped.

## Accessibility and quality gates

- Semantic landmarks, skip link, descriptive title/metadata, and one `h1`.
- Keyboard operation for every interactive element; never remove focus outlines.
- Decorative SVGs are hidden; meaningful graphics have accessible names.
- No fake metrics, testimonials, partner logos, or package-availability claims.
- Verify at 375px, 768px, and 1440px, in both themes, with no console errors.
- The production page must load from the repository subpath `/eventlaw/`.

## Voice

Precise, direct, and candid. Prefer “Run the same law against a trace” over broad
claims such as “revolutionize reliability.” Explain what exists today and label
future ambitions as such.
