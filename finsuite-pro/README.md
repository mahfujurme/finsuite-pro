# 💰 FinSuite Pro v3

**Advanced Personal Finance Planning System** — A production-quality, modular single-page application built with vanilla JavaScript ES Modules, Chart.js, and SheetJS. Zero frameworks. Zero build tools. Just clean, well-structured modern JavaScript.

> **Portfolio context:** Built to demonstrate frontend architecture, financial domain knowledge, data visualisation, and real-world engineering practices to London tech hiring managers.

---

## ✨ Features

| Module | Description |
|---|---|
| 📊 **Dashboard** | 8 KPI cards, 6-month trend chart, Smart Insights engine (10+ rules), goals strip, expense donut, recent transactions, net worth summary |
| 💳 **Transactions** | Full CRUD, search + filter + date range, column sort, CSV export |
| 📂 **Import Data** | Drag-and-drop CSV/Excel import, auto column detection, manual mapping, **duplicate detection**, row-by-row validation, preview before confirm |
| 🗂️ **Budget Planner** | Multi-year income/expense budgets, monthly + yearly grid views, inline editable cells, planned vs actual with variance chart |
| 🏦 **Net Worth** | Asset + liability CRUD, 9 account types, daily NW snapshots, assets/liabilities ratio bar |
| 🔗 **Debt Planner** | Avalanche + Snowball simulation, extra payment slider, payoff timeline, total interest calculation |
| 💎 **Savings Plan** | Goals with icon/colour/deadline, contribution modal, monthly contribution grid per year |
| 🔄 **Subscriptions** | Monthly/yearly/weekly billing, pause/resume, monthly cost KPIs |
| 📈 **Forecast** | 3/6/12-month cash flow projection with balance line chart |
| ⚙️ **Settings** | Profile, currency (7), theme, Beginner/Advanced mode, feature toggles, JSON/CSV backup, trust layer |

---

## 🏗️ Architecture

### Core Patterns

| Pattern | Implementation |
|---|---|
| Single Source of Truth | `state.js` — all data flows through `State.get()` / `State.patch()` |
| Event Delegation | One `click` + `change` + `input` listener in `app.js` dispatches all UI events via `data-action` attributes — **zero inline `onclick` handlers** |
| Hash Routing | `router.js` — `/#/dash`, `/#/tx` etc. Browser back/forward works natively |
| Async API Layer | `services/api.js` — all data operations are `async`/`await`, swappable for real `fetch()` calls |
| Centralised Validation | `services/validator.js` — pure validation functions for all domain objects |
| Debounced Persistence | `store.js` — 280ms debounce on every state mutation |
| Chart Lifecycle | `components/chart.js` — `Charts.killAll()` called on navigation, prevents canvas re-use errors |

### Module Communication

```
User Action → data-action attr → app.js dispatcher
                                        ↓
                               Module method called
                                        ↓
                              State.patch(D => {...})
                                        ↓
                                  Store.queue()
                                  (debounced save)
                                        ↓
                               Module.render() (re-renders view)
```

Modules **never call each other directly** — all state flows through `State`.

---

## 📁 Folder Structure

```
finsuite-pro/
│
├── index.html               # App shell: view panes, modal, toasts
│                            # Zero inline event handlers — all data-action
├── README.md
│
├── css/
│   ├── base.css             # Design tokens, CSS variables, reset, responsive
│   ├── components.css       # Sidebar, buttons, cards, forms, tables, toasts
│   └── dashboard.css        # KPIs, charts, budget grid, import drop zone
│
└── js/
    ├── app.js               # Boot + event delegation (single dispatcher)
    ├── state.js             # Immutable state (State.get / State.patch)
    ├── store.js             # localStorage, export/import, debounced save
    ├── router.js            # Hash router with browser history support
    ├── utils.js             # Pure utilities: uid, formatCurrency, catCfg…
    │
    ├── services/
    │   ├── api.js           # ★ Mock async API layer (backend-ready)
    │   ├── validator.js     # ★ Centralised validation + duplicate detection
    │   ├── calculator.js    # Pure financial analytics (no UI)
    │   ├── insights.js      # Rule-based insights engine (10+ rules)
    │   └── parser.js        # CSV/Excel parsing + column auto-detection
    │
    ├── modules/
    │   ├── dashboard.js     # Dashboard view
    │   ├── transactions.js  # Transaction CRUD
    │   ├── budget.js        # Multi-year budget planner
    │   ├── networth.js      # Assets/liabilities tracker
    │   ├── debt.js          # Debt simulation (Snowball / Avalanche)
    │   ├── savings.js       # Goals + monthly contribution plan
    │   ├── importer.js      # Bulk import with duplicate detection
    │   ├── subscriptions.js # Subscription tracker
    │   ├── forecast.js      # 3–12 month cash flow projection
    │   └── settings.js      # Settings, feature toggles, data management
    │
    └── components/
        ├── chart.js         # Chart.js wrappers (theme-aware, lifecycle-managed)
        ├── form.js          # Modal dialog system
        ├── table.js         # Table builders (data-action driven)
        └── toast.js         # Toast notification system
```

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Language | Vanilla JS — ES2022 Modules | Demonstrates core skills without framework abstraction |
| Charts | Chart.js 4.4 | Industry-standard, lightweight, theme-aware |
| File Parsing | SheetJS 0.20 | Handles CSV, XLSX, XLS with zero friction |
| Fonts | Playfair Display + Syne + JetBrains Mono | Professional editorial feel |
| Storage | `localStorage` (client-side only) | Privacy-first: no server, no account needed |
| Build | **None** | Open `index.html` → runs immediately |

---

## 🚀 Setup

### Option 1 — VS Code Live Server (recommended)
1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `index.html` → **Open with Live Server**

### Option 2 — Python
```bash
cd finsuite-pro && python -m http.server 8080
# → http://localhost:8080
```

### Option 3 — Node.js
```bash
npx serve .
```

> ⚠️ ES Modules require an HTTP server. Direct `file://` opening will fail due to CORS restrictions on module imports.

### GitHub Pages
1. Push to GitHub
2. Settings → Pages → Source: **main / (root)**
3. Live at `https://<username>.github.io/<repo>/`

---

## 🔒 Privacy

All financial data is stored **exclusively in your browser's `localStorage`**.  
Nothing is transmitted to any server. Ever.  
Use **Settings → Export Full Backup** to create a portable JSON backup.

---

## 📸 Screenshots

> _Add after deploying_

| Dashboard | Budget Planner | Debt Simulator |
|---|---|---|
| _(screenshot)_ | _(screenshot)_ | _(screenshot)_ |

---

## 🧠 Engineering Decisions

| Decision | Rationale |
|---|---|
| Zero `window.*` globals | All module APIs are invoked by the central `app.js` dispatcher via `data-action` attributes — clean separation of concerns |
| Hash-based routing | Browser history works natively; bookmarks and direct URL access supported |
| `services/api.js` mock layer | Demonstrates backend readiness — swap internals for `fetch()` without touching modules |
| `services/validator.js` | Centralised validation keeps modules thin; pure functions are trivially unit-testable |
| Duplicate detection in importer | `date + amount + description` fingerprint prevents double-importing bank exports |
| `State.patch(fn)` write pattern | Single mutation point prevents data races; mirrors Redux/Zustand patterns |
| 280ms debounced autosave | Prevents `localStorage` thrashing during rapid inline edits (budget cells, etc.) |
| `Charts.killAll()` on navigation | Chart.js throws on canvas re-use; explicit cleanup prevents console errors |

---

## 💼 Why This Demonstrates Data Analyst Skills

| Skill | Evidence |
|---|---|
| **Data modelling** | State schema handles multi-year budgets, NW snapshots, goal tracking, debt simulation |
| **Financial analytics** | `calculator.js`: savings rate, expense ratio, budget accuracy, MoM trends, debt amortisation |
| **Data visualisation** | 5 chart types (bar, line, doughnut, stacked, horizontal) with theme-aware rendering |
| **ETL experience** | `parser.js`: column detection, date normalisation, Excel/CSV parsing, validation pipeline |
| **Insight generation** | `insights.js`: rule-based engine producing actionable financial recommendations |
| **Clean engineering** | Event delegation, pure services, ES modules, zero build tools |

---

## 🔮 Future Improvements

- [ ] Unit tests (Vitest) for `services/calculator.js` and `services/validator.js`
- [ ] IndexedDB for larger datasets
- [ ] Bank CSV presets (Monzo, Revolut, Barclays, HSBC)
- [ ] Recurring transaction auto-detection rules
- [ ] PWA support (service worker, offline mode)
- [ ] Multi-currency accounts with live exchange rates
- [ ] Goal sharing — export progress cards as images

---

## 📄 Licence

MIT — free to use, modify and distribute with attribution.

---

*Built with clean code, zero dependencies, and a genuine obsession with personal finance.*
