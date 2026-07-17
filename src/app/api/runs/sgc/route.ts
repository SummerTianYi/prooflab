import { runSgcReproduction } from "@/lib/prooflab/sgc-runner";

export const runtime = "nodejs";

export async function POST() {
  try {
    return Response.json(await runSgcReproduction());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown run failure.";
    return Response.json({ error: message }, { status: 500 });
  }
}
