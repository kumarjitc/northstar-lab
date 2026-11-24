# Portrait carousel — final copy (12 slides)

Format: 1080×1350 · T10-B · CTA merged into slide 12 · hallucination chips on phase slides

## 01 Cover
Title: Exploring backends for a conversation platform  
Subtitle: Options · cost · entitlement · hallucination · risks  
Footer: Same journey · five control planes · personal lab exploration

## 02 Why I explored this
Title: What is the best option — and why?  
Bullets:
- Conversation platform owns the user session
- Open question: what control plane sits behind it for self-serve domain work?
- Method: small synthetic fixture set + same utterances + five architectures
Utterances:
1. Why is my account blocked?
2. CUST-1005
3. Explain the block using billing, service, and contract evidence
Diagram: Conversation platform → [plug-in?] → billing / service / contract

## 03 Understanding ≠ domain routing
Left: Query understanding — language → intent/slots (often in the conversation platform)  
Right: Domain routing reasoning — billing vs service vs contract (what Phases 0–4 change)  
Footer: Don’t confuse “understood me” with “chose the right domain owner.”

## 04 Phase 0 REST
One-liner: Code owns the answer path.  
Flow: User → Platform → REST API → Domain services → Fixtures  
Chips: Understood Platform/structured · Routing Code/API · Cost Low · Entitlement API IAM · Hallucination Low  
Best when: Stable auditable paths · Watch-out: Rigid unless coded

## 05 Phase 1 Agentic
One-liner: One AI chooses tools inside one runtime.  
Flow: User → Platform → AI agent → Local tools → CapabilitySet  
Chips: Understood Platform+agent · Routing AI tools · Cost Medium · Entitlement Host+tools · Hallucination Medium–High

## 06 Phase 2 MCP
One-liner: Same agent idea; tools become a portable boundary.  
Flow: User → Platform → AI host → MCP → MCP server → CapabilitySet  
Chips: Understood Platform+host · Routing Host/MCP · Cost Medium–High · Entitlement MCP gateway · Hallucination Medium

## 07 Phase 3 A2A
One-liner: AI orchestrates domain AI owners.  
Flow: User → Platform → AI orchestrator → A2A → AI specialists → MCP  
Chips: Understood Platform+orch · Routing Orchestrator · Cost High · Entitlement Per specialist · Hallucination High

## 08 Phase 4 Mixed
One-liner: One MCP face; backends stay different.  
Flow: AI host → MCP facade → Billing MCP / Service A2A+AI / Contract REST  
Chips: Understood Platform+host · Routing Host/mixed · Cost High/variable · Entitlement Per route · Hallucination High-uneven

## 09 Comparison A
Rows: Who decides · AI present · Query understood in · Domain routing reasoned in · Agent-facing protocol

## 10 Comparison B
Rows: Cost · Entitlement · Hallucination · Best when  
Footnote: Relative lab view — not a $ benchmark. Hallucination = invented/overconfident domain facts.

## 11 Risks (five cards)
0 REST · 1 Agentic · 2 MCP · 3 A2A · 4 Mixed — as locked in plan

## 12 What’s best + CTA
Fit function bullets +  
CTA: What are you plugging behind your conversation platform today? Which risk is least acceptable — cost, entitlement leak, or hallucination?
