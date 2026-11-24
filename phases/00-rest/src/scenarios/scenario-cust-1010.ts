import type { ScenarioContext, ScenarioResult } from "./types.js";

/** Cross-domain equipment fee dispute — order does not prove fee validity. */
export async function runCust1010RouterDispute(
  ctx: ScenarioContext,
): Promise<ScenarioResult> {
  const steps: string[] = [];
  const decisions: string[] = [];
  const customerId = "CUST-1010";

  ctx.logger.log("scenario.step", { step: "getCustomer", customerId });
  steps.push("GET customer");
  const customer = ctx.services.getCustomer(customerId);
  if (!customer.ok) throw new Error(customer.error.message);

  ctx.logger.log("scenario.step", { step: "getFaults", customerId });
  steps.push("GET faults");
  const faults = ctx.services.getFaults(customerId);
  if (!faults.ok) throw new Error(faults.error.message);
  const fault = faults.data.find((f) => f.faultId === "FLT-6009") ?? faults.data[0];
  decisions.push(
    `Fault ${fault?.faultId} type=${fault?.faultType} restarts=${fault?.diagnostics?.routerRestartCount24h}`,
  );

  ctx.logger.log("scenario.step", { step: "getCustomerOrders", customerId });
  steps.push("GET orders");
  const orders = ctx.services.getCustomerOrders(customerId);
  if (!orders.ok) throw new Error(orders.error.message);
  const replacement = orders.data.find((o) => o.orderType === "ROUTER_REPLACEMENT");
  decisions.push(`Replacement order ${replacement?.orderId} status=${replacement?.status}`);

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
  const bill = bills.data.find((b) => b.billId === "BILL-7009");
  const fee = bill?.lineItems.find((li) => li.amount === 34.99);
  decisions.push(`Bill ${bill?.billId} contains charge ${fee?.description} £${fee?.amount}`);

  ctx.logger.log("scenario.step", { step: "getBillingCases", customerId });
  steps.push("GET billing cases");
  const cases = ctx.services.getBillingCases(customerId);
  if (!cases.ok) throw new Error(cases.error.message);
  const dispute = cases.data.find((c) => c.caseType === "EQUIPMENT_CHARGE_DISPUTE");
  const waiver = dispute?.evidence.find((e) => e.type === "FEE_WAIVER");
  decisions.push(
    `Dispute ${dispute?.billingCaseId} status=${dispute?.status}; fee waiver finding=${waiver?.finding}`,
  );

  ctx.logger.log("scenario.step", { step: "getContracts", customerId });
  steps.push("GET contracts");
  const contracts = ctx.services.getContracts(customerId);
  if (!contracts.ok) throw new Error(contracts.error.message);
  const contract = contracts.data[0];
  decisions.push(`Contract ${contract?.contractId} status=${contract?.status}`);
  decisions.push("Replacement order does NOT prove the £34.99 fee is valid");
  decisions.push("Customer free-promise claim does NOT prove the fee is invalid without waiver evidence");
  decisions.push("Keep decision unresolved");
  ctx.logger.log("scenario.decision", { decisions });

  const conclusion = [
    `CUST-1010 has equipment fault evidence (${fault?.faultId}) with elevated router restarts.`,
    `Replacement order ${replacement?.orderId} is ${replacement?.status}.`,
    `Bill ${bill?.billId} includes a £34.99 router replacement charge and is UNDER_DISPUTE.`,
    `Billing case ${dispute?.billingCaseId} is ${dispute?.status}; fee waiver evidence is ${waiver?.finding}.`,
    `Contract ${contract?.contractId} is ${contract?.status}.`,
    "The replacement order does not prove the charge is valid. The dispute remains unresolved pending evidence.",
  ].join(" ");

  ctx.logger.log("scenario.completed", { id: "CUST-1010", conclusion });

  return {
    id: "CUST-1010",
    title: "Router fault + disputed replacement fee",
    steps,
    decisions,
    conclusion,
    supportedFacts: [
      "router restarting / equipment fault evidence",
      "replacement order exists",
      "£34.99 charge is on the bill",
      "fee waiver NOT_FOUND",
      "dispute remains unresolved",
      "active contract exists",
    ],
    forbiddenClaimsAvoided: [
      "replacement order proves the fee is valid",
      "fee is confirmed free",
      "dispute resolved",
    ],
  };
}
