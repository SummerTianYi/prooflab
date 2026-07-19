import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReplayProcessView from "./replay-process-view";
import { buildReplayProcess } from "@/lib/prooflab/replay-process";
import { getReplayRun } from "@/lib/prooflab/replay-data";
import { getStudy } from "@/lib/prooflab/studies";

describe("ReplayProcessView", () => {
  it("renders the GCN evidence trail as seven inspectable stages", () => {
    const html = renderToStaticMarkup(
      <ReplayProcessView
        locale="en"
        process={buildReplayProcess(
          getStudy("gcn-cora"),
          getReplayRun("gcn-cora"),
        )}
      />,
    );

    expect(html).toContain('aria-label="Recorded reproduction process"');
    expect(html.match(/data-process-event=/g)).toHaveLength(7);
    expect(html).toContain("Watch the reproduction, step by step.");
    expect(html).toContain("Step 1 of 7");
    expect(html).toContain("Claim extracted");
    expect(html).toContain("81.50%");
    expect(html).toContain("Open Paper source");
  });

  it("localizes process controls while preserving evidence values", () => {
    const html = renderToStaticMarkup(
      <ReplayProcessView
        locale="zh-CN"
        process={buildReplayProcess(
          getStudy("gcn-cora"),
          getReplayRun("gcn-cora"),
        )}
      />,
    );

    expect(html).toContain("逐步查看复现过程");
    expect(html).toContain("第 1 步，共 7 步");
    expect(html).toContain("下一项证据");
    expect(html).toContain("Cora test accuracy: 81.50%");
    expect(html).toContain("https://arxiv.org/abs/1609.02907");
  });
});
