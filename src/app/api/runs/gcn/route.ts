import { runGcnLegacyRepair } from "@/lib/prooflab/gcn-runner";

export const runtime = "nodejs";

export async function POST() {
  try {
    return Response.json(await runGcnLegacyRepair());
  } catch (error) {
    console.error("GCN legacy repair failed.", error);
    return Response.json(
      { error: "GCN legacy repair failed. Inspect server logs and local evidence artifacts." },
      { status: 500 },
    );
  }
}
