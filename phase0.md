Read northstar_implementation_plan.md and
vibe_agent_phase_execution_guide.md completely before making changes.

Treat northstar_implementation_plan.md as the authoritative technical
specification.

Use northstar_fictional_decisioning_dataset_v3.zip as the immutable
fictional data and knowledge baseline.

IMPLEMENT PHASE 0 ONLY.

Tasks:
1. Create the repository and npm workspace structure defined in the plan.
2. Create only the shared packages required by Phase 0.
3. Implement Phase 0 REST completely.
4. Implement structured JSONL logging.
5. Implement the deterministic scenario runner.
6. Implement all Phase 0 tests.
7. Run build, typecheck and tests.
8. Execute the mandatory Phase 0 scenarios.
9. Verify that generated execution logs reconstruct the flow.
10. Complete phases/00-rest/README.md.
11. Complete docs/observations/phase-00-rest.md.

Do NOT implement Agentic, MCP or A2A.
Do NOT install MCP or A2A dependencies.
Empty future-phase directory placeholders are acceptable, but do not
scaffold future implementation code.

When Phase 0 passes its exit gate, STOP.
Do not proceed to Phase 1 automatically.

At the end report:
- files created;
- architecture implemented;
- build and typecheck results;
- test results;
- scenarios executed;
- log locations;
- exact commands to run Phase 0;
- known limitations;
- deviations from northstar_implementation_plan.md.

Wait for my explicit approval before implementing Phase 1