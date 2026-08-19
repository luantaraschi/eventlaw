# Visual identity

Status: approved wordmark direction.

## Brand idea

The README hero is a wordmark, not a product diagram. It displays only
`eventlaw`, large and centered, with enough negative space to feel like a real
open-source product rather than a decorated documentation header.

The name carries the distinction:

- `event` uses the theme's primary ink;
- `law` uses the brand gradient;
- the continuous lowercase setting keeps both concepts as one product;
- tight tracking gives the mark density without adding an icon or tagline.

## Palette

| Role        | Dark theme | Light theme | Use                     |
| ----------- | ---------- | ----------- | ----------------------- |
| Primary ink | `#f5f7ff`  | `#171a2d`   | `event`                 |
| Law start   | `#a39aff`  | `#6655ef`   | start of `law` gradient |
| Law core    | `#7969ff`  | `#5847e8`   | brand anchor            |
| Law end     | `#43d7c5`  | `#0b9f92`   | end of `law` gradient   |

The gradient is confined to `law`. It should not become a general background,
badge treatment, or decorative glow.

## Type

The wordmark uses a deliberately heavy platform sans-serif stack:

```text
Arial Black, Arial, Helvetica, sans-serif
```

The SVG sets the mark at weight 900 with tight negative tracking. No font is
downloaded, so the README remains fast and does not depend on a font CDN or its
future rendering behavior.

If the identity later needs exact glyph shapes across every platform, the
approved wordmark can be converted to committed vector outlines after verifying
the typeface license.

## Assets

- `assets/eventlaw-wordmark-dark.png` is selected by GitHub in dark mode;
- `assets/eventlaw-wordmark-light.png` is selected in light mode and is the
  fallback;
- both PNGs have a transparent 1280 × 280 canvas with a real alpha channel;
- `assets/eventlaw-hero-dark.svg` and `assets/eventlaw-hero-light.svg` remain the
  small, editable vector sources;
- the npm package includes `assets` so its bundled README does not reference
  missing relative images.

The transparent background lets the mark belong to GitHub's surface instead of
appearing inside a separate promotional card.

## README hierarchy

The top of the README follows this order:

1. wordmark;
2. five factual badges;
3. short navigation to the core reading path;
4. one-sentence explanation and honest research-preview notice;
5. problem, API, evidence, and constraints.

Download counts, funding badges, customer logos, and performance claims should
only appear when they refer to real public evidence.

## Accessibility and constraints

- light and dark variants maintain strong contrast;
- the `<picture>` fallback text is simply the project name;
- there is no animation, remote font, JavaScript, or tracking pixel;
- the SVG contains no explanatory diagram or secondary copy;
- all product explanation stays in normal README text, where it remains
  searchable and accessible.

## Possible extensions

The same `law` gradient can now identify a square repository avatar and a 1280 ×
640 social preview. Those assets should remain typographic rather than
introducing a separate illustration language.
