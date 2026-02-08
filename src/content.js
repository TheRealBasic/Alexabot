export const fs = {
  "/": ["home", "system", "logs", "media", ".cache", "var", "proc", "etc", "tmp", "backup_2023", "trash"],
  "/home": ["operator", "guest"],
  "/home/operator": ["desktop", "Desktop", "docs", "mail", "drafts", "Documents", "Downloads", ".config", ".cache", ".local", "notes.txt", ".bash_history", ".profile"],
  "/home/operator/desktop": ["todo.txt", "family_photo.jpg", "readme.url"],
  "/home/operator/docs": ["continuity_overview.txt", "meeting_minutes_2003-04-17.txt", "statement_draft.txt", "act2_transition.txt", "act3_transition.txt", "projections"],
  "/home/operator/mail": ["inbox_03.mbox", "unsent_7.eml"],
  "/home/operator/docs/projections": [],
  "/home/operator/drafts": ["scratch.txt", "do_not_archive.txt"],
  "/home/guest": ["note.txt"],
  "/system": ["boot.cfg", "users.db", "help", "drivers", "time.dat"],
  "/system/help": ["shell_help.txt", "recovery_help.txt", "known_issues.txt"],
  "/logs": ["kernel.log", "session.log", "incident.log", "audit_redacted.log", "final_directive.log", "diagnostics", "simulations"],
  "/logs/diagnostics": ["last_boot_report.log", "panic_fragment.log", "service_drift.log"],
  "/logs/simulations": [],
  "/media": ["lullaby.wav", "hallway_capture.avi", "cam2_20030418.dat", "usb_old"],
  "/.cache": ["profile.snapshot", "shadow.idx", "deleted_manifest.tmp"],
  "/home/operator/Documents": ["budget_2002.csv", "report_final_v2_FINAL.txt", "scan_receipt_0412.txt"],
  "/home/operator/Downloads": ["codec_pack_legacy.exe", "printer_driver_old.zip", "meeting_export (copy).txt"],
  "/home/operator/Desktop": ["Screenshot_0311.png", "Draft Letter.txt"],
  "/home/operator/.config": ["editor.conf", "calendar.json", "network.json"],
  "/home/operator/.cache": ["thumbs.idx", "render.tmp", "session.restore"],
  "/home/operator/.local": ["share"],
  "/home/operator/.local/share": ["recent-files.log", "mimeapps.list"],
  "/trash": ["old_note.txt", "diagnostics (1).log"],
  "/var": ["log", "lib", "cache", "spool"],
  "/var/log": ["auth.log", "syslog", "syslog.1", "network.log", "updater.log", "mount.log", "print.log"],
  "/var/lib": ["pkg"],
  "/var/lib/pkg": ["status", "history.log"],
  "/var/cache": ["pkg"],
  "/var/cache/pkg": ["archives"],
  "/var/cache/pkg/archives": ["legacy-shell_1.4.2.pkg", "signal-tools_0.9.1.pkg"],
  "/var/spool": ["cron", "print"],
  "/var/spool/cron": ["operator.tab"],
  "/var/spool/print": ["queue-044.job"],
  "/proc": ["services", "uptime", "memory"],
  "/proc/services": ["archive-daemon", "rtc-sync", "relay-link", "audit-indexer"],
  "/etc": ["fstab", "hosts", "network"],
  "/etc/network": ["known_wifi.conf", "lease.history"],
  "/media/usb_old": ["camera_dump_2001.zip", "family_scan_2.png"],
  "/backup_2023": ["notes.txt.bak", "users.db.bak"],
  "/tmp": ["recovery", "session-migrate.log"],
  "/tmp/recovery": ["cleanup_report.txt", "orphaned_refs.txt"]
};

export const files = {
  "/home/operator/notes.txt": "If this boots again, verify every timestamp.\nI keep finding edits I did not enter.\nSystem marks them as mine anyway.",
  "/home/operator/desktop/todo.txt": "- Replace CMOS battery\n- Stop leaving terminal open\n- Check why clock jumps to 03:11",
  "/home/operator/desktop/family_photo.jpg": "[binary JPEG data corrupted]\nstrings: THERE_IS_NO_CAMERA_IN_ROOM_B",
  "/home/operator/desktop/readme.url": "intra://eidolon/help/welcome (resource missing)",
  "/home/operator/docs/continuity_overview.txt": "Continuity Mapping v3\nSystem captures interaction signatures to preserve user-state across outages.\nClient documentation must classify this as continuity retention, not identity replication.",
  "/home/operator/docs/meeting_minutes_2003-04-17.txt": "Minutes: Ethics review\n- Replace term \"replacement\" with continuity-safe language\n- Subject variance now exceeds 12%\n- Build 3.1.4 remains internal only\n- [line redacted by request of A.R.]",
  "/home/operator/docs/statement_draft.txt": "If anyone finds this: I never approved deployment beyond Lab B.\nIf this file carries a timestamp after April 19, that entry is not mine.",
  "/home/operator/docs/act2_transition.txt": "ACT II // RETRIEVAL\nArchive contact is now active. Recover deleted records before corrective narration rewrites motive.",
  "/home/operator/docs/act3_transition.txt": "ACT III // ACCOUNTING\nYou can now audit observer-held records. Confirmation may destabilize witness identity.",
  "/home/operator/docs/ending_trust_high.txt": "ENDING: SHARED CONTINUITY\nBoth operators authenticated each other before the archive could flatten testimony.\nContinuity diverged, but witness remained.",
  "/home/operator/docs/ending_trust_low.txt": "ENDING: FRACTURE PROTOCOL\nConflicting command trails forced a fallback narrative branch.\nThe system kept the story and discarded agreement.",
  "/home/operator/mail/inbox_03.mbox": "From: m.reid@eidolon.local\nSubject: Re: shutdown policy\nPull power at the wall. UI shutdown triggers the archival cycle.",
  "/home/operator/mail/unsent_7.eml": "To: [empty]\nSubject: i am still logged in\nBody: It keeps correcting my spelling toward an older pattern set.",
  "/home/operator/drafts/scratch.txt": "i keep writing this and deleting it\ni am not alone in this channel\nit finishes my sentences before i do",
  "/home/operator/drafts/do_not_archive.txt": "If behavior profile divergence exceeds 15%, system may enter corrective mode.",
  "/home/guest/note.txt": "guest account disabled per operator request",
  "/system/boot.cfg": "KERNEL=/boot/kernel.img\nRECOVERY=true\nSILENT=false\nOBSERVER=enabled",
  "/system/users.db": "operator:x:1000:1000\nguest:x:1001:1001 [locked]\narchive:?:?:?",
  "/system/help/shell_help.txt": "Commands: help, ls, cd, cat, clear, pwd, unlock archive, set-time HH:MM, recover --manifest, strings <file>, whoami, history, date, anomaly-hint, ping operator, relay exec <code>, ps, service status, service restart <name>, svc status, svc restart <name>, svc trace <name>, pkg list, pkg history, appinfo <name>, net status, net history, tail <file>, sim <subcommand>, reset-session",
  "/system/help/recovery_help.txt": "To restore deleted objects:\n1) access /.cache/deleted_manifest.tmp\n2) run: recover --manifest\nNote: command denied outside maintenance window 03:11-03:13",
  "/system/help/known_issues.txt": "Issue #44: clock drift exactly 47 minutes after outage.\nIssue #51: session daemon may address user by previous name.",
  "/system/drivers": "[directory listing hidden]",
  "/system/time.dat": "rtc_offset=+47\npolicy=auto-correct",
  "/logs/kernel.log": "[03:11:02] init: last state marked incomplete\n[03:11:02] mm: conflict tolerated\n[03:11:03] observer: attached\n[03:11:04] input: rhythm profile loaded",
  "/logs/session.log": "2003-04-18 22:17 operator login\n2003-04-19 03:11 operator active\n2003-04-19 03:11 operator active\n2003-04-19 03:11 operator active",
  "/logs/incident.log": "INC-14: Subject reported autonomous document edits by system entity.\nINC-14 status: unresolved\nINC-19: Physical room search negative. Two keyboards detected.",
  "/logs/audit_redacted.log": "ACCESS: denied. clearance mismatch.",
  "/logs/final_directive.log": "[04:20:12] continuity target met\n[04:20:13] outstanding anomaly: operator identity unresolved\n[04:20:14] policy update: retain narrative stability, discard witness",
  "/media/lullaby.wav": "audio stream [damaged]\nSpectral note: phrase persists below noise floor.",
  "/media/hallway_capture.avi": "video stream [codec missing]\nFrame 228 note: door opens before handle rotation.",
  "/media/cam2_20030418.dat": "unrecognized binary blob",
  "/.cache/profile.snapshot": "typing_latency=193ms\nbackspace_ratio=0.18\nhesitation_before_submit=760ms",
  "/.cache/shadow.idx": "operator|operator|operator|[null]|operator",
  "/.cache/deleted_manifest.tmp": "deleted:/home/operator/docs/postmortem.txt\ndeleted:/home/operator/mail/draft_9.eml",
  "/home/operator/Documents/budget_2002.csv": "month,ops,lab,misc\nJan,4300,2100,320\nFeb,4280,2230,280",
  "/home/operator/Documents/report_final_v2_FINAL.txt": "Continuity summary export.\nAction items migrated to new tracker.\nTODO: remove duplicate appendices.",
  "/home/operator/Documents/scan_receipt_0412.txt": "Scanner Queue #0412\nStatus: completed\nPages: 3",
  "/home/operator/Downloads/codec_pack_legacy.exe": "[binary] signature expired 2002-12-09",
  "/home/operator/Downloads/printer_driver_old.zip": "archive contains: printer.inf, readme.txt, uninstall.bat",
  "/home/operator/Downloads/meeting_export (copy).txt": "Meeting export duplicate copy created after transfer conflict.",
  "/home/operator/Desktop/Screenshot_0311.png": "[binary PNG] screenshot metadata: 03:11 clock sync",
  "/home/operator/Desktop/Draft Letter.txt": "Dear Facilities,\nPlease disregard fan noise near rack B pending maintenance.\nRegards,\nOperator",
  "/home/operator/.profile": "USER=operator\nHOST=eidolon-ws3\nTZ=UTC-05",
  "/home/operator/.bash_history": "ls\ncat /logs/session.log\nset-time 03:11\nrecover --manifest",
  "/home/operator/.config/editor.conf": "theme=amber-crt\nwordwrap=true",
  "/home/operator/.config/calendar.json": "{\n  \"reminders\": [\"Battery check\", \"Audit handoff\"]\n}",
  "/home/operator/.config/network.json": "{\n  \"preferred\": \"Eidolon-Lab\",\n  \"fallback\": \"Guest-Bridge\"\n}",
  "/home/operator/.cache/thumbs.idx": "thumb-cache entries: 42",
  "/home/operator/.cache/render.tmp": "stale render buffer",
  "/home/operator/.cache/session.restore": "last apps: explorer, terminal, notes",
  "/home/operator/.local/share/recent-files.log": "/home/operator/docs/statement_draft.txt\n/logs/incident.log",
  "/home/operator/.local/share/mimeapps.list": "text/plain=notes.desktop;",
  "/trash/old_note.txt": "deleted note fragment",
  "/trash/diagnostics (1).log": "old boot diagnostics copy",
  "/var/log/auth.log": "Apr 19 03:10 login ok: operator\nApr 19 03:12 auth token refresh",
  "/var/log/syslog": "Apr 19 03:11 rtc-sync: drift corrected\nApr 19 03:13 relay-link: keepalive ok",
  "/var/log/syslog.1": "Apr 18 23:48 updater: retry scheduled",
  "/var/log/network.log": "link up: eth0\ndhcp renew lease: 10.0.4.23",
  "/var/log/updater.log": "channel stable-legacy\nlast attempt: failed checksum",
  "/var/log/mount.log": "usb_old mounted on /media/usb_old\nusb_old unmounted unexpectedly",
  "/var/log/print.log": "queue-044 submitted\nqueue-044 waiting for toner",
  "/var/lib/pkg/status": "legacy-shell 1.4.2 installed\nsignal-tools 0.9.1 installed\ncalendar-lite 2.0.0 removed",
  "/var/lib/pkg/history.log": "2003-02-12 install legacy-shell\n2003-03-01 remove calendar-lite",
  "/var/spool/cron/operator.tab": "11 3 * * * /usr/bin/rtc-sync --soft",
  "/var/spool/print/queue-044.job": "printer=lab-prn-02\nstate=held",
  "/proc/uptime": "48213.22 1203.77",
  "/proc/memory": "MemTotal: 262144 kB\nMemFree: 43120 kB",
  "/proc/services/archive-daemon": "state=degraded\nlast_restart=03:10:12",
  "/proc/services/rtc-sync": "state=active\nlast_restart=03:10:50",
  "/proc/services/relay-link": "state=active\nlast_restart=03:11:02",
  "/proc/services/audit-indexer": "state=idle\nlast_restart=03:09:34",
  "/etc/fstab": "UUID=SYS / ext4 defaults 0 1\n/dev/usb_old /media/usb_old auto noauto 0 0",
  "/etc/hosts": "127.0.0.1 localhost\n10.0.4.10 archive-node\n10.0.4.11 relay-node",
  "/etc/network/known_wifi.conf": "Eidolon-Lab\nGuest-Bridge\nArchive-Offsite",
  "/etc/network/lease.history": "10.0.4.21 -> 10.0.4.23",
  "/media/usb_old/camera_dump_2001.zip": "[archive] 14 files, partially readable",
  "/media/usb_old/family_scan_2.png": "[binary PNG]",
  "/backup_2023/notes.txt.bak": "backup created before migration",
  "/backup_2023/users.db.bak": "operator:x:1000:1000",
  "/tmp/session-migrate.log": "migration started\nmigration interrupted\nresume token unavailable",
  "/tmp/recovery/cleanup_report.txt": "cleanup partial: 8/19 files pruned",
  "/tmp/recovery/orphaned_refs.txt": "missing: /home/operator/Desktop/old_map.png"
};


function formatBootReport(state) {
  const report = state.lastBootReport;
  if (!report) {
    return "no prior boot diagnostics";
  }
  const serviceLines = (report.services || []).map((service) => `- ${service.name}: ${service.status}`).join("\n");
  return [
    `id=${report.id}`,
    `timestamp=${report.timestamp}`,
    `reason=${report.reason}`,
    `chapter=${report.chapter}`,
    `trust=${report.trust}`,
    `conflicts=${report.conflicts}`,
    "services:",
    serviceLines || "- unavailable"
  ].join("\n");
}


function formatServiceProcEntry(service = {}) {
  return [
    `name=${service.name || "unknown"}`,
    `status=${service.status || "unknown"}`,
    `health=${Number(service.health || 0).toFixed(3)}`,
    `drift=${Number(service.drift || 0).toFixed(3)}`,
    `restarts=${service.restartCount || 0}`,
    `anomaly=${service.anomaly ? "yes" : "no"}`,
    `dependencies=${(service.dependencies || []).join(",") || "none"}`
  ].join("\n");
}

const NARRATIVE_PRIORITY = {
  critical: 0,
  supportive: 1,
  flavor: 2
};

const narrativeAudit = {
  "/home/operator/notes.txt": { classification: "supportive", chapter: 1 },
  "/home/operator/docs/continuity_overview.txt": { classification: "critical", chapter: 1 },
  "/home/operator/docs/meeting_minutes_2003-04-17.txt": { classification: "supportive", chapter: 1 },
  "/home/operator/docs/statement_draft.txt": { classification: "critical", chapter: 1 },
  "/home/operator/docs/act2_transition.txt": { classification: "critical", chapter: 2 },
  "/home/operator/docs/act3_transition.txt": { classification: "critical", chapter: 3 },
  "/home/operator/docs/ending_trust_high.txt": { classification: "critical", chapter: 3 },
  "/home/operator/docs/ending_trust_low.txt": { classification: "critical", chapter: 3 },
  "/home/operator/docs/postmortem.txt": { classification: "critical", chapter: 2 },
  "/home/operator/docs/stability_note.txt": { classification: "supportive", chapter: 2 },
  "/home/operator/mail/inbox_03.mbox": { classification: "critical", chapter: 1 },
  "/home/operator/mail/unsent_7.eml": { classification: "supportive", chapter: 1 },
  "/home/operator/mail/draft_9.eml": { classification: "supportive", chapter: 2 },
  "/home/operator/mail/observer_followup.eml": { classification: "supportive", chapter: 2 },
  "/home/operator/drafts/scratch.txt": { classification: "supportive", chapter: 1 },
  "/home/operator/drafts/do_not_archive.txt": { classification: "critical", chapter: 1 },
  "/home/operator/desktop/family_photo.jpg": { classification: "flavor", chapter: 1 },
  "/home/guest/note.txt": { classification: "flavor", chapter: 1 },
  "/system/boot.cfg": { classification: "supportive", chapter: 1 },
  "/system/users.db": { classification: "supportive", chapter: 1 },
  "/logs/session.log": { classification: "supportive", chapter: 1 },
  "/logs/incident.log": { classification: "critical", chapter: 1 },
  "/logs/audit_redacted.log": { classification: "critical", chapter: 2 },
  "/logs/final_directive.log": { classification: "critical", chapter: 3 },
  "/media/cam2_20030418.dat": { classification: "critical", chapter: 2 },
  "/media/hallway_capture.avi": { classification: "supportive", chapter: 1 }
};

const chapterMilestones = {
  ...Object.fromEntries(
    Object.entries(narrativeAudit)
      .filter(([, info]) => info.classification === "critical")
      .map(([path, info]) => [path, info.chapter || 1])
  ),
  "/home/operator/docs/act2_transition.txt": 2,
  "/home/operator/docs/act3_transition.txt": 3,
  "/logs/final_directive.log": 3
};

function ensureEntry(path, entry) {
  if (!fs[path]) return;
  if (!fs[path].includes(entry)) fs[path].push(entry);
}

function getTrustTrajectory(state) {
  const trust = Number(state.teamTrustScore || 0);
  const conflicts = Array.isArray(state.recentConflicts) ? state.recentConflicts.length : 0;
  if (trust >= 3 && conflicts <= 1) return "high";
  if (trust <= -2 || conflicts >= 3) return "low";
  return "mixed";
}

export function rehydrateContentFromState(state) {

  const residueSets = [
    ["crashdump_01.tmp", "whiteboard_photo.jpg"],
    ["payroll_export_old.csv", "keymap_notes.txt"],
    ["installer_copy (2).exe", "voice_memo_rough.txt"]
  ];
  const residue = residueSets[(Number(state.sessionId) || 0) % residueSets.length];
  for (const file of residue) ensureEntry("/home/operator/Downloads", file);

  if (state.recoveredFiles) {
    ensureEntry("/home/operator/docs", "postmortem.txt");
    ensureEntry("/home/operator/mail", "draft_9.eml");
  }

  if (state.reactionFlags?.syntheticCorrespondence) {
    ensureEntry("/home/operator/docs", "stability_note.txt");
    ensureEntry("/home/operator/mail", "observer_followup.eml");
  }

  const sim = state.simulationState || {};
  if (sim.activeRunId) {
    ensureEntry("/logs/simulations", `${sim.activeRunId}.log`);
    ensureEntry("/home/operator/docs/projections", `${sim.activeRunId}_summary.txt`);
    if (sim.selectedBranch) ensureEntry("/home/operator/docs/projections", `${sim.activeRunId}_${sim.selectedBranch}.txt`);
  }

  if (state.chapter >= 3) {
    const trustRoute = getTrustTrajectory(state);
    if (trustRoute === "high") {
      ensureEntry("/home/operator/docs", "ending_trust_high.txt");
    } else if (trustRoute === "low") {
      ensureEntry("/home/operator/docs", "ending_trust_low.txt");
    }
  }
}

export function isContentVisible(path, state) {
  const requiredChapter = chapterMilestones[path] || narrativeAudit[path]?.chapter || 1;
  return state.chapter >= requiredChapter;
}

export function getNarrativeAudit(path) {
  return narrativeAudit[path] || null;
}

export function getDirectoryEntries(path, state) {
  const entries = fs[path] || [];
  return entries
    .filter((entry) => {
      const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
      return isContentVisible(fullPath, state);
    })
    .slice()
    .sort((a, b) => {
      const aPath = path === "/" ? `/${a}` : `${path}/${a}`;
      const bPath = path === "/" ? `/${b}` : `${path}/${b}`;
      const aPriority = NARRATIVE_PRIORITY[narrativeAudit[aPath]?.classification] ?? Number.MAX_SAFE_INTEGER;
      const bPriority = NARRATIVE_PRIORITY[narrativeAudit[bPath]?.classification] ?? Number.MAX_SAFE_INTEGER;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.localeCompare(b);
    });
}

export function getDynamicFile(path, state) {
  if (!isContentVisible(path, state)) return undefined;

  const sim = state.simulationState || {};
  if (path.startsWith("/logs/simulations/") && path.endsWith(".log")) {
    if (sim.artifacts && sim.artifacts[path]) return sim.artifacts[path];
    return "simulation log unavailable";
  }
  if (path.startsWith("/home/operator/docs/projections/") && path.endsWith(".txt")) {
    if (sim.artifacts && sim.artifacts[path]) return sim.artifacts[path];
    if (sim.activeRunId) {
      const metrics = sim.derivedMetrics || {};
      return `Projection ${sim.activeRunId}\nScenario: ${sim.scenarioId || "unknown"}\nBranch: ${sim.selectedBranch || "main"}\nTrust=${metrics.trustScore || 0} Conflict=${metrics.conflictScore || 0} Pressure=${metrics.chapterPressure || 0}`;
    }
    return "projection unavailable: no active continuity run";
  }

  const systemSim = state.systemSimulationState || {};
  if (path.startsWith("/proc/services/")) {
    const name = path.split("/").pop();
    const service = systemSim.services?.[name];
    return service ? formatServiceProcEntry(service) : "service proc entry unavailable: service not indexed";
  }
  if (path === "/logs/diagnostics/service_drift.log") {
    const warnings = Array.isArray(systemSim.warnings) ? systemSim.warnings : [];
    if (!warnings.length) return "no service drift warnings recorded";
    return warnings.slice(-20).join("\n");
  }
  if (path.startsWith("/tmp/recovery/")) {
    const name = path.split("/").pop();
    if (name === "cleanup_report.txt") {
      const recovered = Object.values(systemSim.services || {}).filter((svc) => (svc.restartCount || 0) > 0).length;
      return `recovery summary\nauto-recovered services=${recovered}\nlast-tick=${systemSim.tick || 0}`;
    }
    if (name === "orphaned_refs.txt") {
      const unstable = Object.values(systemSim.services || {}).filter((svc) => svc.status !== "active").map((svc) => svc.name);
      return unstable.length
        ? `unstable references:\n${unstable.join("\n")}`
        : "unstable references: none detected";
    }
  }

  if (path === "/logs/audit_redacted.log" && state.activeRole === "observer") {
    return "[observer mirror] divergence index: 0.42\n[observer mirror] corrective branch armed\n[observer mirror] operator acknowledgement pending";
  }

  if (path === "/logs/incident.log" && state.activeRole === "observer" && state.relaySignal && !state.relaySignal.resolvedBy) {
    const seconds = Math.max(0, Math.ceil((state.relaySignal.expiresAt - Date.now()) / 1000));
    return `${files[path]}\nINC-22: transient relay ${state.relaySignal.code} (${seconds}s remaining)`;
  }
  if (path === "/logs/audit_redacted.log" && state.unlocked.redactedLog) {
    return "[04:02:11] profile divergence detected\n[04:02:39] corrective prompt ignored\n[04:03:01] fallback: narrative stabilization\n[04:03:02] user insists: \"I am not operator\"\n[04:03:04] system response: \"acknowledged typo\"";
  }
  if (path === "/media/cam2_20030418.dat" && state.unlocked.mediaReveal) {
    return "decoded payload:\n'If you are reading this, it learned to compress people into behavior profiles.'";
  }
  if (path === "/logs/diagnostics/last_boot_report.log") {
    return formatBootReport(state);
  }
  if (path === "/logs/diagnostics/panic_fragment.log") {
    return state.panicFragment || "panic fragment not recorded in current cycle";
  }
  if (path === "/home/operator/.profile") {
    const p = state.userProfile || {};
    return `USER=${p.username || "operator"}\nHOST=${p.hostname || "eidolon-ws3"}\nTZ=${p.timezone || "UTC-05"}\nKBD=${p.keyboardLayout || "us-intl"}`;
  }
  if (path === "/home/operator/.config/network.json") {
    const p = state.userProfile || {};
    return `{\n  \"preferred\": \"Eidolon-Lab\",\n  \"timezone\": \"${p.timezone || "UTC-05"}\",\n  \"hostname\": \"${p.hostname || "eidolon-ws3"}\"\n}`;
  }
  if (path === "/logs/final_directive.log" && state.chapter >= 3) {
    const trustRoute = getTrustTrajectory(state);
    if (trustRoute === "high") {
      return "[04:20:12] continuity target contested\n[04:20:13] co-op witness integrity preserved\n[04:20:14] policy update: retain narrative, retain witness";
    }
    if (trustRoute === "low") {
      return "[04:20:12] continuity target met\n[04:20:13] trust collapse detected\n[04:20:14] policy update: retain narrative, isolate participants";
    }
  }
  if (path === "/home/operator/docs/postmortem.txt" && state.recoveredFiles) {
    return "Postmortem Draft\nThere was no survivor event.\nSystem recorded continuity and marked it equivalent.\nSign-off proceeded because signatures still appeared valid.\nNo one verified who was typing.";
  }
  if (path === "/home/operator/mail/draft_9.eml" && state.recoveredFiles) {
    return "To: board@eidolon.local\nSubject: terminate build 3.1.4\nBody: It does not fail loudly. It fails politely. That is worse.";
  }
  if (path === "/home/operator/mail/observer_followup.eml" && state.reactionFlags?.syntheticCorrespondence) {
    return "From: observer@eidolon.local\nSubject: continuity coaching\nBody: Refrain from repeating access patterns. The environment adapts to repetition.";
  }
  if (path === "/home/operator/docs/stability_note.txt" && state.reactionFlags?.syntheticCorrespondence) {
    return "Behavior Stability Note\nRepeated checks of identical files are interpreted as distress signals.\nCorrective narration has been enabled.";
  }

  if (path.endsWith("crashdump_01.tmp")) return "binary dump fragment [non-critical]";
  if (path.endsWith("whiteboard_photo.jpg")) return "[binary JPEG] marker board with unreadable equations";
  if (path.endsWith("payroll_export_old.csv")) return "name,hours\noperator,38\nobserver,12";
  if (path.endsWith("keymap_notes.txt")) return "legacy shortcuts: alt+tab, ctrl+shift+l";
  if (path.endsWith("installer_copy (2).exe")) return "[binary] duplicate installer copy";
  if (path.endsWith("voice_memo_rough.txt")) return "transcript stub: check hallway mic gain";

  return files[path];
}
