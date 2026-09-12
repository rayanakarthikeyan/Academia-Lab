export function normalizePracticeQuestions(value) {
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
      ids.has(q.id) ||
      typeof q.title !== "string" ||
      !q.title.trim() ||
      q.title.length > 200 ||
      typeof q.prompt !== "string" ||
      !q.prompt.trim() ||
      q.prompt.length > 10000 ||
      typeof q.starterCode !== "string" ||
      q.starterCode.length > 100000 ||
      typeof q.expectedOutput !== "string" ||
      !q.expectedOutput.trim() ||
      q.expectedOutput.length > 10000 ||
      typeof q.input !== "string" ||
      q.input.length > 10000
    ) {
      throw Object.assign(
        new Error(
          "Complete each practice question: language, title, task, input and expected output or observations",
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
      input: q.input,
      expectedOutput: q.expectedOutput,
    };
  });
}
