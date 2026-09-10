"use client";

import { use, useMemo, useState } from "react";
import "reactflow/dist/style.css";
import ReactFlow, { Background, Controls, Node, Edge, MiniMap } from "reactflow";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api/client";
import { Card, CardBody } from "@/components/ui/Card";
import { layoutGraph } from "@/lib/graph/layout";

interface GraphResponse {
  nodes: { id: string; kind: string; label: string; detail?: string; status?: string }[];
  edges: { id: string; source: string; target: string; label: string }[];
}

const KIND_COLOR: Record<string, string> = {
  CITIZEN: "#4f46e5",
  SERVICE: "#0ea5e9",
  DEPARTMENT: "#64748b",
  RULE: "#f59e0b",
  REQUIREMENT: "#10b981",
  DOCUMENT: "#ec4899",
  APPLICATION: "#8b5cf6",
};

export default function GraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <GraphBody serviceId={id} />
    </RequireAuth>
  );
}

function GraphBody({ serviceId }: { serviceId: string }) {
  const [selected, setSelected] = useState<GraphResponse["nodes"][number] | null>(null);
  const { data } = useQuery({
    queryKey: ["graph", serviceId],
    queryFn: () => api.get<GraphResponse>(`/api/graph/service/${serviceId}`),
  });

  const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    if (!data) return { nodes: [], edges: [] };
    const positioned = layoutGraph(data.nodes as never);
    return {
      nodes: positioned.map((n) => ({
        id: n.id,
        position: { x: n.x, y: n.y },
        data: { label: n.label },
        style: {
          borderColor: KIND_COLOR[n.kind] ?? "#94a3b8",
          borderWidth: 2,
          borderRadius: 8,
          padding: 8,
          fontSize: 12,
          background: "white",
          color: "#0f172a",
        },
      })),
      edges: data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        labelStyle: { fontSize: 10 },
        style: { stroke: "#94a3b8" },
      })),
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Service graph explorer</h1>
        <p className="text-sm text-slate-500">Click a node to inspect its details.</p>
      </div>
      <Card>
        <CardBody className="h-[520px] p-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            onNodeClick={(_, node) => {
              const found = data?.nodes.find((n) => n.id === node.id) ?? null;
              setSelected(found);
            }}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </CardBody>
      </Card>
      {selected && (
        <Card>
          <CardBody>
            <div className="text-sm font-semibold">{selected.label}</div>
            <div className="text-xs text-slate-500">Type: {selected.kind}</div>
            {selected.detail && <div className="text-xs text-slate-500">Detail: {selected.detail}</div>}
            {selected.status && <div className="text-xs text-slate-500">Status: {selected.status}</div>}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
