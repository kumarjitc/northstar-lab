import type { FastifyInstance } from "fastify";
import type { AppContext } from "../app.js";
import { sendInvalid, sendResult } from "../http.js";
import { z } from "zod";

export async function registerRoutes(app: FastifyInstance, ctx: AppContext) {
  const { services } = ctx;

  app.get("/health", async () => ({
    ok: true,
    data: {
      status: "healthy",
      phase: "00-rest",
      timestamp: new Date().toISOString(),
    },
  }));

  app.get("/customers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getCustomer(id));
  });

  app.get("/customers/search", async (request, reply) => {
    const query = request.query as { lastName?: string; firstName?: string };
    if (!query.lastName && !query.firstName) {
      return sendInvalid(reply, "Provide firstName and/or lastName");
    }
    return sendResult(reply, services.findCustomersByName(query));
  });

  app.get("/customers/:id/services", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getCustomerServices(id));
  });

  app.get("/customers/:id/orders", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getCustomerOrders(id));
  });

  app.get("/customers/:id/billing-account", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getBillingAccount(id));
  });

  app.get("/customers/:id/billing-cases", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getBillingCases(id));
  });

  app.get("/customers/:id/faults", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getFaults(id));
  });

  app.get("/customers/:id/contracts", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getContracts(id));
  });

  app.get("/customers/:id/offers", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getOffers(id));
  });

  app.get("/billing/accounts/:id/bills", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getBills(id));
  });

  app.get("/billing/accounts/:id/payments", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getPayments(id));
  });

  app.get("/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getOrder(id));
  });

  app.get("/faults/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getFault(id));
  });

  app.get("/contracts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getContract(id));
  });

  app.get("/contracts/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendResult(reply, services.getContractEvents(id));
  });

  app.get("/network-incidents", async (_request, reply) => {
    return sendResult(reply, services.getNetworkIncidents());
  });

  app.get("/knowledge/search", async (request, reply) => {
    const q = (request.query as { q?: string }).q;
    if (!q) return sendInvalid(reply, "Query parameter q is required");
    return sendResult(reply, services.searchKnowledge(q));
  });

  app.post("/support-case-drafts", async (request, reply) => {
    const schema = z.object({
      customerId: z.string(),
      subject: z.string(),
      summary: z.string(),
      relatedRecordIds: z.array(z.string()).optional(),
      evidenceGaps: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return sendInvalid(reply, "Invalid support case draft payload", parsed.error.flatten());
    }
    return sendResult(reply, services.draftSupportCase(parsed.data));
  });
}
