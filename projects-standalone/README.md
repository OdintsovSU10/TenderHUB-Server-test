# Projects Standalone Module

Standalone модуль страницы "Текущие объекты" из TenderHUB.

## Структура проекта

```
projects-standalone/
├── src/
│   ├── pages/
│   │   └── Projects/           # Основная страница и компоненты
│   │       ├── Projects.tsx    # Главная страница
│   │       ├── ProjectDetail/  # Детальная страница проекта
│   │       ├── components/     # UI компоненты
│   │       └── hooks/          # Хуки для работы с данными
│   ├── contexts/
│   │   └── ThemeContext.tsx    # Контекст темы (светлая/тёмная)
│   └── lib/
│       └── supabase/           # Supabase клиент и типы
├── supabase/
│   └── schema.sql              # SQL схема базы данных
├── package.json
└── README.md
```

## Функционал

### Главная страница (/projects)
- Список текущих объектов с прогресс-барами
- Диаграмма Ганта (Gantt Chart) с помесячным выполнением
- Экспорт данных в Excel
- Поиск по объектам
- Переключение между видами (список / Ганта)

### Детальная страница (/projects/:projectId)
- Настройки проекта
- Помесячное выполнение с графиками
- Дополнительные соглашения

### Графики
- **GanttChart.tsx** - Диаграмма Ганта (react-chartjs-2, Line chart)
- **ScheduleChart.tsx** - График расписания (@ant-design/charts, Column chart)
- **MonthlyCompletion.tsx** - Помесячное выполнение

## Установка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Supabase

Создайте `.env` файл:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 3. Создание таблиц в базе данных

Выполните SQL из файла `supabase/schema.sql` в Supabase SQL Editor.

### 4. Запуск

```bash
npm run dev
```

## Интеграция в другой проект

### Необходимые зависимости

```json
{
  "@ant-design/charts": "^2.6.7",
  "@ant-design/icons": "^6.1.0",
  "@supabase/supabase-js": "^2.80.0",
  "@tanstack/react-query": "^5.90.16",
  "antd": "^5.28.0",
  "chart.js": "^4.4.0",
  "dayjs": "^1.11.19",
  "react": "^18.3.1",
  "react-chartjs-2": "^5.2.0",
  "react-dom": "^18.3.1",
  "react-router-dom": "^7.9.5",
  "xlsx-js-style": "^1.2.0"
}
```

### Провайдеры

Оберните приложение в необходимые провайдеры:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfigProvider } from 'antd';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfigProvider>
          {/* Ваши роуты */}
        </ConfigProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### Роутинг

```tsx
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/Projects/ProjectDetail';

const routes = [
  { path: '/projects', element: <Projects /> },
  { path: '/projects/:projectId', element: <ProjectDetail /> },
];
```

## Таблицы Supabase

| Таблица | Описание |
|---------|----------|
| `projects` | Основные данные проектов |
| `project_additional_agreements` | Дополнительные соглашения |
| `project_monthly_completion` | Помесячное выполнение |
| `tenders` | Тендеры (связь с проектами) |

## Типы данных

### ProjectFull
```typescript
interface ProjectFull {
  id: string;
  name: string;
  client_name: string;
  contract_cost: number;
  area?: number | null;
  construction_end_date?: string | null;
  tender_id?: string | null;
  is_active: boolean;
  // Вычисляемые поля
  additional_agreements_sum?: number;
  final_contract_cost?: number;
  total_completion?: number;
  completion_percentage?: number;
}
```

### ProjectCompletion
```typescript
interface ProjectCompletion {
  id: string;
  project_id: string;
  year: number;
  month: number;
  actual_amount: number;
  forecast_amount?: number | null;
}
```

### ProjectAgreement
```typescript
interface ProjectAgreement {
  id: string;
  project_id: string;
  agreement_number: string;
  agreement_date: string;
  amount: number;
  description?: string | null;
}
```

## Тема оформления

Модуль поддерживает светлую и тёмную тему через `ThemeContext`.

```tsx
import { useTheme } from './contexts/ThemeContext';

function MyComponent() {
  const { currentTheme, toggleTheme } = useTheme();
  // currentTheme: 'light' | 'dark'
}
```

## Экспорт в Excel

Компонент `GanttChart` поддерживает экспорт данных в Excel с форматированием:

- Несколько листов (по одному на проект + сводный)
- Стилизация ячеек
- Автоматическая ширина колонок

## Лицензия

Proprietary - SU-10 Construction Company
