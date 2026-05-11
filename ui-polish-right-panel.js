const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
let source = fs.readFileSync(serverPath, "utf8");
let next = source;

next = next.replace(
  /const BOT_VERSION = "[^"]*";/,
  'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-1-7-right-panel-crm-request-polish";'
);

const textReplacements = {
  "Customer CRM Profile": "CRM Profile",
  "Privacy-first profile": "Private CRM profile",
  "Staff Assignment": "Team Assignment",
  "Assign this conversation to the right branch team.": "Branch team responsible for this customer.",
  "Auto-selected by branch. Staff can change it manually.": "Auto-selected by branch. Change only when needed.",
  "Appointment Request": "Booking Request",
  "Review the client request, add a private team note if needed, then send a clear customer update.": "Review the request, add a private note, then send a clear customer update.",
  "Internal note for the team...": "Private team note...",
  "Confirm booking": "Confirm",
  "Suggest another time": "Suggest time",
  "Mark follow-up": "Follow-up",
  "Cancel request": "Cancel",
  "Send customer update": "Send update",
  "Choose an action to prepare an update.": "Choose an action to prepare the update."
};

for (const [oldText, newText] of Object.entries(textReplacements)) {
  next = next.split(oldText).join(newText);
}

const marker = "V31.5.8.60.3.1.7 - Right CRM / Booking Request Panel Polish";
const css = `

    /* V31.5.8.60.3.1.7 - Right CRM / Booking Request Panel Polish.
       UI-only: improves the right CRM / Profile / Booking Request panel.
       Does not touch WhatsApp, webhook, flows, reminders, cron, Google Sheets, Flyksoft, or chat background. */
    .right-reference-panel {
      --right-panel-green: #78b83e !important;
      --right-panel-dark: #16352b !important;
      --right-panel-muted: #64748b !important;
      --right-panel-line: rgba(198, 219, 190, .72) !important;
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(247,252,244,.96)) !important;
    }
    .right-reference-panel .right-reference-scroll {
      padding: 11px !important;
      gap: 9px !important;
      background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,252,246,.96)) !important;
    }
    .right-reference-panel .reference-card {
      padding: 12px 12px 13px !important;
      border-radius: 18px !important;
      border: 1px solid var(--right-panel-line) !important;
      background: linear-gradient(180deg, rgba(255,255,255,.99), rgba(249,252,247,.97)) !important;
      box-shadow: 0 10px 24px rgba(15,23,42,.055), inset 0 1px 0 rgba(255,255,255,.82) !important;
      overflow: hidden !important;
    }
    .right-reference-panel .reference-card-head {
      min-height: 30px !important;
      margin-bottom: 9px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
    }
    .right-reference-panel .reference-card-head h3 {
      margin: 0 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 7px !important;
      color: var(--right-panel-dark) !important;
      font-size: 14px !important;
      line-height: 1.05 !important;
      font-weight: 950 !important;
      letter-spacing: -.015em !important;
      white-space: nowrap !important;
    }
    .right-reference-panel .customer-details-card .reference-card-head h3::before,
    .right-reference-panel .booking-request-card .reference-card-head h3::before {
      width: 25px !important;
      height: 25px !important;
      min-width: 25px !important;
      border-radius: 10px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 8px !important;
      font-weight: 950 !important;
      background: linear-gradient(135deg, rgba(232,248,224,.98), rgba(255,255,255,.98)) !important;
      border: 1px solid rgba(120,184,62,.24) !important;
    }
    .right-reference-panel .customer-details-card .reference-card-head h3::before { content: "CRM" !important; }
    .right-reference-panel .booking-request-card .reference-card-head h3::before { content: "REQ" !important; }
    .right-reference-panel .wa-mini-icon {
      width: 24px !important;
      height: 24px !important;
      min-width: 24px !important;
      border-radius: 999px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 12px !important;
      color: #166534 !important;
      background: rgba(240,253,244,.96) !important;
      border: 1px solid rgba(34,197,94,.22) !important;
    }
    .right-reference-panel .customer-details-top {
      min-height: 46px !important;
      margin: 0 0 9px !important;
      padding: 8px !important;
      gap: 9px !important;
      border-radius: 15px !important;
      background: linear-gradient(135deg, rgba(240,250,236,.92), rgba(255,255,255,.96)) !important;
      border: 1px solid rgba(198,219,190,.66) !important;
    }
    .right-reference-panel .reference-avatar {
      width: 38px !important;
      height: 38px !important;
      min-width: 38px !important;
      flex: 0 0 38px !important;
      border-radius: 14px !important;
      font-size: 12px !important;
      font-weight: 950 !important;
    }
    .right-reference-panel .customer-name {
      font-size: 12.5px !important;
      line-height: 1.1 !important;
      font-weight: 950 !important;
      color: #0f241c !important;
    }
    .right-reference-panel .customer-phone-small {
      margin-top: 3px !important;
      font-size: 10.5px !important;
      line-height: 1.1 !important;
      color: var(--right-panel-muted) !important;
      font-weight: 800 !important;
    }
    .right-reference-panel .crm-privacy-strip {
      min-height: 32px !important;
      margin: 8px 0 9px !important;
      padding: 7px 9px !important;
      border-radius: 13px !important;
      background: linear-gradient(135deg, rgba(245,243,255,.96), rgba(255,255,255,.98)) !important;
      border: 1px solid rgba(124,58,237,.15) !important;
      font-size: 10px !important;
      line-height: 1.15 !important;
      font-weight: 900 !important;
    }
    .right-reference-panel .crm-privacy-strip strong,
    .right-reference-panel .reference-status-pill,
    .right-reference-panel .booking-status-pill,
    .right-reference-panel .crm-code-pill {
      min-height: 20px !important;
      padding: 4px 8px !important;
      border-radius: 999px !important;
      font-size: 9.5px !important;
      line-height: 1 !important;
      font-weight: 950 !important;
    }
    .right-reference-panel .reference-detail-list { gap: 6px !important; }
    .right-reference-panel .reference-detail-row {
      grid-template-columns: 86px minmax(0,1fr) !important;
      gap: 7px !important;
      min-height: 26px !important;
      padding: 5px 7px !important;
      align-items: center !important;
      border-radius: 11px !important;
      background: rgba(255,255,255,.70) !important;
      border: 1px solid rgba(226,232,240,.64) !important;
    }
    .right-reference-panel .reference-detail-row span {
      color: #6b7280 !important;
      font-size: 9.5px !important;
      line-height: 1.05 !important;
      font-weight: 900 !important;
      letter-spacing: .045em !important;
      text-transform: uppercase !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .right-reference-panel .reference-detail-row strong {
      color: #1f2937 !important;
      font-size: 10.8px !important;
      line-height: 1.18 !important;
      font-weight: 850 !important;
      text-align: right !important;
      overflow-wrap: anywhere !important;
    }
    .right-reference-panel .assign-team-card.branch-team-assignment-card {
      margin-top: 9px !important;
      padding: 9px !important;
      border-radius: 15px !important;
      background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(240,250,236,.92)) !important;
      border: 1px solid rgba(120,184,62,.21) !important;
    }
    .right-reference-panel .assign-team-card .assign-top { margin-bottom: 7px !important; gap: 8px !important; }
    .right-reference-panel .assign-team-card .assign-icon { width: 28px !important; height: 28px !important; min-width: 28px !important; border-radius: 11px !important; font-size: 12px !important; }
    .right-reference-panel .assign-title { font-size: 11.5px !important; line-height: 1.1 !important; font-weight: 950 !important; color: var(--right-panel-dark) !important; }
    .right-reference-panel .assign-sub,
    .right-reference-panel .branch-team-assignment-note { color: var(--right-panel-muted) !important; font-size: 9.7px !important; line-height: 1.25 !important; font-weight: 780 !important; }
    .right-reference-panel .branch-team-select { height: 31px !important; min-height: 31px !important; padding: 6px 9px !important; border-radius: 12px !important; font-size: 10.8px !important; font-weight: 900 !important; }
    .right-reference-panel .booking-card-helper {
      margin: -2px 0 9px !important;
      padding: 8px 9px !important;
      border-radius: 12px !important;
      background: rgba(240,253,244,.82) !important;
      border: 1px solid rgba(34,197,94,.16) !important;
      color: #48645a !important;
      font-size: 9.8px !important;
      line-height: 1.32 !important;
      font-weight: 780 !important;
    }
    .right-reference-panel .booking-request-card .reference-detail-row { grid-template-columns: 74px minmax(0,1fr) !important; min-height: 25px !important; padding: 5px 7px !important; }
    .right-reference-panel #bookingRequestMessage { max-height: 58px !important; overflow: auto !important; white-space: pre-line !important; text-align: right !important; }
    .right-reference-panel .booking-note-input { height: 32px !important; min-height: 32px !important; margin-top: 8px !important; padding: 7px 10px !important; border-radius: 12px !important; font-size: 10.8px !important; font-weight: 820 !important; background: #ffffff !important; }
    .right-reference-panel .booking-actions-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: 6px !important; margin-top: 8px !important; }
    .right-reference-panel .booking-action-btn { height: 31px !important; min-height: 31px !important; padding: 0 8px !important; border-radius: 12px !important; font-size: 10px !important; line-height: 1 !important; font-weight: 950 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 5px !important; white-space: nowrap !important; }
    .right-reference-panel .booking-send-update-btn { height: 34px !important; min-height: 34px !important; margin-top: 7px !important; border-radius: 13px !important; font-size: 10.7px !important; }
    .right-reference-panel .booking-result-text { min-height: 26px !important; margin-top: 7px !important; padding: 7px 9px !important; border-radius: 12px !important; font-size: 9.8px !important; line-height: 1.25 !important; font-weight: 780 !important; color: #60736b !important; background: rgba(255,255,255,.76) !important; border: 1px dashed rgba(120,184,62,.24) !important; }
`;

if (!next.includes(marker)) {
  const insertBefore = "    /* V31.5.8.22 - Premium Chat Window + Scroll Stability.";
  if (next.includes(insertBefore)) {
    next = next.replace(insertBefore, `${css}\n${insertBefore}`);
  } else {
    next = next.replace("</style>", `${css}\n  </style>`);
  }
}

if (next !== source) {
  fs.writeFileSync(serverPath, next, "utf8");
  console.log("Right panel UI polish applied.");
} else {
  console.log("Right panel UI polish already applied.");
}
