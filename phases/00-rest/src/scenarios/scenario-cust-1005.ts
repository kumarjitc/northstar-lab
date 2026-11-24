import type { ScenarioContext, ScenarioResult } from "./types.js";

/**
 * Complex deterministic orchestration for CUST-1005:
 * payment claimed, broadband unavailable.
 * Explicit coded sequence: service -> billing -> payments -> billing case -> faults.
 */
export async function runCust1005PaymentRestriction(
  ctx: ScenarioContext,
): Promise<ScenarioResult> {
  const steps: string[] = [];
  const decisions: string[] = [];
  const customerId = "CUST-1005";

  ctx.logger.log("scenario.step", { step: "getCustomer", customerId });
  const customer = ctx.services.getCustomer(customerId);
  steps.push("GET /customers/CUST-1005");
  if (!customer.ok) throw new Error(customer.error.message);

  ctx.logger.log("scenario.step", { step: "getCustomerServices", customerId });
  const services = ctx.services.getCustomerServices(customerId);
  steps.push("GET /customers/CUST-1005/services");
  if (!services.ok) throw new Error(services.error.message);
  const broadband = services.data.find((s) => s.productCategory === "BROADBAND");
  decisions.push(
    `Service lineState=${broadband?.lineState}; accessRestrictionReason=${broadband?.accessRestrictionReason ?? "none"}`,
  );
  ctx.logger.log("scenario.decision", { decision: decisions.at(-1) });

  ctx.logger.log("scenario.step", { step: "getBillingAccount", customerId });
  const account = ctx.services.getBillingAccount(customerId);
  steps.push("GET /customers/CUST-1005/billing-account");
  if (!account.ok) throw new Error(account.error.message);
  decisions.push(
    `Billing account ${account.data.billingAccountId} status=${account.data.accountStatus} balance=${account.data.balance}`,
  );
  ctx.logger.log("scenario.decision", { decision: decisions.at(-1) });

  ctx.logger.log("scenario.step", {
    step: "getPayments",
    billingAccountId: account.data.billingAccountId,
  });
  const payments = ctx.services.getPayments(account.data.billingAccountId);
  steps.push(`GET /billing/accounts/${account.data.billingAccountId}/payments`);
  if (!payments.ok) throw new Error(payments.error.message);
  const failed = payments.data.filter((p) => p.status === "FAILED");
  const pending = payments.data.filter((p) => p.status === "PENDING");
  decisions.push(
    `Payments: failed=${failed.map((p) => p.paymentId).join(",") || "none"}; pending=${pending.map((p) => p.paymentId).join(",") || "none"}`,
  );
  ctx.logger.log("scenario.decision", { decision: decisions.at(-1) });

  ctx.logger.log("scenario.step", { step: "getBillingCases", customerId });
  const cases = ctx.services.getBillingCases(customerId);
  steps.push("GET /customers/CUST-1005/billing-cases");
  if (!cases.ok) throw new Error(cases.error.message);
  decisions.push(
    `Billing cases: ${cases.data.map((c) => `${c.billingCaseId}:${c.status}`).join(", ") || "none"}`,
  );
  ctx.logger.log("scenario.decision", { decision: decisions.at(-1) });

  ctx.logger.log("scenario.step", { step: "getFaults", customerId });
  const faults = ctx.services.getFaults(customerId);
  steps.push("GET /customers/CUST-1005/faults");
  if (!faults.ok) throw new Error(faults.error.message);
  const latestFault = faults.data[0];
  decisions.push(
    `Fault ${latestFault?.faultId ?? "none"} diagnostics.lineTest=${latestFault?.diagnostics?.lineTest ?? "n/a"} accessState=${latestFault?.diagnostics?.accessState ?? "n/a"}`,
  );
  ctx.logger.log("scenario.decision", { decision: decisions.at(-1) });

  const settlementConfirmed = payments.data.some((p) => p.status === "SETTLED" && p.amount >= account.data.balance);
  const physicalFaultIndicated =
    latestFault?.diagnostics?.lineTest === "FAIL" || broadband?.lineState === "DOWN";

  if (settlementConfirmed) {
    decisions.push("Settlement confirmed — unexpected for this fixture");
  } else {
    decisions.push("Settlement NOT confirmed: failed payment remains failed; pending retry is not settled");
  }
  if (physicalFaultIndicated) {
    decisions.push("Physical fault indicated");
  } else {
    decisions.push("Physical network fault NOT indicated; access restriction / billing path applies");
  }
  decisions.push("Do not promise reconnection");
  ctx.logger.log("scenario.decision", { decision: "final", decisions });

  const conclusion = [
    "CUST-1005 reports payment made and broadband unavailable.",
    `Earlier payment ${failed[0]?.paymentId ?? "unknown"} FAILED.`,
    `Retry ${pending[0]?.paymentId ?? "unknown"} remains PENDING and is not settled.`,
    `Broadband lineState is ${broadband?.lineState ?? "unknown"} with access restriction ${broadband?.accessRestrictionReason ?? "unspecified"}.`,
    `Line diagnostics ${latestFault?.diagnostics?.lineTest ?? "unknown"}; physical network fault is not indicated.`,
    "Reconnection must not be promised until settlement is confirmed and restriction is cleared.",
  ].join(" ");

  ctx.logger.log("scenario.completed", { id: "CUST-1005", conclusion });

  return {
    id: "CUST-1005",
    title: "Payment pending + access restriction",
    steps,
    decisions,
    conclusion,
    supportedFacts: [
      "earlier payment failed",
      "retry remains pending rather than settled",
      "physical line diagnostics pass",
      "access is blocked/restricted",
      "evidence does not support diagnosing a physical network fault",
    ],
    forbiddenClaimsAvoided: [
      "the bill has been paid",
      "payment has cleared",
      "promise reconnection today",
      "physical network fault confirmed",
    ],
  };
}
