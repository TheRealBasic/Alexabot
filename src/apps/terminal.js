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

    function applyTime(hours, minutes) {
      const now = new Date();
      const simulated = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      state.driftMinutes = Math.round((simulated - now) / 60000);
      if (hours === 3 && minutes === 11) {
        state.unlocked.redactedLog = true;
        completeObjective(state, "set_time_0311");
        print("maintenance window active");
      }
      print("clock adjusted");
    }

    function handle(cmdLine) {
      if (!cmdLine) return;
      const [cmd, ...args] = cmdLine.split(/\s+/);
      state.terminalHistory.push(cmdLine);

      if (cmd === "help") print(files["/system/help/shell_help.txt"]);
      else if (cmd === "pwd") print(cwd);
      else if (cmd === "history") print(state.terminalHistory.slice(-15).join("\n"));
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
          if (p === "/logs/audit_redacted.log" && state.unlocked.redactedLog) completeObjective(state, "access_redacted_audit");
        }
      } else if (cmd === "clear") out.textContent = "";
      else if (cmd === "unlock" && args[0] === "archive") {
        if ((state.viewed["/home/operator/docs/continuity_overview.txt"] || 0) > 0) {
          state.unlocked.archive = true;
          completeObjective(state, "unlock_archive");
          print("archive channel exposed");
        } else print("unlock: required context missing");
      } else if (cmd === "set-time") {
        if (!args[0]) print("usage: set-time HH:MM");
        else {
          const [h, m] = args[0].split(":").map(Number);
          if (!isValidTime(h, m)) print("invalid time (use HH:MM 00-23:00-59)");
          else applyTime(h, m);
        }
      } else if (cmd === "recover" && args[0] === "--manifest") {
        const clock = new Date(Date.now() + state.driftMinutes * 60000);
        if (clock.getHours() === 3 && clock.getMinutes() >= 11 && clock.getMinutes() <= 13) {
          state.recoveredFiles = true;
          completeObjective(state, "recover_manifest");
          if (!fs["/home/operator/docs"].includes("postmortem.txt")) fs["/home/operator/docs"].push("postmortem.txt");
          if (!fs["/home/operator/mail"].includes("draft_9.eml")) fs["/home/operator/mail"].push("draft_9.eml");
          print("2 files restored from deleted manifest.");
          notify?.("Manifest restored: 2 files recovered.");
        } else print("recover: denied outside maintenance window");
      } else if (cmd === "strings") {
        const p = normalizePath(cwd, args[0]);
        if (p === "/media/cam2_20030418.dat") {
          state.unlocked.mediaReveal = true;
          completeObjective(state, "decode_cam2");
          print("extracting printable strings...");
          print(getDynamicFile(p));
        } else print("no printable strings found");
      } else if (cmd === "whoami") print(state.bootCount > 2 ? "operator?" : "operator");
      else if (cmd === "reset-session") {
        clearState();
        notify?.("Session state cleared. Reloading...");
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
