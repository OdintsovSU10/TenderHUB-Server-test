# TenderHUB by SU_10

Construction tender management portal for Bill of Quantities (BOQ) and bidding workflows.

## Quick Start

### Prerequisites

- Node.js v18+
- npm
- Supabase account

### Installation

1. Clone and install dependencies:

```bash
git clone [repository-url]
cd HUBTender
npm install
```

2. Configure environment variables:

Create `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

3. Run development server:

```bash
npm run dev
```

Application opens at http://localhost:3000

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Ant Design 5
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: TanStack Query + React Context
- **Architecture**: Clean Architecture / DDD
- **Charts**: @ant-design/charts
- **Excel**: xlsx + xlsx-js-style

## Key Features

- Hierarchical Bill of Quantities (BOQ) management
- Commercial proposal calculations with markup strategies
- Excel import/export for BOQ and reports
- Financial analytics with interactive charts
- Multi-user access control with role-based permissions
- Project management with Gantt charts
- Reusable material/work template library
- Real-time cost redistribution calculations
- Audit trail for all changes

## Project Structure

```
src/
├── core/          # Domain layer (entities, value objects, ports)
├── client/        # Adapters, contexts, hooks, providers
├── components/    # Reusable UI components
├── pages/         # Page components (20+ pages)
├── lib/           # External libraries (Supabase client)
└── utils/         # Utility functions
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Developer guide for Claude Code agent (architecture, patterns, database schema)
- **[BRANDING.md](BRANDING.md)** - Design system and brand identity
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Production deployment guide

## Scripts

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # TypeScript check + production build
npm run preview  # Preview production build
npm run lint     # Run ESLint (zero warnings enforced)
```

## Contributing

See [CLAUDE.md](CLAUDE.md) for:
- Development workflow and git conventions
- Architecture patterns and code constraints
- Database schema and API patterns
- Testing guidelines

## License

MIT License

---

**TenderHUB by SU_10** - Портал управления тендерами СУ-10
