import { describe, expect, it } from "vitest";
import { MockModelClient } from "@northstar/model-client";
import { startTestCluster } from "./helpers.js";

describe("A2A agent discovery", () => {
  it("publishes Agent Cards for billing, service, and contract", async () => {
    const mock = new MockModelClient([
      { type: "message", content: JSON.stringify({ ok: true, summary: "unused" }) },
    ]);
    const cluster = await startTestCluster({
      models: { billing: mock, service: mock, contract: mock },
    });
    try {
      for (const id of ["billing", "service", "contract"] as const) {
        const card = await cluster.clients[id].getAgentCard();
        expect(card.name.toLowerCase()).toContain(id === "service" ? "service" : id);
        expect(card.skills?.length).toBeGreaterThan(0);
        expect(card.url).toContain(String(cluster.config.ports[id]));
      }
    } finally {
      await cluster.close();
    }
  }, 60000);
});
