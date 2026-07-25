# DataStream BI

**E-Commerce Executive Analytics Dashboard** — a dark-themed, single-page business intelligence dashboard with auth flow, built with vanilla HTML/CSS/JS.

## Features

- **Authentication** — Login/signup with floating labels, tab indicator, social buttons, and 3D tilt card
- **Dashboard** — KPI cards (Revenue, Orders, AOV, Conversion) with animated counters, Chart.js visualizations (Revenue line, Orders bar, Category donut), products table with CSV export
- **UI Effects** — Dark glassmorphism design, animated gradient orbs, floating dot particles, hologram light sweep, staggered entrance animations, toast notifications
- **Data Persistence** — User accounts stored via localStorage, session persisted across refresh
## Tech Stack

- Vanilla HTML5, CSS3, JavaScript (ES5)
- [Chart.js](https://www.chartjs.org/) for data visualizations
- [Font Awesome 6](https://fontawesome.com/) for icons
- No build tools, frameworks, or dependencies

## Getting Started

Open `index.html` in any modern browser.

**Demo accounts:**
- `admin@datastream.com` / `password123`
- `demo@datastream.com` / `demo1234`

## Project Structure

```
├── index.html     # Main HTML with auth + dashboard markup
├── style.css      # All styles (auth, dashboard, responsive)
├── app.js         # Application logic (auth, charts, animations)
└── README.md
```
