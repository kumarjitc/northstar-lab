import { describe, expect, it } from "vitest";
import {
  BILLING_TOOL_NAMES,
  CONTRACT_TOOL_NAMES,
  SERVICE_AGENT_TOOL,
  createFacadeCatalog,
} from "../src/shared/domains.js";

describe("mixed facade catalog", () => {
  it("assigns distinct transports per domain", () => {
    const catalog = createFacadeCatalog();
    const byName = new Map(catalog.map((t) => [t.name, t]));

    for (const name of BILLING_TOOL_NAMES) {
      expect(byName.get(name)?.transport).toBe("mcp");
    }
    expect(byName.get(SERVICE_AGENT_TOOL)?.transport).toBe("a2a");
    for (const name of CONTRACT_TOOL_NAMES) {
      expect(byName.get(name)?.transport).toBe("rest");
    }
  });
});
