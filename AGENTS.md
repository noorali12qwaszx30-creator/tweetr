# Project rules

- Glass styling lives in `src/index.css` as `.glass-card` (no backdrop blur, for lists/cards) and `.glass-panel` (blurred, for headers, bottom nav, dialogs, popovers); reuse these instead of ad-hoc translucency — keeps low-end POS phones fast.
- Screen roots must not paint `bg-background`; the ambient backdrop comes from `body::before` so glass surfaces show through it.
