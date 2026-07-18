import {
  assertLocalComputeRequest,
  deploymentResponseHeaders,
  LocalComputeBusyError,
  LocalComputeRequestError,
  resolveDeploymentMode,
  runExclusiveLocalCompute,
  runForDeployment,
} from "@/lib/prooflab/deployment";
import { getReplayAudit } from "@/lib/prooflab/replay-data";

export const runtime = "nodejs";

export async function POST(request?: Request) {
  const mode = resolveDeploymentMode(process.env);

  try {
    assertLocalComputeRequest(mode, request);
    const audit = await runForDeployment(mode, {
      replay: getReplayAudit,
      local: () => runExclusiveLocalCompute(async () => {
        const { auditSgcRepository } = await import(
          "@/lib/prooflab/codex-audit"
        );
        return auditSgcRepository();
      }),
    });

    return Response.json(audit, {
      headers: deploymentResponseHeaders(mode),
    });
  } catch (error) {
    console.error("SGC repository audit failed.", error);
    const status = error instanceof LocalComputeRequestError
      ? 403
      : error instanceof LocalComputeBusyError
        ? 429
        : 500;
    const message = status === 403
      ? "Local compute only accepts same-origin loopback requests."
      : status === 429
        ? "Another local compute task is already running."
        : "SGC repository audit failed. Inspect server logs.";
    return Response.json(
      { error: message },
      { status, headers: deploymentResponseHeaders(mode) },
    );
  }
}
