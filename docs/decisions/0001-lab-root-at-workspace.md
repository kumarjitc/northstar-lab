# ADR 0001: Lab root at workspace root

## Status

Accepted

## Context

`northstar_implementation_plan.md` names a top-level folder `northstar-agent-lab/`.
This repository already is the Northstar Agent Lab workspace (`agentic-nw`).

## Decision

Build the npm workspace at the repository root rather than nesting another
`northstar-agent-lab/` directory. Keep the planning markdown files at the root.

## Consequences

- Paths in README commands are relative to the repo root.
- Package names still use the `@northstar/*` scope from the plan.
- This is an intentional, documented deviation from the nested folder name only.
