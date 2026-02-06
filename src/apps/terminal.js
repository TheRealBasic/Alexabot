export function openTerminal({ makeWindow, fs, files, getDynamicFile, state, saveState }) {
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

    function resolve(path) {
      if (!path || path === ".") return cwd;
      if (path.startsWith("/")) return path;
      if (path === "..") return cwd.split("/").slice(0, -1).join("/") || "/";
      return (cwd === "/" ? "" : cwd) + "/" + path;
    }

    function handle(cmdLine) {
      if (!cmdLine) return;
      const [cmd, ...args] = cmdLine.split(/\s+/);
      state.terminalHistory.push(cmdLine);

      if (cmd === "help") print(files["/system/help/shell_help.txt"]);
      else if (cmd === "pwd") print(cwd);
      else if (cmd === "ls") {
        const p = resolve(args[0]);
        const entries = fs[p];
        if (!entries) print("ls: path not found");
        else print(entries.filter((x) => state.unlocked.archive || !x.startsWith(".")).join("  "));
      } else if (cmd === "cd") {
        const p = resolve(args[0]);
        if (fs[p]) cwd = p;
        else print("cd: no such directory");
      } else if (cmd === "cat") {
        const p = resolve(args[0]);
        if (p === "/logs/audit_redacted.log" && !state.unlocked.redactedLog) print("cat: permission denied");
        else print(getDynamicFile(p) || "cat: file not found");
      } else if (cmd === "clear") out.textContent = "";
      else if (cmd === "unlock" && args[0] === "archive") {
        if ((state.viewed["/home/operator/docs/continuity_overview.txt"] || 0) > 0) {
          state.unlocked.archive = true;
          print("archive channel exposed");
        } else print("unlock: required context missing");
      } else if (cmd === "set-time") {
        if (!args[0]) print("usage: set-time HH:MM");
        else {
          const [h, m] = args[0].split(":").map(Number);
          if (Number.isNaN(h) || Number.isNaN(m)) print("invalid time");
          else {
            const now = new Date();
            const simulated = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
            state.driftMinutes = Math.round((simulated - now) / 60000);
            if (h === 3 && m === 11) {
              state.unlocked.redactedLog = true;
              print("maintenance window active");
            }
            print("clock adjusted");
          }
        }
      } else if (cmd === "recover" && args[0] === "--manifest") {
        const clock = new Date(Date.now() + state.driftMinutes * 60000);
        if (clock.getHours() === 3 && clock.getMinutes() >= 11 && clock.getMinutes() <= 13) {
          state.recoveredFiles = true;
          if (!fs["/home/operator/docs"].includes("postmortem.txt")) fs["/home/operator/docs"].push("postmortem.txt");
          if (!fs["/home/operator/mail"].includes("draft_9.eml")) fs["/home/operator/mail"].push("draft_9.eml");
          print("2 files restored from deleted manifest.");
        } else print("recover: denied outside maintenance window");
      } else if (cmd === "strings") {
        const p = resolve(args[0]);
        if (p === "/media/cam2_20030418.dat") {
          state.unlocked.mediaReveal = true;
          print("extracting printable strings...");
          print(getDynamicFile(p));
        } else print("no printable strings found");
      } else if (cmd === "whoami") print(state.bootCount > 2 ? "operator?" : "operator");
      else print("command not found");

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
