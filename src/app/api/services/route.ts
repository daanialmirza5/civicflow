import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const q = searchParams.get("q");

    const services = await prisma.service.findMany({
      where: {
        active: true,
        ...(category ? { category: category as never } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {}),
      },
      include: { department: true, requirements: true },
      orderBy: { priority: "desc" },
    });

    return NextResponse.json({
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        jurisdiction: s.jurisdiction,
        department: s.department.name,
        priority: s.priority,
        processingDays: s.processingDays,
        isSynthetic: s.isSynthetic,
        lastVerified: s.lastVerified,
        requirementCount: s.requirements.length,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
