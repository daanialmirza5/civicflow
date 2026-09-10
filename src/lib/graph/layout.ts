import { GraphNodeData } from "./build";

// Simple deterministic layered layout (no external layout library needed):
// one column per node kind, in a fixed left-to-right reading order matching
// the citizen service graph in docs/knowledge-graph.md.
const COLUMN_ORDER: GraphNodeData["kind"][] = ["CITIZEN", "APPLICATION", "SERVICE", "DEPARTMENT", "RULE", "REQUIREMENT", "DOCUMENT"];
const COLUMN_X = 260;
const ROW_Y = 90;

export interface PositionedNode extends GraphNodeData {
  x: number;
  y: number;
}

export function layoutGraph(nodes: GraphNodeData[]): PositionedNode[] {
  const columnCounts = new Map<string, number>();
  return nodes.map((node) => {
    const columnIndex = COLUMN_ORDER.indexOf(node.kind);
    const row = columnCounts.get(node.kind) ?? 0;
    columnCounts.set(node.kind, row + 1);
    return {
      ...node,
      x: (columnIndex === -1 ? COLUMN_ORDER.length : columnIndex) * COLUMN_X,
      y: row * ROW_Y,
    };
  });
}
