import { prisma } from "@/lib/db";
import { RuleNode } from "./types";

export interface LoadedService {
  id: string;
  name: string;
  description: string;
  category: string;
  jurisdiction: string;
  priority: number;
  processingDays: number;
  isSynthetic: boolean;
  department: { id: string; name: string };
  rules: RuleNode;
  requirements: {
    id: string;
    type: string;
    necessity: string;
    name: string;
    description: string;
  }[];
}

export async function loadServiceWithRules(serviceId: string): Promise<LoadedService | null> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      department: true,
      requirements: true,
      eligibilityRuleSets: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  if (!service || !service.active) return null;
  const ruleSet = service.eligibilityRuleSets[0];
  if (!ruleSet) return null;

  return {
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    jurisdiction: service.jurisdiction,
    priority: service.priority,
    processingDays: service.processingDays,
    isSynthetic: service.isSynthetic,
    department: { id: service.department.id, name: service.department.name },
    rules: JSON.parse(ruleSet.rules) as RuleNode,
    requirements: service.requirements.map((r) => ({
      id: r.id,
      type: r.type,
      necessity: r.necessity,
      name: r.name,
      description: r.description,
    })),
  };
}

export async function loadAllActiveServices(): Promise<LoadedService[]> {
  const services = await prisma.service.findMany({
    where: { active: true },
    include: {
      department: true,
      requirements: true,
      eligibilityRuleSets: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  return services
    .filter((s) => s.eligibilityRuleSets[0])
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      jurisdiction: service.jurisdiction,
      priority: service.priority,
      processingDays: service.processingDays,
      isSynthetic: service.isSynthetic,
      department: { id: service.department.id, name: service.department.name },
      rules: JSON.parse(service.eligibilityRuleSets[0].rules) as RuleNode,
      requirements: service.requirements.map((r) => ({
        id: r.id,
        type: r.type,
        necessity: r.necessity,
        name: r.name,
        description: r.description,
      })),
    }));
}
