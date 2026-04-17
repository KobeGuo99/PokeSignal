import { AdminControls } from "@/components/admin/admin-controls";
import { Panel } from "@/components/ui/panel";
import { getAdminData } from "@/lib/data/queries";
import { formatRelativeTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getAdminData();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">Admin</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">System status and maintenance</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={String(data.cardCount)} subtitle="Cards in database" />
        <Panel title={String(data.snapshotCount)} subtitle="Price snapshots stored" />
        <Panel
          title={formatRelativeTime(data.latestSync?.finishedAt ?? data.latestSync?.startedAt)}
          subtitle={data.latestSync?.status ?? "No sync yet"}
        />
      </div>

      <Panel title="Manual actions" subtitle="Use these in local/dev mode to refresh data or retrain the logistic model.">
        <AdminControls />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Sync status" subtitle="Latest scheduled or manual ingest run.">
          <dl className="grid gap-3 text-sm text-slate-700">
            <div className="flex justify-between gap-4">
              <dt>Status</dt>
              <dd>{data.latestSync?.status ?? "No runs yet"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Started</dt>
              <dd>{data.latestSync?.startedAt.toISOString() ?? "N/A"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Records fetched</dt>
              <dd>{data.latestSync?.recordsFetched ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Records inserted</dt>
              <dd>{data.latestSync?.recordsInserted ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Errors</dt>
              <dd>{data.latestSync?.errorsCount ?? 0}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Model status" subtitle="Current artifact metadata and validation metrics.">
          <dl className="grid gap-3 text-sm text-slate-700">
            <div className="flex justify-between gap-4">
              <dt>Version</dt>
              <dd>{data.latestModel?.version ?? "No model registered"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Algorithm</dt>
              <dd>{data.latestModel?.algorithm ?? "N/A"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Trained</dt>
              <dd>{data.latestModel ? formatRelativeTime(data.latestModel.trainedAt) : "N/A"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Enabled</dt>
              <dd>{data.config.modelEnabled ? "Yes" : "No"}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
              <pre className="overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(data.latestModel?.metrics ?? {}, null, 2)}
              </pre>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel title="Config overview" subtitle="Central signal knobs exposed from app config.">
        <pre className="overflow-x-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">
          {JSON.stringify(data.config, null, 2)}
        </pre>
      </Panel>
    </div>
  );
}
