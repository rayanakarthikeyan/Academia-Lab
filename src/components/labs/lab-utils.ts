export type LabEvent = (
  action: string,
  evidence?: Record<string, unknown>,
) => void;
export function quote(value: string) {
  return "'" + value.replaceAll("'", "''") + "'";
}
export function identifier(value: string) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/.test(value))
    throw new Error(
      "Use names starting with a letter, followed by letters, numbers or underscores (up to 31 characters).",
    );
  return '"' + value + '"';
}
export function downloadText(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
