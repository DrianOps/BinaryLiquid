# BinaryLiquid — Design System (Minimal & Professional)

Single source of truth for UI. Any agent/model editing the frontend **must follow this file**.
Reference feel: Uniswap / Linear / Stripe Dashboard — calm, neutral surfaces, one accent, few words.

---

## 1. Principles

1. **Less text.** One title per page + max one short subtitle line. No marketing paragraphs inside the app.
2. **One primary action per card.** Only that button is orange (`ui-btn-primary`). Everything else is secondary/ghost.
3. **Orange is an accent, not decoration.** Never orange backgrounds on cards, borders, icons-as-ornament or gradients.
4. **Status colors only mean status.** Emerald = success/live · Amber = testnet/warning · Rose = error/"Sin Liquidez".
5. **Technical details are collapsed.** Contract names, opcodes, covenant addresses, fee splits go under a "Detalles" toggle — never shown by default.
6. **No visual noise.** No glows, no gradient buttons/cards, no pulsing (except a tiny live dot or a loader), no emojis, no `uppercase tracking-widest` eyebrows, max 2 badges per row.

## 2. Tokens (auto light/dark — do NOT add `dark:` variants for these)

Defined as CSS variables in `src/index.css`, exposed in `tailwind.config.js`.

| Token | Use |
| --- | --- |
| `bg-canvas` | Page background |
| `bg-surface` | Cards |
| `bg-surface-2` | Inner panels, inputs, segmented controls |
| `bg-surface-3` | Hover state on `surface-2` |
| `border-line` / `border-line-strong` | Hairline borders / focus |
| `text-ink` | Primary text |
| `text-ink-2` | Secondary text |
| `text-ink-3` | Labels, hints, placeholders |
| `bg-primary` / `hover:bg-primary-hover` | The single primary CTA |

Radii: `rounded-card` (24px) cards · `rounded-panel` (16px) inner panels / big buttons · `rounded-control` (12px) inputs, buttons · `rounded-full` chips/badges.
Shadow: `shadow-soft` only. No other shadows.

## 3. Typography

- Font: Plus Jakarta Sans (already loaded). Mono: JetBrains Mono for addresses/hashes only.
- Weights allowed: **400, 500, 600, 700**. Never `font-black` / `font-extrabold` (logo excepted).
- Scale: page title `ui-title` (24–28px, 600) · section `ui-section-title` (16px, 600) · body `text-sm` · labels `text-xs` (500) · big numbers `ui-stat` (24px, 600, `tabular-nums`).
- Sentence case everywhere ("Agregar liquidez", not "AGREGAR LIQUIDEZ" or "Agregar Liquidez").
- All numbers: `tabular-nums`.

## 4. Spacing

Scale 4 · 8 · 12 · 16 · 24 · 32. Card padding `p-4 sm:p-5`. Gap between page sections `space-y-6`. Gap inside cards `space-y-3`/`space-y-4`.

## 5. Primitives (`src/index.css` → `@layer components`)

| Class | Purpose |
| --- | --- |
| `ui-page`, `ui-page-header`, `ui-title`, `ui-subtitle`, `ui-section-title` | Page layout |
| `ui-card`, `ui-panel`, `ui-divider`, `ui-row` | Surfaces & lists |
| `ui-label`, `ui-value`, `ui-stat`, `ui-muted` | Text roles |
| `ui-input` | Text/number inputs |
| `ui-btn-primary`, `ui-btn-secondary`, `ui-btn-ghost`, `ui-btn-inverse`, `ui-btn-disabled` (+ `ui-btn-lg`, `ui-btn-sm`) | Buttons |
| `ui-segment`, `ui-segment-item`, `ui-segment-item-active` | Tabs |
| `ui-badge`, `ui-badge-success`, `ui-badge-warn`, `ui-badge-danger` | Status badges |
| `ui-token-chip` | Token selector pill |

## 6. Page patterns

- **Header:** `ui-title` + optional one-line `ui-subtitle` on the left; network pill / one secondary action on the right.
- **Stats strip:** max 4 stats in one `ui-card` row (label `ui-label` above `ui-stat`), not 4 separate glowing cards.
- **Lists/tables:** one `ui-card`, rows separated by `border-line`, token icon + symbol + 2–3 numeric columns + one action.
- **Action forms (swap, deposit, borrow):** narrow centered card (`max-w-[440px]`), input panels in `ui-panel`, one primary CTA at the bottom whose label states the exact next step ("Conectar wallet BCH para pagar", "Ingresa un monto", "Depositar 50 USDT").
- **Empty states:** one line of `ui-muted` text + one secondary button. No illustrations.
- **"Sin Liquidez":** `ui-badge-danger`, disabled controls; no explanatory paragraph.

## 7. Don'ts (checklist before committing)

- [ ] No `font-black`, `font-extrabold`, `uppercase tracking-wider/widest` labels
- [ ] No `shadow-btc-glow*`, `animate-pulse-glow`, `animate-heartbeat`, gradient backgrounds on cards/buttons
- [ ] No more than one orange button visible per card
- [ ] No paragraph longer than one line inside the app (Landing hero may have two)
- [ ] No hard-coded hex colors (`#121722`, `#171e2c`…) — use tokens
- [ ] Logic, handlers, API calls and translations untouched when restyling
