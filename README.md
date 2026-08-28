# FairShare — Rent & Utilities Calculator

FairShare is a dependency-light, browser-based calculator for sharing monthly rent and utilities between roommates.

## Features

- Equal, income-weighted, and custom room-weight splits.
- Monthly affordability analysis with a configurable 10–60% threshold.
- A roommate is affordable at or below the selected threshold and flagged when over it; the threshold is dynamic, not a fixed band.
- Exact cent reconciliation: displayed roommate shares always sum to the displayed total cost.
- Inline warnings for invalid/clamped inputs, zero-weight fallbacks, missing utilities, and shares greater than income.
- Computed remediation guidance for roommates over the selected threshold.
- Bar chart comparing each monthly share to its affordable cap.
- CSV export, local persistence, and shareable URL state.

## Local development

Open `index.html` in a modern browser, or serve the directory:

```bash
python -m http.server 3000
```

The app is static and can be deployed to GitHub Pages or any static host. Configure the host's standard static-site deployment settings; no repository workflow is required.
