import { PrimeDebugger } from "./PrimeDebugger";
import { GuiSimulator } from "./GuiSimulator";
import { ErStudio } from "./ErStudio";
import { NormalizationLab } from "./NormalizationLab";
import type { LabEvent } from "./lab-utils";
export function hasLearningTool(id: string) {
  return /^(java-lab-(1|10|16|17|18|19|20|21)|dbms-lab-(1|3))$/.test(id);
}
export function LearningTools({
  id,
  onEvent,
  theme,
}: {
  id: string;
  onEvent: LabEvent;
  theme: "light" | "dark";
}) {
  if (id === "java-lab-1")
    return <PrimeDebugger onEvent={onEvent} theme={theme} />;
  if (id === "dbms-lab-1") return <ErStudio onEvent={onEvent} />;
  if (id === "dbms-lab-3") return <NormalizationLab onEvent={onEvent} />;
  if (/^java-lab-(10|16|17|18|19|20|21)$/.test(id))
    return (
      <GuiSimulator lab={Number(id.split("-").at(-1))} onEvent={onEvent} />
    );
  return null;
}
