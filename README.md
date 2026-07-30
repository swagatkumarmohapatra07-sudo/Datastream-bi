# DataStream BI

**E-Commerce Executive Analytics Dashboard** — a clean, modern single-page business intelligence dashboard with role-based access, built with vanilla HTML/CSS/JS. Displays all monetary values in **Indian Rupees (₹)**.

## Features

- **Authentication** — Login/signup with floating labels, tab indicator, social buttons, and 3D tilt card
- **Role-Based Access** — Viewer (read-only), Creator (save views), Editor (manage data), Admin (system settings)
- **Dashboard** — KPI cards (Revenue, Orders, AOV, Conversion) with animated counters, Chart.js visualizations (Revenue vs Profit trend, Category donut, Conversion funnel), top products table with smart insights bar and live activity ticker
- **CSV Export** — Export full dashboard data to CSV
- **Query Console** — Built-in SQL editor with quick-query presets and results table
- **Report Builder** — Templates, scheduled exports, and report history
- **Data Pipeline** — Monitor live data sources with status indicators and progress bars
- **UI Effects** — Clean modern theme with light/dark mode, staggered card animations, smooth transitions, micro tooltips, toast notifications
- **Data Persistence** — User accounts stored via localStorage, session persisted across refresh

## Tech Stack

- Vanilla HTML5, CSS3, JavaScript (ES5)
- [Chart.js](https://www.chartjs.org/) for data visualizations
- [Font Awesome 6](https://fontawesome.com/) for icons
- No build tools, frameworks, or dependencies

## Currency

All monetary values are displayed in **Indian Rupees (₹)** with Indian locale formatting (`en-IN`).

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