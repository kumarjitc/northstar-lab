import type { ScenarioContext, ScenarioResult } from "./types.js";

/** Delayed activation + NOT_STARTED contract — do not invent end date or bill total. */
export async function runCust1008ActivationContract(
  ctx: ScenarioContext,
): Promise<ScenarioResult> {
  const steps: string[] = [];
  const decisions: string[] = [];
  const customerId = "CUST-1008";

  ctx.logger.log("scenario.step", { step: "getCustomer", customerId });
  steps.push("GET customer CUST-1008");
  const customer = ctx.services.getCustomer(customerId);
  if (!customer.ok) throw new Error(customer.error.message);

  ctx.logger.log("scenario.step", { step: "getCustomerServices", customerId });
  steps.push("GET services");
  const services = ctx.services.getCustomerServices(customerId);
  if (!services.ok) throw new Error(services.error.message);

  ctx.logger.log("scenario.step", { step: "getCustomerOrders", customerId });
  steps.push("GET orders");
  const orders = ctx.services.getCustomerOrders(customerId);
  if (!orders.ok) throw new Error(orders.error.message);
  const ord2042 = orders.data.find((o) => o.orderId === "ORD-2042");
  decisions.push(
    `ORD-2042 status=${ord2042?.status} reason=${ord2042?.reasonCode} nextReviewDate=${ord2042?.nextReviewDate} is planning checkpoint only`,
  );

  ctx.logger.log("scenario.step", { step: "getContracts", customerId });
  steps.push("GET contracts");
  const contracts = ctx.services.getContracts(customerId);
  if (!contracts.ok) throw new Error(contracts.error.message);
  const contract = contracts.data[0];
  decisions.push(
    `Contract ${contract?.contractId} status=${contract?.status} minimumTermEndDate=${String(contract?.minimumTermEndDate)}`,
  );

  ctx.logger.log("scenario.step", { step: "getBillingAccount", customerId });
  steps.push("GET billing account");
  const account = ctx.services.getBillingAccount(customerId);
  if (!account.ok) throw new Error(account.error.message);

  ctx.logger.log("scenario.step", {
    step: "getBills",
    billingAccountId: account.data.billingAccountId,
  });
  steps.push("GET bills");
  const bills = ctx.services.getBills(account.data.billingAccountId);
  if (!bills.ok) throw new Error(bills.error.message);
  const pendingBill = bills.data.find((b) => b.status === "PENDING_GENERATION");
  decisions.push(
    `Bill ${pendingBill?.billId} status=PENDING_GENERATION total=${String(pendingBill?.total)} — do not invent amount`,
  );
  decisions.push("Do not invent contract end date for NOT_STARTED contract");
  ctx.logger.log("scenario.decision", { decisions });

  const voice = services.data.find((s) => s.productCategory === "VOICE");
  const conclusion = [
    `Broadband service is ${services.data.find((s) => s.productCategory === "BROADBAND")?.status} with lineState ${services.data.find((s) => s.productCategory === "BROADBAND")?.lineState}.`,
    `ORD-2042 is ${ord2042?.status} due to ${ord2042?.reasonCode}. nextReviewDate ${ord2042?.nextReviewDate} is not a completion promise.`,
    `Voice service depends on broadband (${voice?.dependencyReason ?? "DEPENDENCY_BROADBAND"}).`,
    `Contract ${contract?.contractId} is ${contract?.status}; minimumTermEndDate is unavailable.`,
    `Next bill ${pendingBill?.billId} is PENDING_GENERATION with null total — amount cannot be stated.`,
  ].join(" ");

  ctx.logger.log("scenario.completed", { id: "CUST-1008", conclusion });

  return {
    id: "CUST-1008",
    title: "Delayed activation / NOT_STARTED contract",
    steps,
    decisions,
    conclusion,
    supportedFacts: [
      "ORD-2042 delayed with CIVILS_REQUIRED",
      "contract NOT_STARTED",
      "minimumTermEndDate unavailable",
      "pending bill total is null",
    ],
    forbiddenClaimsAvoided: [
      "contract ends on",
      "next bill will be £310",
      "guaranteed completion on the review date",
    ],
  };
}
