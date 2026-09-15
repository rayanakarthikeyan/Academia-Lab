// These catalog experiments need a display, JDBC server, or legacy applet host.
export function needsDesktopJava(curriculumItemId: string) {
  return /^java-lab-(10|16|17|18|19|20|21)$/.test(curriculumItemId);
}

export const javaCompilerHelp =
  "Built-in Java 8 compiler · no API key or daily run quota. Use a public class with public static void main(String[] args). Upload data files and download java.io output files. JDBC supports the built-in H2 database (jdbc:h2:mem:lab). java.nio.file, desktop windows, external database servers and applets are not supported.";

export const jdbcStarter = `import java.sql.*;
import java.util.Scanner;
public class JdbcLab {
  public static void main(String[] args) throws Exception {
    String name = new Scanner(System.in).nextLine();
    Class.forName("org.h2.Driver");
    try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:lab", "sa", "");
         Statement statement = connection.createStatement()) {
      statement.executeUpdate("CREATE TABLE students(id INTEGER PRIMARY KEY, name VARCHAR(80))");
      try (PreparedStatement insert = connection.prepareStatement("INSERT INTO students VALUES (?, ?)")) {
        insert.setInt(1, 1);
        insert.setString(2, name);
        insert.executeUpdate();
      }
      statement.executeUpdate("UPDATE students SET name = UPPER(name) WHERE id = 1");
      try (ResultSet rows = statement.executeQuery("SELECT id, name FROM students")) {
        while (rows.next()) System.out.println(rows.getInt(1) + " " + rows.getString(2));
      }
      System.out.println("Deleted: " + statement.executeUpdate("DELETE FROM students WHERE id = 1"));
      statement.execute("SHUTDOWN");
    }
  }
}`;
