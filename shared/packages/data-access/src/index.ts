import fs from "node:fs";
import path from "node:path";
import {
  BillingAccountSchema,
  BillingCaseSchema,
  BillSchema,
  ContractEventSchema,
  ContractSchema,
  CustomerSchema,
  FaultSchema,
  NetworkIncidentSchema,
  OfferSchema,
  OrderSchema,
  PaymentSchema,
  ServiceSchema,
  err,
  ok,
  type BillingAccount,
  type BillingCase,
  type Bill,
  type Contract,
  type ContractEvent,
  type Customer,
  type Fault,
  type NetworkIncident,
  type Offer,
  type Order,
  type Payment,
  type Result,
  type Service,
} from "@northstar/domain-model";
import { z } from "zod";

type DataPaths = {
  dataDir: string;
};

function readJsonArray<T>(filePath: string, schema: z.ZodType<T>): T[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  return z.array(schema).parse(raw);
}

export class NorthstarDataStore {
  readonly customers: Customer[];
  readonly services: Service[];
  readonly orders: Order[];
  readonly billingAccounts: BillingAccount[];
  readonly bills: Bill[];
  readonly payments: Payment[];
  readonly billingCases: BillingCase[];
  readonly faults: Fault[];
  readonly networkIncidents: NetworkIncident[];
  readonly contracts: Contract[];
  readonly contractEvents: ContractEvent[];
  readonly offers: Offer[];

  private constructor(data: {
    customers: Customer[];
    services: Service[];
    orders: Order[];
    billingAccounts: BillingAccount[];
    bills: Bill[];
    payments: Payment[];
    billingCases: BillingCase[];
    faults: Fault[];
    networkIncidents: NetworkIncident[];
    contracts: Contract[];
    contractEvents: ContractEvent[];
    offers: Offer[];
  }) {
    this.customers = data.customers;
    this.services = data.services;
    this.orders = data.orders;
    this.billingAccounts = data.billingAccounts;
    this.bills = data.bills;
    this.payments = data.payments;
    this.billingCases = data.billingCases;
    this.faults = data.faults;
    this.networkIncidents = data.networkIncidents;
    this.contracts = data.contracts;
    this.contractEvents = data.contractEvents;
    this.offers = data.offers;
  }

  static load(paths: DataPaths): NorthstarDataStore {
    const d = paths.dataDir;
    return new NorthstarDataStore({
      customers: readJsonArray(path.join(d, "customers.json"), CustomerSchema),
      services: readJsonArray(path.join(d, "services.json"), ServiceSchema),
      orders: readJsonArray(path.join(d, "orders.json"), OrderSchema),
      billingAccounts: readJsonArray(path.join(d, "billing-accounts.json"), BillingAccountSchema),
      bills: readJsonArray(path.join(d, "bills.json"), BillSchema),
      payments: readJsonArray(path.join(d, "payments.json"), PaymentSchema),
      billingCases: readJsonArray(path.join(d, "billing-cases.json"), BillingCaseSchema),
      faults: readJsonArray(path.join(d, "faults.json"), FaultSchema),
      networkIncidents: readJsonArray(path.join(d, "network-incidents.json"), NetworkIncidentSchema),
      contracts: readJsonArray(path.join(d, "contracts.json"), ContractSchema),
      contractEvents: readJsonArray(path.join(d, "contract-events.json"), ContractEventSchema),
      offers: readJsonArray(path.join(d, "offers.json"), OfferSchema),
    });
  }
}

function uniqueOrAmbiguous<T>(
  matches: T[],
  notFoundMessage: string,
  ambiguousMessage: string,
): Result<T> {
  if (matches.length === 0) return err("NOT_FOUND", notFoundMessage);
  if (matches.length > 1) {
    return err("AMBIGUOUS", ambiguousMessage, { matchCount: matches.length, matches });
  }
  return ok(matches[0]!);
}

export function getCustomerById(store: NorthstarDataStore, customerId: string): Result<Customer> {
  const matches = store.customers.filter((c) => c.customerId === customerId);
  return uniqueOrAmbiguous(matches, `Customer ${customerId} not found`, `Multiple customers for ${customerId}`);
}

export function findCustomers(
  store: NorthstarDataStore,
  query: { lastName?: string; firstName?: string; email?: string },
): Result<Customer[]> {
  let matches = store.customers;
  if (query.lastName) {
    const ln = query.lastName.toLowerCase();
    matches = matches.filter((c) => c.lastName?.toLowerCase() === ln || c.contactLastName?.toLowerCase() === ln);
  }
  if (query.firstName) {
    const fn = query.firstName.toLowerCase();
    matches = matches.filter((c) => c.firstName?.toLowerCase() === fn || c.contactFirstName?.toLowerCase() === fn);
  }
  if (query.email) {
    const email = query.email.toLowerCase();
    matches = matches.filter((c) => c.email.toLowerCase() === email);
  }
  return ok(matches);
}

export function findCustomerBySurname(store: NorthstarDataStore, surname: string): Result<Customer> {
  const matches = store.customers.filter(
    (c) => c.lastName?.toLowerCase() === surname.toLowerCase() || c.contactLastName?.toLowerCase() === surname.toLowerCase(),
  );
  return uniqueOrAmbiguous(
    matches,
    `No customer found with surname ${surname}`,
    `Multiple customers match surname ${surname}`,
  );
}

export function getServicesByCustomer(store: NorthstarDataStore, customerId: string): Result<Service[]> {
  const customer = getCustomerById(store, customerId);
  if (!customer.ok) return customer;
  return ok(store.services.filter((s) => s.customerId === customerId));
}

export function getServiceById(store: NorthstarDataStore, serviceId: string): Result<Service> {
  return uniqueOrAmbiguous(
    store.services.filter((s) => s.serviceId === serviceId),
    `Service ${serviceId} not found`,
    `Multiple services for ${serviceId}`,
  );
}

export function getOrdersByCustomer(store: NorthstarDataStore, customerId: string): Result<Order[]> {
  const customer = getCustomerById(store, customerId);
  if (!customer.ok) return customer;
  return ok(store.orders.filter((o) => o.customerId === customerId));
}

export function getOrderById(store: NorthstarDataStore, orderId: string): Result<Order> {
  return uniqueOrAmbiguous(
    store.orders.filter((o) => o.orderId === orderId),
    `Order ${orderId} not found`,
    `Multiple orders for ${orderId}`,
  );
}

export function getBillingAccountByCustomer(
  store: NorthstarDataStore,
  customerId: string,
): Result<BillingAccount> {
  const customer = getCustomerById(store, customerId);
  if (!customer.ok) return customer;
  return uniqueOrAmbiguous(
    store.billingAccounts.filter((b) => b.customerId === customerId),
    `Billing account for ${customerId} not found`,
    `Multiple billing accounts for ${customerId}`,
  );
}

export function getBillingAccountById(
  store: NorthstarDataStore,
  billingAccountId: string,
): Result<BillingAccount> {
  return uniqueOrAmbiguous(
    store.billingAccounts.filter((b) => b.billingAccountId === billingAccountId),
    `Billing account ${billingAccountId} not found`,
    `Multiple billing accounts for ${billingAccountId}`,
  );
}

export function getBillsByAccount(store: NorthstarDataStore, billingAccountId: string): Result<Bill[]> {
  const account = getBillingAccountById(store, billingAccountId);
  if (!account.ok) return account;
  return ok(store.bills.filter((b) => b.billingAccountId === billingAccountId));
}

export function getBillById(store: NorthstarDataStore, billId: string): Result<Bill> {
  return uniqueOrAmbiguous(
    store.bills.filter((b) => b.billId === billId),
    `Bill ${billId} not found`,
    `Multiple bills for ${billId}`,
  );
}

export function getPaymentsByAccount(
  store: NorthstarDataStore,
  billingAccountId: string,
): Result<Payment[]> {
  const account = getBillingAccountById(store, billingAccountId);
  if (!account.ok) return account;
  return ok(store.payments.filter((p) => p.billingAccountId === billingAccountId));
}

export function getBillingCasesByCustomer(
  store: NorthstarDataStore,
  customerId: string,
): Result<BillingCase[]> {
  const customer = getCustomerById(store, customerId);
  if (!customer.ok) return customer;
  return ok(store.billingCases.filter((c) => c.customerId === customerId));
}

export function getFaultsByCustomer(store: NorthstarDataStore, customerId: string): Result<Fault[]> {
  const customer = getCustomerById(store, customerId);
  if (!customer.ok) return customer;
  return ok(store.faults.filter((f) => f.customerId === customerId));
}

export function getFaultById(store: NorthstarDataStore, faultId: string): Result<Fault> {
  return uniqueOrAmbiguous(
    store.faults.filter((f) => f.faultId === faultId),
    `Fault ${faultId} not found`,
    `Multiple faults for ${faultId}`,
  );
}

export function getNetworkIncidents(store: NorthstarDataStore): Result<NetworkIncident[]> {
  return ok(store.networkIncidents);
}

export function getContractsByCustomer(
  store: NorthstarDataStore,
  customerId: string,
): Result<Contract[]> {
  const customer = getCustomerById(store, customerId);
  if (!customer.ok) return customer;
  return ok(store.contracts.filter((c) => c.customerId === customerId));
}

export function getContractByService(
  store: NorthstarDataStore,
  serviceId: string,
): Result<Contract> {
  return uniqueOrAmbiguous(
    store.contracts.filter((c) => c.serviceId === serviceId),
    `Contract for service ${serviceId} not found`,
    `Multiple contracts for service ${serviceId}`,
  );
}

export function getContractById(store: NorthstarDataStore, contractId: string): Result<Contract> {
  return uniqueOrAmbiguous(
    store.contracts.filter((c) => c.contractId === contractId),
    `Contract ${contractId} not found`,
    `Multiple contracts for ${contractId}`,
  );
}

export function getContractEvents(
  store: NorthstarDataStore,
  contractId: string,
): Result<ContractEvent[]> {
  const contract = getContractById(store, contractId);
  if (!contract.ok) return contract;
  return ok(store.contractEvents.filter((e) => e.contractId === contractId));
}

export function getOffersByCustomer(store: NorthstarDataStore, customerId: string): Result<Offer[]> {
  const customer = getCustomerById(store, customerId);
  if (!customer.ok) return customer;
  return ok(store.offers.filter((o) => o.customerId === customerId));
}
