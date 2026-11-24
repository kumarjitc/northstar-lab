import type { FastifyReply } from "fastify";
import type { Result } from "@northstar/domain-model";

export function sendResult<T>(reply: FastifyReply, result: Result<T>) {
  if (result.ok) {
    return reply.code(200).send({ ok: true, data: result.data });
  }
  const status =
    result.error.code === "NOT_FOUND"
      ? 404
      : result.error.code === "AMBIGUOUS"
        ? 409
        : result.error.code === "INVALID_INPUT"
          ? 400
          : result.error.code === "UNAVAILABLE"
            ? 503
            : 500;
  return reply.code(status).send({ ok: false, error: result.error });
}

export function sendInvalid(reply: FastifyReply, message: string, details?: unknown) {
  return reply.code(400).send({
    ok: false,
    error: {
      code: "INVALID_INPUT",
      message,
      details,
    },
  });
}
