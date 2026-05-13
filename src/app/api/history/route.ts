import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Return all histories ordered by newest first
    // Exclude thumbnailUrl if we want a lighter payload, but since we need it in UI, let's include it.
    // If it gets too slow, we can truncate or separate.
    const patterns = await prisma.pattern.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: patterns });
  } catch (error: any) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.pattern.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting pattern:", error);
    return NextResponse.json({ error: "Failed to delete pattern" }, { status: 500 });
  }
}
