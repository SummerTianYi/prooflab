import { runGcnLegacyRepair } from "@/lib/prooflab/gcn-runner";

export const runtime = "nodejs";

export async function POST() {
  try {
    return Response.json(await runGcnLegacyRepair());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown repair failure.";
    return Response.json({ error: message }, { status: 500 });
  }
}
