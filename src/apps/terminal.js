import { clearState, incrementFileView } from "../state.js";

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

export function openTerminal({ makeWindow, fs, files, getDynamicFile, getDirectoryEntries, isContentVisible, state, saveState, completeObjective, notify }) {
  makeWindow("terminal", "Terminal", (content) => {
    content.classList.add("terminal");
    content.innerHTML = `<div class="terminal-output" id="termOut"></div><div class="terminal-input"><span>operator@eidolon:$</span><input id="termInput" autocomplete="off" /></div>`;
    const out = content.querySelector("#termOut");
    const input = content.querySelector("#termInput");
    let cwd = "/home/operator";

    function print(txt = "") {
      out.textContent += `${txt}\n`;
      out.scrollTop = out.scrollHeight;
    }

    function addHistory(command, actor = state.playerId) {
      if (!Array.isArray(state.terminalHistory)) state.terminalHistory = [];
      state.terminalHistory.push({ command, actor: actorLabel(actor), timestamp: Date.now() });
    }

    function parseTerminalAction(cmdLine, actor = state.playerId) {
      const [cmd, ...args] = cmdLine.split(/\s+/);
      const timestamp = Date.now();
      if (cmd === "unlock" && args[0] === "archive") {
        return { type: "CMD_UNLOCK_ARCHIVE", actor, timestamp, commandLine: cmdLine };
      }
      if (cmd === "set-time") {
        if (!args[0]) return { parseError: "usage: set-time HH:MM" };
        const [h, m] = args[0].split(":").map(Number);
        if (!isValidTime(h, m)) return { parseError: "invalid time (use HH:MM 00-23:00-59)" };
        return { type: "CMD_SET_TIME", actor, timestamp, commandLine: cmdLine, hours: h, minutes: m };
      }
      if (cmd === "recover" && args[0] === "--manifest") {
        return { type: "CMD_RECOVER_MANIFEST", actor, timestamp, commandLine: cmdLine };
      }
      if (cmd === "strings") {
        const path = normalizePath(cwd, args[0]);
        return {
          type: "CMD_STRINGS",
          actor,
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

    function handle(cmdLine) {
      if (!cmdLine) return;
      const [cmd, ...args] = cmdLine.split(/\s+/);
      const action = parseTerminalAction(cmdLine);
      const isActionCommand = Boolean(action?.type);

      if (!isActionCommand || state.sessionMode === "solo") {
        addHistory(cmdLine);
      }

      if (cmd === "help") print(files["/system/help/shell_help.txt"]);
      else if (cmd === "pwd") print(cwd);
      else if (cmd === "history") printHistory();
      else if (cmd === "date") print(new Date(Date.now() + state.driftMinutes * 60_000).toString());
      else if (cmd === "ls") {
        const p = normalizePath(cwd, args[0]);
        const entries = getDirectoryEntries(p, state);
        if (!fs[p]) print("ls: path not found");
        else print(entries.filter((x) => state.unlocked.archive || !x.startsWith(".")).join("  "));
      } else if (cmd === "cd") {
        const p = normalizePath(cwd, args[0]);
        if (fs[p]) cwd = p;
        else print("cd: no such directory");
      } else if (cmd === "cat") {
        const p = normalizePath(cwd, args[0]);
        if (!isContentVisible(p, state)) print("cat: file not found");
        else if (p === "/logs/audit_redacted.log" && !state.unlocked.redactedLog) print("cat: permission denied");
        else {
          print(getDynamicFile(p) || "cat: file not found");
          incrementFileView(state, p);
          if (p === "/logs/audit_redacted.log" && state.unlocked.redactedLog) completeObjective({ type: "objective.complete", objectiveId: "access_redacted_audit" });
        }
      } else if (cmd === "clear") out.textContent = "";
      else if (action?.parseError) {
        print(action.parseError);
      } else if (isActionCommand) {
        const result = completeObjective(action);
        if (result?.accepted === false && state.sessionMode === "coop") {
          print("queued for server confirmation...");
        }
        for (const line of result?.terminalLines || []) print(line);
      } else if (cmd === "whoami") print(state.bootCount > 2 ? "operator?" : "operator");
      else if (cmd === "reset-session") {
        clearState();
        notify?.("Session state cleared. Reloading...", { actor: actorLabel(state.playerId) });
        setTimeout(() => window.location.reload(), 250);
      } else print("command not found");

      if (cmdLine.includes("shutdown") || cmdLine.includes("exit")) {
        print("session cannot be terminated while continuity is pending");
      }
      saveState();
    }

    print("Eidolon shell 3.1.4");
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
