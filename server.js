/*
Iconic Hair Care — Team Inbox v10 fixed patch
Target: current repo server.js
Scope: Team Inbox UI only

This fixed patch does not depend on the next function name after buildStatusOptions.
It finds and replaces functions by matching their braces, so it works even if the
surrounding Team Inbox code changed slightly.

Fixes:
- Clearer browser tab favicon/logo.
- Bot Reply stays visible and working.
- Raw Bot and Follow-up Test are hidden from the filter list.
- One clean Follow-up filter searches the full conversation.
- Talk to Team searches the full conversation, including body, status,
  messageType, sender, customerName, branch, phoneNumberId, and future
  button/interactive fields.
- Dubai counter stays visible beside Abu Dhabi counter.

Does NOT change Smart Concierge replies, Call Now templates, Location action
buttons, Google Sheets logging, reminders, or branch routing.
*/

const fs = require("fs");
const path = require("path");

const serverPath = path.join(process.cwd(), "server.js");

if (!fs.existsSync(serverPath)) {
  console.error("ERROR: server.js not found. Run this script from the repo root folder.");
  process.exit(1);
}

let code = fs.readFileSync(serverPath, "utf8");
const original = code;
const applied = [];
const warnings = [];

function logOK(label) {
  applied.push(label);
  console.log("OK:", label);
}

function logWarn(label) {
  warnings.push(label);
  console.log("WARN:", label);
}

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function findFunctionRange(functionName) {
  const pattern = new RegExp("function\\s+" + functionName + "\\s*\\(");
  const match = pattern.exec(code);
  if (!match) return null;

  const start = match.index;
  const openBrace = code.indexOf("{", start);
  if (openBrace === -1) return null;

  const closeBrace = findMatchingBrace(code, openBrace);
  if (closeBrace === -1) return null;

  let end = closeBrace + 1;
  while (end < code.length && /[ \t\r\n]/.test(code[end])) end += 1;
  return { start, end };
}

function replaceFunction(functionName, replacement) {
  const range = findFunctionRange(functionName);
  if (!range) return false;
  code = code.slice(0, range.start) + replacement.trim() + "\n\n" + code.slice(range.end);
  logOK("replace " + functionName);
  return true;
}

function insertBefore(anchor, block, label) {
  const index = code.indexOf(anchor);
  if (index === -1) return false;
  code = code.slice(0, index) + block.trim() + "\n\n" + code.slice(index);
  logOK(label);
  return true;
}

// 1) Version label only. Safe if not present.
if (/const BOT_VERSION = "[^"]+";/.test(code)) {
  code = code.replace(/const BOT_VERSION = "[^"]+";/, 'const BOT_VERSION = "iconic-team-inbox-v10-logo-talk-filter-fix";');
  logOK("version label");
} else {
  logWarn("BOT_VERSION not found; skipped version label only");
}

// 2) Add a sharper favicon data URI for the browser tab.
const faviconBlock = `
const INBOX_TAB_LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="14" fill="%2378b83e"/>' +
  '<circle cx="32" cy="32" r="24" fill="%23111827" opacity=".16"/>' +
  '<text x="32" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="900" fill="white">IC</text>' +
  '</svg>';
const INBOX_FAVICON_DATA_URI = "data:image/svg+xml," + INBOX_TAB_LOGO_SVG;
`;

if (!code.includes("INBOX_FAVICON_DATA_URI")) {
  const insertionPatterns = [
    /const FOLLOW_UP_SCAN_LIMIT = Number\(process\.env\.FOLLOW_UP_SCAN_LIMIT \|\| "5000"\);/,
    /const MAIN_MENU_HEADER_IMAGE_URL[\s\S]*?;/,
    /const INBOX_PASS = process\.env\.INBOX_PASS \|\| "123456";/
  ];

  let insertedFavicon = false;
  for (const pattern of insertionPatterns) {
    if (pattern.test(code)) {
      code = code.replace(pattern, (match) => match + "\n" + faviconBlock);
      insertedFavicon = true;
      logOK("add clearer favicon constants");
      break;
    }
  }

  if (!insertedFavicon) {
    logWarn("could not insert favicon constants; filters will still be patched");
  }
}

// 3) Replace favicon links inside /inbox HTML template.
code = code.replace(
  /<link\s+rel="icon"[^>]*>/g,
  '<link rel="icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />'
);
code = code.replace(
  /<link\s+rel="shortcut icon"[^>]*>/g,
  '<link rel="shortcut icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />'
);

if (code.includes("INBOX_FAVICON_DATA_URI") && !code.includes('rel="icon" href="${INBOX_FAVICON_DATA_URI}"')) {
  code = code.replace(
    /<title>Iconic Hair Care[^<]*Team Inbox<\/title>/,
    (match) => match + '\n  <link rel="icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />\n  <link rel="shortcut icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />'
  );
}
logOK("favicon html link check");

// 4) Status sender helper: keep Bot Reply mapped to bot.
const statusToSenderFilterV10 = `
function statusToSenderFilter(status) {
  if (status === "Customer Reply") return "customer";
  if (status === "Human Reply") return "staff";
  if (status === "Bot Reply") return "bot";
  return "";
}
`;

if (!replaceFunction("statusToSenderFilter", statusToSenderFilterV10)) {
  insertBefore("function senderToReplyStatus", statusToSenderFilterV10, "insert statusToSenderFilter");
}

// 5) Build clean filter dropdown.
const buildStatusOptionsV10 = `
function buildStatusOptions() {
  const current = statusFilter.value;

  // Clean operational filters only.
  // Keep Bot Reply because it works and is useful.
  // Hide raw/test statuses like "Bot" and "Follow-up Test".
  const fixedStatuses = [
    "Customer Reply",
    "Human Reply",
    "Bot Reply",
    "Talk to Team",
    "Consultation Request",
    "Location Requested",
    "Call Requested",
    "Follow-up",
    "Need Follow-up",
    "Closed"
  ];

  const hiddenStatuses = new Set([
    "Bot",
    "Follow-up Test",
    "Follow-up Sent",
    "Service Follow-up Reminder",
    "Service Follow-up Template Test",
    "Call Now Test",
    "Call Now Template Test",
    "Location Test",
    "Location CTA Test"
  ]);

  const dynamicStatuses = Array.from(new Set((allMessages || []).map(function(m) {
    return (m.status || "").toString().trim();
  }).filter(function(status) {
    return status && !hiddenStatuses.has(status);
  })));

  const statuses = Array.from(new Set(fixedStatuses.concat(dynamicStatuses)));

  statusFilter.innerHTML = '<option value="">All conversations</option>' + statuses.map(function(s) {
    return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
  }).join("");

  if (statuses.includes(current)) statusFilter.value = current;
}
`;

if (!replaceFunction("buildStatusOptions", buildStatusOptionsV10)) {
  const inserted = insertBefore("function normalizedMessageBranch", buildStatusOptionsV10, "insert buildStatusOptions before normalizedMessageBranch") ||
    insertBefore("function updateStats", buildStatusOptionsV10, "insert buildStatusOptions before updateStats");
  if (!inserted) {
    console.error("ERROR: Could not find or insert buildStatusOptions.");
    process.exit(1);
  }
}

// 6) Make sure normalizedMessageBranch exists for counters.
const normalizedMessageBranchV10 = `
function normalizedMessageBranch(message) {
  const branch = (message && message.branch ? message.branch : "").toString().trim();
  if (branch === "Abu Dhabi") return "Abu Dhabi";
  return "Dubai";
}
`;

if (!code.includes("function normalizedMessageBranch")) {
  insertBefore("function updateStats", normalizedMessageBranchV10, "insert normalizedMessageBranch");
}

// 7) Keep Dubai counter beside Abu Dhabi counter.
const updateStatsV10 = `
function updateStats() {
  const conversations = buildConversations();
  document.getElementById("statTotal").textContent = allMessages.length;
  document.getElementById("statCustomers").textContent = conversations.length;
  document.getElementById("statUnread").textContent = conversations.filter(isUnreadConversation).length;

  const statDubai = document.getElementById("statDubai");
  const statAbu = document.getElementById("statAbu");

  if (statDubai) {
    statDubai.textContent = allMessages.filter(function(m) {
      return normalizedMessageBranch(m) === "Dubai";
    }).length;
  }

  if (statAbu) {
    statAbu.textContent = allMessages.filter(function(m) {
      return normalizedMessageBranch(m) === "Abu Dhabi";
    }).length;
  }
}
`;

if (!replaceFunction("updateStats", updateStatsV10)) {
  insertBefore("function conversationHasStatus", updateStatsV10, "insert updateStats") ||
    insertBefore("function filteredConversations", updateStatsV10, "insert updateStats before filteredConversations");
}

// 8) Full conversation status matcher.
const conversationHasStatusV10 = `
function conversationHasStatus(conversation, wantedStatus) {
  const wanted = (wantedStatus || "").toLowerCase().trim();
  if (!wanted) return true;

  return (conversation.messages || []).some(function(message) {
    const fields = [
      message.status,
      message.messageType,
      message.body,
      message.sender,
      message.phone,
      message.customerName,
      message.branch,
      message.phoneNumberId,

      // Future-safe support if button/interactive fields are added later.
      message.buttonText,
      message.buttonTitle,
      message.buttonPayload,
      message.buttonId,
      message.payload,
      message.interactiveTitle,
      message.interactiveId,
      message.interactivePayload
    ];

    const combined = fields.map(function(value) {
      return (value || "").toString().toLowerCase().trim();
    }).join(" ");

    const status = (message.status || "").toString().toLowerCase().trim();
    const messageType = (message.messageType || "").toString().toLowerCase().trim();

    if (status === wanted || messageType === wanted || combined.includes(wanted)) {
      return true;
    }

    // Talk to Team must search the full conversation, including button replies and bot logs.
    if (wanted === "talk to team") {
      return combined.includes("talk to team") ||
        combined.includes("team handoff") ||
        combined.includes("chat with team") ||
        combined.includes("speak with our team") ||
        combined.includes("الفريق") ||
        combined.includes("فريق") ||
        combined.includes("موظف") ||
        combined.includes("support") ||
        combined.includes("human");
    }

    // One clean Follow-up filter for all follow-up activity.
    // Test/status noise is hidden from the dropdown but still searchable here.
    if (wanted === "follow-up") {
      return combined.includes("follow-up") ||
        combined.includes("follow up") ||
        combined.includes("followup") ||
        combined.includes("service follow-up") ||
        combined.includes("service_review_follow_up") ||
        combined.includes("review_follow_up") ||
        combined.includes("follow-up sent") ||
        combined.includes("follow-up test") ||
        combined.includes("service follow-up reminder") ||
        combined.includes("service follow-up template test") ||
        combined.includes("reminder") ||
        combined.includes("تذكير") ||
        combined.includes("متابعة");
    }

    return false;
  });
}
`;

if (!replaceFunction("conversationHasStatus", conversationHasStatusV10)) {
  insertBefore("function filteredConversations", conversationHasStatusV10, "insert conversationHasStatus");
}

// 9) Filter conversations using reply filters + full conversation matcher.
const filteredConversationsV10 = `
function filteredConversations() {
  const q = (searchBox.value || "").toLowerCase().trim();
  const branch = branchFilter.value;
  const status = statusFilter.value;
  const senderFilter = statusToSenderFilter(status);

  return buildConversations().filter(function(c) {
    const hay = [
      c.phone,
      c.branch,
      c.status,
      c.replyFilterStatus,
      c.phoneNumberId
    ].concat((c.messages || []).map(function(m) {
      return [
        m.body,
        m.status,
        m.messageType,
        m.sender,
        m.phone,
        m.customerName,
        m.branch,
        m.phoneNumberId,
        m.buttonText,
        m.buttonTitle,
        m.buttonPayload,
        m.buttonId,
        m.payload,
        m.interactiveTitle,
        m.interactiveId,
        m.interactivePayload
      ].join(" ");
    })).join(" ").toLowerCase();

    if (q && !hay.includes(q)) return false;
    if (branch && c.branch !== branch) return false;

    // Reply filters stay based on reply type, so Bot Reply remains working.
    if (senderFilter && c.replyFilterStatus !== status) return false;

    // Business workflow filters search the full conversation.
    if (status && !senderFilter && !conversationHasStatus(c, status)) return false;

    return true;
  });
}
`;

if (!replaceFunction("filteredConversations", filteredConversationsV10)) {
  const inserted = insertBefore("function renderConversationList", filteredConversationsV10, "insert filteredConversations");
  if (!inserted) {
    console.error("ERROR: Could not find or insert filteredConversations.");
    process.exit(1);
  }
}

// 10) Make sure the Dubai counter card exists if an older file is missing it.
if (!code.includes('id="statDubai"') && code.includes('id="statAbu"')) {
  const counterPatterns = [
    /<div class="stat"><div class="stat-label">Abu Dhabi<\/div><div class="stat-value" id="statAbu">0<\/div><\/div>/,
    /<div class="stat">\s*<div class="stat-label">Abu Dhabi<\/div>\s*<div class="stat-value" id="statAbu">0<\/div>\s*<\/div>/
  ];

  let addedCounter = false;
  for (const pattern of counterPatterns) {
    if (pattern.test(code)) {
      code = code.replace(
        pattern,
        '<div class="stat"><div class="stat-label">Dubai</div><div class="stat-value" id="statDubai">0</div></div>\n      <div class="stat"><div class="stat-label">Abu Dhabi</div><div class="stat-value" id="statAbu">0</div></div>'
      );
      addedCounter = true;
      logOK("add Dubai counter card");
      break;
    }
  }

  if (!addedCounter) {
    logWarn("statAbu found but Dubai card insertion pattern did not match; updateStats remains safe");
  }
}

if (code === original) {
  console.error("ERROR: No changes were applied.");
  process.exit(1);
}

const backupPath = path.join(process.cwd(), "server.js.backup-before-v10");
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, original, "utf8");
}

fs.writeFileSync(serverPath, code, "utf8");

console.log("");
console.log("DONE: Team Inbox v10 fixed patch applied.");
console.log("Backup saved as: server.js.backup-before-v10");
console.log("Applied sections:", applied.length);
if (warnings.length) {
  console.log("Warnings:", warnings.join(" | "));
}
console.log("Next: commit server.js to GitHub, then manually deploy on Render.");
