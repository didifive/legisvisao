-- ====================================================================
-- LegisVisão - Migração: Permitir múltiplos temas como tags em texto livre
-- ====================================================================

ALTER TABLE propositions ALTER COLUMN tema TYPE TEXT;
