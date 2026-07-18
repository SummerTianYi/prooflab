import {
  deploymentResponseHeaders,
  resolveDeploymentMode,
} from "@/lib/prooflab/deployment";

export const runtime = "nodejs";

export async function GET() {
  const mode = resolveDeploymentMode(process.env);

  return Response.json(
    {
      status: "ok",
      mode,
      liveCompute: mode === "local",
      revision: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
    },
    { headers: deploymentResponseHeaders(mode) },
  );
}
