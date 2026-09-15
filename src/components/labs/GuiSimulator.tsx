import { useState } from "react";
import type { LabEvent } from "./lab-utils";

const titles: Record<number, string> = {
  10: "Exception rescue",
  16: "Traffic control",
  17: "Pointer event detective",
  18: "Keyboard event detective",
  19: "Calculator workshop",
  20: "Applet lifecycle studio",
  21: "Factorial machine",
};
const concepts: Record<number, string> = {
  10: "Integer.parseInt(...) can throw NumberFormatException. Integer division by zero throws ArithmeticException. Catch these separately and show an explanatory dialog.",
  16: "A radio-button selection changes the signal state. In Swing, an ActionListener or ItemListener updates the selected lamp and requests repaint().",
  17: "MouseAdapter lets you override only the events you need: mouseEntered, mousePressed, mouseReleased, mouseClicked and mouseExited. A click follows a press and release.",
  18: "KeyListener distinguishes keyPressed, keyTyped and keyReleased. Text entry and physical key events are not identical, especially with mobile keyboards.",
  19: "GridLayout arranges the buttons. ActionListener stores operands and the selected operator, validates the operation and updates a result field.",
  20: "init() prepares an applet instance; start() activates it; paint(Graphics g) draws its content; stop() suspends activity; destroy() releases resources. Reinitializing this simulation represents a new instance.",
  21: "An ActionListener reads and validates n, multiplies from 1 through n, and updates a result field. 0! is 1. A Java long holds factorials only through 20!.",
};
export function GuiSimulator({
  lab,
  onEvent,
}: {
  lab: number;
  onEvent: LabEvent;
}) {
  const [a, setA] = useState("8"),
    [b, setB] = useState("2");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const [signal, setSignal] = useState("red");
  const [challenge, setChallenge] = useState(0);
  const [events, setEvents] = useState<string[]>([]);
  const [lifecycle, setLifecycle] = useState("uninitialized");
  const [text, setText] = useState("Welcome to my applet");
  const [operand, setOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState("+");
  const [display, setDisplay] = useState("0");
  const [fresh, setFresh] = useState(true);
  const [factorial, setFactorial] = useState<string[]>([]);
  const [factorialStep, setFactorialStep] = useState(0);
  const [prediction, setPrediction] = useState("");
  function mark(action: string, evidence: Record<string, unknown> = {}) {
    setDone((current) =>
      current.includes(action) ? current : [...current, action],
    );
    onEvent(action, { lab, ...evidence });
  }
  function event(kind: string) {
    setEvents((current) => [...current.slice(-11), kind]);
    mark("event_" + kind);
  }
  const targets = ["red", "yellow", "green"];
  const goal =
    lab === 10
      ? "Run a valid division, then cause and explain both exceptions."
      : lab === 16
        ? "Choose the safe signal for each scenario."
        : lab === 17
          ? "Observe enter, press, release, click and exit. Touch controls provide equivalent simulated events."
          : lab === 18
            ? "Compare key press/release with text input. Mobile keyboards may emit input without physical key events."
            : lab === 19
              ? "Build results with the keypad. Try a normal calculation and division by zero."
              : lab === 20
                ? "Initialize, start, stop, restart and destroy an applet. Watch when painting is allowed."
                : "Predict a factorial, then follow each multiplication. Try 0 as a boundary case.";
  return (
    <section className="panel p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="text-xl font-semibold">{titles[lab]}</h2>
        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs">
          Java lab {lab} · interactive simulation
        </span>
      </div>
      <p className="text-sm text-[var(--muted)]">
        {goal} This models Java GUI/Applet concepts; it does not compile Swing
        or Applet source.
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(220px,2fr)]">
        <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 space-y-4">
          {lab === 10 && (
            <>
              <label className="block">
                Dividend
                <input
                  aria-label="Dividend"
                  className="input-field"
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                />
              </label>
              <label className="block">
                Divisor
                <input
                  aria-label="Divisor"
                  className="input-field"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                />
              </label>
              <button
                className="primary-button"
                onClick={() => {
                  const valid = (s: string) =>
                    /^[+-]?\d+$/.test(s.trim()) &&
                    Number(s) >= -2147483648 &&
                    Number(s) <= 2147483647;
                  if (!valid(a) || !valid(b)) {
                    setMessage(
                      "NumberFormatException: enter valid 32-bit integers.",
                    );
                    mark("number_format_exception");
                  } else if (Number(b) === 0) {
                    setMessage(
                      "ArithmeticException: integer division by zero. The catch block handles this instead of crashing the window.",
                    );
                    mark("arithmetic_exception");
                  } else {
                    const value =
                      Number(a) === -2147483648 && Number(b) === -1
                        ? -2147483648
                        : Math.trunc(Number(a) / Number(b));
                    setMessage("Quotient: " + value);
                    mark("division_success");
                  }
                }}
              >
                Divide
              </button>
            </>
          )}
          {lab === 16 && (
            <>
              <svg
                viewBox="0 0 320 300"
                className="w-full max-h-72"
                role="img"
                aria-label={`Traffic signal ${signal}`}
              >
                <rect
                  x="110"
                  y="10"
                  width="100"
                  height="270"
                  rx="28"
                  fill="#172033"
                />
                {targets.map((color, i) => (
                  <circle
                    key={color}
                    cx="160"
                    cy={60 + i * 85}
                    r="30"
                    fill={
                      signal === color
                        ? {
                            red: "#ef4444",
                            yellow: "#facc15",
                            green: "#22c55e",
                          }[color]
                        : "#394151"
                    }
                  />
                ))}
              </svg>
              <fieldset className="flex flex-wrap justify-center gap-4">
                <legend className="sr-only">Traffic signal</legend>
                {targets.map((color) => (
                  <label key={color} className="p-2">
                    <input
                      type="radio"
                      name="signal"
                      value={color}
                      checked={signal === color}
                      onChange={() => {
                        setSignal(color);
                        mark("signal_selected", { color });
                      }}
                    />{" "}
                    {color}
                  </label>
                ))}
              </fieldset>
              <p>
                {
                  [
                    "Pedestrians are crossing. What signal should drivers see?",
                    "The signal is about to turn red. Which light warns drivers?",
                    "The crossing is clear and traffic may proceed. Which light applies?",
                  ][challenge]
                }
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  const matched = signal === targets[challenge];
                  setMessage(
                    matched
                      ? "Correct: " +
                          ["stop", "prepare to stop", "proceed when safe"][
                            challenge
                          ]
                      : "Try again. Consider the safety instruction.",
                  );
                  mark("traffic_answer", { challenge, matched });
                  if (matched) setChallenge((challenge + 1) % 3);
                }}
              >
                Check signal
              </button>
            </>
          )}
          {lab === 17 && (
            <>
              <div
                tabIndex={0}
                role="button"
                aria-label="Pointer event surface"
                className="min-h-52 rounded-xl border-2 border-dashed border-cyan-500 flex items-center justify-center text-center p-6 touch-manipulation"
                onPointerEnter={() => event("entered")}
                onPointerDown={() => event("pressed")}
                onPointerUp={() => event("released")}
                onPointerLeave={() => event("exited")}
                onClick={() => event("clicked")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    event("clicked");
                  }
                }}
              >
                Move, tap or click here.
                <br />
                Focus and press Enter for keyboard access.
              </div>
              <div className="flex flex-wrap gap-2">
                {["entered", "pressed", "released", "clicked", "exited"].map(
                  (kind) => (
                    <button
                      className="secondary-button"
                      key={kind}
                      onClick={() => event(kind)}
                    >
                      Simulate {kind}
                    </button>
                  ),
                )}
              </div>
            </>
          )}
          {lab === 18 && (
            <>
              <label className="block">
                Keyboard capture
                <input
                  className="input-field"
                  aria-label="Keyboard capture"
                  placeholder="Type here"
                  maxLength={80}
                  onKeyDown={() => event("keyPressed")}
                  onKeyUp={() => event("keyReleased")}
                  onInput={() => event("textInput")}
                />
              </label>
              <p className="text-xs">
                Typed text stays here; telemetry records event types, not your
                text.
              </p>
              <div className="flex flex-wrap gap-2">
                {["A", "Enter", "Space", "Backspace"].map((key) => (
                  <button
                    key={key}
                    className="secondary-button"
                    onClick={() => {
                      event("virtualKeyPressed");
                      if (key === "A" || key === "Space")
                        event("virtualKeyTyped");
                      event("virtualKeyReleased");
                      setMessage(
                        `Simulated ${key}: press → ${key === "A" || key === "Space" ? "typed → " : ""}release`,
                      );
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </>
          )}
          {lab === 19 && (
            <>
              <output
                aria-label="Calculator display"
                className="block rounded-lg bg-[var(--surface)] text-right p-4 font-mono text-3xl break-all"
              >
                {display}
              </output>
              <div className="grid grid-cols-4 gap-2">
                {[
                  "7",
                  "8",
                  "9",
                  "/",
                  "4",
                  "5",
                  "6",
                  "*",
                  "1",
                  "2",
                  "3",
                  "-",
                  "C",
                  "0",
                  "=",
                  "+",
                ].map((key) => (
                  <button
                    className="secondary-button min-h-12"
                    key={key}
                    onClick={() => {
                      if (/^\d$/.test(key)) {
                        setDisplay((current) =>
                          fresh || current === "0"
                            ? key
                            : (current + key).slice(0, 12),
                        );
                        setFresh(false);
                        return;
                      }
                      if (key === "C") {
                        setDisplay("0");
                        setOperand(null);
                        setFresh(true);
                        return;
                      }
                      if (key !== "=") {
                        setOperand(Number(display));
                        setOperator(key);
                        setFresh(true);
                        return;
                      }
                      if (operand === null) return;
                      const n = Number(display);
                      const result =
                        operator === "+"
                          ? operand + n
                          : operator === "-"
                            ? operand - n
                            : operator === "*"
                              ? operand * n
                              : n === 0
                                ? NaN
                                : operand / n;
                      setDisplay(
                        Number.isFinite(result)
                          ? String(Number(result.toPrecision(12)))
                          : "Error",
                      );
                      setMessage(
                        Number.isFinite(result)
                          ? "Action listener evaluated the selected operation."
                          : "Division by zero: show an error and let the user recover with C.",
                      );
                      setOperand(null);
                      setFresh(true);
                      mark("calculator_result", {
                        operator,
                        status: Number.isFinite(result) ? "passed" : "error",
                      });
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <p className="text-xs">
                Choose a first number, an operator, a second number, then =. C
                starts a new calculation.
              </p>
            </>
          )}
          {lab === 20 && (
            <>
              <label className="block">
                Applet message
                <input
                  aria-label="Applet message"
                  className="input-field"
                  value={text}
                  maxLength={60}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <svg
                viewBox="0 0 500 180"
                role="img"
                aria-label="Applet canvas"
                className="w-full rounded-xl bg-slate-900"
              >
                <text
                  x="250"
                  y="85"
                  textAnchor="middle"
                  fill="#67e8f9"
                  fontSize="18"
                >
                  {lifecycle === "running" ? text : `Applet: ${lifecycle}`}
                </text>
                <text
                  x="250"
                  y="125"
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="12"
                >
                  {lifecycle === "running"
                    ? "paint(Graphics g)"
                    : "Painting is inactive"}
                </text>
              </svg>
              <div className="flex flex-wrap gap-2">
                {["init", "start", "stop", "destroy"].map((action) => {
                  const allowed =
                    action === "init"
                      ? ["uninitialized", "destroyed"].includes(lifecycle)
                      : action === "start"
                        ? ["initialized", "stopped"].includes(lifecycle)
                        : action === "stop"
                          ? lifecycle === "running"
                          : ["initialized", "stopped"].includes(lifecycle);
                  return (
                    <button
                      key={action}
                      className="secondary-button"
                      disabled={!allowed}
                      onClick={() => {
                        const next = {
                          init: "initialized",
                          start: "running",
                          stop: "stopped",
                          destroy: "destroyed",
                        }[action]!;
                        setLifecycle(next);
                        event(action);
                        setMessage(`${action}() → ${next}`);
                      }}
                    >
                      {action}()
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {lab === 21 && (
            <>
              <label className="block">
                Factorial input
                <input
                  type="number"
                  aria-label="Factorial input"
                  className="input-field"
                  min="0"
                  max="20"
                  value={a}
                  onChange={(e) => {
                    setA(e.target.value);
                    setFactorial([]);
                    setMessage("");
                  }}
                />
              </label>
              <label className="block">
                Your predicted result
                <input
                  aria-label="Factorial prediction"
                  className="input-field"
                  inputMode="numeric"
                  value={prediction}
                  onChange={(e) => setPrediction(e.target.value)}
                />
              </label>
              <button
                className="primary-button"
                onClick={() => {
                  const n = Number(a);
                  if (
                    !/^\d+$/.test(a) ||
                    !Number.isInteger(n) ||
                    n < 0 ||
                    n > 20
                  ) {
                    setMessage(
                      "Use a whole number from 0 to 20 (the Java long range for factorials).",
                    );
                    mark("factorial_invalid");
                    return;
                  }
                  let value = 1n;
                  const steps = ["Start: result = 1"];
                  for (let i = 1; i <= n; i++) {
                    value *= BigInt(i);
                    steps.push(`${i}: result × ${i} = ${value}`);
                  }
                  setFactorial(steps);
                  setFactorialStep(0);
                  const matched = prediction.trim() === String(value);
                  setMessage(
                    prediction.trim()
                      ? matched
                        ? "Prediction matched. Step through to explain it."
                        : "Prediction differs. Follow the multiplication steps."
                      : "Step through, then compare your reasoning with the final result.",
                  );
                  mark("factorial_run", {
                    n,
                    predictionProvided: !!prediction.trim(),
                    matched,
                  });
                }}
              >
                Run factorial
              </button>
              {factorial.length > 0 && (
                <>
                  <output className="block font-mono break-all">
                    {factorial[factorialStep]}
                  </output>
                  <button
                    className="secondary-button"
                    disabled={factorialStep >= factorial.length - 1}
                    onClick={() => {
                      setFactorialStep(factorialStep + 1);
                      mark("factorial_step");
                    }}
                  >
                    Next multiplication
                  </button>
                  <p>
                    Step {factorialStep + 1} / {factorial.length}
                  </p>
                </>
              )}
            </>
          )}
        </div>
        <aside className="min-w-0 space-y-4">
          <h3 className="font-semibold">Observe → predict → explain</h3>
          <p className="text-sm rounded-lg border border-[var(--line)] p-3">
            {concepts[lab]}
          </p>
          <p
            role="status"
            className="rounded-lg bg-cyan-500/10 p-4 min-h-20 whitespace-pre-wrap"
          >
            {message || "Interact with the lab to see feedback here."}
          </p>
          {events.length > 0 && (
            <ol
              aria-label="Event timeline"
              className="rounded-lg bg-[var(--surface-2)] p-4 space-y-1 font-mono text-sm"
            >
              {events.map((item, i) => (
                <li key={i}>
                  {i + 1}. {item}
                </li>
              ))}
            </ol>
          )}
          <p className="text-sm">
            {done.length} distinct interactions recorded. Interaction counts are
            not grades.
          </p>
          <label className="block text-sm">
            Explain what happened
            <textarea
              aria-label="Simulation reflection"
              className="input-field min-h-28"
              maxLength={1500}
              placeholder="Which Java event, exception, or lifecycle method explains the result?"
              onBlur={(e) => {
                if (e.target.value.trim())
                  onEvent("simulation_reflection", {
                    lab,
                    reflection: e.target.value.slice(0, 1500),
                  });
              }}
            />
          </label>
          <p className="text-xs text-[var(--muted)]">
            Your reflection and learning actions are available to faculty. No
            automatic correctness grade is awarded for completing clicks.
          </p>
        </aside>
      </div>
    </section>
  );
}
