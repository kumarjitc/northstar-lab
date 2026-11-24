import { randomUUID } from "node:crypto";
import {
  findCustomerBySurname,
  findCustomers,
  getBillingAccountByCustomer,
  getBillingAccountById,
  getBillingCasesByCustomer,
  getBillsByAccount,
  getContractById,
  getContractEvents,
  getContractsByCustomer,
  getCustomerById,
  getFaultById,
  getFaultsByCustomer,
  getNetworkIncidents,
  getOffersByCustomer,
  getOrderById,
  getOrdersByCustomer,
  getPaymentsByAccount,
  getServiceById,
  getServicesByCustomer,
  type NorthstarDataStore,
} from "@northstar/data-access";
import {
  CustomerIdSchema,
  err,
  ok,
  SupportCaseDraftSchema,
  type Result,
  type SupportCaseDraft,
} from "@northstar/domain-model";
import {
  loadKnowledgeArticles,
  searchKnowledge,
  type KnowledgeArticle,
} from "@northstar/knowledge-search";

export type DomainServices = ReturnType<typeof createDomainServices>;

export function createDomainServices(options: {
  store: NorthstarDataStore;
  knowledgeDir: string;
}) {
  const articles: KnowledgeArticle[] = loadKnowledgeArticles(options.knowledgeDir);
  const drafts = new Map<string, SupportCaseDraft>();
  const store = options.store;

  return {
    getCustomer(customerId: string) {
      const parsed = CustomerIdSchema.safeParse(customerId);
      if (!parsed.success) return err("INVALID_INPUT", `Invalid customer id: ${customerId}`);
      return getCustomerById(store, parsed.data);
    },

    findCustomersByName(query: { firstName?: string; lastName?: string }) {
      if (!query.firstName && !query.lastName) {
        return err("INVALID_INPUT", "Provide firstName and/or lastName");
      }
      return findCustomers(store, query);
    },

    findCustomerBySurname(surname: string) {
      if (!surname.trim()) return err("INVALID_INPUT", "surname is required");
      return findCustomerBySurname(store, surname.trim());
    },

    getCustomerServices(customerId: string) {
      return getServicesByCustomer(store, customerId);
    },

    getService(serviceId: string) {
      return getServiceById(store, serviceId);
    },

    getCustomerOrders(customerId: string) {
      return getOrdersByCustomer(store, customerId);
    },

    getOrder(orderId: string) {
      return getOrderById(store, orderId);
    },

    getBillingAccount(customerId: string) {
      return getBillingAccountByCustomer(store, customerId);
    },

    getBillingAccountById(billingAccountId: string) {
      return getBillingAccountById(store, billingAccountId);
    },

    getBills(billingAccountId: string) {
      return getBillsByAccount(store, billingAccountId);
    },

    getPayments(billingAccountId: string) {
      return getPaymentsByAccount(store, billingAccountId);
    },

    getBillingCases(customerId: string) {
      return getBillingCasesByCustomer(store, customerId);
    },

    getFaults(customerId: string) {
      return getFaultsByCustomer(store, customerId);
    },

    getFault(faultId: string) {
      return getFaultById(store, faultId);
    },

    getNetworkIncidents() {
      return getNetworkIncidents(store);
    },

    getContracts(customerId: string) {
      return getContractsByCustomer(store, customerId);
    },

    getContract(contractId: string) {
      return getContractById(store, contractId);
    },

    getContractEvents(contractId: string) {
      return getContractEvents(store, contractId);
    },

    getOffers(customerId: string) {
      return getOffersByCustomer(store, customerId);
    },

    searchKnowledge(query: string, limit = 3) {
      if (!query.trim()) return err("INVALID_INPUT", "query is required");
      return searchKnowledge(articles, query, limit);
    },

    listKnowledgeArticles() {
      return ok(articles.map((a) => ({ articleId: a.articleId, title: a.title, fileName: a.fileName, category: a.category })));
    },

    draftSupportCase(input: {
      customerId: string;
      subject: string;
      summary: string;
      relatedRecordIds?: string[];
      evidenceGaps?: string[];
    }): Result<SupportCaseDraft> {
      const customer = getCustomerById(store, input.customerId);
      if (!customer.ok) return customer;
      if (!input.subject.trim() || !input.summary.trim()) {
        return err("INVALID_INPUT", "subject and summary are required");
      }
      const draft = SupportCaseDraftSchema.parse({
        draftId: `DRAFT-${randomUUID()}`,
        status: "DRAFT" as const,
        customerId: input.customerId,
        subject: input.subject.trim(),
        summary: input.summary.trim(),
        relatedRecordIds: input.relatedRecordIds ?? [],
        evidenceGaps: input.evidenceGaps ?? [],
        createdAt: new Date().toISOString(),
      });
      drafts.set(draft.draftId, draft);
      return ok(draft);
    },

    getDraft(draftId: string): Result<SupportCaseDraft> {
      const draft = drafts.get(draftId);
      if (!draft) return err("NOT_FOUND", `Draft ${draftId} not found`);
      return ok(draft);
    },
  };
}
