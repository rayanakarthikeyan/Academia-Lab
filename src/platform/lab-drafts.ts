import type { CourseCode } from "./types";
export interface ExperimentDraft {
  id: string;
  courseCode: CourseCode;
  label: string;
  title: string;
  brief: string;
  starterCode: string;
  expectedOutput: string;
  suggestedMarks: number;
  outcomes: string[];
  unit: number;
  isCustom?: boolean;
  environment?: "runner" | "external" | "visual";
}
export interface SavedLabDraft {
  id: string;
  faculty_id: string;
  draft: ExperimentDraft;
  updated_at: string;
}
export async function draftRequest(
  token: string,
  method = "GET",
  body?: unknown,
) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/assignments?drafts=1`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Draft request failed");
  return data as { drafts?: SavedLabDraft[]; draft?: SavedLabDraft };
}
