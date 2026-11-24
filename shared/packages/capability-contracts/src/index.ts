import type {
  Bill,
  BillingAccount,
  BillingCase,
  Contract,
  ContractEvent,
  Customer,
  Fault,
  KnowledgeSearchResult,
  NetworkIncident,
  Offer,
  Order,
  Payment,
  Result,
  Service,
  SupportCaseDraft,
} from "@northstar/domain-model";

export type CustomerCapabilities = {
  getCustomer(customerId: string): Promise<Result<Customer>>;
  findCustomersByName(query: {
    firstName?: string;
    lastName?: string;
  }): Promise<Result<Customer[]>>;
};

export type ServiceCapabilities = {
  getCustomerServices(customerId: string): Promise<Result<Service[]>>;
  getCustomerOrders(customerId: string): Promise<Result<Order[]>>;
  getOrder(orderId: string): Promise<Result<Order>>;
  getFaults(customerId: string): Promise<Result<Fault[]>>;
  getFault(faultId: string): Promise<Result<Fault>>;
  getNetworkIncidents(): Promise<Result<NetworkIncident[]>>;
};

export type BillingCapabilities = {
  getBillingAccount(customerId: string): Promise<Result<BillingAccount>>;
  getBills(billingAccountId: string): Promise<Result<Bill[]>>;
  getPayments(billingAccountId: string): Promise<Result<Payment[]>>;
  getBillingCases(customerId: string): Promise<Result<BillingCase[]>>;
};

export type ContractCapabilities = {
  getContracts(customerId: string): Promise<Result<Contract[]>>;
  getContract(contractId: string): Promise<Result<Contract>>;
  getContractEvents(contractId: string): Promise<Result<ContractEvent[]>>;
  getOffers(customerId: string): Promise<Result<Offer[]>>;
};

export type KnowledgeCapabilities = {
  searchKnowledge(query: string, limit?: number): Promise<Result<KnowledgeSearchResult[]>>;
};

export type SupportCapabilities = {
  draftSupportCase(input: {
    customerId: string;
    subject: string;
    summary: string;
    relatedRecordIds?: string[];
    evidenceGaps?: string[];
  }): Promise<Result<SupportCaseDraft>>;
};

export type CapabilitySet = CustomerCapabilities &
  ServiceCapabilities &
  BillingCapabilities &
  ContractCapabilities &
  KnowledgeCapabilities &
  SupportCapabilities;

export type CapabilityBackend = "direct" | "rest";
