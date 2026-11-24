export type ServiceDelegationRequest = {
  a2aTaskId: string;
  customerId?: string;
  question: string;
  correlation: {
    runId: string;
    sessionId: string;
    turnId: string;
  };
};

export type ServiceDelegationEvidence = {
  specialist: "service";
  a2aTaskId: string;
  ok: boolean;
  summary: string;
  recordIds?: string[];
  caveats?: string[];
  error?: string;
};
