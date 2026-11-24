import {
  BillSchema,
  BillingAccountSchema,
  BillingCaseSchema,
  ContractEventSchema,
  ContractSchema,
  CustomerSchema,
  DomainErrorSchema,
  FaultSchema,
  KnowledgeSearchResultSchema,
  NetworkIncidentSchema,
  OfferSchema,
  OrderSchema,
  PaymentSchema,
  ServiceSchema,
  SupportCaseDraftSchema,
  err,
  type Result,
  type SupportCaseDraft,
} from "@northstar/domain-model";
import type { CapabilitySet } from "@northstar/capability-contracts";
import { z } from "zod";

export type RestClientConfig = {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  onRequest?: (info: {
    method: string;
    path: string;
    requestId: string;
  }) => void;
  onResponse?: (info: {
    method: string;
    path: string;
    requestId: string;
    status: number;
    durationMs: number;
  }) => void;
};

type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: z.infer<typeof DomainErrorSchema> };

function makeEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.union([
    z.object({ ok: z.literal(true), data: dataSchema }),
    z.object({ ok: z.literal(false), error: DomainErrorSchema }),
  ]);
}

export class NorthstarRestClient implements CapabilitySet {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onRequest?: RestClientConfig["onRequest"];
  private readonly onResponse?: RestClientConfig["onResponse"];

  constructor(config: RestClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 5000;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
  }

  private async request<T>(
    method: string,
    path: string,
    dataSchema: z.ZodType<T>,
    body?: unknown,
  ): Promise<Result<T>> {
    const requestId = `rest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const started = Date.now();
    this.onRequest?.({ method, path, requestId });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      this.onResponse?.({
        method,
        path,
        requestId,
        status: res.status,
        durationMs: Date.now() - started,
      });

      let json: unknown;
      try {
        json = await res.json();
      } catch {
        return err("UNAVAILABLE", `REST ${method} ${path} returned non-JSON (${res.status})`);
      }

      const parsed = makeEnvelopeSchema(dataSchema).safeParse(json);
      if (!parsed.success) {
        return err("UNAVAILABLE", `REST ${method} ${path} envelope invalid`, parsed.error.flatten());
      }
      const envelope = parsed.data as Envelope<T>;
      if (!envelope.ok) {
        return { ok: false, error: envelope.error };
      }
      return { ok: true, data: envelope.data };
    } catch (error) {
      this.onResponse?.({
        method,
        path,
        requestId,
        status: 0,
        durationMs: Date.now() - started,
      });
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("abort")) {
        return err("UNAVAILABLE", `REST ${method} ${path} timed out after ${this.timeoutMs}ms`);
      }
      return err(
        "UNAVAILABLE",
        `REST capability unavailable for ${method} ${path}: ${message}. Is Phase 0 running at ${this.baseUrl}?`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  getCustomer(customerId: string) {
    return this.request("GET", `/customers/${encodeURIComponent(customerId)}`, CustomerSchema);
  }

  findCustomersByName(query: { firstName?: string; lastName?: string }) {
    const params = new URLSearchParams();
    if (query.firstName) params.set("firstName", query.firstName);
    if (query.lastName) params.set("lastName", query.lastName);
    return this.request("GET", `/customers/search?${params.toString()}`, z.array(CustomerSchema));
  }

  getCustomerServices(customerId: string) {
    return this.request(
      "GET",
      `/customers/${encodeURIComponent(customerId)}/services`,
      z.array(ServiceSchema),
    );
  }

  getCustomerOrders(customerId: string) {
    return this.request(
      "GET",
      `/customers/${encodeURIComponent(customerId)}/orders`,
      z.array(OrderSchema),
    );
  }

  getOrder(orderId: string) {
    return this.request("GET", `/orders/${encodeURIComponent(orderId)}`, OrderSchema);
  }

  getFaults(customerId: string) {
    return this.request(
      "GET",
      `/customers/${encodeURIComponent(customerId)}/faults`,
      z.array(FaultSchema),
    );
  }

  getFault(faultId: string) {
    return this.request("GET", `/faults/${encodeURIComponent(faultId)}`, FaultSchema);
  }

  getNetworkIncidents() {
    return this.request("GET", "/network-incidents", z.array(NetworkIncidentSchema));
  }

  getBillingAccount(customerId: string) {
    return this.request(
      "GET",
      `/customers/${encodeURIComponent(customerId)}/billing-account`,
      BillingAccountSchema,
    );
  }

  getBills(billingAccountId: string) {
    return this.request(
      "GET",
      `/billing/accounts/${encodeURIComponent(billingAccountId)}/bills`,
      z.array(BillSchema),
    );
  }

  getPayments(billingAccountId: string) {
    return this.request(
      "GET",
      `/billing/accounts/${encodeURIComponent(billingAccountId)}/payments`,
      z.array(PaymentSchema),
    );
  }

  getBillingCases(customerId: string) {
    return this.request(
      "GET",
      `/customers/${encodeURIComponent(customerId)}/billing-cases`,
      z.array(BillingCaseSchema),
    );
  }

  getContracts(customerId: string) {
    return this.request(
      "GET",
      `/customers/${encodeURIComponent(customerId)}/contracts`,
      z.array(ContractSchema),
    );
  }

  getContract(contractId: string) {
    return this.request("GET", `/contracts/${encodeURIComponent(contractId)}`, ContractSchema);
  }

  getContractEvents(contractId: string) {
    return this.request(
      "GET",
      `/contracts/${encodeURIComponent(contractId)}/events`,
      z.array(ContractEventSchema),
    );
  }

  getOffers(customerId: string) {
    return this.request(
      "GET",
      `/customers/${encodeURIComponent(customerId)}/offers`,
      z.array(OfferSchema),
    );
  }

  searchKnowledge(query: string, limit = 3) {
    const params = new URLSearchParams({ q: query });
    // Phase 0 search ignores limit in query today; client still accepts it for parity.
    void limit;
    return this.request(
      "GET",
      `/knowledge/search?${params.toString()}`,
      z.array(KnowledgeSearchResultSchema),
    );
  }

  draftSupportCase(input: {
    customerId: string;
    subject: string;
    summary: string;
    relatedRecordIds?: string[];
    evidenceGaps?: string[];
  }): Promise<Result<SupportCaseDraft>> {
    return this.request("POST", "/support-case-drafts", SupportCaseDraftSchema, input) as Promise<
      Result<SupportCaseDraft>
    >;
  }
}

export function createRestCapabilities(config: RestClientConfig): CapabilitySet {
  return new NorthstarRestClient(config);
}
