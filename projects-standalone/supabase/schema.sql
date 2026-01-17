-- =====================================================
-- SQL Schema for Projects Standalone Module
-- "Текущие объекты" (Current Objects) Page
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: projects
-- Description: Основная таблица проектов (текущих объектов)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    client_name text NOT NULL,
    contract_cost numeric(15,2) NOT NULL DEFAULT 0,
    contract_date date,
    area numeric(12,2),
    construction_end_date date,
    tender_id uuid,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT projects_pkey PRIMARY KEY (id),
    CONSTRAINT projects_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.projects IS 'Таблица текущих объектов (проектов)';
COMMENT ON COLUMN public.projects.id IS 'Уникальный идентификатор проекта (UUID)';
COMMENT ON COLUMN public.projects.name IS 'Название объекта';
COMMENT ON COLUMN public.projects.client_name IS 'Наименование заказчика';
COMMENT ON COLUMN public.projects.contract_cost IS 'Стоимость контракта';
COMMENT ON COLUMN public.projects.contract_date IS 'Дата контракта';
COMMENT ON COLUMN public.projects.area IS 'Площадь объекта (м²)';
COMMENT ON COLUMN public.projects.construction_end_date IS 'Дата окончания строительства';
COMMENT ON COLUMN public.projects.tender_id IS 'Ссылка на тендер';
COMMENT ON COLUMN public.projects.is_active IS 'Активен ли проект';
COMMENT ON COLUMN public.projects.created_by IS 'ID пользователя, создавшего проект';

-- =====================================================
-- Table: project_additional_agreements
-- Description: Дополнительные соглашения к проектам
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_additional_agreements (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL,
    agreement_number text NOT NULL,
    agreement_date date NOT NULL,
    amount numeric(15,2) NOT NULL DEFAULT 0,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_additional_agreements_pkey PRIMARY KEY (id),
    CONSTRAINT project_additional_agreements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.project_additional_agreements IS 'Дополнительные соглашения к проектам';
COMMENT ON COLUMN public.project_additional_agreements.id IS 'Уникальный идентификатор соглашения';
COMMENT ON COLUMN public.project_additional_agreements.project_id IS 'Ссылка на проект';
COMMENT ON COLUMN public.project_additional_agreements.agreement_number IS 'Номер соглашения';
COMMENT ON COLUMN public.project_additional_agreements.agreement_date IS 'Дата соглашения';
COMMENT ON COLUMN public.project_additional_agreements.amount IS 'Сумма соглашения';
COMMENT ON COLUMN public.project_additional_agreements.description IS 'Описание соглашения';

-- =====================================================
-- Table: project_monthly_completion
-- Description: Ежемесячное выполнение проектов
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_monthly_completion (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL CHECK (month >= 1 AND month <= 12),
    actual_amount numeric(15,2) NOT NULL DEFAULT 0,
    forecast_amount numeric(15,2),
    note text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_monthly_completion_pkey PRIMARY KEY (id),
    CONSTRAINT project_monthly_completion_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT project_monthly_completion_unique UNIQUE (project_id, year, month)
);

COMMENT ON TABLE public.project_monthly_completion IS 'Ежемесячное выполнение проектов';
COMMENT ON COLUMN public.project_monthly_completion.id IS 'Уникальный идентификатор записи';
COMMENT ON COLUMN public.project_monthly_completion.project_id IS 'Ссылка на проект';
COMMENT ON COLUMN public.project_monthly_completion.year IS 'Год';
COMMENT ON COLUMN public.project_monthly_completion.month IS 'Месяц (1-12)';
COMMENT ON COLUMN public.project_monthly_completion.actual_amount IS 'Фактическая сумма выполнения';
COMMENT ON COLUMN public.project_monthly_completion.forecast_amount IS 'Прогнозная сумма выполнения';
COMMENT ON COLUMN public.project_monthly_completion.note IS 'Примечание';

-- =====================================================
-- Table: tenders (simplified version)
-- Description: Тендеры (упрощённая версия для связи с проектами)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tenders (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    client_name text NOT NULL,
    tender_number text NOT NULL,
    submission_deadline timestamp with time zone,
    version integer DEFAULT 1,
    area_client numeric(12,2),
    area_sp numeric(12,2),
    usd_rate numeric(10,4),
    eur_rate numeric(10,4),
    cny_rate numeric(10,4),
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT tenders_pkey PRIMARY KEY (id),
    CONSTRAINT tenders_tender_number_key UNIQUE (tender_number)
);

COMMENT ON TABLE public.tenders IS 'Таблица тендеров';
COMMENT ON COLUMN public.tenders.id IS 'Уникальный идентификатор тендера';
COMMENT ON COLUMN public.tenders.title IS 'Название тендера';
COMMENT ON COLUMN public.tenders.tender_number IS 'Номер тендера';

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON public.projects(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_tender_id ON public.projects(tender_id);
CREATE INDEX IF NOT EXISTS idx_project_agreements_project_id ON public.project_additional_agreements(project_id);
CREATE INDEX IF NOT EXISTS idx_project_completion_project_id ON public.project_monthly_completion(project_id);
CREATE INDEX IF NOT EXISTS idx_project_completion_year_month ON public.project_monthly_completion(year, month);

-- =====================================================
-- Row Level Security (RLS) Policies
-- Enable RLS on tables
-- =====================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_additional_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_monthly_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read" ON public.projects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.project_additional_agreements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.project_monthly_completion
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.tenders
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated write" ON public.projects
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write" ON public.project_additional_agreements
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write" ON public.project_monthly_completion
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
