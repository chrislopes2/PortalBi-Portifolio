-- ====================================================================
-- SCRIPT DE CONFIGURAÇÃO DO PORTALBI NO SUPABASE
-- Execute este script no SQL Editor do seu painel do Supabase.
-- ====================================================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    area TEXT,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE DASHBOARDS
CREATE TABLE IF NOT EXISTS dashboards (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'financeiro', 'comercial', 'operacional', 'rh'
    description TEXT,
    date_label TEXT, -- ex: 'Mai 2025'
    colors JSONB, -- Array de cores hex
    embed_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE PERMISSÕES
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    dashboard_id INT REFERENCES dashboards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, dashboard_id)
);

-- 4. INSERIR USUÁRIO ADMINISTRADOR PADRÃO
-- Altere a senha se desejar antes de rodar
INSERT INTO users (email, password, name, area, is_admin)
VALUES ('cristhofermaciel3@gmail.com', '1234', 'Administrador', 'TI', true)
ON CONFLICT (email) DO NOTHING;

-- 5. INSERIR DASHBOARDS INICIAIS (OPCIONAL)
INSERT INTO dashboards (title, category, description, date_label, colors, embed_url)
VALUES 
('Receita vs Meta 2025', 'financeiro', 'Acompanhamento mensal de receita bruta.', 'Mai 2025', '["#F59E0B", "#FBBF24"]', ''),
('Pipeline Comercial', 'comercial', 'Funil de vendas e forecast.', 'Mai 2025', '["#38BDF8", "#0EA5E9"]', '')
ON CONFLICT DO NOTHING;
