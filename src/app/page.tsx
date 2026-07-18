import Dashboard from "./dashboard";
import { resolveDeploymentMode } from "@/lib/prooflab/deployment";
import { studies } from "@/lib/prooflab/studies";

export default function Home() {
  return (
    <Dashboard
      deploymentMode={resolveDeploymentMode(process.env)}
      studies={studies}
    />
  );
}
