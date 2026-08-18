-- ====================================================================
-- LegisVisão - Schema Inicial
-- ====================================================================

DROP TABLE IF EXISTS politician_votes CASCADE;
DROP TABLE IF EXISTS party_votes CASCADE;
DROP TABLE IF EXISTS vote_sessions CASCADE;
DROP TABLE IF EXISTS legislative_phases CASCADE;
DROP TABLE IF EXISTS project_house_records CASCADE;
DROP TABLE IF EXISTS legislative_projects CASCADE;
DROP TABLE IF EXISTS mandates CASCADE;
DROP TABLE IF EXISTS politician_party_history CASCADE;
DROP TABLE IF EXISTS politicians CASCADE;
DROP TABLE IF EXISTS political_parties CASCADE;
DROP TABLE IF EXISTS sync_control CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS bill_vote_sessions CASCADE;

-- 1. Partidos Políticos
CREATE TABLE IF NOT EXISTS political_parties (
    id SERIAL PRIMARY KEY,
    sigla VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    uri VARCHAR(255),
    situacao VARCHAR(50) DEFAULT 'Ativo', -- 'Ativo' ou 'Inativo' (oficial da API da Câmara)
    total_membros INTEGER DEFAULT 0,
    total_posse INTEGER DEFAULT 0,
    numero_eleitoral INTEGER,
    logo_url TEXT
);

-- 2. Políticos (Deputados Federais e Senadores)
CREATE TABLE IF NOT EXISTS politicians (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL, -- 'CAMARA' ou 'SENADO'
    external_id VARCHAR(100) NOT NULL, -- ID oficial nas APIs governamentais
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'DEPUTY' ou 'SENATOR'
    state VARCHAR(2) NOT NULL, -- UF (ex: 'SP', 'RJ', 'BR')
    photo_url TEXT,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_politician_source_id UNIQUE (source, external_id)
);

-- 3. Histórico Partidário do Político
CREATE TABLE IF NOT EXISTS politician_party_history (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    party_id INTEGER NOT NULL REFERENCES political_parties(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE -- NULL significa partido atual em exercício
);

-- 4. Mandatos
CREATE TABLE IF NOT EXISTS mandates (
    id SERIAL PRIMARY KEY,
    politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    office VARCHAR(100) NOT NULL, -- 'Deputado Federal', 'Senador'
    house VARCHAR(20) NOT NULL, -- 'CAMARA', 'SENADO'
    start_date DATE NOT NULL,
    end_date DATE,
    legislature_id INTEGER
);

-- 5. Projetos Legislativos Canônicos (único por proposição: {TIPO}-{NUMERO}-{ANO})
CREATE TABLE IF NOT EXISTS legislative_projects (
    id SERIAL PRIMARY KEY,
    canonical_id VARCHAR(100) UNIQUE NOT NULL, -- "PL-2630-2020", "PEC-45-2019"
    type VARCHAR(50) NOT NULL,
    number VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    current_status VARCHAR(255),
    last_updated_at TIMESTAMP,
    CONSTRAINT unique_canonical_project UNIQUE(type, number, year)
);

-- 6. Registros por Casa Legislativa (Câmara dos Deputados / Senado Federal)
CREATE TABLE IF NOT EXISTS project_house_records (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES legislative_projects(id) ON DELETE CASCADE,
    house VARCHAR(20) NOT NULL, -- 'CAMARA', 'SENADO'
    external_id VARCHAR(100) NOT NULL,
    official_url TEXT,
    full_text_url TEXT,
    presentation_date DATE,
    author_name VARCHAR(255),
    author_party VARCHAR(50),
    author_state VARCHAR(10),
    rapporteur_name VARCHAR(255),
    tramitacao_etapa VARCHAR(255),
    despacho TEXT,
    last_event_date DATE,
    source_updated_at TIMESTAMP,
    source_read_at TIMESTAMP,
    CONSTRAINT unique_house_record UNIQUE(house, external_id)
);

-- 7. Fases Legislativas
-- Hierarquia padronizada: 1=Comissão, 2=Comissão Especial, 3=Plenário, 4=Redação Final, 5=Aprovado, 6=Arquivado, 7=Vetado, 8=Sancionado
CREATE TABLE IF NOT EXISTS legislative_phases (
    id SERIAL PRIMARY KEY,
    house_record_id INTEGER NOT NULL REFERENCES project_house_records(id) ON DELETE CASCADE,
    phase_name VARCHAR(100) NOT NULL,
    phase_order INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 8. Sessões de Votação
CREATE TABLE IF NOT EXISTS vote_sessions (
    id SERIAL PRIMARY KEY,
    house_record_id INTEGER NOT NULL REFERENCES project_house_records(id) ON DELETE CASCADE,
    phase_id INTEGER REFERENCES legislative_phases(id) ON DELETE SET NULL,
    external_vote_id VARCHAR(100),
    date TIMESTAMP NOT NULL,
    description TEXT,
    result VARCHAR(100),
    CONSTRAINT unique_house_vote_session UNIQUE(house_record_id, external_vote_id)
);

-- 9. Votos Nominais dos Parlamentares (com valor original da API e partido no momento da votação)
CREATE TABLE IF NOT EXISTS politician_votes (
    id SERIAL PRIMARY KEY,
    vote_session_id INTEGER NOT NULL REFERENCES vote_sessions(id) ON DELETE CASCADE,
    politician_id INTEGER NOT NULL REFERENCES politicians(id) ON DELETE CASCADE,
    party_id INTEGER REFERENCES political_parties(id) ON DELETE SET NULL,
    vote_original VARCHAR(100) NOT NULL,
    CONSTRAINT unique_vote_session_politician UNIQUE(vote_session_id, politician_id)
);

-- 10. Monitor e Controle de Sincronização de Dados Oficiais
CREATE TABLE IF NOT EXISTS sync_control (
    source VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    official_url TEXT,
    last_sync TIMESTAMP NOT NULL,
    last_successful_sync TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING',
    records_count INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    dataset_version VARCHAR(100),
    last_error TEXT
);

-- 11. Índices de Performance para Consultas Rápidas
CREATE INDEX IF NOT EXISTS idx_politicians_source ON politicians(source);
CREATE INDEX IF NOT EXISTS idx_politicians_state ON politicians(state);
CREATE INDEX IF NOT EXISTS idx_politicians_active ON politicians(is_active);
CREATE INDEX IF NOT EXISTS idx_mandates_politician_id ON mandates(politician_id);
CREATE INDEX IF NOT EXISTS idx_mandates_house ON mandates(house);
CREATE INDEX IF NOT EXISTS idx_politician_party_history_lookup ON politician_party_history(politician_id, party_id);
CREATE INDEX IF NOT EXISTS idx_politician_party_history_politician ON politician_party_history(politician_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_legislative_projects_canonical ON legislative_projects(canonical_id);
CREATE INDEX IF NOT EXISTS idx_legislative_projects_year ON legislative_projects(year);
CREATE INDEX IF NOT EXISTS idx_project_house_records_project ON project_house_records(project_id);
CREATE INDEX IF NOT EXISTS idx_project_house_records_house ON project_house_records(house);
CREATE INDEX IF NOT EXISTS idx_legislative_phases_record ON legislative_phases(house_record_id);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_house_record ON vote_sessions(house_record_id);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_phase ON vote_sessions(phase_id);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_date ON vote_sessions(date);
CREATE INDEX IF NOT EXISTS idx_politician_votes_session ON politician_votes(vote_session_id);
CREATE INDEX IF NOT EXISTS idx_politician_votes_politician ON politician_votes(politician_id);
CREATE INDEX IF NOT EXISTS idx_politician_votes_party ON politician_votes(party_id);

-- 12. Seed Inicial de Controle das Fontes Oficiais (Apenas Câmara e Senado)
INSERT INTO sync_control (source, name, official_url, last_sync, status) VALUES
('CAMARA', 'Câmara dos Deputados (Dados Abertos)', 'https://dadosabertos.camara.leg.br', NOW(), 'PENDING'),
('SENADO', 'Senado Federal (Dados Abertos)', 'https://legis.senado.leg.br/dadosabertos', NOW(), 'PENDING')
ON CONFLICT (source) DO UPDATE SET
    name = EXCLUDED.name,
    official_url = EXCLUDED.official_url;

-- 13. Permissões de Acesso ao Schema e Segurança
-- Conexões do backend (BFF) e dos scripts de sync utilizam a DATABASE_URL com usuário/senha autenticados (postgres / service_role).
-- Acesso anônimo (anon) NÃO possui permissão de escrita/modificação (INSERT, UPDATE, DELETE, TRUNCATE).

-- Permissões completas para os roles autenticados de conexão direta:
GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;

-- Acesso anônimo (anon) restrito apenas a leitura (SELECT), sem qualquer permissão de escrita:
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
