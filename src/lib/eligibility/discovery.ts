// Service discovery / matching: ranks services for a citizen profile using
// deterministic eligibility results only. No AI scoring — see docs/eligibility-engine.md.

import { EligibilityResult } from "./types";

export interface RankableService {
  serviceId: string;
  serviceName: string;
  category: string;
  priority: number; // service.priority from the catalog
  result: EligibilityResult;
}

export interface RankedService extends RankableService {
  /** Deterministic composite score used only for sort order, always shown alongside its inputs. */
  score: number;
}

/**
 * Ranking formula (documented, not a black box):
 *   score = satisfiedCount * 100
 *         + completeness
 *         + priority * 5
 *         - missingFields.length * 10
 *         - (verdict === "NOT_MATCH" ? 10_000 : 0)
 * NOT_MATCH services sink to the bottom but are not hidden, so a citizen can
 * still see why a service didn't match.
 */
export function rankServices(services: RankableService[]): RankedService[] {
  return services
    .map((s) => {
      const notMatchPenalty = s.result.verdict === "NOT_MATCH" ? 10_000 : 0;
      const score =
        s.result.satisfiedCount * 100 +
        s.result.completeness +
        s.priority * 5 -
        s.result.missingFields.length * 10 -
        notMatchPenalty;
      return { ...s, score };
    })
    .sort((a, b) => b.score - a.score);
}
