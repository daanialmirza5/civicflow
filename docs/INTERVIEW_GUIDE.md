# CivicFlow — Interview Guide & Technical Defense

## 1. Pitches
- **30-Second Pitch**: "CivicFlow is an intelligent GovTech platform that transforms complex government services into transparent citizen journeys. It uses rule-based knowledge graphs to evaluate social benefit eligibility, generate document checklists, and guide citizens step-by-step."
- **2-Minute Pitch**: "Navigating public welfare programs, grants, and municipal services is notoriously bureaucratic, causing eligible citizens to miss critical assistance. CivicFlow structures government administrative logic into an executable knowledge graph built with Next.js and Prisma. Our eligibility engine processes household parameters against deterministic rule trees, calculating exact benefit qualification. We generate personalized prerequisite document checklists and step-by-step application timelines, complemented by an AI citizen assistant that translates complex administrative jargon into plain, multi-lingual guidance without hallucinations."

## 2. Key Technical Q&A
- **Q: Why use a deterministic rule engine rather than letting an LLM evaluate eligibility?**
  - **A**: Government benefit eligibility is legally binding and strictly deterministic. An LLM might hallucinate qualification, creating false expectations or fraud risks. CivicFlow executes deterministic TypeScript rule trees for eligibility decisions and utilizes LLMs solely to explain the results in accessible language.
