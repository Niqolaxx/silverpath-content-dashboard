const API_KEY = process.env.AIRTABLE_API_KEY!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID!;
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

export interface Project {
  id: string;
  topic: string;
  category: string;
  scenario: string;
  user_email: string;
  created_at: string;
  results: { [key: number]: string };
}

function recordToProject(record: any): Project {
  const f = record.fields;
  return {
    id: record.id,
    topic: f.topic || "",
    category: f.category || "",
    scenario: f.scenario || "",
    user_email: f.user_email || "",
    created_at: f.created_at || record.createdTime,
    results: {
      1: f.step_research || "",
      2: f.step_brief || "",
      3: f.step_draft || "",
      4: f.step_polish || "",
      5: f.step_seo || "",
      6: f.step_social || "",
      7: f.step_carousel || "",
    },
  };
}

export async function getProjects(userEmail: string): Promise<Project[]> {
  const formula = encodeURIComponent(`{user_email}="${userEmail}"`);
  const url = `${BASE_URL}?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc`;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Airtable fetch failed: ${res.status} ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return (data.records || []).map(recordToProject);
}

export async function createProject(project: {
  topic: string;
  category: string;
  scenario: string;
  user_email: string;
  results: { [key: number]: string };
}): Promise<Project> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fields: {
        topic: project.topic,
        category: project.category,
        scenario: project.scenario,
        user_email: project.user_email,
        created_at: new Date().toISOString(),
        step_research: project.results[1] || "",
        step_brief: project.results[2] || "",
        step_draft: project.results[3] || "",
        step_polish: project.results[4] || "",
        step_seo: project.results[5] || "",
        step_social: project.results[6] || "",
        step_carousel: project.results[7] || "",
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Airtable insert failed: ${res.status} ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return recordToProject(data);
}
