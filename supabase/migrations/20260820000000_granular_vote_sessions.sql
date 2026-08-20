-- ====================================================================
-- LegisVisão - Expansão de Deliberações Granulares e Enriquecimento Semântico por IA
-- Migration: 20260820000000_granular_vote_sessions.sql
-- ====================================================================

-- 1. Adicionar colunas de categorização e enriquecimento cidadão na tabela vote_sessions
ALTER TABLE vote_sessions
ADD COLUMN IF NOT EXISTS tipo_deliberacao VARCHAR(50) DEFAULT 'OUTRO',
ADD COLUMN IF NOT EXISTS titulo_amigavel TEXT,
ADD COLUMN IF NOT EXISTS resumo_simplificado TEXT,
ADD COLUMN IF NOT EXISTS pergunta_cidadao TEXT,
ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_error TEXT;

-- 2. Comentários explicativos para documentação de schema
COMMENT ON COLUMN vote_sessions.tipo_deliberacao IS 'Tipo categorizado da deliberação: MERITO, DESTAQUE, EMENDA, REQUERIMENTO, OUTRO';
COMMENT ON COLUMN vote_sessions.titulo_amigavel IS 'Título conciso e compreensível para o cidadão identificando o destaque ou emenda';
COMMENT ON COLUMN vote_sessions.resumo_simplificado IS 'Explicação clara e neutra do que esta deliberação específica altera na matéria';
COMMENT ON COLUMN vote_sessions.pergunta_cidadao IS 'Pergunta contextualizada para o cidadão opinar diretamente no destaque';
COMMENT ON COLUMN vote_sessions.ai_processed IS 'Flag indicando se a sessão já foi processada pelo modelo de IA';
COMMENT ON COLUMN vote_sessions.ai_processed_at IS 'Data e hora do processamento pela IA';
COMMENT ON COLUMN vote_sessions.ai_error IS 'Mensagem de erro caso o processamento de IA tenha falhado';

-- 3. Índices de Alta Performance para Consultas e Sincronização em Lote
CREATE INDEX IF NOT EXISTS idx_vote_sessions_tipo ON vote_sessions(tipo_deliberacao);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_ai_processed ON vote_sessions(ai_processed);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_proposicao_tipo ON vote_sessions(proposicao_id, tipo_deliberacao);

-- 4. Notificar PostgREST para recarregar o schema no Supabase
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
