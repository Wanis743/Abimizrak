const fs = require("node:fs");
const { Client } = require("../lib/db/node_modules/pg");

const source = fs.readFileSync("lib/db/test-db.cjs", "utf8");
const match = source.match(/connectionString:\s*'([^']+)'/);
if (!match) throw new Error("Database connection configuration not found");

const client = new Client({
  connectionString: match[1],
  ssl: { rejectUnauthorized: false },
});

const queries = {
  migrations: "select version, name from supabase_migrations.schema_migrations order by version",
  tables: "select c.relname as table_name, c.relrowsecurity as rls_enabled from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname like 'campus_%' order by c.relname",
  policies: "select tablename, policyname, cmd from pg_policies where schemaname = 'public' and tablename like 'campus_%' order by tablename, policyname",
  columns: "select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name like 'campus_%' order by table_name, ordinal_position",
};

(async () => {
  await client.connect();
  const result = {};
  for (const [name, sql] of Object.entries(queries)) {
    result[name] = (await client.query(sql)).rows;
  }
  console.log(JSON.stringify(result, null, 2));
  await client.end();
})().catch(async (error) => {
  console.error(JSON.stringify({ error: error.message }));
  try { await client.end(); } catch {}
  process.exit(1);
});
