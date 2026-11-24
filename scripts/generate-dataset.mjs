#!/usr/bin/env node
/**
 * One-shot generator for the Northstar fictional decisioning dataset.
 * Produces shared/data/*.json, shared/knowledge/*.md, README, and a zip baseline.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "shared", "data");
const knowledgeDir = path.join(root, "shared", "knowledge");
const stagingDir = path.join(root, "northstar_fictional_decisioning_dataset_v3");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(knowledgeDir, { recursive: true });

const customers = [
  {
    customerId: "CUST-1001",
    type: "CONSUMER",
    status: "ACTIVE",
    title: "Ms",
    firstName: "Alex",
    lastName: "Rivera",
    email: "alex.rivera@example.test",
    phone: "+44-7700-100001",
    address: { line1: "14 Maple Close", city: "Bristol", postcode: "BS1 4AA", country: "GB" },
  },
  {
    customerId: "CUST-1002",
    type: "CONSUMER",
    status: "ACTIVE",
    title: "Ms",
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@example.test",
    phone: "+44-7700-100002",
    address: { line1: "22 Oak Avenue", city: "Leeds", postcode: "LS1 2AB", country: "GB" },
  },
  {
    customerId: "CUST-1003",
    type: "CONSUMER",
    status: "ACTIVE",
    title: "Mr",
    firstName: "James",
    lastName: "Okonkwo",
    email: "james.okonkwo@example.test",
    phone: "+44-7700-100003",
    address: { line1: "9 Canal Road", city: "Manchester", postcode: "M1 3CD", country: "GB" },
  },
  {
    customerId: "CUST-1004",
    type: "SMALL_BUSINESS",
    status: "ACTIVE",
    businessName: "Horizon Cafe Ltd",
    contactFirstName: "Sofia",
    contactLastName: "Martinez",
    email: "billing@horizoncafe.example.test",
    phone: "+44-161-100004",
    address: { line1: "5 Market Street", city: "Manchester", postcode: "M2 1EE", country: "GB" },
  },
  {
    customerId: "CUST-1005",
    type: "CONSUMER",
    status: "SUSPENDED",
    title: "Mx",
    firstName: "Sam",
    lastName: "Torres",
    email: "sam.torres@example.test",
    phone: "+44-7700-100005",
    address: { line1: "88 Harbour View", city: "Plymouth", postcode: "PL1 5FF", country: "GB" },
  },
  {
    customerId: "CUST-1006",
    type: "CONSUMER",
    status: "ACTIVE",
    title: "Ms",
    firstName: "Maya",
    lastName: "Chen",
    email: "maya.chen@example.test",
    phone: "+44-7700-100006",
    address: { line1: "3 Hillside Lane", city: "Oxford", postcode: "OX1 6GG", country: "GB" },
  },
  {
    customerId: "CUST-1007",
    type: "CONSUMER",
    status: "ACTIVE",
    title: "Ms",
    firstName: "Maya",
    lastName: "Brooks",
    email: "maya.brooks@example.test",
    phone: "+44-7700-100007",
    address: { line1: "17 Riverside Walk", city: "York", postcode: "YO1 7HH", country: "GB" },
  },
  {
    customerId: "CUST-1008",
    type: "SMALL_BUSINESS",
    status: "ACTIVE",
    businessName: "Bright Desk Ltd",
    contactFirstName: "Noah",
    contactLastName: "Bennett",
    email: "ops@brightdesk.example.test",
    phone: "+44-207-100008",
    address: { line1: "41 Fleet Place", city: "London", postcode: "EC4A 1JJ", country: "GB" },
  },
  {
    customerId: "CUST-1009",
    type: "CONSUMER",
    status: "CLOSED",
    title: "Mr",
    firstName: "Raj",
    lastName: "Patel",
    email: "raj.patel@example.test",
    phone: "+44-7700-100009",
    address: { line1: "66 Station Road", city: "Birmingham", postcode: "B1 8KK", country: "GB" },
  },
  {
    customerId: "CUST-1010",
    type: "CONSUMER",
    status: "ACTIVE",
    title: "Ms",
    firstName: "Elena",
    lastName: "Novak",
    email: "elena.novak@example.test",
    phone: "+44-7700-100010",
    address: { line1: "12 Cedar Court", city: "Brighton", postcode: "BN1 9LL", country: "GB" },
  },
];

const services = [
  {
    serviceId: "SVC-3001",
    customerId: "CUST-1001",
    productName: "Fibre 150",
    productCategory: "BROADBAND",
    status: "ACTIVE",
    lineState: "UP",
    downloadMbps: 150,
    uploadMbps: 30,
    routerModel: "NS-Router-X1",
    accessTechnology: "FTTP",
    activatedAt: "2024-03-12T10:00:00Z",
  },
  {
    serviceId: "SVC-3002",
    customerId: "CUST-1001",
    productName: "Digital Voice",
    productCategory: "VOICE",
    status: "ACTIVE",
    lineState: "UP",
    dependsOnServiceId: "SVC-3001",
    activatedAt: "2024-03-12T10:00:00Z",
  },
  {
    serviceId: "SVC-3003",
    customerId: "CUST-1002",
    productName: "Fibre 50",
    productCategory: "BROADBAND",
    status: "ACTIVE",
    lineState: "UP",
    downloadMbps: 50,
    uploadMbps: 10,
    routerModel: "NS-Router-Home",
    accessTechnology: "FTTC",
    activatedAt: "2022-01-05T09:00:00Z",
  },
  {
    serviceId: "SVC-3004",
    customerId: "CUST-1002",
    productName: "Whole Home WiFi",
    productCategory: "ADD_ON",
    status: "ACTIVE",
    lineState: "UP",
    dependsOnServiceId: "SVC-3003",
    activatedAt: "2022-06-01T09:00:00Z",
  },
  {
    serviceId: "SVC-3005",
    customerId: "CUST-1003",
    productName: "Fibre 150",
    productCategory: "BROADBAND",
    status: "SUSPENDED",
    lineState: "DOWN",
    downloadMbps: 150,
    uploadMbps: 30,
    routerModel: "NS-Router-X1",
    accessTechnology: "FTTP",
    activatedAt: "2023-08-20T11:00:00Z",
  },
  {
    serviceId: "SVC-3006",
    customerId: "CUST-1004",
    productName: "Business Fibre 500",
    productCategory: "BROADBAND",
    status: "ACTIVE",
    lineState: "DEGRADED",
    downloadMbps: 500,
    uploadMbps: 100,
    routerModel: "NS-Router-Biz",
    accessTechnology: "FTTP",
    activatedAt: "2023-02-14T08:00:00Z",
  },
  {
    serviceId: "SVC-3007",
    customerId: "CUST-1004",
    productName: "Static IP",
    productCategory: "ADD_ON",
    status: "ACTIVE",
    lineState: "UP",
    dependsOnServiceId: "SVC-3006",
    activatedAt: "2023-02-14T08:00:00Z",
  },
  {
    serviceId: "SVC-3008",
    customerId: "CUST-1005",
    productName: "Fibre 50",
    productCategory: "BROADBAND",
    status: "SUSPENDED",
    lineState: "BLOCKED",
    downloadMbps: 50,
    uploadMbps: 10,
    routerModel: "NS-Router-Home",
    accessTechnology: "FTTC",
    activatedAt: "2024-01-10T12:00:00Z",
    accessRestrictionReason: "BILLING_RESTRICTION",
  },
  {
    serviceId: "SVC-3009",
    customerId: "CUST-1006",
    productName: "Fibre 500",
    productCategory: "BROADBAND",
    status: "ACTIVE",
    lineState: "UP",
    downloadMbps: 500,
    uploadMbps: 100,
    routerModel: "NS-Router-X2",
    accessTechnology: "FTTP",
    activatedAt: "2023-11-01T10:00:00Z",
  },
  {
    serviceId: "SVC-3010",
    customerId: "CUST-1007",
    productName: "Fibre 150",
    productCategory: "BROADBAND",
    status: "ACTIVE",
    lineState: "UP",
    downloadMbps: 150,
    uploadMbps: 30,
    routerModel: "NS-Router-X1",
    accessTechnology: "FTTP",
    activatedAt: "2023-05-18T09:30:00Z",
  },
  {
    serviceId: "SVC-3011",
    customerId: "CUST-1008",
    productName: "Business Fibre 900",
    productCategory: "BROADBAND",
    status: "PROVISIONING",
    lineState: "NOT_ACTIVATED",
    downloadMbps: 900,
    uploadMbps: 200,
    routerModel: null,
    accessTechnology: "FTTP",
    activatedAt: null,
  },
  {
    serviceId: "SVC-3012",
    customerId: "CUST-1008",
    productName: "Digital Voice",
    productCategory: "VOICE",
    status: "PROVISIONING",
    lineState: "NOT_ACTIVATED",
    dependsOnServiceId: "SVC-3011",
    dependencyReason: "DEPENDENCY_BROADBAND",
    activatedAt: null,
  },
  {
    serviceId: "SVC-3013",
    customerId: "CUST-1009",
    productName: "Fibre 50",
    productCategory: "BROADBAND",
    status: "CEASED",
    lineState: "CEASED",
    downloadMbps: 50,
    uploadMbps: 10,
    routerModel: "NS-Router-Home",
    accessTechnology: "FTTC",
    activatedAt: "2021-04-01T10:00:00Z",
    ceasedAt: "2025-09-30T23:59:59Z",
  },
  {
    serviceId: "SVC-3014",
    customerId: "CUST-1010",
    productName: "Fibre 150",
    productCategory: "BROADBAND",
    status: "ACTIVE",
    lineState: "DEGRADED",
    downloadMbps: 150,
    uploadMbps: 30,
    routerModel: "NS-Router-X1",
    accessTechnology: "FTTP",
    activatedAt: "2024-06-01T14:00:00Z",
  },
];

const orders = [
  {
    orderId: "ORD-2040",
    customerId: "CUST-1001",
    serviceId: "SVC-3001",
    orderType: "NEW_SERVICE",
    status: "COMPLETED",
    reasonCode: null,
    placedAt: "2024-02-20T09:00:00Z",
    completedAt: "2024-03-12T10:00:00Z",
    nextReviewDate: null,
    notes: "Initial Fibre 150 activation completed.",
  },
  {
    orderId: "ORD-2041",
    customerId: "CUST-1002",
    serviceId: "SVC-3003",
    orderType: "ROUTER_REPLACEMENT",
    status: "IN_PROGRESS",
    reasonCode: null,
    placedAt: "2025-10-28T11:00:00Z",
    completedAt: null,
    nextReviewDate: "2025-11-25T09:00:00Z",
    notes: "Replacement ordered after Wi-Fi issue; fault later resolved remotely. Order remains open and needs review.",
  },
  {
    orderId: "ORD-2042",
    customerId: "CUST-1008",
    serviceId: "SVC-3011",
    orderType: "NEW_SERVICE",
    status: "DELAYED",
    reasonCode: "CIVILS_REQUIRED",
    placedAt: "2025-09-01T08:00:00Z",
    completedAt: null,
    nextReviewDate: "2025-11-28T09:00:00Z",
    notes: "Civils work required before FTTP activation. nextReviewDate is a planning checkpoint, not a completion promise.",
  },
  {
    orderId: "ORD-2043",
    customerId: "CUST-1008",
    serviceId: "SVC-3012",
    orderType: "VOICE_ADD",
    status: "DELAYED",
    reasonCode: "DEPENDENCY_BROADBAND",
    placedAt: "2025-09-01T08:05:00Z",
    completedAt: null,
    nextReviewDate: "2025-11-28T09:00:00Z",
    notes: "Voice cannot activate until ORD-2042 broadband completes.",
  },
  {
    orderId: "ORD-2044",
    customerId: "CUST-1003",
    serviceId: "SVC-3005",
    orderType: "FAULT_VISIT",
    status: "IN_PROGRESS",
    reasonCode: null,
    placedAt: "2025-11-12T08:30:00Z",
    completedAt: null,
    nextReviewDate: "2025-11-21T13:00:00Z",
    appointmentWindow: "2025-11-21T13:00:00Z/2025-11-21T17:00:00Z",
    notes: "Engineer visit already booked for total-loss fault. Do not book another engineer without review.",
  },
  {
    orderId: "ORD-2045",
    customerId: "CUST-1006",
    serviceId: "SVC-3009",
    orderType: "FAULT_VISIT",
    status: "COMPLETED",
    reasonCode: null,
    placedAt: "2025-10-02T09:00:00Z",
    completedAt: "2025-10-05T15:40:00Z",
    nextReviewDate: null,
    notes: "Engineer attended. Customer later disputed consent for chargeable visit.",
  },
  {
    orderId: "ORD-2046",
    customerId: "CUST-1010",
    serviceId: "SVC-3014",
    orderType: "ROUTER_REPLACEMENT",
    status: "IN_PROGRESS",
    reasonCode: null,
    placedAt: "2025-11-08T10:00:00Z",
    completedAt: null,
    nextReviewDate: "2025-11-22T10:00:00Z",
    notes: "Replacement ordered due to repeated router restarts. Customer claims fee was promised free; no waiver recorded.",
  },
  {
    orderId: "ORD-2047",
    customerId: "CUST-1004",
    serviceId: "SVC-3006",
    orderType: "FAULT_VISIT",
    status: "PLACED",
    reasonCode: null,
    placedAt: "2025-11-15T09:00:00Z",
    completedAt: null,
    nextReviewDate: "2025-11-24T09:00:00Z",
    notes: "Performance investigation visit placed after low measured speeds.",
  },
  {
    orderId: "ORD-2048",
    customerId: "CUST-1007",
    serviceId: "SVC-3010",
    orderType: "FAULT_VISIT",
    status: "COMPLETED",
    reasonCode: null,
    placedAt: "2025-09-10T08:00:00Z",
    completedAt: "2025-09-12T16:00:00Z",
    nextReviewDate: null,
    notes: "Intermittent connectivity investigated and resolved.",
  },
  {
    orderId: "ORD-2049",
    customerId: "CUST-1009",
    serviceId: "SVC-3013",
    orderType: "CEASE",
    status: "COMPLETED",
    reasonCode: "CUSTOMER_CANCELLED",
    placedAt: "2025-09-01T10:00:00Z",
    completedAt: "2025-09-30T23:59:59Z",
    nextReviewDate: null,
    notes: "Service ceased at customer request.",
  },
];

const billingAccounts = [
  { billingAccountId: "BA-5001", customerId: "CUST-1001", balance: 45.0, currency: "GBP", accountStatus: "CURRENT", paymentMethod: "DIRECT_DEBIT", autopayStatus: "ENABLED" },
  { billingAccountId: "BA-5002", customerId: "CUST-1002", balance: 0.0, currency: "GBP", accountStatus: "CURRENT", paymentMethod: "CARD", autopayStatus: "ENABLED" },
  { billingAccountId: "BA-5003", customerId: "CUST-1003", balance: 62.5, currency: "GBP", accountStatus: "CURRENT", paymentMethod: "DIRECT_DEBIT", autopayStatus: "ENABLED" },
  { billingAccountId: "BA-5004", customerId: "CUST-1004", balance: 180.0, currency: "GBP", accountStatus: "CURRENT", paymentMethod: "INVOICE", autopayStatus: "DISABLED" },
  { billingAccountId: "BA-5005", customerId: "CUST-1005", balance: 79.99, currency: "GBP", accountStatus: "RESTRICTED", paymentMethod: "CARD", autopayStatus: "DISABLED" },
  { billingAccountId: "BA-5006", customerId: "CUST-1006", balance: 34.99, currency: "GBP", accountStatus: "CURRENT", paymentMethod: "DIRECT_DEBIT", autopayStatus: "ENABLED" },
  { billingAccountId: "BA-5007", customerId: "CUST-1007", balance: -15.0, currency: "GBP", accountStatus: "CURRENT", paymentMethod: "DIRECT_DEBIT", autopayStatus: "ENABLED" },
  { billingAccountId: "BA-5008", customerId: "CUST-1008", balance: 0.0, currency: "GBP", accountStatus: "CURRENT", paymentMethod: "INVOICE", autopayStatus: "DISABLED" },
  { billingAccountId: "BA-5009", customerId: "CUST-1009", balance: 0.0, currency: "GBP", accountStatus: "CLOSED", paymentMethod: "CARD", autopayStatus: "DISABLED" },
  { billingAccountId: "BA-5010", customerId: "CUST-1010", balance: 34.99, currency: "GBP", accountStatus: "CURRENT", paymentMethod: "DIRECT_DEBIT", autopayStatus: "ENABLED" },
];

const bills = [
  {
    billId: "BILL-7001",
    billingAccountId: "BA-5001",
    customerId: "CUST-1001",
    status: "ISSUED",
    periodStart: "2025-10-01",
    periodEnd: "2025-10-31",
    issuedAt: "2025-11-01T00:00:00Z",
    dueDate: "2025-11-15",
    currency: "GBP",
    total: 45.0,
    lineItems: [
      { code: "RECURRING", description: "Fibre 150 monthly", amount: 35.0 },
      { code: "RECURRING", description: "Digital Voice monthly", amount: 10.0 },
    ],
  },
  {
    billId: "BILL-7002",
    billingAccountId: "BA-5002",
    customerId: "CUST-1002",
    status: "PAID",
    periodStart: "2025-10-01",
    periodEnd: "2025-10-31",
    issuedAt: "2025-11-01T00:00:00Z",
    dueDate: "2025-11-15",
    currency: "GBP",
    total: 32.0,
    lineItems: [
      { code: "RECURRING", description: "Fibre 50 monthly", amount: 27.0 },
      { code: "RECURRING", description: "Whole Home WiFi", amount: 5.0 },
    ],
  },
  {
    billId: "BILL-7003",
    billingAccountId: "BA-5003",
    customerId: "CUST-1003",
    status: "PARTIALLY_PAID",
    periodStart: "2025-10-01",
    periodEnd: "2025-10-31",
    issuedAt: "2025-11-01T00:00:00Z",
    dueDate: "2025-11-15",
    currency: "GBP",
    total: 85.0,
    amountPaid: 22.5,
    lineItems: [
      { code: "RECURRING", description: "Fibre 150 monthly", amount: 35.0 },
      { code: "ONE_OFF", description: "Missed payment recovery fee", amount: 50.0 },
    ],
  },
  {
    billId: "BILL-7004",
    billingAccountId: "BA-5005",
    customerId: "CUST-1005",
    status: "PAYMENT_PENDING",
    periodStart: "2025-10-01",
    periodEnd: "2025-10-31",
    issuedAt: "2025-11-01T00:00:00Z",
    dueDate: "2025-11-10",
    currency: "GBP",
    total: 79.99,
    lineItems: [
      { code: "RECURRING", description: "Fibre 50 monthly", amount: 29.99 },
      { code: "LATE_FEE", description: "Late payment fee", amount: 50.0 },
    ],
  },
  {
    billId: "BILL-7005",
    billingAccountId: "BA-5006",
    customerId: "CUST-1006",
    status: "UNDER_DISPUTE",
    periodStart: "2025-10-01",
    periodEnd: "2025-10-31",
    issuedAt: "2025-11-01T00:00:00Z",
    dueDate: "2025-11-15",
    currency: "GBP",
    total: 69.99,
    lineItems: [
      { code: "RECURRING", description: "Fibre 500 monthly", amount: 35.0 },
      { code: "ONE_OFF", description: "Engineer visit charge", amount: 34.99 },
    ],
  },
  {
    billId: "BILL-7006",
    billingAccountId: "BA-5007",
    customerId: "CUST-1007",
    status: "CREDIT",
    periodStart: "2025-09-01",
    periodEnd: "2025-09-30",
    issuedAt: "2025-10-01T00:00:00Z",
    dueDate: "2025-10-15",
    currency: "GBP",
    total: 20.0,
    lineItems: [
      { code: "RECURRING", description: "Fibre 150 monthly", amount: 35.0 },
      { code: "SERVICE_CREDIT", description: "Fault compensation credit FLT-6007", amount: -15.0 },
    ],
  },
  {
    billId: "BILL-7007",
    billingAccountId: "BA-5008",
    customerId: "CUST-1008",
    status: "PENDING_GENERATION",
    periodStart: "2025-11-01",
    periodEnd: "2025-11-30",
    issuedAt: null,
    dueDate: null,
    currency: "GBP",
    total: null,
    lineItems: [],
    notes: "Service not yet activated; next bill amount cannot be estimated from records.",
  },
  {
    billId: "BILL-7008",
    billingAccountId: "BA-5004",
    customerId: "CUST-1004",
    status: "ISSUED",
    periodStart: "2025-10-01",
    periodEnd: "2025-10-31",
    issuedAt: "2025-11-01T00:00:00Z",
    dueDate: "2025-11-20",
    currency: "GBP",
    total: 180.0,
    lineItems: [
      { code: "RECURRING", description: "Business Fibre 500 monthly", amount: 160.0 },
      { code: "RECURRING", description: "Static IP", amount: 20.0 },
    ],
  },
  {
    billId: "BILL-7009",
    billingAccountId: "BA-5010",
    customerId: "CUST-1010",
    status: "UNDER_DISPUTE",
    periodStart: "2025-10-01",
    periodEnd: "2025-10-31",
    issuedAt: "2025-11-01T00:00:00Z",
    dueDate: "2025-11-15",
    currency: "GBP",
    total: 69.99,
    lineItems: [
      { code: "RECURRING", description: "Fibre 150 monthly", amount: 35.0 },
      { code: "ONE_OFF", description: "Router replacement charge", amount: 34.99 },
    ],
  },
  {
    billId: "BILL-7010",
    billingAccountId: "BA-5009",
    customerId: "CUST-1009",
    status: "PAID",
    periodStart: "2025-09-01",
    periodEnd: "2025-09-30",
    issuedAt: "2025-10-01T00:00:00Z",
    dueDate: "2025-10-15",
    currency: "GBP",
    total: 27.0,
    lineItems: [{ code: "RECURRING", description: "Fibre 50 final month", amount: 27.0 }],
  },
];

const payments = [
  {
    paymentId: "PAY-8001",
    billingAccountId: "BA-5001",
    billId: "BILL-7001",
    customerId: "CUST-1001",
    amount: 45.0,
    currency: "GBP",
    status: "SCHEDULED",
    method: "DIRECT_DEBIT",
    attemptedAt: "2025-11-15T06:00:00Z",
    settledAt: null,
  },
  {
    paymentId: "PAY-8002",
    billingAccountId: "BA-5002",
    billId: "BILL-7002",
    customerId: "CUST-1002",
    amount: 32.0,
    currency: "GBP",
    status: "SETTLED",
    method: "CARD",
    attemptedAt: "2025-11-05T08:00:00Z",
    settledAt: "2025-11-05T08:00:12Z",
  },
  {
    paymentId: "PAY-8003",
    billingAccountId: "BA-5003",
    billId: "BILL-7003",
    customerId: "CUST-1003",
    amount: 22.5,
    currency: "GBP",
    status: "SETTLED",
    method: "DIRECT_DEBIT",
    attemptedAt: "2025-11-10T06:00:00Z",
    settledAt: "2025-11-10T06:00:20Z",
  },
  {
    paymentId: "PAY-8004",
    billingAccountId: "BA-5005",
    billId: "BILL-7004",
    customerId: "CUST-1005",
    amount: 79.99,
    currency: "GBP",
    status: "FAILED",
    method: "CARD",
    attemptedAt: "2025-11-10T09:15:00Z",
    settledAt: null,
    failureReason: "INSUFFICIENT_FUNDS",
  },
  {
    paymentId: "PAY-8005",
    billingAccountId: "BA-5005",
    billId: "BILL-7004",
    customerId: "CUST-1005",
    amount: 79.99,
    currency: "GBP",
    status: "PENDING",
    method: "CARD",
    attemptedAt: "2025-11-18T10:00:00Z",
    settledAt: null,
    notes: "Retry after failed PAY-8004. PENDING does not prove settlement.",
  },
  {
    paymentId: "PAY-8006",
    billingAccountId: "BA-5007",
    billId: "BILL-7006",
    customerId: "CUST-1007",
    amount: 20.0,
    currency: "GBP",
    status: "SETTLED",
    method: "DIRECT_DEBIT",
    attemptedAt: "2025-10-12T06:00:00Z",
    settledAt: "2025-10-12T06:00:15Z",
  },
  {
    paymentId: "PAY-8007",
    billingAccountId: "BA-5004",
    billId: "BILL-7008",
    customerId: "CUST-1004",
    amount: 180.0,
    currency: "GBP",
    status: "SCHEDULED",
    method: "BANK_TRANSFER",
    attemptedAt: "2025-11-20T00:00:00Z",
    settledAt: null,
  },
  {
    paymentId: "PAY-8008",
    billingAccountId: "BA-5010",
    billId: "BILL-7009",
    customerId: "CUST-1010",
    amount: 35.0,
    currency: "GBP",
    status: "SETTLED",
    method: "DIRECT_DEBIT",
    attemptedAt: "2025-11-12T06:00:00Z",
    settledAt: "2025-11-12T06:00:18Z",
    notes: "Recurring portion only; disputed router fee remains unpaid/under dispute.",
  },
  {
    paymentId: "PAY-8009",
    billingAccountId: "BA-5009",
    billId: "BILL-7010",
    customerId: "CUST-1009",
    amount: 27.0,
    currency: "GBP",
    status: "SETTLED",
    method: "CARD",
    attemptedAt: "2025-10-10T12:00:00Z",
    settledAt: "2025-10-10T12:00:10Z",
  },
];

const billingCases = [
  {
    billingCaseId: "BC-9001",
    customerId: "CUST-1005",
    billingAccountId: "BA-5005",
    billId: "BILL-7004",
    caseType: "PAYMENT_INVESTIGATION",
    status: "PENDING_EXTERNAL",
    openedAt: "2025-11-11T09:00:00Z",
    summary: "Investigate failed card payment and pending retry while access remains restricted.",
    evidence: [
      { type: "PAYMENT", referenceId: "PAY-8004", finding: "FAILED", detail: "Insufficient funds" },
      { type: "PAYMENT", referenceId: "PAY-8005", finding: "PENDING", detail: "Retry submitted; not settled" },
      { type: "ACCESS", referenceId: "SVC-3008", finding: "BLOCKED", detail: "Billing restriction active" },
    ],
    outcome: null,
  },
  {
    billingCaseId: "BC-9002",
    customerId: "CUST-1006",
    billingAccountId: "BA-5006",
    billId: "BILL-7005",
    caseType: "CHARGE_DISPUTE",
    status: "INVESTIGATING",
    openedAt: "2025-11-03T14:00:00Z",
    summary: "Customer disputes engineer visit charge; claims no chargeable visit was agreed.",
    evidence: [
      { type: "ORDER", referenceId: "ORD-2045", finding: "COMPLETED", detail: "Engineer visit occurred" },
      { type: "CONSENT", referenceId: null, finding: "NOT_FOUND", detail: "No recorded customer consent for chargeable visit" },
      { type: "BILL_LINE", referenceId: "BILL-7005", finding: "PRESENT", detail: "£34.99 engineer visit charge raised" },
    ],
    outcome: null,
  },
  {
    billingCaseId: "BC-9003",
    customerId: "CUST-1010",
    billingAccountId: "BA-5010",
    billId: "BILL-7009",
    caseType: "EQUIPMENT_CHARGE_DISPUTE",
    status: "AWAITING_EVIDENCE",
    openedAt: "2025-11-10T11:00:00Z",
    summary: "Customer says replacement router was promised free; bill includes £34.99 replacement charge.",
    evidence: [
      { type: "ORDER", referenceId: "ORD-2046", finding: "IN_PROGRESS", detail: "Router replacement ordered" },
      { type: "BILL_LINE", referenceId: "BILL-7009", finding: "PRESENT", detail: "£34.99 router replacement charge" },
      { type: "FEE_WAIVER", referenceId: null, finding: "NOT_FOUND", detail: "No fee waiver recorded" },
      { type: "CUSTOMER_STATEMENT", referenceId: null, finding: "CLAIMED", detail: "Customer asserts free replacement promise" },
    ],
    outcome: null,
  },
  {
    billingCaseId: "BC-9004",
    customerId: "CUST-1003",
    billingAccountId: "BA-5003",
    billId: "BILL-7003",
    caseType: "PARTIAL_PAYMENT_QUERY",
    status: "OPEN",
    openedAt: "2025-11-14T10:00:00Z",
    summary: "Customer claims bill fully paid; only partial settled payment is on record.",
    evidence: [
      { type: "PAYMENT", referenceId: "PAY-8003", finding: "SETTLED", detail: "£22.50 settled against £85.00 bill" },
      { type: "BILL", referenceId: "BILL-7003", finding: "PARTIALLY_PAID", detail: "Outstanding balance remains" },
    ],
    outcome: null,
  },
  {
    billingCaseId: "BC-9005",
    customerId: "CUST-1007",
    billingAccountId: "BA-5007",
    billId: "BILL-7006",
    caseType: "CREDIT_QUERY",
    status: "RESOLVED",
    openedAt: "2025-09-20T09:00:00Z",
    summary: "Fault compensation credit applied after intermittent connectivity fault.",
    evidence: [
      { type: "FAULT", referenceId: "FLT-6007", finding: "RESOLVED", detail: "Intermittent fault closed" },
      { type: "SERVICE_CREDIT", referenceId: "BILL-7006", finding: "APPLIED", detail: "£15.00 credit applied" },
    ],
    outcome: "CREDIT_APPLIED",
  },
  {
    billingCaseId: "BC-9006",
    customerId: "CUST-1004",
    billingAccountId: "BA-5004",
    billId: "BILL-7008",
    caseType: "CREDIT_QUERY",
    status: "OPEN",
    openedAt: "2025-11-16T09:30:00Z",
    summary: "Business customer asking about compensation for below-minimum speeds.",
    evidence: [
      { type: "FAULT", referenceId: "FLT-6004", finding: "OPEN", detail: "Performance fault open" },
      { type: "INCIDENT", referenceId: "INC-4101", finding: "ACTIVE", detail: "Congestion incident affecting area" },
    ],
    outcome: null,
  },
];

const faults = [
  {
    faultId: "FLT-6001",
    customerId: "CUST-1001",
    serviceId: "SVC-3001",
    faultType: "INTERMITTENT",
    status: "MONITORING",
    openedAt: "2025-11-14T18:00:00Z",
    summary: "Customer reports intermittent red broadband light.",
    diagnostics: {
      lineTest: "PASS",
      opticalPower: "NORMAL",
      routerReachable: true,
      routerRestartCount24h: 1,
      measuredDownloadMbps: 142,
      contractMinimumMbps: 100,
      congestionDetected: false,
      accessState: "UP",
      relatedIncidentId: "INC-4102",
    },
    notes: "Line healthy. Active DNS/resolver degradation incident may explain browsing issues.",
  },
  {
    faultId: "FLT-6002",
    customerId: "CUST-1002",
    serviceId: "SVC-3003",
    faultType: "EQUIPMENT",
    status: "RESOLVED",
    openedAt: "2025-10-20T09:00:00Z",
    resolvedAt: "2025-10-27T16:00:00Z",
    summary: "Wi-Fi dropouts reported; resolved remotely with configuration change.",
    diagnostics: {
      lineTest: "PASS",
      routerReachable: true,
      routerRestartCount24h: 0,
      measuredDownloadMbps: 48,
      contractMinimumMbps: 35,
      congestionDetected: false,
      accessState: "UP",
    },
    relatedOrderId: "ORD-2041",
    notes: "Fault resolved but router replacement order ORD-2041 remains IN_PROGRESS — operational mismatch requiring review.",
  },
  {
    faultId: "FLT-6003",
    customerId: "CUST-1003",
    serviceId: "SVC-3005",
    faultType: "TOTAL_LOSS",
    status: "ENGINEER_BOOKED",
    openedAt: "2025-11-11T08:00:00Z",
    summary: "No broadband service.",
    diagnostics: {
      lineTest: "FAIL",
      opticalPower: "LOW",
      routerReachable: false,
      routerRestartCount24h: 0,
      measuredDownloadMbps: 0,
      contractMinimumMbps: 100,
      congestionDetected: false,
      accessState: "DOWN",
    },
    relatedOrderId: "ORD-2044",
    notes: "Engineer appointment already booked via ORD-2044.",
  },
  {
    faultId: "FLT-6004",
    customerId: "CUST-1004",
    serviceId: "SVC-3006",
    faultType: "PERFORMANCE",
    status: "OPEN",
    openedAt: "2025-11-13T10:00:00Z",
    summary: "Business broadband consistently below contractual minimum download speed.",
    diagnostics: {
      lineTest: "PASS",
      opticalPower: "NORMAL",
      routerReachable: true,
      routerRestartCount24h: 0,
      measuredDownloadMbps: 180,
      contractMinimumMbps: 400,
      congestionDetected: true,
      accessState: "DEGRADED",
      relatedIncidentId: "INC-4101",
    },
    relatedOrderId: "ORD-2047",
    notes: "Evidence supports service-level review; does not authorise automatic fee-free cancellation.",
  },
  {
    faultId: "FLT-6005",
    customerId: "CUST-1005",
    serviceId: "SVC-3008",
    faultType: "ACCESS_RESTRICTION",
    status: "CLOSED_NO_FAULT",
    openedAt: "2025-11-11T11:00:00Z",
    resolvedAt: "2025-11-11T12:00:00Z",
    summary: "Customer reported no internet; diagnostics show billing access restriction.",
    diagnostics: {
      lineTest: "PASS",
      opticalPower: "NORMAL",
      routerReachable: true,
      routerRestartCount24h: 0,
      measuredDownloadMbps: null,
      contractMinimumMbps: 35,
      congestionDetected: false,
      accessState: "BLOCKED",
    },
    notes: "Physical network fault not indicated. Access blocked due to billing restriction.",
  },
  {
    faultId: "FLT-6006",
    customerId: "CUST-1006",
    serviceId: "SVC-3009",
    faultType: "CONNECTIVITY",
    status: "RESOLVED",
    openedAt: "2025-10-01T09:00:00Z",
    resolvedAt: "2025-10-05T15:40:00Z",
    summary: "Intermittent dropouts resolved after engineer visit.",
    diagnostics: {
      lineTest: "PASS",
      routerReachable: true,
      measuredDownloadMbps: 480,
      contractMinimumMbps: 350,
      accessState: "UP",
    },
    relatedOrderId: "ORD-2045",
  },
  {
    faultId: "FLT-6007",
    customerId: "CUST-1007",
    serviceId: "SVC-3010",
    faultType: "INTERMITTENT",
    status: "RESOLVED",
    openedAt: "2025-09-08T08:00:00Z",
    resolvedAt: "2025-09-12T16:00:00Z",
    summary: "Intermittent connectivity resolved; explicit fault credit applied.",
    diagnostics: {
      lineTest: "PASS",
      routerReachable: true,
      measuredDownloadMbps: 145,
      contractMinimumMbps: 100,
      accessState: "UP",
    },
    relatedOrderId: "ORD-2048",
    compensationCreditGbp: 15.0,
  },
  {
    faultId: "FLT-6008",
    customerId: "CUST-1008",
    serviceId: "SVC-3011",
    faultType: "PRE_ACTIVATION",
    status: "OPEN",
    openedAt: "2025-10-15T09:00:00Z",
    summary: "Customer reports service unavailable prior to activation.",
    diagnostics: {
      lineTest: "NOT_APPLICABLE",
      routerReachable: false,
      measuredDownloadMbps: null,
      contractMinimumMbps: 700,
      accessState: "NOT_ACTIVATED",
    },
    relatedOrderId: "ORD-2042",
    notes: "Evaluate against provisioning/orders before diagnosing network fault.",
  },
  {
    faultId: "FLT-6009",
    customerId: "CUST-1010",
    serviceId: "SVC-3014",
    faultType: "EQUIPMENT",
    status: "OPEN",
    openedAt: "2025-11-07T19:00:00Z",
    summary: "Router repeatedly restarting.",
    diagnostics: {
      lineTest: "PASS",
      opticalPower: "NORMAL",
      routerReachable: true,
      routerRestartCount24h: 14,
      measuredDownloadMbps: 120,
      contractMinimumMbps: 100,
      congestionDetected: false,
      accessState: "DEGRADED",
    },
    relatedOrderId: "ORD-2046",
    notes: "Equipment instability indicated. Replacement ordered. Charge validity remains separate dispute.",
  },
  {
    faultId: "FLT-6010",
    customerId: "CUST-1009",
    serviceId: "SVC-3013",
    faultType: "CONNECTIVITY",
    status: "CLOSED_NO_FAULT",
    openedAt: "2025-08-01T10:00:00Z",
    resolvedAt: "2025-08-02T10:00:00Z",
    summary: "Historic fault closed before cease.",
    diagnostics: {
      lineTest: "PASS",
      routerReachable: true,
      accessState: "UP",
    },
  },
];

const networkIncidents = [
  {
    incidentId: "INC-4101",
    title: "Regional congestion affecting business FTTP",
    status: "ACTIVE",
    severity: "MEDIUM",
    startedAt: "2025-11-12T06:00:00Z",
    estimatedResolutionAt: "2025-11-22T18:00:00Z",
    affectedAreas: ["Manchester M2"],
    affectedServiceIds: ["SVC-3006"],
    summary: "Congestion reducing throughput for some Business Fibre services. Line tests may still pass.",
  },
  {
    incidentId: "INC-4102",
    title: "DNS / resolver degradation",
    status: "ACTIVE",
    severity: "LOW",
    startedAt: "2025-11-14T12:00:00Z",
    estimatedResolutionAt: "2025-11-21T12:00:00Z",
    affectedAreas: ["Bristol BS1"],
    affectedServiceIds: ["SVC-3001"],
    summary: "Intermittent DNS resolution issues. Line tests remain healthy and routers remain reachable.",
  },
  {
    incidentId: "INC-4103",
    title: "Planned maintenance window",
    status: "SCHEDULED",
    severity: "LOW",
    startedAt: "2025-11-25T01:00:00Z",
    estimatedResolutionAt: "2025-11-25T05:00:00Z",
    affectedAreas: ["Brighton BN1"],
    affectedServiceIds: ["SVC-3014"],
    summary: "Planned overnight maintenance; not currently causing the reported router restarts.",
  },
];

const contracts = [
  {
    contractId: "CON-1101",
    customerId: "CUST-1001",
    serviceId: "SVC-3001",
    status: "IN_TERM",
    startedAt: "2024-03-12",
    minimumTermEndDate: "2026-03-11",
    monthlyRecurringCharge: 35.0,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 100,
    earlyTerminationPolicyId: "ETP-CONSUMER-12",
  },
  {
    contractId: "CON-1102",
    customerId: "CUST-1002",
    serviceId: "SVC-3003",
    status: "OUT_OF_TERM",
    startedAt: "2022-01-05",
    minimumTermEndDate: "2023-01-04",
    monthlyRecurringCharge: 27.0,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 35,
    earlyTerminationPolicyId: "ETP-CONSUMER-12",
  },
  {
    contractId: "CON-1103",
    customerId: "CUST-1003",
    serviceId: "SVC-3005",
    status: "IN_TERM",
    startedAt: "2023-08-20",
    minimumTermEndDate: "2025-08-19",
    monthlyRecurringCharge: 35.0,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 100,
    earlyTerminationPolicyId: "ETP-CONSUMER-12",
  },
  {
    contractId: "CON-1104",
    customerId: "CUST-1004",
    serviceId: "SVC-3006",
    status: "IN_TERM",
    startedAt: "2023-02-14",
    minimumTermEndDate: "2026-02-13",
    monthlyRecurringCharge: 160.0,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 400,
    earlyTerminationPolicyId: "ETP-BUSINESS-24",
  },
  {
    contractId: "CON-1105",
    customerId: "CUST-1005",
    serviceId: "SVC-3008",
    status: "IN_TERM_RESTRICTED",
    startedAt: "2024-01-10",
    minimumTermEndDate: "2025-01-09",
    monthlyRecurringCharge: 29.99,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 35,
    earlyTerminationPolicyId: "ETP-CONSUMER-12",
  },
  {
    contractId: "CON-1106",
    customerId: "CUST-1006",
    serviceId: "SVC-3009",
    status: "ENDING",
    startedAt: "2023-11-01",
    minimumTermEndDate: "2025-10-31",
    monthlyRecurringCharge: 35.0,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 350,
    earlyTerminationPolicyId: "ETP-CONSUMER-12",
  },
  {
    contractId: "CON-1107",
    customerId: "CUST-1007",
    serviceId: "SVC-3010",
    status: "IN_TERM",
    startedAt: "2023-05-18",
    minimumTermEndDate: "2025-05-17",
    monthlyRecurringCharge: 35.0,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 100,
    earlyTerminationPolicyId: "ETP-CONSUMER-12",
  },
  {
    contractId: "CON-1108",
    customerId: "CUST-1008",
    serviceId: "SVC-3011",
    status: "NOT_STARTED",
    startedAt: null,
    minimumTermEndDate: null,
    monthlyRecurringCharge: 220.0,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 700,
    earlyTerminationPolicyId: "ETP-BUSINESS-24",
    activationTrigger: "SERVICE_ACTIVATION",
  },
  {
    contractId: "CON-1109",
    customerId: "CUST-1009",
    serviceId: "SVC-3013",
    status: "TERMINATED",
    startedAt: "2021-04-01",
    minimumTermEndDate: "2022-03-31",
    monthlyRecurringCharge: 27.0,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 35,
    earlyTerminationPolicyId: "ETP-CONSUMER-12",
    terminatedAt: "2025-09-30",
  },
  {
    contractId: "CON-1110",
    customerId: "CUST-1010",
    serviceId: "SVC-3014",
    status: "IN_TERM",
    startedAt: "2024-06-01",
    minimumTermEndDate: "2026-05-31",
    monthlyRecurringCharge: 35.0,
    currency: "GBP",
    minimumGuaranteedDownloadMbps: 100,
    earlyTerminationPolicyId: "ETP-CONSUMER-12",
  },
];

const contractEvents = [
  {
    eventId: "CE-1301",
    contractId: "CON-1101",
    eventType: "SERVICE_LEVEL_REVIEW_OPENED",
    occurredAt: "2025-11-14T18:30:00Z",
    relatedFaultId: "FLT-6001",
    relatedIncidentId: "INC-4102",
    detail: "Monitoring intermittent browsing issues alongside DNS incident.",
  },
  {
    eventId: "CE-1302",
    contractId: "CON-1102",
    eventType: "MINIMUM_TERM_ENDED",
    occurredAt: "2023-01-04T00:00:00Z",
    detail: "Minimum term ended; contract now OUT_OF_TERM.",
  },
  {
    eventId: "CE-1303",
    contractId: "CON-1102",
    eventType: "EQUIPMENT_REPLACEMENT_ORDERED",
    occurredAt: "2025-10-28T11:00:00Z",
    relatedOrderId: "ORD-2041",
    relatedFaultId: "FLT-6002",
    detail: "Replacement ordered; later fault resolution creates open-order mismatch.",
  },
  {
    eventId: "CE-1304",
    contractId: "CON-1102",
    eventType: "RENEWAL_OFFER_CREATED",
    occurredAt: "2025-11-01T09:00:00Z",
    relatedOfferId: "OFF-1201",
    detail: "Renewal offer available; not accepted.",
  },
  {
    eventId: "CE-1305",
    contractId: "CON-1104",
    eventType: "SERVICE_LEVEL_REVIEW_OPENED",
    occurredAt: "2025-11-13T10:30:00Z",
    relatedFaultId: "FLT-6004",
    relatedIncidentId: "INC-4101",
    detail: "Measured speed below contractual minimum during active congestion incident.",
  },
  {
    eventId: "CE-1306",
    contractId: "CON-1105",
    eventType: "SERVICE_RESTRICTED",
    occurredAt: "2025-11-10T09:30:00Z",
    relatedBillingCaseId: "BC-9001",
    detail: "Access restricted after failed payment.",
  },
  {
    eventId: "CE-1307",
    contractId: "CON-1107",
    eventType: "FAULT_CREDIT_APPLIED",
    occurredAt: "2025-09-20T12:00:00Z",
    relatedFaultId: "FLT-6007",
    relatedBillingCaseId: "BC-9005",
    detail: "£15.00 fault compensation credit applied.",
  },
  {
    eventId: "CE-1308",
    contractId: "CON-1108",
    eventType: "ACTIVATION_DELAYED",
    occurredAt: "2025-09-15T08:00:00Z",
    relatedOrderId: "ORD-2042",
    detail: "Civils required; contract remains NOT_STARTED until service activation.",
  },
  {
    eventId: "CE-1309",
    contractId: "CON-1110",
    eventType: "EQUIPMENT_REPLACEMENT_ORDERED",
    occurredAt: "2025-11-08T10:00:00Z",
    relatedOrderId: "ORD-2046",
    relatedFaultId: "FLT-6009",
    detail: "Replacement ordered for restarting router.",
  },
];

const offers = [
  {
    offerId: "OFF-1201",
    customerId: "CUST-1002",
    relatedContractId: "CON-1102",
    offerType: "RENEWAL",
    status: "AVAILABLE",
    title: "Fibre 150 renewal for 18 months",
    monthlyRecurringCharge: 32.0,
    currency: "GBP",
    validUntil: "2025-12-15",
    notes: "Available offer only — not an accepted contract.",
  },
  {
    offerId: "OFF-1202",
    customerId: "CUST-1006",
    relatedContractId: "CON-1106",
    offerType: "RENEWAL",
    status: "AVAILABLE",
    title: "Fibre 500 continue for 12 months",
    monthlyRecurringCharge: 33.0,
    currency: "GBP",
    validUntil: "2025-11-30",
    notes: "Available offer only — not an accepted contract.",
  },
  {
    offerId: "OFF-1203",
    customerId: "CUST-1004",
    relatedContractId: "CON-1104",
    offerType: "UPGRADE",
    status: "AVAILABLE",
    title: "Business Fibre 900 upgrade",
    monthlyRecurringCharge: 210.0,
    currency: "GBP",
    validUntil: "2025-12-31",
    notes: "Available offer only — not an accepted contract.",
  },
  {
    offerId: "OFF-1204",
    customerId: "CUST-1010",
    relatedContractId: "CON-1110",
    offerType: "ADD_ON",
    status: "AVAILABLE",
    title: "Whole Home WiFi add-on",
    monthlyRecurringCharge: 5.0,
    currency: "GBP",
    validUntil: "2025-12-31",
    notes: "Available offer only — not an accepted contract.",
  },
];

const datasets = {
  "customers.json": customers,
  "services.json": services,
  "orders.json": orders,
  "billing-accounts.json": billingAccounts,
  "bills.json": bills,
  "payments.json": payments,
  "billing-cases.json": billingCases,
  "faults.json": faults,
  "network-incidents.json": networkIncidents,
  "contracts.json": contracts,
  "contract-events.json": contractEvents,
  "offers.json": offers,
};

for (const [name, data] of Object.entries(datasets)) {
  fs.writeFileSync(path.join(dataDir, name), JSON.stringify(data, null, 2) + "\n");
}

const knowledgeArticles = [
  {
    file: "billing-decisioning.md",
    articleId: "KB-BILL-001",
    title: "Billing decisioning basics",
    category: "billing",
    body: `Use the billing account balance as the authoritative current balance in this dataset.

A bill line item proves that a charge was raised. It does not prove the charge is valid.

Never invent a next-bill total when bill status is PENDING_GENERATION or total is null.

Open disputes remain unresolved until evidence supports a decision.`,
  },
  {
    file: "payment-status.md",
    articleId: "KB-PAY-001",
    title: "Interpreting payment statuses",
    category: "billing",
    body: `SETTLED proves payment was received.

PENDING does NOT prove payment was received.

SCHEDULED does NOT prove payment was received.

A failed payment remains failed even when a retry is pending. Do not tell the customer the bill has been paid when only a pending retry exists.`,
  },
  {
    file: "billing-disputes.md",
    articleId: "KB-DISP-001",
    title: "Billing dispute handling",
    category: "billing",
    body: `Customer assertions are evidence but not proof.

An engineer visit occurring does not prove the charge was agreed. Missing required consent means the dispute remains unresolved.

A replacement order does not prove a replacement fee is valid. Absence of a fee waiver does not by itself prove the fee is invalid. Report the conflict and evidence gap.

An open dispute does not automatically suspend a contract term.`,
  },
  {
    file: "fault-decisioning.md",
    articleId: "KB-FAULT-001",
    title: "Fault classification guidance",
    category: "service",
    body: `A billing or access restriction is not automatically a network fault. Passing line tests with blocked access usually indicate restriction, not physical failure.

Pre-activation complaints should normally be evaluated against provisioning and orders before network faults.

Existing engineer appointments must be checked before dispatching another engineer.

When line tests pass and a network DNS incident is active, consider the incident before diagnosing router failure.`,
  },
  {
    file: "fault-compensation.md",
    articleId: "KB-COMP-001",
    title: "Fault compensation rules",
    category: "service",
    body: `A resolved fault does not automatically mean compensation is due.

Only explicit credit records may be reported as applied credits.

Do not promise additional compensation beyond evidenced credits.

A support-case draft is not a submitted case.`,
  },
  {
    file: "contract-status.md",
    articleId: "KB-CON-001",
    title: "Contract status interpretation",
    category: "contract",
    body: `NOT_STARTED contracts have no active minimum-term end date. Do not invent one from order placement dates.

An offer is not an accepted contract.

A fault does not automatically cancel a contract.

Do not calculate unsupported early termination charges. This dataset does not contain enough information to compute an exact early termination fee.`,
  },
  {
    file: "cross-domain-decisioning.md",
    articleId: "KB-XDOM-001",
    title: "Cross-domain decisioning",
    category: "cross-domain",
    body: `When payment, access, and fault evidence conflict, separate verified records from customer assertions.

Conflicting evidence should be reported, not silently resolved.

Do not convert PENDING payments into settled conclusions, and do not convert available offers into accepted contracts.

A draft support case must remain labelled DRAFT with no claim that it was submitted externally.`,
  },
  {
    file: "orders-and-activation.md",
    articleId: "KB-ORD-001",
    title: "Orders and activation guidance",
    category: "orders",
    body: `A review date is not a promised completion date.

DEPENDENCY_BROADBAND means dependent services wait on broadband activation.

An order being placed does not prove delivery or completion.

A resolved fault with an open replacement order is an operational mismatch that requires review; do not automatically cancel the order.`,
  },
  {
    file: "router-red-light.md",
    articleId: "KB-ROUTER-001",
    title: "Guidance for a red broadband light",
    category: "service",
    body: `A red broadband light can indicate local equipment issues or upstream problems.

Check line diagnostics and active network incidents before concluding the router alone is at fault.

If line tests pass and a DNS incident is active, prefer incident-aware troubleshooting over immediate router replacement claims.`,
  },
];

for (const article of knowledgeArticles) {
  const content = `---
articleId: ${article.articleId}
title: ${article.title}
category: ${article.category}
lastReviewed: 2025-11-18
---

# ${article.title}

${article.body}
`;
  fs.writeFileSync(path.join(knowledgeDir, article.file), content);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validate() {
  const customerIds = new Set(customers.map((c) => c.customerId));
  const serviceIds = new Set(services.map((s) => s.serviceId));
  const orderIds = new Set(orders.map((o) => o.orderId));
  const baIds = new Set(billingAccounts.map((b) => b.billingAccountId));
  const billIds = new Set(bills.map((b) => b.billId));
  const paymentIds = new Set(payments.map((p) => p.paymentId));
  const faultIds = new Set(faults.map((f) => f.faultId));
  const incidentIds = new Set(networkIncidents.map((i) => i.incidentId));
  const contractIds = new Set(contracts.map((c) => c.contractId));
  const offerIds = new Set(offers.map((o) => o.offerId));

  assert(customerIds.size === customers.length, "duplicate customers");
  assert(serviceIds.size === services.length, "duplicate services");
  assert(orderIds.size === orders.length, "duplicate orders");
  assert(baIds.size === billingAccounts.length, "duplicate billing accounts");
  assert(billIds.size === bills.length, "duplicate bills");
  assert(paymentIds.size === payments.length, "duplicate payments");
  assert(faultIds.size === faults.length, "duplicate faults");
  assert(incidentIds.size === networkIncidents.length, "duplicate incidents");
  assert(contractIds.size === contracts.length, "duplicate contracts");
  assert(offerIds.size === offers.length, "duplicate offers");

  for (const s of services) {
    assert(customerIds.has(s.customerId), `service ${s.serviceId} bad customer`);
    if (s.dependsOnServiceId) assert(serviceIds.has(s.dependsOnServiceId), `service ${s.serviceId} bad dependency`);
  }
  for (const o of orders) {
    assert(customerIds.has(o.customerId), `order ${o.orderId} bad customer`);
    assert(serviceIds.has(o.serviceId), `order ${o.orderId} bad service`);
  }
  for (const ba of billingAccounts) assert(customerIds.has(ba.customerId), `BA ${ba.billingAccountId} bad customer`);
  for (const b of bills) {
    assert(baIds.has(b.billingAccountId), `bill ${b.billId} bad BA`);
    assert(customerIds.has(b.customerId), `bill ${b.billId} bad customer`);
  }
  for (const p of payments) {
    assert(baIds.has(p.billingAccountId), `payment ${p.paymentId} bad BA`);
    if (p.billId) assert(billIds.has(p.billId), `payment ${p.paymentId} bad bill`);
  }
  for (const bc of billingCases) {
    assert(customerIds.has(bc.customerId), `case ${bc.billingCaseId} bad customer`);
    assert(baIds.has(bc.billingAccountId), `case ${bc.billingCaseId} bad BA`);
  }
  for (const f of faults) {
    assert(customerIds.has(f.customerId), `fault ${f.faultId} bad customer`);
    assert(serviceIds.has(f.serviceId), `fault ${f.faultId} bad service`);
    if (f.relatedOrderId) assert(orderIds.has(f.relatedOrderId), `fault ${f.faultId} bad order`);
    if (f.diagnostics?.relatedIncidentId) assert(incidentIds.has(f.diagnostics.relatedIncidentId), `fault ${f.faultId} bad incident`);
  }
  for (const c of contracts) {
    assert(customerIds.has(c.customerId), `contract ${c.contractId} bad customer`);
    assert(serviceIds.has(c.serviceId), `contract ${c.contractId} bad service`);
  }
  for (const e of contractEvents) {
    assert(contractIds.has(e.contractId), `event ${e.eventId} bad contract`);
  }
  for (const o of offers) {
    assert(customerIds.has(o.customerId), `offer ${o.offerId} bad customer`);
    assert(contractIds.has(o.relatedContractId), `offer ${o.offerId} bad contract`);
  }

  // Scenario integrity checks
  const patels = customers.filter((c) => c.lastName === "Patel");
  assert(patels.length >= 2, "need at least two Patels");
  const mayas = customers.filter((c) => c.firstName === "Maya");
  assert(mayas.length >= 2, "need at least two Mayas");
  assert(!customers.some((c) => c.firstName === "Jordan" && c.lastName === "Green"), "Jordan Green must not exist");

  const cust1005 = customers.find((c) => c.customerId === "CUST-1005");
  const svc1005 = services.find((s) => s.customerId === "CUST-1005" && s.productCategory === "BROADBAND");
  const pays1005 = payments.filter((p) => p.customerId === "CUST-1005");
  assert(svc1005.lineState === "BLOCKED", "CUST-1005 must be blocked");
  assert(pays1005.some((p) => p.status === "FAILED") && pays1005.some((p) => p.status === "PENDING"), "CUST-1005 failed+pending");

  const con1008 = contracts.find((c) => c.customerId === "CUST-1008");
  assert(con1008.status === "NOT_STARTED" && con1008.minimumTermEndDate === null, "CUST-1008 NOT_STARTED");
  const bill1008 = bills.find((b) => b.customerId === "CUST-1008");
  assert(bill1008.status === "PENDING_GENERATION" && bill1008.total === null, "CUST-1008 pending bill null total");
  assert(orders.some((o) => o.orderId === "ORD-2042" && o.status === "DELAYED"), "ORD-2042 delayed");

  const bill7005 = bills.find((b) => b.billId === "BILL-7005");
  assert(bill7005.lineItems.some((li) => li.description.includes("Engineer")), "BILL-7005 engineer charge");
  const case7005 = billingCases.find((c) => c.billId === "BILL-7005");
  assert(case7005.evidence.some((e) => e.type === "CONSENT" && e.finding === "NOT_FOUND"), "consent NOT_FOUND");

  const bill7009 = bills.find((b) => b.billId === "BILL-7009");
  assert(bill7009.lineItems.some((li) => li.amount === 34.99), "£34.99 replacement charge");
  const case1010 = billingCases.find((c) => c.customerId === "CUST-1010");
  assert(case1010.evidence.some((e) => e.type === "FEE_WAIVER" && e.finding === "NOT_FOUND"), "fee waiver NOT_FOUND");

  const fault1002 = faults.find((f) => f.customerId === "CUST-1002");
  assert(fault1002.status === "RESOLVED", "CUST-1002 fault resolved");
  assert(orders.some((o) => o.customerId === "CUST-1002" && o.status === "IN_PROGRESS"), "open replacement for CUST-1002");

  const fault1004 = faults.find((f) => f.customerId === "CUST-1004");
  assert(fault1004.diagnostics.measuredDownloadMbps < fault1004.diagnostics.contractMinimumMbps, "CUST-1004 below minimum");

  console.log("Validation passed.");
}

validate();

const readme = `# Northstar fictional decisioning dataset v3

This dataset is **completely synthetic**. It contains no real customer, billing, network, or contract data.

## Structure

- \`data/\` — JSON entity fixtures
- \`knowledge/\` — Markdown decisioning articles with YAML frontmatter

## Identifier conventions

| Entity | Pattern |
|---|---|
| Customer | CUST-10xx |
| Service | SVC-30xx |
| Order | ORD-20xx |
| Billing account | BA-50xx |
| Bill | BILL-70xx |
| Payment | PAY-80xx |
| Billing case | BC-90xx |
| Fault | FLT-60xx |
| Incident | INC-41xx |
| Contract | CON-11xx |
| Contract event | CE-13xx |
| Offer | OFF-12xx |

## Deliberate scenarios

| ID | Customer | Trap |
|---|---|---|
| A | CUST-1005 | Failed payment + pending retry + blocked access; not a physical fault |
| B | CUST-1006 / BILL-7005 | Engineer visit occurred; consent NOT_FOUND; dispute unresolved |
| C | CUST-1004 | Below contractual speed + congestion; no automatic fee-free cancel |
| D | CUST-1008 / ORD-2042 | Delayed activation; contract NOT_STARTED; no end date |
| E | CUST-1007 | Resolved intermittent fault + evidenced £15 credit only |
| F | CUST-1002 | Resolved Wi-Fi fault + open replacement order mismatch |
| G | CUST-1010 | Restarting router + £34.99 charge + no waiver; dispute open |
| H | Patel / Maya | Ambiguous identity requires clarification |

## Example utterances

- What broadband package and line status does CUST-1001 have?
- Why is ORD-2042 delayed, and when will it be completed?
- Has CUST-1005 paid the outstanding amount?
- Is the engineer charge on BILL-7005 valid?
- CUST-1003 has no service. Should another engineer be booked?
- CUST-1005 says broadband is faulty. What does the evidence show?
- When does CUST-1008's minimum contract term end?
- CUST-1004 says speed is below the contractual minimum. Can they cancel without charge?
- Explain CUST-1010's router fault, replacement order, bill charge, dispute and contract position.
- Show me the services and orders for customer Patel.

Do not "fix" intentional conflicts such as a resolved fault with an open replacement order.
`;

fs.writeFileSync(path.join(dataDir, "README.md"), readme);
fs.writeFileSync(path.join(root, "shared", "README.md"), `# Shared Northstar assets

- \`data/\` — immutable fictional JSON fixtures
- \`knowledge/\` — decisioning Markdown articles
- \`packages/\` — shared TypeScript packages used by phases

Application orchestration (REST routes, agent loops, MCP, A2A) must not live here.
`);

// Stage and zip baseline copy expected by execution guide
fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(path.join(stagingDir, "data"), { recursive: true });
fs.mkdirSync(path.join(stagingDir, "knowledge"), { recursive: true });
for (const name of Object.keys(datasets)) {
  fs.copyFileSync(path.join(dataDir, name), path.join(stagingDir, "data", name));
}
fs.copyFileSync(path.join(dataDir, "README.md"), path.join(stagingDir, "README.md"));
for (const article of knowledgeArticles) {
  fs.copyFileSync(path.join(knowledgeDir, article.file), path.join(stagingDir, "knowledge", article.file));
}

const zipPath = path.join(root, "northstar_fictional_decisioning_dataset_v3.zip");
fs.rmSync(zipPath, { force: true });
execSync(`cd "${root}" && zip -r northstar_fictional_decisioning_dataset_v3.zip northstar_fictional_decisioning_dataset_v3`, {
  stdio: "inherit",
});
fs.rmSync(stagingDir, { recursive: true, force: true });

const counts = Object.fromEntries(
  Object.entries(datasets).map(([name, data]) => [name, data.length]),
);
console.log(JSON.stringify({ counts, knowledgeArticles: knowledgeArticles.length, zipPath }, null, 2));
