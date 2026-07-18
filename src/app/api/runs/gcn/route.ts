import {
  assertLocalComputeRequest,
  deploymentResponseHeaders,
  LocalComputeBusyError,
  LocalComputeRequestError,
  resolveDeploymentMode,
  runExclusiveLocalCompute,
  runForDeployment,
} from "@/lib/prooflab/deployment";
import { getReplayRun } from "@/lib/prooflab/replay-data";

export const runtime = "nodejs";

export async function POST(request?: Request) {
  const mode = resolveDeploymentMode(process.env);

  try {
    assertLocalComputeRequest(mode, request);
    const report = await runForDeployment(mode, {
      replay: () => getReplayRun("gcn-cora"),
      local: () => runExclusiveLocalCompute(async () => {
        const { runGcnLegacyRepair } = await import(
          "@/lib/prooflab/gcn-runner"
        );
        return runGcnLegacyRepair();
      }),
    });

    return Response.json(report, {
      headers: deploymentResponseHeaders(mode),
    });
  } catch (error) {
    console.error("GCN legacy repair failed.", error);
    const status = error instanceof LocalComputeRequestError
      ? 403
      : error instanceof LocalComputeBusyError
        ? 429
        : 500;
    const message = status === 403
      ? "Local compute only accepts same-origin loopback requests."
      : status === 429
        ? "Another local compute task is already running."
        : "GCN legacy repair failed. Inspect server logs and local evidence artifacts.";
    return Response.json(
      { error: message },
      { status, headers: deploymentResponseHeaders(mode) },
    );
  }
}
