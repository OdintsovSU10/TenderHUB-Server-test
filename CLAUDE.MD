# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenderHUB by SU_10 is a production-ready construction tender management portal for Bill of Quantities (BOQ) and bidding workflows built with Clean Architecture principles.

**Language Convention**: Russian UI, English code, Russian commit messages
**Current State**: Production MVP with full Supabase backend integration
**Architecture**: Clean Architecture / Domain-Driven Design (DDD)
**Organization**: SU-10 (Construction Company)
**Branding**: Complete design system documented in [BRANDING.md](BRANDING.md)

## Development Commands

```bash
# Core development
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000, auto-opens)
npm run build        # TypeScript check + Vite production build
npm run preview      # Preview production build
npm run lint         # ESLint with zero-warning enforcement
```

## 🚨 CRITICAL DATABASE RULES 🚨

```
DATABASE SINGLE SOURCE OF TRUTH:
supabase/schemas/prod.sql

- ALWAYS verify schema in prod.sql before ANY database work
- NEVER trust TypeScript types over prod.sql definitions
- prod.sql contains ALL Supabase system tables and business tables
- 69 total tables (43 Supabase system + 26 business tables)
```

**Key Business Tables**:
- `tenders` - Main tender records with currency rates, housing class, construction scope
- `client_positions` - Bill of Quantities positions (hierarchical with parent_position_id)
- `boq_items` - BOQ line items (materials/works) with commercial calculations
- `boq_items_audit` - Audit trail for BOQ changes
- `materials_library`, `material_names` - Material catalog and name library
- `works_library`, `work_names` - Works catalog and name library
- `units` - Unit of measurement reference table
- `cost_categories`, `detail_cost_categories`, `construction_cost_volumes` - Cost management
- `markup_tactics`, `markup_parameters`, `tender_markup_percentage` - Markup system
- `tender_pricing_distribution` - Rules for distributing costs between materials/work
- `templates`, `template_items` - Reusable work/material templates
- `cost_redistribution_results`, `subcontract_growth_exclusions` - Cost redistribution
- `users`, `roles` - User management with role-based access
- `user_tasks`, `user_position_filters` - User-specific data
- `notifications`, `tender_documents` - System notifications and documentation

**ENUMs Defined** (11 types):
- `access_status_type`: 'pending', 'approved', 'blocked'
- `boq_item_type`: 'мат', 'суб-мат', 'мат-комп.', 'раб', 'суб-раб', 'раб-комп.'
- `construction_scope_type`: 'генподряд', 'коробка', 'монолит'
- `currency_type`: 'RUB', 'USD', 'EUR', 'CNY'
- `delivery_price_type`: 'в цене', 'не в цене', 'суммой'
- `housing_class_type`: 'комфорт', 'бизнес', 'премиум', 'делюкс'
- `material_type`: 'основн.', 'вспомогат.'
- `task_status`: 'running', 'paused', 'completed'
- `user_role_type`: 'Руководитель', 'Администратор', 'Разработчик', 'Старший группы', 'Инженер'
- `work_mode`: 'office', 'remote'
- `work_status`: 'working', 'not_working'

## Clean Architecture Overview

### Directory Structure
```
src/
├── core/                          # Domain layer (business logic)
│   ├── domain/
│   │   ├── entities/             # Business entities (Tender, BoqItem, etc.)
│   │   └── value-objects/        # Value objects (Currency, UnitType, etc.)
│   ├── ports/
│   │   └── repositories/         # Repository interfaces (7 interfaces)
│   └── services/                 # Domain services
├── client/                        # Adapter layer (infrastructure)
│   ├── adapters/
│   │   ├── repositories/         # Repository implementations (Supabase adapters)
│   │   └── services/             # Service adapters
│   ├── contexts/                 # React contexts
│   ├── hooks/                    # Custom hooks
│   └── providers/                # Provider components
├── components/                    # UI components
│   ├── Auth/                     # Authentication components
│   ├── Icons/                    # Custom SVG icons (LogoIcon, HeaderIcon)
│   └── Layout/                   # Layout components (MainLayout)
├── pages/                         # Page components (20+ pages)
├── lib/                           # External libraries
│   └── supabase/                 # Supabase client (client.ts, types.ts)
├── types/                         # TypeScript type definitions
└── utils/                         # Utility functions
```

### Repository Pattern
- **Interfaces**: [src/core/ports/repositories/](src/core/ports/repositories/) (7 interfaces)
  - IBoqItemRepository, IClientPositionRepository, IMarkupTacticRepository
  - IMaterialRepository, IProjectRepository, ITenderRepository, IWorkRepository
- **Implementations**: [src/client/adapters/repositories/](src/client/adapters/repositories/) (Supabase adapters)
  - SupabaseBoqItemRepository, SupabaseClientPositionRepository, SupabaseTenderRepository
- **Dependency Injection**: CoreServicesProvider wraps the entire application

## Tech Stack

### Dependencies (Actually Installed)
```json
{
  "@supabase/supabase-js": "^2.80.0",
  "@tanstack/react-query": "^5.90.16",
  "@tanstack/react-query-devtools": "^5.91.2",
  "@ant-design/charts": "^2.6.7",
  "@ant-design/icons": "^6.1.0",
  "antd": "^5.28.0",
  "dayjs": "^1.11.19",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^7.9.5",
  "xlsx": "^0.18.5",
  "xlsx-js-style": "^1.2.0"
}
```

### Architecture Patterns
- **State Management**: TanStack Query for server state, React Context for client state
- **Authentication**: Supabase Auth with protected routes
- **Data Fetching**: Custom hooks wrapping repositories
- **Forms**: Ant Design forms with inline editing patterns
- **Routing**: React Router v7 with nested routes

## Implemented Pages (20+)

### Authentication
- [/login](src/pages/Auth/Login.tsx) - Email/password authentication
- [/register](src/pages/Auth/Register.tsx) - User registration
- [/forgot-password](src/pages/Auth/ForgotPassword.tsx) - Password reset request
- [/reset-password](src/pages/Auth/ResetPassword.tsx) - Password reset confirmation

### Core Features
- [/dashboard](src/pages/Dashboard/Dashboard.tsx) - Main hub with 8-card feature grid
- [/positions](src/pages/ClientPositions/ClientPositions.tsx) - Hierarchical BOQ management
- [/positions/:id/items](src/pages/PositionItems/PositionItems.tsx) - BOQ items (materials/works)
- [/commerce/proposal](src/pages/Commerce.tsx) - Commercial proposal calculations
- [/commerce/redistribution](src/pages/CostRedistribution.tsx) - Cost redistribution
- [/library](src/pages/Library.tsx) - Materials and works library
- [/library/templates](src/pages/Library/Templates.tsx) - Reusable template sets
- [/bsm](src/pages/Bsm/Bsm.tsx) - Business Specification Management
- [/financial-indicators](src/pages/FinancialIndicators/FinancialIndicators.tsx) - Financial analytics with charts
- [/projects](src/pages/Projects.tsx) - Project management
- [/projects/:id](src/pages/Projects/ProjectDetail.tsx) - Project detail with Gantt charts
- [/users](src/pages/Users/Users.tsx) - User management with access control
- [/tasks](src/pages/Tasks.tsx) - Task management system

### Admin Pages
- [/admin/nomenclatures](src/pages/Admin/Nomenclatures/Nomenclatures.tsx) - Material/work name libraries + units
- [/admin/tenders](src/pages/Admin/Tenders/Tenders.tsx) - Tender CRUD + BOQ Excel upload wizard
- [/admin/construction_cost](src/pages/Admin/ConstructionCost/ConstructionCost.tsx) - Cost category hierarchy
- [/admin/markup_constructor](src/pages/Admin/MarkupConstructor/MarkupConstructor.tsx) - Markup tactic configuration
- [/admin/markup](src/pages/Admin/MarkupPercentages/MarkupPercentages.tsx) - Markup percentage management
- [/costs](src/pages/Admin/ConstructionCostNew.tsx) - Alternative construction cost view

### Analytics
- [/analytics/comparison](src/pages/Analytics/ObjectComparison.tsx) - Object comparison analysis

### Placeholder
- /settings - Basic UI placeholder (minimal implementation)

## Authentication System

**Provider**: Supabase Auth
**Context**: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)
**Protection**: [src/components/Auth/ProtectedRoute.tsx](src/components/Auth/ProtectedRoute.tsx)

**User Roles** (5 types from user_role_type ENUM):
- Руководитель (Director)
- Администратор (Administrator)
- Разработчик (Developer)
- Старший группы (Senior Group Leader)
- Инженер (Engineer)

**User Metadata**:
- Stored in `users` table (linked to auth.users)
- Access control via `tender_access` table with access_status_type ENUM

## Code Constraints

### File Size Rule
**STRICT**: All files MUST be ≤ 600 lines
- Split large files into modules with barrel exports
- Extract components, hooks, utilities to separate files

### TypeScript Configuration
- Target: ES2020, strict mode
- No unused locals/parameters
- No implicit any
- React JSX transform (no React import needed)

### ESLint Rules
- Zero warnings enforced (`max-warnings: 0`)
- Fix all violations before committing

### Git Conventions
- **Commits**: Russian, imperative mood
- **Examples**: "Добавить валидацию форм", "Исправить ошибку в расчетах"
- **Branches**: feature/, fix/, refactor/ prefixes

## Component Hierarchy

```
App.tsx
└── QueryProvider (@tanstack/react-query)
    └── ThemeProvider
        └── AuthProvider
            └── NomenclaturesProvider
                └── CoreServicesProvider (Dependency Injection)
                    └── ConfigProvider (Ant Design)
                        └── Routes
                            └── ProtectedRoute
                                └── MainLayout
                                    ├── Sider (collapsible navigation)
                                    ├── Header (search, theme toggle, notifications, user menu)
                                    └── Content (Outlet for pages)
```

## Key Design Patterns

### Theme System
- **Context**: [src/contexts/ThemeContext.tsx](src/contexts/ThemeContext.tsx)
- **Storage**: localStorage key `tenderHub_theme`
- **Colors**: Primary #10b981 (emerald)
- **Dark Mode**: Black background (#000), sidebar #0a0a0a
- **Light Mode**: Ant Design default algorithm

**Implementation**:
```typescript
algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm
```

### Inline Editing Pattern
1. Click to edit (or Edit button)
2. Row/cell enters edit mode
3. Save (Enter key or Save button) - triggers database update
4. Cancel (Escape key or Cancel button)
5. Auto-update on successful save

### Hierarchical Data Pattern
- Self-referencing with `parent_id` field
- Used in: client_positions, cost_categories, templates
- Recursive rendering components

### Unit Color Coding
Standardized Tag colors across the application:
```typescript
'шт': 'blue',       // Pieces
'м': 'green',       // Meters
'м2': 'cyan',       // Square meters
'м3': 'purple',     // Cubic meters
'кг': 'orange',     // Kilograms
'т': 'red',         // Tons
'л': 'magenta',     // Liters
'компл': 'volcano', // Set
'м.п.': 'geekblue'  // Running meters
```

### Price Field Convention
- `initial_price`: Base price from library
- `calculated_price`: Price after markup application
- `total_price`: Price × quantity

### BOQ Item Types (boq_item_type ENUM)
- **мат** - Material
- **суб-мат** - Subcontracted Material
- **мат-комп.** - Component Material
- **раб** - Work
- **суб-раб** - Subcontracted Work
- **раб-комп.** - Component Work

## Supabase Integration

### Client Initialization
- **Location**: [src/lib/supabase/client.ts](src/lib/supabase/client.ts)
- **Environment Variables**:
  - `VITE_SUPABASE_URL` - Project URL
  - `VITE_SUPABASE_PUBLISHABLE_KEY` - Anonymous/public key
- **Features**: Auto-refresh tokens, session persistence, RLS enabled

### Type Generation
- **Types**: [src/lib/supabase/types.ts](src/lib/supabase/types.ts) (auto-generated, 1000+ lines)
- **Regenerate**: After schema changes in prod.sql
- **Note**: Domain entities are separate from database types (Clean Architecture)

### Query Patterns
- Use TanStack Query for caching and synchronization
- Repository pattern for data access abstraction
- Optimistic updates for better UX

## Excel Import/Export

### Import
- **Library**: xlsx
- **Used in**: Tenders (BOQ upload), Nomenclatures
- **Pattern**: 3-step wizard (Upload → Mapping → Preview)

### Export
- **Library**: xlsx-js-style (for styling)
- **Used in**: Financial Indicators, Construction Costs, Commerce
- **Pattern**: Multi-sheet exports with formatting and formulas

## Custom SVG Icons

**Location**: [src/components/Icons/](src/components/Icons/)
- **LogoIcon**: Building + crane design (used in sidebar)
- **HeaderIcon**: Modern house design (used in dashboard header)

**Props**: `size` (number), `color` (string), `className` (string)

## Dashboard Design System

### Card Grid (8 Features)
Each card includes:
- Gradient header (135deg angle)
- 64px circular icon container
- Hover effect: translateY(-6px) with enhanced shadow
- Responsive: xs={24} sm={12} lg={6}

### Gradient Color Assignments
1. Дашборд - #1a5f7a → #159957
2. Позиции заказчика - #10b981 → #059669
3. Коммерция - #06b6d4 → #0891b2
4. Библиотеки - #14b8a6 → #0d9488
5. Затраты - #34d399 → #10b981
6. Администрирование - #0284c7 → #0369a1
7. Пользователи - #0891b2 → #0e7490
8. Настройки - #22c55e → #16a34a

## Development Workflow

1. Pull latest from main: `git pull origin main`
2. Create feature branch: `git checkout -b feature/название`
3. Make changes (respect 600-line limit per file)
4. Run linter: `npm run lint` (fix ALL warnings)
5. Test locally: `npm run dev`
6. Commit: `git commit -m "Добавить функцию X"`
7. Push and create PR

## Vite Configuration

```typescript
// vite.config.ts key settings
server: {
  port: 3000,
  open: true  // Auto-opens browser
}
build: {
  sourcemap: true  // Enables debugging
}
resolve: {
  alias: {
    '@': '/src'  // Path alias for imports
  }
}
```

## Critical Gotchas

### Database
- **prod.sql is single source of truth** - no migration files used
- Schema managed via direct prod.sql exports and imports
- RLS policies exist but may be disabled - verify before querying
- Always check column types and constraints in prod.sql

### Authentication
- Protected routes require ProtectedRoute wrapper component
- User metadata in `users` table, NOT auth.users
- Tender access controlled via `tender_access` table with access_status_type

### Type Safety
- Supabase types are auto-generated - regenerate after schema changes
- Domain entities (core/domain) are separate from database types
- Use repository interfaces for type safety across layers

### Performance
- TanStack Query provides caching - use query keys wisely
- Batch database operations when possible
- Use React.memo for expensive components

## Additional Resources

- **Brand Identity**: See [BRANDING.md](BRANDING.md) for design system and logo usage
- **Deployment**: See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for production configuration

---

**Version**: MVP 1.0
**Last Updated**: 2026-01-14
**Maintained By**: Claude Code Agent
