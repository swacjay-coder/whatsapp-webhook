/*
Iconic Hair Care — Team Inbox v10 patch
Target: current repo server.js
Scope: Team Inbox UI only
- Improves browser tab logo/favicon with a clear SVG IC icon.
- Keeps Bot Reply filter visible and working.
- Removes raw Bot / Follow-up Test noise from dropdown.
- Adds one clean Follow-up filter.
- Makes Talk to Team and Follow-up search across the full conversation:
  body, status, messageType, sender, phone, branch, phoneNumberId, and possible button/interactive fields.
- Keeps Dubai counter beside Abu Dhabi counter.
Does NOT change Smart Concierge replies, Call Now templates, Location action buttons, Google Sheets logging, reminders, or branch routing.
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

function replaceOrFail(label, pattern, replacement) {
  if (!pattern.test(code)) {
    console.error("ERROR: Could not find section:", label);
    process.exit(1);
  }
  code = code.replace(pattern, replacement);
  console.log("OK:", label);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 1) Version label only.
code = code.replace(
  /const BOT_VERSION = "[^"]+";/,
  'const BOT_VERSION = "iconic-team-inbox-v10-logo-talk-filter-fix";'
);

// 2) Add a sharper favicon data URI for the browser tab.
if (!code.includes("INBOX_FAVICON_DATA_URI")) {
  const faviconBlock = `
const INBOX_TAB_LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="14" fill="%2378b83e"/>' +
  '<circle cx="32" cy="32" r="24" fill="%23111827" opacity=".16"/>' +
  '<text x="32" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="900" fill="white">IC</text>' +
  '</svg>';
const INBOX_FAVICON_DATA_URI = "data:image/svg+xml," + INBOX_TAB_LOGO_SVG;
`;
  if (code.includes("const FOLLOW_UP_SCAN_LIMIT")) {
    code = code.replace(
      /const FOLLOW_UP_SCAN_LIMIT = Number\(process\.env\.FOLLOW_UP_SCAN_LIMIT \|\| "5000"\);/,
      match => match + "\n" + faviconBlock
    );
    console.log("OK: add INBOX_FAVICON_DATA_URI");
  } else if (code.includes("const MAIN_MENU_HEADER_IMAGE_URL")) {
    code = code.replace(
      /const MAIN_MENU_HEADER_IMAGE_URL[\s\S]*?;/,
      match => match + "\n" + faviconBlock
    );
    console.log("OK: add INBOX_FAVICON_DATA_URI fallback");
  } else {
    console.error("ERROR: Could not insert favicon constants.");
    process.exit(1);
  }
}

// 3) Replace favicon links inside /inbox HTML template.
// Handles both previous image favicon and any already-existing favicon line.
code = code.replace(
  /<link rel="icon" href="\$\{[^}]+\}" type="image\/jpeg" \/>/g,
  '<link rel="icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />'
);
code = code.replace(
  /<link rel="shortcut icon" href="\$\{[^}]+\}" type="image\/jpeg" \/>/g,
  '<link rel="shortcut icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />'
);
if (!code.includes('href="${INBOX_FAVICON_DATA_URI}"')) {
  // Insert after <title> if favicon links were missing.
  code = code.replace(
    /<title>Iconic Hair Care — Team Inbox<\/title>/,
    '<title>Iconic Hair Care — Team Inbox</title>\\n  <link rel="icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />\\n  <link rel="shortcut icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />'
  );
}

// 4) Build clean filter dropdown.
// Important: Bot Reply stays visible. Raw Bot and test statuses stay hidden.
const buildStatusOptionsV10 = `function buildStatusOptions() {
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

replaceOrFail(
  "buildStatusOptions",
  /function buildStatusOptions\(\) \{[\s\S]*?\n\}\n\nfunction normalizedMessageBranch/,
  buildStatusOptionsV10 + "function normalizedMessageBranch"
);

// 5) Keep Dubai counter beside Abu Dhabi counter.
const updateStatsV10 = `function updateStats() {
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

replaceOrFail(
  "updateStats",
  /function updateStats\(\) \{[\s\S]*?\n\}\n\nfunction conversationHasStatus/,
  updateStatsV10 + "function conversationHasStatus"
);

// 6) Full conversation status matcher.
// Searches all conversation messages, not only latest row.
// Includes body, status, messageType, sender, branch, phoneNumberId, and possible button/interactive fields.
const conversationHasStatusV10 = `function conversationHasStatus(conversation, wantedStatus) {
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

replaceOrFail(
  "conversationHasStatus",
  /function conversationHasStatus\(conversation, wantedStatus\) \{[\s\S]*?\n\}\n\nfunction filteredConversations/,
  conversationHasStatusV10 + "function filteredConversations"
);

// 7) Filter conversations using special reply filters + full conversation matcher.
const filteredConversationsV10 = `function filteredConversations() {
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

    // Reply filters stay based on the latest message type, so Bot Reply remains working.
    if (senderFilter && c.replyFilterStatus !== status) return false;

    // Business workflow filters search the full conversation.
    if (status && !senderFilter && !conversationHasStatus(c, status)) return false;

    return true;
  });
}

`;

replaceOrFail(
  "filteredConversations",
  /function filteredConversations\(\) \{[\s\S]*?\n\}\n\nfunction renderConversationList/,
  filteredConversationsV10 + "function renderConversationList"
);

// 8) Make sure the Dubai counter card exists if an older file is missing it.
if (!code.includes('id="statDubai"') && code.includes('id="statAbu"')) {
  code = code.replace(
    /<div class="stat"><div class="stat-label">Abu Dhabi<\/div><div class="stat-value" id="statAbu">0<\/div><\/div>/,
    '<div class="stat"><div class="stat-label">Dubai</div><div class="stat-value" id="statDubai">0</div></div>\\n      <div class="stat"><div class="stat-label">Abu Dhabi</div><div class="stat-value" id="statAbu">0</div></div>'
  );
  console.log("OK: add Dubai counter card");
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
console.log("DONE: Team Inbox v10 patch applied.");
console.log("Backup saved as: server.js.backup-before-v10");
console.log("Next: commit server.js to GitHub, then manually deploy on Render.");
