// Builds a React Flow-compatible node/edge graph for the Service Graph
// Explorer (build brief §16/§17/§45). Pure transformation over already-loaded
// domain data — no DB access here, so it's easy to unit test and reuse for
// both the citizen-centric view and the service-centric view.

export interface GraphNodeData {
  id: string;
  kind: "CITIZEN" | "SERVICE" | "RULE" | "REQUIREMENT" | "DOCUMENT" | "APPLICATION" | "DEPARTMENT";
  label: string;
  detail?: string;
  status?: string;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label:
    | "ELIGIBLE_FOR"
    | "REQUIRES"
    | "PROVIDED_BY"
    | "APPLIES_TO"
    | "BLOCKED_BY"
    | "SATISFIED_BY"
    | "APPLICATION_FOR";
}

export interface ServiceGraphInput {
  serviceId: string;
  serviceName: string;
  departmentId: string;
  departmentName: string;
  ruleLabels: string[];
  requirements: { id: string; name: string; necessity: string }[];
  application?: {
    id: string;
    status: string;
    documents: { requirementId: string; status: string }[];
  } | null;
}

export function buildServiceGraph(input: ServiceGraphInput): { nodes: GraphNodeData[]; edges: GraphEdgeData[] } {
  const nodes: GraphNodeData[] = [];
  const edges: GraphEdgeData[] = [];

  const serviceNodeId = `service:${input.serviceId}`;
  const deptNodeId = `department:${input.departmentId}`;

  nodes.push({ id: serviceNodeId, kind: "SERVICE", label: input.serviceName });
  nodes.push({ id: deptNodeId, kind: "DEPARTMENT", label: input.departmentName });
  edges.push({ id: `${serviceNodeId}->${deptNodeId}`, source: serviceNodeId, target: deptNodeId, label: "PROVIDED_BY" });

  input.ruleLabels.forEach((label, i) => {
    const ruleNodeId = `rule:${input.serviceId}:${i}`;
    nodes.push({ id: ruleNodeId, kind: "RULE", label });
    edges.push({ id: `${serviceNodeId}->${ruleNodeId}`, source: serviceNodeId, target: ruleNodeId, label: "REQUIRES" });
  });

  input.requirements.forEach((req) => {
    const reqNodeId = `requirement:${req.id}`;
    nodes.push({ id: reqNodeId, kind: "REQUIREMENT", label: req.name, detail: req.necessity });
    edges.push({ id: `${serviceNodeId}->${reqNodeId}`, source: serviceNodeId, target: reqNodeId, label: "REQUIRES" });
  });

  if (input.application) {
    const appNodeId = `application:${input.application.id}`;
    nodes.push({ id: appNodeId, kind: "APPLICATION", label: `Application ${input.application.id.slice(-6)}`, status: input.application.status });
    edges.push({ id: `${appNodeId}->${serviceNodeId}`, source: appNodeId, target: serviceNodeId, label: "APPLICATION_FOR" });

    for (const doc of input.application.documents) {
      const reqNodeId = `requirement:${doc.requirementId}`;
      const docNodeId = `document:${input.application.id}:${doc.requirementId}`;
      nodes.push({ id: docNodeId, kind: "DOCUMENT", label: "Document", status: doc.status });
      edges.push({ id: `${docNodeId}->${reqNodeId}`, source: docNodeId, target: reqNodeId, label: "SATISFIED_BY" });
      edges.push({ id: `${appNodeId}->${docNodeId}`, source: appNodeId, target: docNodeId, label: "REQUIRES" });
    }
  }

  return { nodes, edges };
}
