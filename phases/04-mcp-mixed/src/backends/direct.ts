import type { CapabilitySet } from "@northstar/capability-contracts";
import type { DomainServices } from "@northstar/domain-services";

export function createDirectCapabilities(services: DomainServices): CapabilitySet {
  return {
    getCustomer: async (customerId) => services.getCustomer(customerId),
    findCustomersByName: async (query) => services.findCustomersByName(query),
    getCustomerServices: async (customerId) => services.getCustomerServices(customerId),
    getCustomerOrders: async (customerId) => services.getCustomerOrders(customerId),
    getOrder: async (orderId) => services.getOrder(orderId),
    getFaults: async (customerId) => services.getFaults(customerId),
    getFault: async (faultId) => services.getFault(faultId),
    getNetworkIncidents: async () => services.getNetworkIncidents(),
    getBillingAccount: async (customerId) => services.getBillingAccount(customerId),
    getBills: async (billingAccountId) => services.getBills(billingAccountId),
    getPayments: async (billingAccountId) => services.getPayments(billingAccountId),
    getBillingCases: async (customerId) => services.getBillingCases(customerId),
    getContracts: async (customerId) => services.getContracts(customerId),
    getContract: async (contractId) => services.getContract(contractId),
    getContractEvents: async (contractId) => services.getContractEvents(contractId),
    getOffers: async (customerId) => services.getOffers(customerId),
    searchKnowledge: async (query, limit) => services.searchKnowledge(query, limit),
    draftSupportCase: async (input) => services.draftSupportCase(input),
  };
}
