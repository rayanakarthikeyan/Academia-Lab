export function normalizePracticeQuestions(value, courseCode, draft = false) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20)
    throw Object.assign(new Error("Attach at most 20 practice questions"), {
      statusCode: 400,
    });
  const ids = new Set();
  return value.map((q) => {
    if (
      !q ||
      typeof q !== "object" ||
      !["java", "sql", "visual"].includes(q.language) ||
      typeof q.id !== "string" ||
      !q.id.trim() ||
      q.id.length > 120 ||
      ids.has(q.id) ||
      typeof q.title !== "string" ||
      (!draft && !q.title.trim()) ||
      q.title.length > 200 ||
      typeof q.prompt !== "string" ||
      (!draft && !q.prompt.trim()) ||
      q.prompt.length > 10000 ||
      typeof q.starterCode !== "string" ||
      q.starterCode.length > 100000 ||
      (q.expectedOutput != null &&
        (typeof q.expectedOutput !== "string" ||
          q.expectedOutput.length > 10000)) ||
      (q.input != null &&
        (typeof q.input !== "string" || q.input.length > 10000)) ||
      (!draft && courseCode === "JAVA" && q.language === "sql") ||
      (!draft && courseCode === "DBMS" && q.language !== "sql")
    ) {
      throw Object.assign(
        new Error(
          "Complete each practice question with a title, task and language matching the course. Sample input and output are optional.",
        ),
        { statusCode: 400 },
      );
    }
    ids.add(q.id);
    return {
      id: q.id,
      language: q.language,
      title: q.title.trim(),
      prompt: q.prompt.trim(),
      starterCode: q.starterCode,
      input: q.input || "",
      expectedOutput: q.expectedOutput || "",
      ...(q.requireSubmission === true ? { requireSubmission: true } : {}),
    };
  });
}
