import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProjects, createProject } from "@/lib/airtable";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const projects = await getProjects(session.user.email);
    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error("[Projects GET]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { topic, category, scenario, results } = await req.json();
    const project = await createProject({
      topic,
      category,
      scenario,
      results,
      user_email: session.user.email,
    });
    return NextResponse.json({ project });
  } catch (err: any) {
    console.error("[Projects POST]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
