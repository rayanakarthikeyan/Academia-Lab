export interface CodeProblem {
  line: number;
  column: number;
  message: string;
}
export function compilerProblems(text: string, source = ""): CodeProblem[] {
  const sourceClass =
    source.match(
      /\bpublic\s+(?:(?:final|abstract|strictfp)\s+)*class\s+(\w+)/,
    )?.[1] || source.match(/\bclass\s+(\w+)/)?.[1];
  const found: CodeProblem[] = [];
  const pattern =
    /\d+\. (?:ERROR|WARNING) in [^\n]+\(at line (\d+)\)\r?\n([^\n]*)\r?\n([^\n]*\^+)\r?\n([^\n]+)/g;
  for (const match of text.matchAll(pattern))
    found.push({
      line: Number(match[1]),
      column: Math.max(1, match[3].indexOf("^")),
      message: match[4].trim(),
    });
  if (!found.length) {
    for (const match of text.matchAll(
      /\b(?!AsterLabLauncher\b)([\w$]+)\.java:(\d+)\)/g,
    )) {
      if (sourceClass && match[1] !== sourceClass) continue;
      found.push({
        line: Number(match[2]),
        column: 1,
        message:
          text
            .split("\n")
            .filter(
              (line) => !/^\s*at\s/.test(line) && /Exception|Error/.test(line),
            )
            .at(-1) || "Runtime error at this line",
      });
      if (found.length === 5) break;
    }
  }
  return found.slice(0, 30);
}
// Immediate structural feedback only; Java's compiler supplies semantic errors.
export function structuralProblems(
  source: string,
  language: string,
): CodeProblem[] {
  if (!["java", "sql"].includes(language)) return [];
  const stack: { char: string; line: number; column: number }[] = [];
  let quote = "",
    comment = "",
    line = 1,
    column = 0,
    startLine = 1,
    startColumn = 1;
  for (let i = 0; i < source.length; i++) {
    const c = source[i],
      next = source[i + 1];
    column++;
    if (c === "\n") {
      line++;
      column = 0;
      if (comment === "line") comment = "";
    }
    if (comment) {
      if (comment === "block" && c === "*" && next === "/") {
        comment = "";
        i++;
        column++;
      }
      continue;
    }
    if (quote) {
      if (language === "java" && c === "\\") {
        i++;
        column++;
        continue;
      }
      if (c === quote) {
        if (language === "sql" && next === quote) {
          i++;
          column++;
        } else quote = "";
      }
      continue;
    }
    if (c === "/" && next === "*") {
      comment = "block";
      startLine = line;
      startColumn = column;
      i++;
      column++;
      continue;
    }
    if (
      (language === "java" && c === "/" && next === "/") ||
      (language === "sql" && c === "-" && next === "-")
    ) {
      comment = "line";
      i++;
      column++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      startLine = line;
      startColumn = column;
      continue;
    }
    if ("([{".includes(c)) stack.push({ char: c, line, column });
    if (")]}".includes(c)) {
      const open = stack.pop();
      if (!open || "([{".indexOf(open.char) !== ")]}".indexOf(c))
        return [
          { line, column, message: `Unexpected '${c}' or mismatched bracket.` },
        ];
    }
  }
  if (quote)
    return [
      {
        line: startLine,
        column: startColumn,
        message: "Unclosed string or quoted value.",
      },
    ];
  if (comment === "block")
    return [
      {
        line: startLine,
        column: startColumn,
        message: "Unclosed block comment.",
      },
    ];
  return stack.slice(-5).map((item) => ({
    line: item.line,
    column: item.column,
    message: `Missing closing bracket for '${item.char}'.`,
  }));
}
