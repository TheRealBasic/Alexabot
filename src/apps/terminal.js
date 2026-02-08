import { appendManifestationEvent, clearSimulation, clearState, incrementFileView, recordCommandTelemetry } from "../state.js";
import { consumeManifestation, consumeTieredHint, isManifestationActive } from "../progression/reactions.js";
import { forkBranch, replaySeed, runScenario, stepScenario } from "../simulation/engine.js";
import { ensureSimulationState, serializeSimulationSnapshot } from "../simulation/serializer.js";
import { getServiceStatusTable, getServiceTrace, restartService } from "../systems/simulator.js";
import { listScenarioDefinitions } from "../simulation/scenarios.js";

function isValidTime(hours, minutes) {
  return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function normalizePath(cwd, rawPath = ".") {
  const source = rawPath.startsWith("/") ? rawPath : `${cwd === "/" ? "" : cwd}/${rawPath}`;
  const parts = source.split("/");
  const stack = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  return `/${stack.join("/")}`;
}

function actorLabel(actor) {
  return actor || "operator";
}

function canRunCommand(role, cmd) {
  if (role === "operator") return true;
  const observerAllowed = new Set(["help", "pwd", "history", "date", "ls", "cd", "cat", "clear", "whoami", "anomaly-hint", "ping", "ps", "service", "svc", "pkg", "appinfo", "net", "tail", "top-lite", "sim"]);
  return observerAllowed.has(cmd);
}

export function parseSimCommandArgs(args = []) {
  const subcommand = args[0] || "help";
  return {
    subcommand,
    scenarioId: args[1] || "",
    label: args.slice(1).join(" ").trim(),
    branchLabel: args[1] || "",
    seed: (() => {
      const seedArg = args.find((entry) => entry.startsWith("--seed="));
      return seedArg ? Number(seedArg.split("=")[1]) : null;
    })()
  };
}

export function canRunSimSubcommand(role, subcommand) {
  if (role === "operator") return true;
  const observerOnly = new Set(["metrics", "export", "branch"]);
  const operatorOnly = new Set(["start", "step", "fork"]);
  if (operatorOnly.has(subcommand)) return false;
  return observerOnly.has(subcommand) || subcommand === "help";
}

export function openTerminal({ makeWindow, fs, files, getDynamicFile, getDirectoryEntries, isContentVisible, state, saveState, completeObjective, notify }) {
  makeWindow("terminal", "Terminal", (content, win) => {
    const role = state.activeRole || "operator";
    content.classList.add("terminal");
    content.innerHTML = `<div class="terminal-output" id="termOut"></div><div class="terminal-input"><span>${role}@eidolon:$</span><input id="termInput" autocomplete="off" /></div>`;
    const out = content.querySelector("#termOut");
    const input = content.querySelector("#termInput");
    let cwd = "/home/operator";
    win?.setHealth?.("active");

    function maybeDistortLine(txt = "") {
      if (!isManifestationActive(state, "terminalAnomaly")) return txt;
      if (!consumeManifestation(state, "terminalAnomaly")) return txt;
      appendManifestationEvent(state, "terminalAnomaly", "single-line echo distortion emitted");
      const source = String(txt || "");
      if (!source.trim()) return "...";
      return source.replace(/[aeiou]/i, "_") + " [line-jitter]";
    }

    function print(txt = "") {
      out.textContent += `${maybeDistortLine(txt)}\n`;
      out.scrollTop = out.scrollHeight;
    }

    function addHistory(command, actor = state.playerId) {
      if (!Array.isArray(state.terminalHistory)) state.terminalHistory = [];
      state.terminalHistory.push({ command, actor: actorLabel(actor), timestamp: Date.now() });
    }

    function parseTerminalAction(cmdLine, actor = state.playerId) {
      const [cmd, ...args] = cmdLine.split(/\s+/);
      const timestamp = Date.now();
      if (cmd === "ping" && args[0] === "operator") {
        return { type: "CMD_OBSERVER_PING", actor, role, timestamp, commandLine: cmdLine };
      }
      if (cmd === "relay" && args[0] === "exec") {
        return { type: "CMD_EXEC_RELAY", actor, role, timestamp, commandLine: cmdLine, code: args[1] || "" };
      }
      if (cmd === "unlock" && args[0] === "archive") {
        return { type: "CMD_UNLOCK_ARCHIVE", actor, role, timestamp, commandLine: cmdLine };
      }
      if (cmd === "set-time") {
        if (!args[0]) return { parseError: "usage: set-time HH:MM" };
        const [h, m] = args[0].split(":").map(Number);
        if (!isValidTime(h, m)) return { parseError: "invalid time (use HH:MM 00-23:00-59)" };
        return { type: "CMD_SET_TIME", actor, role, timestamp, commandLine: cmdLine, hours: h, minutes: m };
      }
      if (cmd === "recover" && args[0] === "--manifest") {
        return { type: "CMD_RECOVER_MANIFEST", actor, role, timestamp, commandLine: cmdLine };
      }
      if (cmd === "strings") {
        const path = normalizePath(cwd, args[0]);
        return {
          type: "CMD_STRINGS",
          actor,
          role,
          timestamp,
          commandLine: cmdLine,
          path,
          decodedText: path === "/media/cam2_20030418.dat" ? getDynamicFile(path) : ""
        };
      }
      return null;
    }

    function printHistory() {
      const lines = state.terminalHistory.slice(-15).map((entry) => {
        if (typeof entry === "string") return `[operator] ${entry}`;
        return `[${actorLabel(entry.actor)}] ${entry.command}`;
      });
      print(lines.join("\n"));
    }


    function printProcessTable() {
      const services = [
        ["101", "archive-daemon", state.chapter >= 2 ? "degraded" : "active"],
        ["118", "rtc-sync", "active"],
        ["126", "relay-link", state.sessionMode === "coop" ? "active" : "idle"],
        ["155", "audit-indexer", state.chapter >= 3 ? "active" : "idle"]
      ];
      print(["PID   NAME             STATE", ...services.map((row) => `${row[0].padEnd(5)} ${row[1].padEnd(16)} ${row[2]}`)].join("\n"));
    }


    function printSimulationHelp() {
      const names = listScenarioDefinitions().map((entry) => entry.id).join(", ");
      print("sim commands:");
      print("  sim start <scenario> [--seed=N]");
      print("  sim step");
      print("  sim fork <label>");
      print("  sim branch <label>");
      print("  sim metrics");
      print("  sim export");
      print(`  scenarios: ${names}`);
    }

    function handleSimulationCommand(args) {
      const sim = ensureSimulationState(state);
      const parsed = parseSimCommandArgs(args);
      const sub = parsed.subcommand;

      if (!canRunSimSubcommand(role, sub) && ["start", "step", "fork"].includes(sub)) {
        print("sim: operator role required for mutating commands");
        return;
      }
      if (!canRunSimSubcommand(role, sub)) {
        print("sim: command not allowed for observer");
        return;
      }

      if (sub === "help") {
        printSimulationHelp();
        return;
      }

      if (sub === "start") {
        const scenarioId = parsed.scenarioId;
        if (!scenarioId) {
          print("sim start: missing scenario id");
          printSimulationHelp();
          return;
        }
        const seed = parsed.seed ?? Date.now();
        const result = runScenario(state, { scenarioId, seed });
        if (!result.ok) {
          print(`sim start failed: ${result.message}`);
          return;
        }
        print(`simulation started: ${result.runId} (${result.scenario.label})`);
        return;
      }

      if (sub === "step") {
        const result = stepScenario(state);
        if (!result.ok) {
          print(`sim step failed: ${result.message}`);
          return;
        }
        print(`sim event: ${result.event.eventType}`);
        print(`trust=${result.metrics.trustScore} conflict=${result.metrics.conflictScore} pressure=${result.metrics.chapterPressure}`);
        return;
      }

      if (sub === "fork") {
        const label = parsed.label;
        if (!label) {
          print("sim fork: missing label");
          return;
        }
        const result = forkBranch(state, label);
        if (!result.ok) {
          print(`sim fork failed: ${result.message}`);
          return;
        }
        print(`branch forked: ${result.branch.id}`);
        return;
      }

      if (sub === "branch") {
        const label = parsed.branchLabel;
        if (!label) {
          const branches = Object.keys(sim.branches);
          print(`active branch: ${sim.selectedBranch || "none"}`);
          print(`branches: ${branches.join(", ") || "none"}`);
          return;
        }
        if (!sim.branches[label]) {
          print(`sim branch: not found ${label}`);
          return;
        }
        sim.selectedBranch = label;
        print(`active branch set: ${label}`);
        return;
      }

      if (sub === "metrics") {
        if (!sim.activeRunId) {
          print("sim metrics: no active simulation");
          return;
        }
        const m = sim.derivedMetrics || {};
        print(`run=${sim.activeRunId} scenario=${sim.scenarioId || "unknown"} branch=${sim.selectedBranch || "none"}`);
        print(`events=${m.eventCount || 0} trust=${m.trustScore || 0} conflict=${m.conflictScore || 0} pressure=${m.chapterPressure || 0}`);
        print(`success=${m.successRate || 0} ci=[${m.confidenceInterval?.lower ?? 0}, ${m.confidenceInterval?.upper ?? 0}]`);
        return;
      }

      if (sub === "export") {
        if (!sim.activeRunId) {
          print("sim export: no active simulation");
          return;
        }
        const result = replaySeed(state, sim.selectedBranch || "main");
        if (!result.ok) {
          print(`sim export failed: ${result.message}`);
          return;
        }
        const snapshot = serializeSimulationSnapshot(state);
        print("simulation exported to snapshot");
        print(snapshot.slice(0, 240));
        return;
      }

      if (sub === "clear") {
        if (role !== "operator") {
          print("sim clear: operator role required");
          return;
        }
        clearSimulation(state);
        print("simulation state cleared");
        return;
      }

      print(`sim: unknown subcommand ${sub}`);
      printSimulationHelp();
    }

    function serviceStatus(name = "") {
      const rows = getServiceStatusTable(state);
      if (!name) {
        const lines = rows.map((row) => `${row.name}: status=${row.status}; health=${row.health.toFixed(2)}; drift=${row.drift.toFixed(2)}; anomalies=${row.anomaly ? "yes" : "no"}; restarts=${row.restartCount}`);
        print(lines.join("\n"));
        return;
      }
      const row = rows.find((entry) => entry.name === name);
      if (!row) {
        print("service: unknown unit");
        return;
      }
      print(`${row.name}: status=${row.status}; health=${row.health.toFixed(2)}; drift=${row.drift.toFixed(2)}; deps=${row.dependencies.join(",") || "none"}`);
    }



    function reportGuidanceHint() {
      const hint = consumeTieredHint(state);
      if (hint) print(`[hint] ${hint}`);
    }

    function handle(cmdLine) {
      let commandSucceeded = true;
      if (!cmdLine) return;
      const [cmd, ...args] = cmdLine.split(/\s+/);
      const action = parseTerminalAction(cmdLine);
      const isActionCommand = Boolean(action?.type);

      if (!canRunCommand(role, cmd) && !isActionCommand) {
        print("permission denied for current role");
        win?.setHealth?.("fault");
        commandSucceeded = false;
        recordCommandTelemetry(state, { success: false });
        reportGuidanceHint();
        saveState();
        return;
      }

      if (!isActionCommand || state.sessionMode === "solo") {
        addHistory(cmdLine);
      }

      if (cmd === "help") {
        print(files["/system/help/shell_help.txt"]);
        completeObjective({ type: "objective.complete", objectiveId: "onboarding_run_help" });
      }
      else if (cmd === "pwd") print(cwd);
      else if (cmd === "history") printHistory();
      else if (cmd === "anomaly-hint") {
        if (role !== "observer") { print("anomaly-hint: restricted to observer"); commandSucceeded = false; }
        else print(state.relaySignal?.code ? `transient relay code: ${state.relaySignal.code}` : "monitor incident log for transient code flashes");
      } else if (cmd === "date") print(new Date(Date.now() + state.driftMinutes * 60_000).toString());
      else if (cmd === "ls") {
        const p = normalizePath(cwd, args[0]);
        const entries = getDirectoryEntries(p, state);
        if (!fs[p]) { print("ls: path not found"); win?.setHealth?.("stale"); commandSucceeded = false; }
        else { print(entries.filter((x) => state.unlocked.archive || !x.startsWith(".")).join("  ")); win?.setHealth?.("active"); }
      } else if (cmd === "cd") {
        const p = normalizePath(cwd, args[0]);
        if (fs[p]) cwd = p;
        else { print("cd: no such directory"); win?.setHealth?.("stale"); commandSucceeded = false; }
      } else if (cmd === "cat") {
        const p = normalizePath(cwd, args[0]);
        if (!isContentVisible(p, state)) { print("cat: file not found"); commandSucceeded = false; }
        else if (p === "/logs/audit_redacted.log" && !state.unlocked.redactedLog && role !== "observer") { print("cat: permission denied"); commandSucceeded = false; }
        else {
          print(getDynamicFile(p) || "cat: file not found");
          incrementFileView(state, p);
          completeObjective({ type: "objective.complete", objectiveId: "onboarding_read_file" });
          if (p === "/logs/audit_redacted.log" && (state.unlocked.redactedLog || role === "observer")) completeObjective({ type: "objective.complete", objectiveId: "access_redacted_audit" });
          if (role === "observer" && p === "/logs/incident.log") completeObjective({ type: "objective.complete", objectiveId: "observer_anomaly_trace" });
        }
      } else if (cmd === "clear") out.textContent = "";
      else if (action?.parseError) {
        print(action.parseError);
        commandSucceeded = false;
      } else if (isActionCommand) {
        if (role !== "operator" && action.type !== "CMD_OBSERVER_PING") {
          print("command restricted to operator role");
          commandSucceeded = false;
        } else {
          const result = completeObjective(action);
          if (result?.accepted === false && state.sessionMode === "coop") {
            print("queued for server confirmation...");
          }
          for (const line of result?.terminalLines || []) print(line);
          if ((result?.terminalLines || []).some((line) => /denied|invalid|expired|not found|required context missing|no active signal/i.test(String(line)))) commandSucceeded = false;
          if (["CMD_UNLOCK_ARCHIVE", "CMD_SET_TIME", "CMD_RECOVER_MANIFEST", "CMD_STRINGS", "CMD_EXEC_RELAY", "CMD_OBSERVER_PING"].includes(action.type)) {
            completeObjective({ type: "objective.complete", objectiveId: "onboarding_progression_command" });
          }
        }
      } else if (cmd === "ps" || cmd === "top-lite") {
        printProcessTable();
      } else if ((cmd === "service" || cmd === "svc") && args[0] === "status") {
        serviceStatus(args[1]);
      } else if ((cmd === "service" || cmd === "svc") && args[0] === "restart") {
        if (role !== "operator") { print("service restart: restricted to operator"); commandSucceeded = false; }
        else {
          const result = restartService(state, args[1] || "", "terminal");
          if (!result.ok) { print(result.message); commandSucceeded = false; }
          else print(`service ${args[1]}: restart completed`);
        }
      } else if ((cmd === "service" || cmd === "svc") && args[0] === "trace") {
        const trace = getServiceTrace(state, args[1] || "");
        if (!trace.ok) { print(trace.message); commandSucceeded = false; }
        else print(trace.lines.join("\n"));
      } else if (cmd === "pkg" && args[0] === "list") {
        print(getDynamicFile("/var/lib/pkg/status") || "pkg database unavailable");
      } else if (cmd === "pkg" && args[0] === "history") {
        print(getDynamicFile("/var/lib/pkg/history.log") || "pkg history unavailable");
      } else if (cmd === "appinfo") {
        const table = {
          "legacy-shell": "legacy-shell 1.4.2 // terminal environment",
          "signal-tools": "signal-tools 0.9.1 // media diagnostics",
          "calendar-lite": "calendar-lite 2.0.0 // removed"
        };
        print(table[args[0]] || "appinfo: package not found");
      } else if (cmd === "net" && args[0] === "status") {
        print("link: up\nlease: 10.0.4.23\nknown-ssid: Eidolon-Lab");
      } else if (cmd === "net" && args[0] === "history") {
        print(getDynamicFile("/etc/network/lease.history") || "network history unavailable");
      } else if (cmd === "tail") {
        const p = normalizePath(cwd, args[0]);
        const body = getDynamicFile(p);
        if (!body) { print("tail: file not found"); commandSucceeded = false; }
        else print(String(body).split("\n").slice(-8).join("\n"));
      } else if (cmd === "sim") {
        handleSimulationCommand(args);
      } else if (cmd === "whoami") print(role);
      else if (cmd === "reset-session") {
        clearState();
        notify?.("Session state cleared. Reloading...", { actor: actorLabel(state.playerId) });
        setTimeout(() => window.location.reload(), 250);
      } else { print("command not found"); win?.setHealth?.("fault"); commandSucceeded = false; }

      if (cmdLine.includes("shutdown") || cmdLine.includes("exit")) {
        print("session cannot be terminated while continuity is pending");
      }
      recordCommandTelemetry(state, { success: commandSucceeded });
      reportGuidanceHint();
      saveState();
    }

    print(`Eidolon shell 3.1.4 // ${role} channel`);
    if (role === "observer") print("Observer tools active: anomaly-hint, ping operator");
    print("Type 'help'.");

    input.onkeydown = (e) => {
      if (e.key !== "Enter") return;
      const cmd = input.value.trim();
      input.value = "";
      print(`> ${cmd}`);
      handle(cmd);
    };
  });
}
