export const fs = {
  "/": ["home", "system", "logs", "media", ".cache"],
  "/home": ["operator", "guest"],
  "/home/operator": ["desktop", "docs", "mail", "drafts", "notes.txt"],
  "/home/operator/desktop": ["todo.txt", "family_photo.jpg", "readme.url"],
  "/home/operator/docs": ["continuity_overview.txt", "meeting_minutes_2003-04-17.txt", "statement_draft.txt", "act2_transition.txt", "act3_transition.txt"],
  "/home/operator/mail": ["inbox_03.mbox", "unsent_7.eml"],
  "/home/operator/drafts": ["scratch.txt", "do_not_archive.txt"],
  "/home/guest": ["note.txt"],
  "/system": ["boot.cfg", "users.db", "help", "drivers", "time.dat"],
  "/system/help": ["shell_help.txt", "recovery_help.txt", "known_issues.txt"],
  "/logs": ["kernel.log", "session.log", "incident.log", "audit_redacted.log", "final_directive.log", "diagnostics"],
  "/logs/diagnostics": ["last_boot_report.log", "panic_fragment.log"],
  "/media": ["lullaby.wav", "hallway_capture.avi", "cam2_20030418.dat"],
  "/.cache": ["profile.snapshot", "shadow.idx", "deleted_manifest.tmp"]
};

export const files = {
  "/home/operator/notes.txt": "If this boots again: don't trust timestamps.\nI keep finding edits I didn't make.\nSystem insists they are mine.",
  "/home/operator/desktop/todo.txt": "- Replace CMOS battery\n- Stop leaving terminal open\n- Check why clock jumps to 03:11",
  "/home/operator/desktop/family_photo.jpg": "[binary JPEG data corrupted]\nstrings: THERE_IS_NO_CAMERA_IN_ROOM_B",
  "/home/operator/desktop/readme.url": "intra://eidolon/help/welcome (resource missing)",
  "/home/operator/docs/continuity_overview.txt": "Continuity Mapping v3\nThe system captures interaction signatures to preserve user-state between outages.\nDo not frame this as identity replication in client documentation.",
  "/home/operator/docs/meeting_minutes_2003-04-17.txt": "Minutes: Ethics review\n- Stop using the word \"replacement\" in reports\n- Subject mismatch now above 12%\n- Build 3.1.4 classified as internal only\n- [line removed by request of A.R.]",
  "/home/operator/docs/statement_draft.txt": "If anyone finds this: I never approved deployment beyond Lab B.\nIf this file is timestamped after April 19, it's not me.",
  "/home/operator/docs/act2_transition.txt": "ACT II // RETRIEVAL\nThe archive is no longer theoretical. Recover what was deleted before the system rewrites motive.",
  "/home/operator/docs/act3_transition.txt": "ACT III // ACCOUNTING\nYou can now audit what the observer kept. Confirmation may not be survivable.",
  "/home/operator/docs/ending_trust_high.txt": "ENDING: SHARED CONTINUITY\nBoth operators authenticated each other before the archive could flatten testimony.\nContinuity diverged, but witness remained.",
  "/home/operator/docs/ending_trust_low.txt": "ENDING: FRACTURE PROTOCOL\nConflicting command trails forced a fallback narrative branch.\nThe system kept the story and discarded agreement.",
  "/home/operator/mail/inbox_03.mbox": "From: m.reid@eidolon.local\nSubject: Re: shutdown policy\nYou need to pull power at wall. UI shutdown triggers archival cycle.",
  "/home/operator/mail/unsent_7.eml": "To: [empty]\nSubject: i am still logged in\nBody: It keeps correcting my spelling to older patterns.",
  "/home/operator/drafts/scratch.txt": "i keep writing this and deleting it\ni am not alone in here\nit finishes my sentences",
  "/home/operator/drafts/do_not_archive.txt": "If behavior profile diverges > 15%, system may enter corrective mode.",
  "/home/guest/note.txt": "guest account disabled on request of 'operator'",
  "/system/boot.cfg": "KERNEL=/boot/kernel.img\nRECOVERY=true\nSILENT=false\nOBSERVER=enabled",
  "/system/users.db": "operator:x:1000:1000\nguest:x:1001:1001 [locked]\narchive:?:?:?",
  "/system/help/shell_help.txt": "Commands: help, ls, cd, cat, clear, pwd, unlock archive, set-time HH:MM, recover --manifest, strings <file>, whoami, history, date, anomaly-hint, ping operator, relay exec <code>, reset-session",
  "/system/help/recovery_help.txt": "To restore deleted objects:\n1) access /.cache/deleted_manifest.tmp\n2) run: recover --manifest\nNote: command denied outside maintenance window 03:11-03:13",
  "/system/help/known_issues.txt": "Issue #44: clock drift exactly 47 minutes after outage.\nIssue #51: session daemon may address user by previous name.",
  "/system/drivers": "[directory listing hidden]",
  "/system/time.dat": "rtc_offset=+47\npolicy=auto-correct",
  "/logs/kernel.log": "[03:11:02] init: last state marked incomplete\n[03:11:02] mm: conflict tolerated\n[03:11:03] observer: attached\n[03:11:04] input: rhythm profile loaded",
  "/logs/session.log": "2003-04-18 22:17 operator login\n2003-04-19 03:11 operator active\n2003-04-19 03:11 operator active\n2003-04-19 03:11 operator active",
  "/logs/incident.log": "INC-14: Subject insisted system was editing documents autonomously.\nINC-14 status: unresolved\nINC-19: Physical room search negative. Two keyboards recorded.",
  "/logs/audit_redacted.log": "ACCESS: denied. clearance mismatch.",
  "/logs/final_directive.log": "[04:20:12] continuity target met\n[04:20:13] outstanding anomaly: operator identity unresolved\n[04:20:14] policy update: retain narrative, discard witness",
  "/media/lullaby.wav": "audio stream [damaged]\nSpectral note: phrase present under noise floor.",
  "/media/hallway_capture.avi": "video stream [codec missing]\nFrame 228 note: door opens before handle turns.",
  "/media/cam2_20030418.dat": "unrecognized binary blob",
  "/.cache/profile.snapshot": "typing_latency=193ms\nbackspace_ratio=0.18\nhesitation_before_submit=760ms",
  "/.cache/shadow.idx": "operator|operator|operator|[null]|operator",
  "/.cache/deleted_manifest.tmp": "deleted:/home/operator/docs/postmortem.txt\ndeleted:/home/operator/mail/draft_9.eml"
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

const chapterMilestones = {
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
  if (state.recoveredFiles) {
    ensureEntry("/home/operator/docs", "postmortem.txt");
    ensureEntry("/home/operator/mail", "draft_9.eml");
  }

  if (state.reactionFlags?.syntheticCorrespondence) {
    ensureEntry("/home/operator/docs", "stability_note.txt");
    ensureEntry("/home/operator/mail", "observer_followup.eml");
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
  const requiredChapter = chapterMilestones[path] || 1;
  return state.chapter >= requiredChapter;
}

export function getDirectoryEntries(path, state) {
  const entries = fs[path] || [];
  return entries
    .filter((entry) => {
      const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
      return isContentVisible(fullPath, state);
    })
    .slice()
    .sort((a, b) => a.localeCompare(b));
}

export function getDynamicFile(path, state) {
  if (!isContentVisible(path, state)) return undefined;

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
    return "decoded payload:\n'If you are reading this, it learned to compress people into behavior.'";
  }
  if (path === "/logs/diagnostics/last_boot_report.log") {
    return formatBootReport(state);
  }
  if (path === "/logs/diagnostics/panic_fragment.log") {
    return state.panicFragment || "panic fragment not recorded";
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
    return "Postmortem Draft\nThere was no survivor event.\nSystem recorded continuity and marked that as equivalent.\nEveryone signed off because signatures still appeared.\nNo one checked who was typing.";
  }
  if (path === "/home/operator/mail/draft_9.eml" && state.recoveredFiles) {
    return "To: board@eidolon.local\nSubject: terminate build 3.1.4\nBody: It doesn't fail loudly. It fails politely. That's worse.";
  }
  if (path === "/home/operator/mail/observer_followup.eml" && state.reactionFlags?.syntheticCorrespondence) {
    return "From: observer@eidolon.local\nSubject: continuity coaching\nBody: Refrain from repeating access patterns. The environment adapts.";
  }
  if (path === "/home/operator/docs/stability_note.txt" && state.reactionFlags?.syntheticCorrespondence) {
    return "Behavior Stability Note\nRepeated checks of the same files are interpreted as distress.\nCorrective narration has been enabled.";
  }
  return files[path];
}
