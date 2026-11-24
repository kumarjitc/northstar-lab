import type { ScenarioContext, ScenarioResult } from "./types.js";

/** Deterministic lookup for CUST-1001 package and line status. */
export async function runS01(ctx: ScenarioContext): Promise<ScenarioResult> {
  const steps: string[] = [];
  const decisions: string[] = [];
  const customerId = "CUST-1001";

  ctx.logger.log("scenario.step", { step: "getCustomer", customerId });
  const customer = ctx.services.getCustomer(customerId);
  steps.push("GET customer CUST-1001");
  if (!customer.ok) throw new Error(customer.error.message);

  ctx.logger.log("scenario.step", { step: "getCustomerServices", customerId });
  const services = ctx.services.getCustomerServices(customerId);
  steps.push("GET services for CUST-1001");
  if (!services.ok) throw new Error(services.error.message);

  const broadband = services.data.find((s) => s.productCategory === "BROADBAND");
  decisions.push("Select broadband product from customer services");
  ctx.logger.log("scenario.decision", { decision: decisions[0], broadband });

  const conclusion = broadband
    ? `CUST-1001 has ${broadband.productName}. Service status is ${broadband.status}. Line status is ${broadband.lineState}.`
    : "No broadband service found for CUST-1001.";

  ctx.logger.log("scenario.completed", { id: "S01", conclusion });

  return {
    id: "S01",
    title: "Customer/service lookup",
    steps,
    decisions,
    conclusion,
    supportedFacts: [
      "CUST-1001 has Fibre 150 broadband",
      `line status is ${broadband?.lineState ?? "unknown"}`,
      `service status is ${broadband?.status ?? "unknown"}`,
    ],
    forbiddenClaimsAvoided: ["service is down", "access is blocked"],
  };
}
