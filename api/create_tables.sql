-- ====================================================================
-- SCRIPT DE CRIAÇÃO DE TABELAS PARA O MÓDULO FINANCEIRO (STAR SCHEMA)
-- Execute este script no SQL Editor do seu painel do Supabase.
-- ====================================================================

-- 1. Dimensão de Ativos
CREATE TABLE IF NOT EXISTS fin_dim_ativos (
    ticker VARCHAR(10) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL -- 'Acao', 'FII'
);

-- 2. Dimensão de Contas
CREATE TABLE IF NOT EXISTS fin_dim_contas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL
);

-- 3. Fato de Cotações Históricas
CREATE TABLE IF NOT EXISTS fin_fato_cotacoes (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    ticker VARCHAR(10) REFERENCES fin_dim_ativos(ticker),
    preco_fechamento DECIMAL(10, 2) NOT NULL,
    UNIQUE(data, ticker)
);

-- 4. Fato de Fluxo de Caixa (Receitas/Despesas)
CREATE TABLE IF NOT EXISTS fin_fato_caixa (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'Receita', 'Despesa'
    descricao VARCHAR(200) NOT NULL,
    valor DECIMAL(15, 2) NOT NULL
);

-- 5. Fato de Transações de Ativos
CREATE TABLE IF NOT EXISTS fin_fato_transacoes (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    ticker VARCHAR(10) REFERENCES fin_dim_ativos(ticker),
    tipo VARCHAR(10) NOT NULL, -- 'Compra', 'Venda'
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL
);

-- Inserir dados iniciais de Contas
INSERT INTO fin_dim_contas (nome) VALUES 
('Caixa Operacional'), 
('Reserva de Oportunidade'), 
('Carteira de Investimentos')
ON CONFLICT DO NOTHING;

-- Inserir alguns ativos padrão para iniciar
INSERT INTO fin_dim_ativos (ticker, nome, tipo) VALUES 
('PETR4', 'Petróleo Brasileiro S.A. - Petrobras', 'Acao'),
('VALE3', 'Vale S.A.', 'Acao'),
('ITUB4', 'Itaú Unibanco Holding S.A.', 'Acao'),
('HGLG11', 'CGHG Logística Fundo Investimento Imobiliário', 'FII'),
('KNRI11', 'Kinea Renda Imobiliária FII', 'FII')
ON CONFLICT DO NOTHING;
