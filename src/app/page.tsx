import Dashboard from "./dashboard";
import { studies } from "@/lib/prooflab/studies";

export default function Home() {
  return <Dashboard studies={studies} />;
}
