import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/stash/db";
import { parseNoteNames } from "@/stash/mix-ai";
import { mixes } from "@/stash/schema";

/** Guest menu. Only mixes an admin has put on the menu. Never blocks the page if the shelf is down. */
export async function GET() {
  try {
    await connection();
    const rows = await db().query.mixes.findMany({
      where: eq(mixes.status, "menu"),
      orderBy: [desc(mixes.createdAt)],
      limit: 12,
    });
    return NextResponse.json({
      mixes: rows.map((row) => ({
        id: row.id,
        name: row.name,
        zone: row.zone,
        character: row.character,
        profile: row.profile,
        story: row.story,
        notes: parseNoteNames(row.notes).map((name) => ({ name })),
        fromShelf: true,
      })),
    });
  } catch {
    return NextResponse.json({ mixes: [] });
  }
}
