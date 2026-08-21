-- ====================================================================
-- LegisVisão - Resumo Geral de Proposições por Inteligência Artificial
-- Migration: 20260820000001_propositions_ai_summary.sql
-- ====================================================================

-- 1. Adicionar colunas de resumo cívico geral e controle de IA na tabela propositions
ALTER TABLE propositions
ADD COLUMN IF NOT EXISTS resumo_geral TEXT,
ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_error TEXT;

-- 2. Comentários explicativos para documentação de schema
COMMENT ON COLUMN propositions.resumo_geral IS 'Resumo geral explicativo da proposta em linguagem cidadã de até 5 frases elaborado por IA a partir do texto integral ou ementa';
COMMENT ON COLUMN propositions.ai_processed IS 'Flag indicando se o resumo geral da proposição já foi processado pelo modelo de IA';
COMMENT ON COLUMN propositions.ai_processed_at IS 'Data e hora do processamento do resumo geral pela IA';
COMMENT ON COLUMN propositions.ai_error IS 'Mensagem de erro caso a geração do resumo geral tenha falhado';

-- 3. Índices de Alta Performance para Consultas e Sincronização em Lote
CREATE INDEX IF NOT EXISTS idx_propositions_ai_processed ON propositions(ai_processed);

-- 4. Notificar PostgREST para recarregar o schema no Supabase
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
