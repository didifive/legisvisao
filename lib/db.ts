import postgres from "postgres";

// Evita a criação de múltiplas conexões com o banco de dados durante o hot reloading no Next.js em desenvolvimento.
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

function getDbInstance(): postgres.Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("A variável de ambiente DATABASE_URL não está definida.");
  }
  if (!globalForDb.conn) {
    globalForDb.conn = postgres(connectionString, {
      // IMPORTANTE: prepare: false é obrigatório ao se conectar ao Transaction Pooler (porta 6543 com pgbouncer=true),
      // pois o PgBouncer em modo Transaction não suporta Prepared Statements persistentes por conexão.
      prepare: false,
    });
  }
  return globalForDb.conn;
}

export const db: postgres.Sql = new Proxy((() => {}) as unknown as postgres.Sql, {
  apply(_target, thisArg, argArray) {
    const instance = getDbInstance();
    return Reflect.apply(instance as unknown as Function, thisArg, argArray);
  },
  get(_target, prop, receiver) {
    const instance = getDbInstance();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
