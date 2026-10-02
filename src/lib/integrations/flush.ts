import { recordDelivery, type DeliveryJob } from "@/lib/services/engine";
import { withDb } from "@/lib/repo";

export async function flushJobs(jobs: DeliveryJob[]): Promise<void> {
  for (const job of jobs) {
    let outcome = { ok: false, status: 0, body: "sin respuesta" };
    try {
      const response = await fetch(job.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(job.secret ? { "x-webhook-secret": job.secret } : {}),
        },
        body: JSON.stringify(job.body),
      });
      outcome = { ok: response.ok, status: response.status, body: (await response.text()).slice(0, 500) };
    } catch (error) {
      outcome = { ok: false, status: 0, body: error instanceof Error ? error.message : "error de red" };
    }
    await withDb((db) => {
      recordDelivery(db, job, outcome, new Date());
    });
  }
}
