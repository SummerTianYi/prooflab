import { auditSgcRepository } from "@/lib/prooflab/codex-audit";

export const runtime = "nodejs";

export async function POST() {
  try {
    return Response.json(await auditSgcRepository());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown audit failure.";
    return Response.json({ error: message }, { status: 500 });
  }
}
