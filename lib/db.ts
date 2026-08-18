import postgres from "postgres";

// Evita a criação de múltiplas conexões com o banco de dados durante o hot reloading no Next.js em desenvolvimento.
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("A variável de ambiente DATABASE_URL não está definida no arquivo .env.local.");
}

export const db = globalForDb.conn ?? postgres(connectionString, {
  // IMPORTANTE: prepare: false é obrigatório ao se conectar ao Transaction Pooler (porta 6543 com pgbouncer=true),
  // pois o PgBouncer em modo Transaction não suporta Prepared Statements persistentes por conexão.
  prepare: false,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = db;
}
