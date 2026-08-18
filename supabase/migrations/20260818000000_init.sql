-- ====================================================================
-- LegisVisão - Schema Inicial Focado na Câmara dos Deputados (Deputados Federais)
-- Migration: 20260818000000_init.sql
-- ====================================================================

-- 1. Partidos Políticos na Câmara
CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY,                  -- ID oficial da Câmara (ex: 36898)
    sigla VARCHAR(50) UNIQUE NOT NULL,       -- Ex: 'PL', 'PT', 'UNIÃO'
    nome TEXT NOT NULL,                      -- Nome oficial completo
    logo_url TEXT,                           -- URL do logotipo oficial
    total_membros INTEGER DEFAULT 0          -- Contagem de deputados em exercício
);

-- 2. Deputados Federais (57ª Legislatura / Atuais)
CREATE TABLE IF NOT EXISTS deputies (
    id INTEGER PRIMARY KEY,                  -- ID oficial na API da Câmara (ex: 220593)
    nome TEXT NOT NULL,                      -- Nome civil completo
    nome_eleitoral TEXT NOT NULL,            -- Nome parlamentar / de urna
    sigla_partido VARCHAR(50) NOT NULL REFERENCES parties(sigla) ON UPDATE CASCADE,
    sigla_uf VARCHAR(2) NOT NULL,            -- UF de representação (ex: 'SP', 'RJ', 'MG')
    url_foto TEXT,                           -- Foto oficial de alta resolução da Câmara
    email TEXT,                              -- Email institucional oficial
    situacao VARCHAR(50) DEFAULT 'Exercício',-- 'Exercício', 'Licença', etc.
    legislatura INTEGER DEFAULT 57,          -- Número da legislatura (57 = 2023-2027)
    is_active BOOLEAN DEFAULT TRUE           -- Se está atualmente em exercício
);

-- 3. Proposições Legislativas (Apenas matérias que possuem votação nominal no Plenário)
CREATE TABLE IF NOT EXISTS propositions (
    id INTEGER PRIMARY KEY,                  -- ID oficial da proposição na Câmara (ex: 2255678)
    sigla_tipo VARCHAR(20) NOT NULL,         -- 'PL', 'PEC', 'PLP', 'MPV'
    numero INTEGER NOT NULL,                 -- Ex: 2630
    ano INTEGER NOT NULL,                    -- Ex: 2020
    titulo VARCHAR(100) NOT NULL,            -- "PL 2630/2020"
    ementa TEXT NOT NULL,                    -- Resumo oficial do teor da proposta
    ementa_detalhada TEXT,                   -- Ementa completa oficial
    tema VARCHAR(100),                       -- Área temática (Economia, Saúde, etc.)
    url_inteiro_teor TEXT,                   -- Link direto para o PDF/texto integral na Câmara
    url_camara TEXT,                         -- Link da página oficial da tramitação na Câmara
    data_apresentacao DATE,                  -- Data original de apresentação
    ultimo_status TEXT,                      -- Situação da tramitação
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sessões de Votação Nominal do Plenário
CREATE TABLE IF NOT EXISTS vote_sessions (
    id VARCHAR(100) PRIMARY KEY,             -- ID oficial da votação na Câmara (ex: "2255678-120")
    proposicao_id INTEGER NOT NULL REFERENCES propositions(id) ON DELETE CASCADE,
    data_hora TIMESTAMPTZ NOT NULL,          -- Data e hora da votação
    descricao TEXT NOT NULL,                 -- Objeto da deliberação / resumo da matéria votada
    resultado TEXT,                          -- "Aprovado", "Rejeitado", etc.
    sigla_orgao VARCHAR(50) DEFAULT 'PLEN'   -- Órgão deliberativo ('PLEN' para Plenário)
);

-- 5. Votos Nominais dos Deputados
CREATE TABLE IF NOT EXISTS deputy_votes (
    id SERIAL PRIMARY KEY,
    votacao_id VARCHAR(100) NOT NULL REFERENCES vote_sessions(id) ON DELETE CASCADE,
    deputado_id INTEGER NOT NULL REFERENCES deputies(id) ON DELETE CASCADE,
    sigla_partido VARCHAR(50),               -- Partido do deputado no momento da votação
    voto_original VARCHAR(50) NOT NULL,      -- "Sim", "Não", "Abstenção", "Obstrução", "Art. 17"
    CONSTRAINT unique_vote_session_deputy UNIQUE(votacao_id, deputado_id)
);

-- 6. Monitor e Controle de Sincronização
CREATE TABLE IF NOT EXISTS sync_control (
    source VARCHAR(50) PRIMARY KEY,          -- 'CAMARA'
    name VARCHAR(100) NOT NULL,
    official_url TEXT NOT NULL,
    last_sync TIMESTAMPTZ NOT NULL,
    last_successful_sync TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'PENDING',    -- 'SUCCESS', 'RUNNING', 'FAILED'
    total_deputies INTEGER DEFAULT 0,
    total_propositions INTEGER DEFAULT 0,
    total_vote_sessions INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    dataset_version VARCHAR(100),
    last_error TEXT
);

-- 7. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_deputies_partido ON deputies(sigla_partido);
CREATE INDEX IF NOT EXISTS idx_deputies_uf ON deputies(sigla_uf);
CREATE INDEX IF NOT EXISTS idx_deputies_active ON deputies(is_active);
CREATE INDEX IF NOT EXISTS idx_propositions_tipo_ano ON propositions(sigla_tipo, ano);
CREATE INDEX IF NOT EXISTS idx_propositions_ano ON propositions(ano);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_proposicao ON vote_sessions(proposicao_id);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_data ON vote_sessions(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_deputy_votes_votacao ON deputy_votes(votacao_id);
CREATE INDEX IF NOT EXISTS idx_deputy_votes_deputado ON deputy_votes(deputado_id);
CREATE INDEX IF NOT EXISTS idx_deputy_votes_partido ON deputy_votes(sigla_partido);

-- 8. Seed Inicial de Controle
INSERT INTO sync_control (
    source, name, official_url, last_sync, status, total_deputies, total_propositions, total_vote_sessions, total_votes
)
VALUES (
    'CAMARA', 'Câmara dos Deputados (Dados Abertos)', 'https://dadosabertos.camara.leg.br', NOW(), 'PENDING', 0, 0, 0, 0
)
ON CONFLICT (source) DO UPDATE SET
    name = EXCLUDED.name,
    official_url = EXCLUDED.official_url;

-- 9. Permissões de Acesso ao Schema e Segurança
GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;

-- Acesso anônimo restrito a leitura (SELECT)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO anon, authenticated;

-- Recarga de cache PostgREST (Supabase)
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
