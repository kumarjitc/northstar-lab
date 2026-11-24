import { z } from "zod";

export const CustomerIdSchema = z.string().regex(/^CUST-\d+$/);
export const ServiceIdSchema = z.string().regex(/^SVC-\d+$/);
export const OrderIdSchema = z.string().regex(/^ORD-\d+$/);
export const BillingAccountIdSchema = z.string().regex(/^BA-\d+$/);
export const BillIdSchema = z.string().regex(/^BILL-\d+$/);
export const PaymentIdSchema = z.string().regex(/^PAY-\d+$/);
export const BillingCaseIdSchema = z.string().regex(/^BC-\d+$/);
export const FaultIdSchema = z.string().regex(/^FLT-\d+$/);
export const IncidentIdSchema = z.string().regex(/^INC-\d+$/);
export const ContractIdSchema = z.string().regex(/^CON-\d+$/);
export const ContractEventIdSchema = z.string().regex(/^CE-\d+$/);
export const OfferIdSchema = z.string().regex(/^OFF-\d+$/);

export type CustomerId = z.infer<typeof CustomerIdSchema>;
export type ServiceId = z.infer<typeof ServiceIdSchema>;
export type OrderId = z.infer<typeof OrderIdSchema>;
export type BillingAccountId = z.infer<typeof BillingAccountIdSchema>;
export type BillId = z.infer<typeof BillIdSchema>;
export type PaymentId = z.infer<typeof PaymentIdSchema>;
export type BillingCaseId = z.infer<typeof BillingCaseIdSchema>;
export type FaultId = z.infer<typeof FaultIdSchema>;
export type IncidentId = z.infer<typeof IncidentIdSchema>;
export type ContractId = z.infer<typeof ContractIdSchema>;
export type OfferId = z.infer<typeof OfferIdSchema>;

export const AddressSchema = z.object({
  line1: z.string(),
  city: z.string(),
  postcode: z.string(),
  country: z.string(),
});

export const CustomerSchema = z.object({
  customerId: CustomerIdSchema,
  type: z.enum(["CONSUMER", "SMALL_BUSINESS"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "CLOSED"]),
  title: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  businessName: z.string().optional(),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string(),
  address: AddressSchema,
});
export type Customer = z.infer<typeof CustomerSchema>;

export const ServiceSchema = z.object({
  serviceId: ServiceIdSchema,
  customerId: CustomerIdSchema,
  productName: z.string(),
  productCategory: z.enum(["BROADBAND", "VOICE", "ADD_ON"]),
  status: z.enum(["ACTIVE", "PROVISIONING", "SUSPENDED", "CEASED"]),
  lineState: z.enum(["UP", "DOWN", "DEGRADED", "BLOCKED", "NOT_ACTIVATED", "CEASED"]),
  downloadMbps: z.number().nullable().optional(),
  uploadMbps: z.number().nullable().optional(),
  routerModel: z.string().nullable().optional(),
  accessTechnology: z.string().nullable().optional(),
  dependsOnServiceId: ServiceIdSchema.optional(),
  dependencyReason: z.string().optional(),
  accessRestrictionReason: z.string().optional(),
  activatedAt: z.string().nullable().optional(),
  ceasedAt: z.string().optional(),
});
export type Service = z.infer<typeof ServiceSchema>;

export const OrderSchema = z.object({
  orderId: OrderIdSchema,
  customerId: CustomerIdSchema,
  serviceId: ServiceIdSchema,
  orderType: z.string(),
  status: z.enum(["PLACED", "IN_PROGRESS", "DELAYED", "COMPLETED", "CANCELLED"]),
  reasonCode: z.string().nullable().optional(),
  placedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  nextReviewDate: z.string().nullable().optional(),
  appointmentWindow: z.string().optional(),
  notes: z.string().optional(),
});
export type Order = z.infer<typeof OrderSchema>;

export const BillingAccountSchema = z.object({
  billingAccountId: BillingAccountIdSchema,
  customerId: CustomerIdSchema,
  balance: z.number(),
  currency: z.string(),
  accountStatus: z.enum(["CURRENT", "RESTRICTED", "CLOSED"]),
  paymentMethod: z.string(),
  autopayStatus: z.string(),
});
export type BillingAccount = z.infer<typeof BillingAccountSchema>;

export const BillLineItemSchema = z.object({
  code: z.string(),
  description: z.string(),
  amount: z.number(),
});

export const BillSchema = z.object({
  billId: BillIdSchema,
  billingAccountId: BillingAccountIdSchema,
  customerId: CustomerIdSchema,
  status: z.enum([
    "ISSUED",
    "PARTIALLY_PAID",
    "PAYMENT_PENDING",
    "UNDER_DISPUTE",
    "CREDIT",
    "PENDING_GENERATION",
    "PAID",
  ]),
  periodStart: z.string(),
  periodEnd: z.string(),
  issuedAt: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  currency: z.string(),
  total: z.number().nullable(),
  amountPaid: z.number().optional(),
  lineItems: z.array(BillLineItemSchema),
  notes: z.string().optional(),
});
export type Bill = z.infer<typeof BillSchema>;

export const PaymentSchema = z.object({
  paymentId: PaymentIdSchema,
  billingAccountId: BillingAccountIdSchema,
  billId: BillIdSchema.optional(),
  customerId: CustomerIdSchema.optional(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(["SETTLED", "FAILED", "PENDING", "SCHEDULED"]),
  method: z.string(),
  attemptedAt: z.string(),
  settledAt: z.string().nullable().optional(),
  failureReason: z.string().optional(),
  notes: z.string().optional(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const EvidenceItemSchema = z.object({
  type: z.string(),
  referenceId: z.string().nullable().optional(),
  finding: z.string(),
  detail: z.string().optional(),
});

export const BillingCaseSchema = z.object({
  billingCaseId: BillingCaseIdSchema,
  customerId: CustomerIdSchema,
  billingAccountId: BillingAccountIdSchema,
  billId: BillIdSchema.optional(),
  caseType: z.string(),
  status: z.enum([
    "OPEN",
    "INVESTIGATING",
    "PENDING_EXTERNAL",
    "AWAITING_EVIDENCE",
    "RESOLVED",
  ]),
  openedAt: z.string(),
  summary: z.string(),
  evidence: z.array(EvidenceItemSchema),
  outcome: z.string().nullable().optional(),
});
export type BillingCase = z.infer<typeof BillingCaseSchema>;

export const FaultDiagnosticsSchema = z.object({
  lineTest: z.string().optional(),
  opticalPower: z.string().optional(),
  routerReachable: z.boolean().optional(),
  routerRestartCount24h: z.number().optional(),
  measuredDownloadMbps: z.number().nullable().optional(),
  contractMinimumMbps: z.number().optional(),
  congestionDetected: z.boolean().optional(),
  accessState: z.string().optional(),
  relatedIncidentId: IncidentIdSchema.optional(),
});

export const FaultSchema = z.object({
  faultId: FaultIdSchema,
  customerId: CustomerIdSchema,
  serviceId: ServiceIdSchema,
  faultType: z.string(),
  status: z.enum([
    "OPEN",
    "ENGINEER_BOOKED",
    "MONITORING",
    "RESOLVED",
    "RESOLVED_MONITORING",
    "CLOSED_NO_FAULT",
  ]),
  openedAt: z.string(),
  resolvedAt: z.string().optional(),
  summary: z.string(),
  diagnostics: FaultDiagnosticsSchema.optional(),
  relatedOrderId: OrderIdSchema.optional(),
  compensationCreditGbp: z.number().optional(),
  notes: z.string().optional(),
});
export type Fault = z.infer<typeof FaultSchema>;

export const NetworkIncidentSchema = z.object({
  incidentId: IncidentIdSchema,
  title: z.string(),
  status: z.string(),
  severity: z.string(),
  startedAt: z.string(),
  estimatedResolutionAt: z.string().optional(),
  affectedAreas: z.array(z.string()),
  affectedServiceIds: z.array(ServiceIdSchema),
  summary: z.string(),
});
export type NetworkIncident = z.infer<typeof NetworkIncidentSchema>;

export const ContractSchema = z.object({
  contractId: ContractIdSchema,
  customerId: CustomerIdSchema,
  serviceId: ServiceIdSchema,
  status: z.enum([
    "IN_TERM",
    "OUT_OF_TERM",
    "ENDING",
    "NOT_STARTED",
    "IN_TERM_RESTRICTED",
    "TERMINATED",
  ]),
  startedAt: z.string().nullable().optional(),
  minimumTermEndDate: z.string().nullable().optional(),
  monthlyRecurringCharge: z.number(),
  currency: z.string(),
  minimumGuaranteedDownloadMbps: z.number().optional(),
  earlyTerminationPolicyId: z.string().optional(),
  activationTrigger: z.string().optional(),
  terminatedAt: z.string().optional(),
});
export type Contract = z.infer<typeof ContractSchema>;

export const ContractEventSchema = z.object({
  eventId: ContractEventIdSchema,
  contractId: ContractIdSchema,
  eventType: z.string(),
  occurredAt: z.string(),
  relatedFaultId: FaultIdSchema.optional(),
  relatedIncidentId: IncidentIdSchema.optional(),
  relatedOrderId: OrderIdSchema.optional(),
  relatedOfferId: OfferIdSchema.optional(),
  relatedBillingCaseId: BillingCaseIdSchema.optional(),
  detail: z.string().optional(),
});
export type ContractEvent = z.infer<typeof ContractEventSchema>;

export const OfferSchema = z.object({
  offerId: OfferIdSchema,
  customerId: CustomerIdSchema,
  relatedContractId: ContractIdSchema,
  offerType: z.string(),
  status: z.enum(["AVAILABLE", "ACCEPTED", "EXPIRED"]),
  title: z.string(),
  monthlyRecurringCharge: z.number(),
  currency: z.string(),
  validUntil: z.string(),
  notes: z.string().optional(),
});
export type Offer = z.infer<typeof OfferSchema>;

export const KnowledgeSearchResultSchema = z.object({
  articleId: z.string(),
  title: z.string(),
  score: z.number(),
  fileName: z.string(),
  excerpt: z.string(),
  category: z.string().optional(),
});
export type KnowledgeSearchResult = z.infer<typeof KnowledgeSearchResultSchema>;

export const SupportCaseDraftSchema = z.object({
  draftId: z.string(),
  status: z.literal("DRAFT"),
  customerId: CustomerIdSchema,
  subject: z.string(),
  summary: z.string(),
  relatedRecordIds: z.array(z.string()).default([]),
  evidenceGaps: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type SupportCaseDraft = z.infer<typeof SupportCaseDraftSchema>;

export const ErrorCodeSchema = z.enum([
  "NOT_FOUND",
  "AMBIGUOUS",
  "INVALID_INPUT",
  "UNSUPPORTED",
  "UNAVAILABLE",
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const DomainErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
});
export type DomainError = z.infer<typeof DomainErrorSchema>;

export type OkResult<T> = { ok: true; data: T };
export type ErrResult = { ok: false; error: DomainError };
export type Result<T> = OkResult<T> | ErrResult;

export function ok<T>(data: T): OkResult<T> {
  return { ok: true, data };
}

export function err(code: ErrorCode, message: string, details?: unknown): ErrResult {
  return {
    ok: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
}

export function isOk<T>(result: Result<T>): result is OkResult<T> {
  return result.ok;
}

export function isErr<T>(result: Result<T>): result is ErrResult {
  return !result.ok;
}
