# PokeSignal

PokeSignal is a practical MVP for tracking Pokemon card prices over time, storing daily snapshots, and turning those snapshots into interpretable buy/watch/avoid signals.

The system intentionally favors:

- simple provider adapters over leaky API usage
- rule-based dip and falling-knife detection over opaque modeling
- a lightweight logistic regression artifact for short-horizon continuation scoring
- honest fallback behavior when the model or external APIs are weak

## Architecture Summary

PokeSignal is a single Next.js application with a PostgreSQL database and a small Python training pipeline:

- Next.js App Router handles the dashboard, card detail page, watchlist, admin page, and API routes.
- Prisma stores cards, daily price snapshots, computed feature snapshots, recommendation snapshots, sync runs, watchlist items, and model versions.
- Provider adapters wrap the free TCGdex SDK behind validated mapping logic.
- Feature engineering is pure TypeScript and lives separately from UI code.
- Recommendation resolution combines rule score, optional model score, and data quality into a final category plus explanation.
- Python training reads exported rows, performs chronological splits, trains logistic regression, and writes a JSON artifact the app can score directly.

## Folder Structure

```text
app/
  admin/
  api/
  cards/[id]/
  watchlist/
components/
  admin/
  cards/
  charts/
  dashboard/
  ui/
lib/
  api/
  config/
  data/
  db/
  demo/
  features/
  ml/
  recommendations/
  utils/
prisma/
  migrations/
python/
  artifacts/
  common/
  inference/
  tests/
  training/
scripts/
tests/
```

## Data Sources

The app uses a free public API and validates the mapped response shape before persistence:

- TCGdex SDK / TCGdex v2 for card metadata and pricing

Notes:

- TCGdex pricing can be missing for some cards; those cards are skipped gracefully during sync.
- Historical depth is created locally by taking and storing snapshots over time.

## Core Product Behavior

### Signal categories

- `STRONG_BUY_DIP`: meaningful recent drop, but medium-term structure still holds and volatility is not extreme
- `WATCH`: mixed or inconclusive signals
- `AVOID`: falling-knife pattern with larger drawdown, weak trend, or thin/noisy data
- `MOMENTUM_BUY`: recent uptrend with supportive medium-term context and optional model support

### Feature set

The app computes:

- current price
- previous price
- 1d / 7d / 30d returns
- 7d rolling volatility
- 7d / 30d simple moving averages
- 7d slope
- drawdown from 30d peak
- data quality score
- liquidity proxy
- set age
- rarity score

### ML approach

- model type: logistic regression
- target: whether a currently rising card is higher after `MODEL_HORIZON_DAYS`
- split strategy: chronological train / validation / test split
- metrics tracked: accuracy, precision, recall, F1, ROC-AUC
- fallback: the app still functions if the artifact is missing or disabled

## Local Setup

### 1. Install dependencies

```bash
npm install
python3 -m pip install -r python/requirements.txt
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp .env.example .env
```

### 4. Generate Prisma client and apply the initial migration

```bash
npm run db:generate
npx prisma migrate deploy
```

For local development you can also use:

```bash
npm run db:migrate
```

### 5. Bootstrap live market data

```bash
npm run db:seed
```

This clears existing app data and runs a real TCGdex sync. No synthetic demo prices are inserted.

### 6. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Sync and Scheduling

### Manual sync

```bash
npm run sync
```

Or use the Admin page button.

### Scheduled sync

Use the route handler for a deployed cron or call the local script from cron:

```cron
0 8 * * * cd /path/to/pokesignal && /usr/bin/env npm run sync
```

For deployed cron:

- endpoint: `GET /api/cron/sync`
- auth: `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set

## Model Training

### Export training data and train the model

```bash
npm run model:train
```

This will:

1. export rising-card feature rows from PostgreSQL to `python/artifacts/training-data.json`
2. train logistic regression in Python
3. write `python/artifacts/current-model.json`
4. register the artifact in the `ModelVersion` table

## Testing

### TypeScript tests

```bash
npm test
```

### Python tests

```bash
npm run test:python
```

### Linting

```bash
npm run lint
```

## Deployment Notes

This MVP is easiest to deploy as:

- Vercel for the Next.js app
- managed PostgreSQL such as Neon, Supabase Postgres, or Railway
- an external cron hitting `/api/cron/sync`
- a separate scheduled command or CI job for `npm run model:train`

Recommended deployment approach:

- set `DATABASE_URL`, `APP_URL`, `CRON_SECRET`, and `TCGDEX_API_URL`
- run `npx prisma migrate deploy`
- use `npm run db:seed` only when you want to clear and rebuild the local dataset from live TCGdex data
- use the cron route only for sync, not model training

## Tradeoffs

- The sync fetches a bounded universe of English cards with live pricing using `SYNC_CARD_LIMIT`. The default is `3000`, which keeps broad coverage without trying to ingest the full catalog on every daily run.
- The model is logistic regression so the app can score the artifact directly in TypeScript without needing a live Python service.
- The watchlist is a single local/global list for MVP simplicity; the schema can be extended later for auth-scoped watchlists.

## Known Limitations

- public price feeds can be noisy, delayed, or incomplete
- historical depth is shallow when the project first starts
- collectible markets are irrational and event-driven
- some cards will have sparse or unstable pricing
- the model may be weak when there are too few rising-card examples
- TCGdex response shapes can evolve over time
- this is not a backtesting engine and should not be treated as financial advice

## Next Improvements

- add user authentication and per-user watchlists
- support comparing multiple cards on a shared chart
- store provider-level variant pricing more explicitly
- add signal history and recommendation change tracking
- improve sync breadth with paginated multi-page ingestion and better rate limiting telemetry
- add exportable CSVs and richer admin analytics
