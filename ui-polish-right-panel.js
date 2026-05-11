const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
let source = fs.readFileSync(serverPath, "utf8");
let next = source;

next = next.replace(
  /const BOT_VERSION = "[^"]*";/,
  'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-1-10-sidebar-logo-branches-polish";'
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

const sidebarLogoBranchesMarker = "V31.5.8.60.3.1.10 - Sidebar logo and branches polish";
const sidebarLogoBranchesCss = `

    /* V31.5.8.60.3.1.10 - Sidebar logo and branches polish */
    .main-sidebar {
      padding: 12px 13px 14px !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 100vh !important;
    }
    .sidebar-brand {
      min-height: 104px !important;
      padding: 6px 2px 18px !important;
      margin-bottom: 10px !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      border-bottom: 1px solid rgba(198,219,190,.70) !important;
    }
    .sidebar-logo {
      width: 188px !important;
      height: 86px !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 auto !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    .sidebar-logo img {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      object-position: center center !important;
      border-radius: 0 !important;
      filter: drop-shadow(0 8px 14px rgba(15,23,42,.08)) !important;
    }
    .sidebar-nav {
      gap: 8px !important;
      margin-top: 2px !important;
    }
    .sidebar-branches {
      margin-top: auto !important;
      margin-bottom: 10px !important;
      padding: 14px 13px 13px !important;
      border-radius: 22px !important;
      background:
        radial-gradient(circle at 15% 0%, rgba(120,184,62,.16), transparent 34%),
        linear-gradient(180deg, rgba(255,255,255,.97), rgba(247,252,244,.96)) !important;
      border: 1px solid rgba(120,184,62,.28) !important;
      box-shadow: 0 16px 34px rgba(15,23,42,.075), inset 0 1px 0 rgba(255,255,255,.86) !important;
    }
    .sidebar-branches-head {
      margin-bottom: 10px !important;
      padding-bottom: 8px !important;
      border-bottom: 1px solid rgba(198,219,190,.58) !important;
    }
    .sidebar-section-title {
      font-size: 10.5px !important;
      letter-spacing: .095em !important;
      font-weight: 950 !important;
      color: #667085 !important;
    }
    .sidebar-branch-add {
      width: 27px !important;
      height: 27px !important;
      border-radius: 10px !important;
      background: linear-gradient(135deg, #ffffff, #eef9e8) !important;
      border: 1px solid rgba(120,184,62,.32) !important;
      color: #16352b !important;
      font-size: 15px !important;
      font-weight: 950 !important;
      box-shadow: 0 8px 16px rgba(120,184,62,.12) !important;
    }
    .branch-row {
      min-height: 36px !important;
      padding: 8px 4px !important;
      border-radius: 13px !important;
      font-size: 12.5px !important;
      font-weight: 950 !important;
      color: #16352b !important;
    }
    .branch-row:hover {
      background: rgba(240,250,236,.82) !important;
    }
    .branch-row .branch-dot,
    .branch-dot {
      width: 9px !important;
      height: 9px !important;
      min-width: 9px !important;
      box-shadow: 0 0 0 4px rgba(120,184,62,.14) !important;
    }
    .branch-row b {
      height: 24px !important;
      min-width: 38px !important;
      padding: 0 9px !important;
      border-radius: 999px !important;
      background: linear-gradient(135deg, rgba(120,184,62,.22), rgba(233,246,228,.94)) !important;
      color: #3d7a34 !important;
      font-size: 11.5px !important;
      font-weight: 950 !important;
    }
    .sidebar-credit,
    .created-by,
    .sidebar-created-by {
      margin-top: 2px !important;
      padding: 8px 10px !important;
      border-radius: 16px !important;
      background: rgba(255,255,255,.76) !important;
      border: 1px solid rgba(198,219,190,.58) !important;
      transform: scale(.94) !important;
      transform-origin: bottom center !important;
    }
`;

if (!next.includes(sidebarLogoBranchesMarker)) {
  const styleEndIndex = next.lastIndexOf("</style>");
  if (styleEndIndex !== -1) {
    next = next.slice(0, styleEndIndex) + sidebarLogoBranchesCss + "\n  " + next.slice(styleEndIndex);
  }
}

if (next !== source) {
  fs.writeFileSync(serverPath, next, "utf8");
  console.log("Sidebar logo and branches polish applied.");
} else {
  console.log("Sidebar logo and branches polish already applied.");
}
