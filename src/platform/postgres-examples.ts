export const postgresExamples = {
  Procedure: `CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance NUMERIC);
INSERT INTO accounts VALUES (1, 100);
CREATE PROCEDURE deposit(account_id INTEGER, amount NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE accounts SET balance = balance + amount WHERE id = account_id;
END;
$$;
CALL deposit(1, 50);
SELECT * FROM accounts;`,
  Cursor: `CREATE TABLE marks (name TEXT, score INTEGER);
INSERT INTO marks VALUES ('Asha', 80), ('Ravi', 90);
DO $$
DECLARE
  student RECORD;
  students CURSOR FOR SELECT * FROM marks ORDER BY name;
BEGIN
  OPEN students;
  LOOP
    FETCH students INTO student;
    EXIT WHEN NOT FOUND;
    RAISE NOTICE '%: %', student.name, student.score;
  END LOOP;
  CLOSE students;
END;
$$;`,
  "ANY and ALL": `CREATE TABLE marks (score INTEGER);
INSERT INTO marks VALUES (60), (80), (90);
SELECT 85 > ANY (SELECT score FROM marks) AS above_some,
       85 > ALL (SELECT score FROM marks) AS above_all;`,
  Trigger: `CREATE TABLE items (id INTEGER PRIMARY KEY, price NUMERIC);
CREATE TABLE audit (item_id INTEGER, action TEXT);
CREATE FUNCTION log_item() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit VALUES (NEW.id, TG_OP);
  RETURN NEW;
END;
$$;
CREATE TRIGGER item_changed AFTER INSERT OR UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION log_item();
INSERT INTO items VALUES (1, 20);
UPDATE items SET price = 25 WHERE id = 1;
SELECT * FROM audit;`,
};
