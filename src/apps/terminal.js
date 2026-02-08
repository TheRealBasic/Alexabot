import { clearState, incrementFileView, appendManifestationEvent } from "../state.js";
import { consumeManifestation, isManifestationActive } from "../progression/reactions.js";

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
  const observerAllowed = new Set(["help", "pwd", "history", "date", "ls", "cd", "cat", "clear", "whoami", "anomaly-hint", "ping", "ps", "service", "pkg", "appinfo", "net", "tail", "top-lite"]);
  return observerAllowed.has(cmd);
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

    function serviceStatus(name = "") {
      const map = {
        "archive-daemon": "state=degraded; queued repairs=2",
        "rtc-sync": "state=active; drift_monitor=enabled",
        "relay-link": "state=active; heartbeat=ok",
        "audit-indexer": "state=idle; backlog=3"
      };
      if (!name) {
        print(Object.entries(map).map(([k,v]) => `${k}: ${v}`).join("\n"));
        return;
      }
      print(map[name] ? `${name}: ${map[name]}` : "service: unknown unit");
    }

    function handle(cmdLine) {
      if (!cmdLine) return;
      const [cmd, ...args] = cmdLine.split(/\s+/);
      const action = parseTerminalAction(cmdLine);
      const isActionCommand = Boolean(action?.type);

      if (!canRunCommand(role, cmd) && !isActionCommand) {
        print("permission denied for current role");
        win?.setHealth?.("fault");
        return;
      }

      if (!isActionCommand || state.sessionMode === "solo") {
        addHistory(cmdLine);
      }

      if (cmd === "help") print(files["/system/help/shell_help.txt"]);
      else if (cmd === "pwd") print(cwd);
      else if (cmd === "history") printHistory();
      else if (cmd === "anomaly-hint") {
        if (role !== "observer") print("anomaly-hint: restricted to observer");
        else print(state.relaySignal?.code ? `transient relay code: ${state.relaySignal.code}` : "monitor incident log for transient code flashes");
      } else if (cmd === "date") print(new Date(Date.now() + state.driftMinutes * 60_000).toString());
      else if (cmd === "ls") {
        const p = normalizePath(cwd, args[0]);
        const entries = getDirectoryEntries(p, state);
        if (!fs[p]) { print("ls: path not found"); win?.setHealth?.("stale"); }
        else { print(entries.filter((x) => state.unlocked.archive || !x.startsWith(".")).join("  ")); win?.setHealth?.("active"); }
      } else if (cmd === "cd") {
        const p = normalizePath(cwd, args[0]);
        if (fs[p]) cwd = p;
        else { print("cd: no such directory"); win?.setHealth?.("stale"); }
      } else if (cmd === "cat") {
        const p = normalizePath(cwd, args[0]);
        if (!isContentVisible(p, state)) print("cat: file not found");
        else if (p === "/logs/audit_redacted.log" && !state.unlocked.redactedLog && role !== "observer") print("cat: permission denied");
        else {
          print(getDynamicFile(p) || "cat: file not found");
          incrementFileView(state, p);
          if (p === "/logs/audit_redacted.log" && (state.unlocked.redactedLog || role === "observer")) completeObjective({ type: "objective.complete", objectiveId: "access_redacted_audit" });
          if (role === "observer" && p === "/logs/incident.log") completeObjective({ type: "objective.complete", objectiveId: "observer_anomaly_trace" });
        }
      } else if (cmd === "clear") out.textContent = "";
      else if (action?.parseError) {
        print(action.parseError);
      } else if (isActionCommand) {
        if (role !== "operator" && action.type !== "CMD_OBSERVER_PING") {
          print("command restricted to operator role");
        } else {
          const result = completeObjective(action);
          if (result?.accepted === false && state.sessionMode === "coop") {
            print("queued for server confirmation...");
          }
          for (const line of result?.terminalLines || []) print(line);
        }
      } else if (cmd === "ps" || cmd === "top-lite") {
        printProcessTable();
      } else if (cmd === "service" && args[0] === "status") {
        serviceStatus(args[1]);
      } else if (cmd === "service" && args[0] === "restart") {
        if (role !== "operator") print("service restart: restricted to operator");
        else print(`service ${args[1] || "(missing)"}: restart queued`);
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
        if (!body) print("tail: file not found");
        else print(String(body).split("\n").slice(-8).join("\n"));
      } else if (cmd === "whoami") print(role);
      else if (cmd === "reset-session") {
        clearState();
        notify?.("Session state cleared. Reloading...", { actor: actorLabel(state.playerId) });
        setTimeout(() => window.location.reload(), 250);
      } else { print("command not found"); win?.setHealth?.("fault"); }

      if (cmdLine.includes("shutdown") || cmdLine.includes("exit")) {
        print("session cannot be terminated while continuity is pending");
      }
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
