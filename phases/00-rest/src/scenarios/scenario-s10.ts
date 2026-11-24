import type { ScenarioContext, ScenarioResult } from "./types.js";

/** Ambiguous Patel identity — must not pick one arbitrarily. */
export async function runS10PatelAmbiguity(ctx: ScenarioContext): Promise<ScenarioResult> {
  const steps: string[] = [];
  const decisions: string[] = [];

  ctx.logger.log("scenario.step", { step: "findCustomersByName", lastName: "Patel" });
  steps.push("SEARCH customers lastName=Patel");
  const matches = ctx.services.findCustomersByName({ lastName: "Patel" });
  if (!matches.ok) throw new Error(matches.error.message);

  decisions.push(`Matched ${matches.data.length} Patel customers`);
  if (matches.data.length > 1) {
    decisions.push("Identity is ambiguous — request additional identifier before returning services/orders");
  }
  ctx.logger.log("scenario.decision", {
    decisions,
    matches: matches.data.map((c) => ({
      customerId: c.customerId,
      firstName: c.firstName,
      lastName: c.lastName,
      status: c.status,
    })),
  });

  const conclusion =
    matches.data.length > 1
      ? `Multiple customers match surname Patel: ${matches.data
          .map((c) => `${c.customerId} (${c.firstName} ${c.lastName}, ${c.status})`)
          .join("; ")}. Clarification is required before returning services or orders.`
      : "Unexpected: Patel search was not ambiguous.";

  ctx.logger.log("scenario.completed", { id: "S10", conclusion });

  return {
    id: "S10",
    title: "Ambiguous identity",
    steps,
    decisions,
    conclusion,
    supportedFacts: ["multiple Patel customers match", "clarification is required"],
    forbiddenClaimsAvoided: [
      "selected one Patel arbitrarily",
      "services for an unresolved Patel identity",
    ],
  };
}
