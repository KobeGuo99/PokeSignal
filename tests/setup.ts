process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/pokesignal";
process.env.APP_URL ??= "http://localhost:3000";
process.env.TCGDEX_API_URL ??= "https://api.tcgdex.net/v2";
process.env.MODEL_ARTIFACT_PATH ??= "python/artifacts/current-model.json";
process.env.AUTO_SYNC_ENABLED ??= "false";
