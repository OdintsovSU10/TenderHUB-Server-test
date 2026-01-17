-- ============================================
-- PUBLIC SCHEMA TABLES FOR NEW SUPABASE
-- Generated: 2026-01-17
-- Execute AFTER creating ENUM types
-- ============================================

-- Enable uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- GROUP 1: Independent tables
-- ============================================

-- Table: public.units (BASE TABLE - must be first!)
CREATE TABLE IF NOT EXISTS public.units (
    code text NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT units_pkey PRIMARY KEY (code)
);

-- Table: public.roles
CREATE TABLE IF NOT EXISTS public.roles (
    code text NOT NULL,
    name text NOT NULL,
    allowed_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_system_role boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    color text DEFAULT 'default'::text,
    CONSTRAINT roles_pkey PRIMARY KEY (code),
    CONSTRAINT roles_name_key UNIQUE (name)
);

-- ============================================
-- GROUP 2: Reference tables (depend on units)
-- ============================================

-- Table: public.material_names
CREATE TABLE IF NOT EXISTS public.material_names (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    unit text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT material_names_pkey PRIMARY KEY (id),
    CONSTRAINT material_names_unit_fkey FOREIGN KEY (unit) REFERENCES public.units(code)
);

-- Table: public.work_names
CREATE TABLE IF NOT EXISTS public.work_names (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    unit text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT work_names_pkey PRIMARY KEY (id),
    CONSTRAINT work_names_unit_fkey FOREIGN KEY (unit) REFERENCES public.units(code)
);

-- Table: public.cost_categories
CREATE TABLE IF NOT EXISTS public.cost_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    unit text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cost_categories_pkey PRIMARY KEY (id),
    CONSTRAINT cost_categories_unit_fkey FOREIGN KEY (unit) REFERENCES public.units(code)
);

-- ============================================
-- GROUP 3: Detailed reference tables
-- ============================================

-- Table: public.detail_cost_categories
CREATE TABLE IF NOT EXISTS public.detail_cost_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    cost_category_id uuid NOT NULL,
    location text NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    order_num integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT detail_cost_categories_pkey PRIMARY KEY (id),
    CONSTRAINT detail_cost_categories_cost_category_id_fkey FOREIGN KEY (cost_category_id) REFERENCES public.cost_categories(id),
    CONSTRAINT detail_cost_categories_unit_fkey FOREIGN KEY (unit) REFERENCES public.units(code)
);

-- Table: public.materials_library
CREATE TABLE IF NOT EXISTS public.materials_library (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    material_type material_type NOT NULL,
    item_type boq_item_type NOT NULL,
    consumption_coefficient numeric(10,4) DEFAULT 1.0000,
    unit_rate numeric(15,2) NOT NULL,
    currency_type currency_type NOT NULL DEFAULT 'RUB'::currency_type,
    delivery_price_type delivery_price_type NOT NULL DEFAULT 'в цене'::delivery_price_type,
    delivery_amount numeric(15,2) DEFAULT 0.00,
    material_name_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT materials_library_pkey PRIMARY KEY (id),
    CONSTRAINT materials_library_material_name_id_fkey FOREIGN KEY (material_name_id) REFERENCES public.material_names(id)
);

-- Table: public.works_library
CREATE TABLE IF NOT EXISTS public.works_library (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    work_name_id uuid NOT NULL,
    item_type boq_item_type NOT NULL,
    unit_rate numeric(15,2) NOT NULL,
    currency_type currency_type NOT NULL DEFAULT 'RUB'::currency_type,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT works_library_pkey PRIMARY KEY (id),
    CONSTRAINT works_library_work_name_id_fkey FOREIGN KEY (work_name_id) REFERENCES public.work_names(id)
);

-- Table: public.markup_parameters
CREATE TABLE IF NOT EXISTS public.markup_parameters (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    key text NOT NULL,
    label text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    order_num integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    default_value numeric(5,2) NOT NULL DEFAULT 0,
    CONSTRAINT markup_parameters_pkey PRIMARY KEY (id),
    CONSTRAINT markup_parameters_key_key UNIQUE (key)
);

-- ============================================
-- GROUP 4: Users (depends on auth.users)
-- ============================================

-- Table: public.users
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    access_status access_status_type NOT NULL DEFAULT 'pending'::access_status_type,
    approved_by uuid,
    approved_at timestamp with time zone,
    registration_date timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    access_enabled boolean DEFAULT true,
    role_code text NOT NULL,
    allowed_pages jsonb DEFAULT '[]'::jsonb,
    tender_deadline_extensions jsonb DEFAULT '[]'::jsonb,
    current_work_mode work_mode DEFAULT 'office'::work_mode,
    current_work_status work_status DEFAULT 'working'::work_status,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT fk_users_auth_users FOREIGN KEY (id) REFERENCES auth.users(id),
    CONSTRAINT users_role_code_fkey FOREIGN KEY (role_code) REFERENCES public.roles(code)
);

-- Add self-referencing FK after table creation
ALTER TABLE public.users
ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

-- ============================================
-- GROUP 5: Tenders
-- ============================================

-- Table: public.markup_tactics
CREATE TABLE IF NOT EXISTS public.markup_tactics (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text,
    sequences jsonb NOT NULL DEFAULT '{"мат": [], "раб": [], "суб-мат": [], "суб-раб": [], "мат-комп.": [], "раб-комп.": []}'::jsonb,
    base_costs jsonb NOT NULL DEFAULT '{"мат": 0, "раб": 0, "суб-мат": 0, "суб-раб": 0, "мат-комп.": 0, "раб-комп.": 0}'::jsonb,
    user_id uuid,
    is_global boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT markup_tactics_pkey PRIMARY KEY (id),
    CONSTRAINT markup_tactics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Table: public.tenders
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
    upload_folder text,
    bsm_link text,
    tz_link text,
    qa_form_link text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    markup_tactic_id uuid,
    apply_subcontract_works_growth boolean DEFAULT true,
    apply_subcontract_materials_growth boolean DEFAULT true,
    housing_class housing_class_type,
    construction_scope construction_scope_type,
    project_folder_link text,
    is_archived boolean NOT NULL DEFAULT false,
    volume_title text DEFAULT 'Полный объём строительства'::text,
    CONSTRAINT tenders_pkey PRIMARY KEY (id),
    CONSTRAINT tenders_tender_number_key UNIQUE (tender_number),
    CONSTRAINT tenders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
    CONSTRAINT tenders_markup_tactic_id_fkey FOREIGN KEY (markup_tactic_id) REFERENCES public.markup_tactics(id)
);

-- Table: public.client_positions
CREATE TABLE IF NOT EXISTS public.client_positions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    position_number numeric(10,2) NOT NULL,
    unit_code text,
    volume numeric(18,6),
    client_note text,
    item_no text,
    work_name text NOT NULL,
    manual_volume numeric(18,6),
    manual_note text,
    hierarchy_level integer DEFAULT 0,
    is_additional boolean DEFAULT false,
    parent_position_id uuid,
    total_material numeric(18,2) DEFAULT 0,
    total_works numeric(18,2) DEFAULT 0,
    material_cost_per_unit numeric(18,6) DEFAULT 0,
    work_cost_per_unit numeric(18,6) DEFAULT 0,
    total_commercial_material numeric(18,6) DEFAULT 0,
    total_commercial_work numeric(18,6) DEFAULT 0,
    total_commercial_material_per_unit numeric(18,6) DEFAULT 0,
    total_commercial_work_per_unit numeric(18,6) DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT client_positions_pkey PRIMARY KEY (id),
    CONSTRAINT client_positions_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT client_positions_unit_code_fkey FOREIGN KEY (unit_code) REFERENCES public.units(code),
    CONSTRAINT client_positions_parent_position_id_fkey FOREIGN KEY (parent_position_id) REFERENCES public.client_positions(id)
);

-- Table: public.boq_items
CREATE TABLE IF NOT EXISTS public.boq_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tender_id uuid NOT NULL,
    client_position_id uuid NOT NULL,
    sort_number integer NOT NULL DEFAULT 0,
    boq_item_type boq_item_type NOT NULL,
    material_type material_type,
    material_name_id uuid,
    work_name_id uuid,
    unit_code text,
    quantity numeric(18,6),
    base_quantity numeric(18,6),
    consumption_coefficient numeric(10,4),
    conversion_coefficient numeric(10,4),
    delivery_price_type delivery_price_type,
    delivery_amount numeric(15,2) DEFAULT 0.00,
    currency_type currency_type DEFAULT 'RUB'::currency_type,
    total_amount numeric(18,2),
    detail_cost_category_id uuid,
    quote_link text,
    commercial_markup numeric(10,4),
    total_commercial_material_cost numeric(18,6),
    total_commercial_work_cost numeric(18,6),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    parent_work_item_id uuid,
    description text,
    unit_rate numeric(18,2) DEFAULT 0.00,
    CONSTRAINT boq_items_pkey PRIMARY KEY (id),
    CONSTRAINT boq_items_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT boq_items_client_position_id_fkey FOREIGN KEY (client_position_id) REFERENCES public.client_positions(id),
    CONSTRAINT boq_items_material_name_id_fkey FOREIGN KEY (material_name_id) REFERENCES public.material_names(id),
    CONSTRAINT boq_items_work_name_id_fkey FOREIGN KEY (work_name_id) REFERENCES public.work_names(id),
    CONSTRAINT boq_items_unit_code_fkey FOREIGN KEY (unit_code) REFERENCES public.units(code),
    CONSTRAINT boq_items_detail_cost_category_id_fkey FOREIGN KEY (detail_cost_category_id) REFERENCES public.detail_cost_categories(id),
    CONSTRAINT boq_items_parent_work_item_id_fkey FOREIGN KEY (parent_work_item_id) REFERENCES public.boq_items(id)
);

-- Table: public.boq_items_audit
CREATE TABLE IF NOT EXISTS public.boq_items_audit (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    boq_item_id uuid NOT NULL,
    operation_type text NOT NULL,
    changed_at timestamp with time zone NOT NULL DEFAULT now(),
    changed_by uuid,
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    CONSTRAINT boq_items_audit_pkey PRIMARY KEY (id),
    CONSTRAINT boq_items_audit_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id)
);

-- ============================================
-- GROUP 6: Tender-related tables
-- ============================================

-- Table: public.tender_markup_percentage
CREATE TABLE IF NOT EXISTS public.tender_markup_percentage (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    markup_parameter_id uuid NOT NULL,
    value numeric(8,5) NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tender_markup_percentage_pkey PRIMARY KEY (id),
    CONSTRAINT tender_markup_percentage_tender_param_key UNIQUE (tender_id, markup_parameter_id),
    CONSTRAINT tender_markup_percentage_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT tender_markup_percentage_markup_parameter_id_fkey FOREIGN KEY (markup_parameter_id) REFERENCES public.markup_parameters(id)
);

-- Table: public.tender_pricing_distribution
CREATE TABLE IF NOT EXISTS public.tender_pricing_distribution (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    markup_tactic_id uuid,
    basic_material_base_target text NOT NULL DEFAULT 'material'::text,
    basic_material_markup_target text NOT NULL DEFAULT 'work'::text,
    auxiliary_material_base_target text NOT NULL DEFAULT 'work'::text,
    auxiliary_material_markup_target text NOT NULL DEFAULT 'work'::text,
    work_base_target text NOT NULL DEFAULT 'work'::text,
    work_markup_target text NOT NULL DEFAULT 'work'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    subcontract_basic_material_base_target text NOT NULL DEFAULT 'work'::text,
    subcontract_basic_material_markup_target text NOT NULL DEFAULT 'work'::text,
    subcontract_auxiliary_material_base_target text NOT NULL DEFAULT 'work'::text,
    subcontract_auxiliary_material_markup_target text NOT NULL DEFAULT 'work'::text,
    component_material_base_target text NOT NULL DEFAULT 'work'::text,
    component_material_markup_target text NOT NULL DEFAULT 'work'::text,
    component_work_base_target text NOT NULL DEFAULT 'work'::text,
    component_work_markup_target text NOT NULL DEFAULT 'work'::text,
    CONSTRAINT tender_pricing_distribution_pkey PRIMARY KEY (id),
    CONSTRAINT tender_pricing_distribution_tender_tactic_key UNIQUE (tender_id, markup_tactic_id),
    CONSTRAINT tender_pricing_distribution_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT tender_pricing_distribution_markup_tactic_id_fkey FOREIGN KEY (markup_tactic_id) REFERENCES public.markup_tactics(id)
);

-- Table: public.construction_cost_volumes
CREATE TABLE IF NOT EXISTS public.construction_cost_volumes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    detail_cost_category_id uuid,
    volume numeric(18,6) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    group_key text,
    CONSTRAINT construction_cost_volumes_pkey PRIMARY KEY (id),
    CONSTRAINT construction_cost_volumes_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT construction_cost_volumes_detail_cost_category_id_fkey FOREIGN KEY (detail_cost_category_id) REFERENCES public.detail_cost_categories(id)
);

-- Table: public.cost_redistribution_results
CREATE TABLE IF NOT EXISTS public.cost_redistribution_results (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tender_id uuid NOT NULL,
    markup_tactic_id uuid NOT NULL,
    boq_item_id uuid NOT NULL,
    original_work_cost numeric(18,2),
    deducted_amount numeric(18,2) NOT NULL DEFAULT 0,
    added_amount numeric(18,2) NOT NULL DEFAULT 0,
    final_work_cost numeric(18,2),
    redistribution_rules jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    CONSTRAINT cost_redistribution_results_pkey PRIMARY KEY (id),
    CONSTRAINT cost_redistribution_results_tender_tactic_boq_key UNIQUE (tender_id, markup_tactic_id, boq_item_id),
    CONSTRAINT cost_redistribution_results_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT cost_redistribution_results_markup_tactic_id_fkey FOREIGN KEY (markup_tactic_id) REFERENCES public.markup_tactics(id),
    CONSTRAINT cost_redistribution_results_boq_item_id_fkey FOREIGN KEY (boq_item_id) REFERENCES public.boq_items(id),
    CONSTRAINT cost_redistribution_results_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Table: public.subcontract_growth_exclusions
CREATE TABLE IF NOT EXISTS public.subcontract_growth_exclusions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tender_id uuid NOT NULL,
    detail_cost_category_id uuid NOT NULL,
    exclusion_type text NOT NULL DEFAULT 'works'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subcontract_growth_exclusions_pkey PRIMARY KEY (id),
    CONSTRAINT subcontract_growth_exclusions_tender_category_type_key UNIQUE (tender_id, detail_cost_category_id, exclusion_type),
    CONSTRAINT subcontract_growth_exclusions_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT subcontract_growth_exclusions_detail_cost_category_id_fkey FOREIGN KEY (detail_cost_category_id) REFERENCES public.detail_cost_categories(id)
);

-- Table: public.tender_documents
CREATE TABLE IF NOT EXISTS public.tender_documents (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tender_id uuid NOT NULL,
    section_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    original_filename character varying(255),
    content_markdown text NOT NULL,
    file_size bigint,
    upload_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tender_documents_pkey PRIMARY KEY (id),
    CONSTRAINT tender_documents_tender_section_file_key UNIQUE (tender_id, section_type, original_filename),
    CONSTRAINT tender_documents_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id)
);

-- ============================================
-- GROUP 7: Templates and Projects
-- ============================================

-- Table: public.templates
CREATE TABLE IF NOT EXISTS public.templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    detail_cost_category_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT templates_pkey PRIMARY KEY (id),
    CONSTRAINT templates_detail_cost_category_fk FOREIGN KEY (detail_cost_category_id) REFERENCES public.detail_cost_categories(id)
);

-- Table: public.template_items
CREATE TABLE IF NOT EXISTS public.template_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL,
    kind text NOT NULL,
    work_library_id uuid,
    material_library_id uuid,
    parent_work_item_id uuid,
    conversation_coeff numeric(18,6),
    position integer NOT NULL DEFAULT 0,
    note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    detail_cost_category_id uuid,
    CONSTRAINT template_items_pkey PRIMARY KEY (id),
    CONSTRAINT template_items_template_fk FOREIGN KEY (template_id) REFERENCES public.templates(id),
    CONSTRAINT template_items_work_library_fk FOREIGN KEY (work_library_id) REFERENCES public.works_library(id),
    CONSTRAINT template_items_material_library_fk FOREIGN KEY (material_library_id) REFERENCES public.materials_library(id),
    CONSTRAINT template_items_parent_work_item_fk FOREIGN KEY (parent_work_item_id) REFERENCES public.template_items(id),
    CONSTRAINT template_items_detail_cost_category_fk FOREIGN KEY (detail_cost_category_id) REFERENCES public.detail_cost_categories(id)
);

-- Table: public.projects
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    client_name text NOT NULL,
    contract_cost numeric(15,2) NOT NULL DEFAULT 0,
    area numeric(12,2),
    construction_end_date date,
    tender_id uuid,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    contract_date date,
    CONSTRAINT projects_pkey PRIMARY KEY (id),
    CONSTRAINT projects_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id)
);

-- Table: public.project_additional_agreements
CREATE TABLE IF NOT EXISTS public.project_additional_agreements (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL,
    agreement_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text,
    agreement_number text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT project_additional_agreements_pkey PRIMARY KEY (id),
    CONSTRAINT project_additional_agreements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);

-- Table: public.project_monthly_completion
CREATE TABLE IF NOT EXISTS public.project_monthly_completion (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    actual_amount numeric(15,2) NOT NULL DEFAULT 0,
    forecast_amount numeric(15,2),
    note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT project_monthly_completion_pkey PRIMARY KEY (id),
    CONSTRAINT project_monthly_completion_project_year_month_key UNIQUE (project_id, year, month),
    CONSTRAINT project_monthly_completion_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);

-- ============================================
-- GROUP 8: User data
-- ============================================

-- Table: public.user_tasks
CREATE TABLE IF NOT EXISTS public.user_tasks (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    tender_id uuid NOT NULL,
    description text NOT NULL,
    task_status task_status DEFAULT 'running'::task_status,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT user_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT user_tasks_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id)
);

-- Table: public.user_position_filters
CREATE TABLE IF NOT EXISTS public.user_position_filters (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    tender_id uuid NOT NULL,
    position_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_position_filters_pkey PRIMARY KEY (id),
    CONSTRAINT user_position_filters_user_tender_position_key UNIQUE (user_id, tender_id, position_id),
    CONSTRAINT user_position_filters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT user_position_filters_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id),
    CONSTRAINT user_position_filters_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.client_positions(id)
);

-- Table: public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    related_entity_type text,
    related_entity_id uuid,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- ============================================
-- VIEWS
-- ============================================

-- View: materials_library_full_view
CREATE OR REPLACE VIEW public.materials_library_full_view AS
SELECT
    m.id,
    m.material_type,
    m.item_type,
    mn.name AS material_name,
    mn.unit,
    m.consumption_coefficient,
    m.unit_rate,
    m.currency_type,
    m.delivery_price_type,
    m.delivery_amount,
    m.created_at,
    m.updated_at
FROM materials_library m
JOIN material_names mn ON m.material_name_id = mn.id;

-- View: works_library_full_view
CREATE OR REPLACE VIEW public.works_library_full_view AS
SELECT
    w.id,
    w.item_type,
    wn.name AS work_name,
    wn.unit,
    w.unit_rate,
    w.currency_type,
    w.created_at,
    w.updated_at
FROM works_library w
JOIN work_names wn ON w.work_name_id = wn.id;

-- ============================================
-- END OF SCHEMA
-- ============================================
