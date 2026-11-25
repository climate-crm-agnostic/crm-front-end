# AGENTS.md — front-end rules for Climate CRM

Read this before changing any screen. The look below was approved by the CEO. A new module is not
"done" until it follows it. When in doubt, copy the closest existing page (`Teams.jsx`, `Periods.jsx`,
`Goals.jsx`, `PayablesAging.jsx` are the reference list pages) instead of inventing a variant.

Stack: React 19, Vite, Tailwind CSS 4, Radix UI, React Router 7. API calls live in `src/services/*`
(one file per entity, headers from `getHeaders()` in `services/api.js`). The built bundle is
copied into `../crm-back-end/frontend_build` with `npm run deploy`.

## 1. Where the style lives (change it there, never per page)

| What | Where |
|---|---|
| Colors, radius, shadows, light/dark values | `src/index.css` (`:root` and `.dark`) |
| Page title block | `src/components/PageHeader.jsx` |
| Buttons | `src/components/ui/button.jsx` |
| Tables and pagination | `src/components/Table.jsx`, `PaginationControls.jsx` |
| Section cards | `src/components/SectionCard.jsx` (`Card`, `CardHeader`) |
| Menu (hubs and tabs) | `src/hooks/useMenu.jsx` — single source of truth |
| Shell (icon rail, top bar) | `src/components/shell/*` |
| Product name of the AI assistant | `src/lib/brand.js` (`AI_NAME`, `AI_SHORT`, `AI_PATH`) |
| Number / money / date formatting | `src/lib/utils.js` |

## 2. Colors

Always use tokens (`var(--secondary)`, `text-muted-foreground`, `bg-card`, `border-border`, ...),
never a hard-coded hex or a Tailwind palette color for UI chrome. Tokens flip for dark mode on their
own; a hard-coded color does not and is a bug (it was the cause of most dark-mode regressions).

Brand values (light): green `#60d805`, dark green `#255b01` (`--secondary`, `--ink-brand`, titles),
slate green `#34534a` (`--muted-foreground`). Page background is a grey-green
(`color-mix(#34534a 9%, white)`), cards are white, borders and inputs are light green
(`color-mix(#60d805 45%, white)`). Dark mode: page `#1a1a1a`, cards `#242424`, accent `#7ed957`.

Status and category colors (stages, chips, option lists) come from the attribute options' own colors,
not from new constants.

## 3. Typography

- Headings and figures: Plus Jakarta Sans (`font-heading`). Text: DM Sans. Nothing else.
- No serif, no italics. Both fonts are loaded upright only and `index.css` forces
  `.italic, em, i { font-style: normal }`; do not fight it.
- Minimum text size is 12px. Never write `text-[8px]` ... `text-[11px]` or an inline `fontSize` below 12.
- Page title: `text-2xl font-bold tracking-tight` in `text-codex-texto-primary` — which `PageHeader` already does.

## 4. Pages

**List pages** start with the shared header, with the page's actions as its children:

```jsx
import { PageHeader } from "@/components/PageHeader";
import { Users2 } from "lucide-react";

<PageHeader icon={Users2} title="Teams" description="Organize users into teams with a leader and a roster.">
    <Button>...</Button>   {/* actions, toggles, balances: right-aligned, wrap on small screens */}
</PageHeader>
```

- Use the same icon as the page's entry in `useMenu.jsx`; keep the description to one line.
- Never hand-roll an `<h1>` plus icon tile. If the header needs a new capability, add a prop to `PageHeader`.
- Content below the header: `Card`/`CardHeader` blocks or the shared `Table` with pagination
  (use `fetchAllPages` / the paginated service helpers, do not render unbounded lists).
- Pages that are not lists keep their own layout: chat views (`Chat`, `ChettAI`), profile (`MyInfo`),
  docs (`ApiGuide`, `Faq`), and detail pages (`*Detail.jsx`, which use a back link + title + tabs).
  Public/auth pages (`Login`, `ContractSign`, `EventRegister`, ...) have their own look.
- Layout width: `mx-auto w-full max-w-5xl space-y-6 p-6` for focused pages, full width for tables.

**A new module is added in this order:** service file → page → route in `router/RouterApp.jsx`
(wrap with `PermissionGuard` and `FeatureGate` like its neighbors) → entry in `hooks/useMenu.jsx`
(`permission`, `feature`, icon) → `PageHeader` → test.

## 5. Interaction rules

- A modal holding anything the user typed must NOT close on a click on the backdrop; only Cancel/X
  (or the explicit action) closes it. Never lose composed content by accident.
- Destructive actions confirm with SweetAlert (`Swal.fire`, `showCancelButton`) using
  `confirmButtonColor: 'var(--secondary)'`. Success/error feedback is a toast
  (`toast: true, position: 'top-end', timer: 3000`).
- Every `SelectTrigger` fills its field (`w-full`).
- One kind of sale per document: a lead, quotation or invoice sells products OR services, never both;
  recurring billing is only for services. The UI hides or locks the other option.
- Intelligence (the AI assistant) is at the bottom of the icon rail on desktop and a floating button on
  mobile (`ChettButton`). Do not add it as a hub tab.

## 6. Formatting data on screen

- Numbers: `formatCount`, `formatDecimal`, `formatMoney` from `lib/utils.js` (thousands with a comma,
  `en-US`). Never `toLocaleString()` without a locale and never `toFixed` for display.
- Attribute values (currency, phone, percentage, url, dates, option labels): `formatAttributeValue`
  in `utils/attributeTypes.js`. It is verified against the backend with the shared corpus:
  run `npm run check:format-contract` after touching it.

## 7. Before you finish

1. `npx eslint <files you touched>` is clean (the repo has older unrelated errors; do not add new ones).
2. `npx vitest run` passes; add a test for new behavior (`__tests__/` next to the page or component).
3. `npm run build` succeeds.
4. Look at it in the browser in light AND dark mode, at 1280, 1024 and 390 px wide.
5. `grep -rn "text-\[[0-9]px\]" src` (anything under 12px) finds nothing new.
6. If you changed the UI that ships: `npm run deploy` regenerates `../crm-back-end/frontend_build`. That folder
   is generated; never merge or edit it by hand. After a merge, regenerate it instead of resolving conflicts.

## 8. Git

- `git fetch` first: other contributors push to this repo (the UI polish branches). Merge, do not
  cherry-pick, unless a commit must be excluded on purpose.
- Commits carry only the author's own identity (no `Co-Authored-By` trailers).
