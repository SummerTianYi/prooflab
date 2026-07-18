import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Dashboard from "./dashboard";
import { studies } from "@/lib/prooflab/studies";

describe("Dashboard language selection", () => {
  it("renders an accessible selector with every launch language", () => {
    const html = renderToStaticMarkup(
      <Dashboard deploymentMode="replay" studies={studies} initialLocale="en" />,
    );

    expect(html).toContain('aria-label="Language"');
    expect(html.match(/<option/g)).toHaveLength(9);
    expect(html).toContain("简体中文");
    expect(html).toContain("日本語");
    expect(html).toContain("Español");
  });

  it("renders the workflow chrome in Simplified Chinese", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        deploymentMode="replay"
        studies={studies}
        initialLocale="zh-CN"
      />,
    );

    expect(html).toContain("证据回放");
    expect(html).toContain("论文结论，接受检验");
    expect(html).toContain("回放已验证运行");
    expect(html).toContain("研究队列");
  });

  it("renders a second non-Latin locale without changing paper titles", () => {
    const html = renderToStaticMarkup(
      <Dashboard deploymentMode="replay" studies={studies} initialLocale="ja" />,
    );

    expect(html).toContain("エビデンス再生");
    expect(html).toContain("検証済み実行を再生");
    expect(html).toContain("Simplifying Graph Convolutional Networks");
  });
});
