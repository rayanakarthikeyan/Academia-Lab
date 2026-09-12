// These catalog experiments need a display, JDBC server, or legacy applet host.
export function needsDesktopJava(curriculumItemId: string) {
  return /^java-lab-(10|15|16|17|18|19|20|21)$/.test(curriculumItemId);
}

export const javaCompilerHelp =
  "Built-in Java 8 compiler · no API key or daily run quota. Use class Main with public static void main(String[] args). File labs use java.io streams and temporary browser files; java.nio.file is not supported. Desktop windows, JDBC servers and applets require the college Java environment.";
