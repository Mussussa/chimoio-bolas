if (!process.env.DATABASE_URL && process.env.RUN_DB_INTEGRATION !== "true") {
  process.env.DATABASE_URL = "postgres://127.0.0.1:5432/chimoio_bolas_test";
}
