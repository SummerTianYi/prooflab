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
      replay: () => getReplayRun("sgc-cora"),
      local: () => runExclusiveLocalCompute(async () => {
        const { runSgcReproduction } = await import(
          "@/lib/prooflab/sgc-runner"
        );
        return runSgcReproduction();
      }),
    });

    return Response.json(report, {
      headers: deploymentResponseHeaders(mode),
    });
  } catch (error) {
    console.error("SGC reproduction failed.", error);
    const status = error instanceof LocalComputeRequestError
      ? 403
      : error instanceof LocalComputeBusyError
        ? 429
        : 500;
    const message = status === 403
      ? "Local compute only accepts same-origin loopback requests."
      : status === 429
        ? "Another local compute task is already running."
        : "SGC reproduction failed. Inspect server logs and evidence artifacts.";
    return Response.json(
      { error: message },
      { status, headers: deploymentResponseHeaders(mode) },
    );
  }
}
