const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
let source = fs.readFileSync(serverPath, "utf8");
let s = source;

const LIVE_VERSION = "iconic-team-inbox-v31-5-8-60-3-1-11-unified-functional-sidebar";
const FAVICON_URL = "https://iconichaircare.com/wp-content/uploads/2026/05/BE6F2E6E-357D-486A-ADC3-0A8F70D22A26.jpg";

s = s.replace(/const BOT_VERSION = "[^"]*";/, `const BOT_VERSION = "${LIVE_VERSION}";`);

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
  s = s.split(oldText).join(newText);
}

const navHtml = `      <nav class="sidebar-nav" aria-label="Team Inbox navigation">
        <button class="sidebar-item active" type="button" data-sidebar-section="inbox"><span class="nav-icon">💬</span><span>Team Inbox</span><small>Live</small></button>
        <button class="sidebar-item" type="button" data-sidebar-section="dashboard"><span class="nav-icon">📊</span><span>Dashboard</span><small>Today</small></button>
        <button class="sidebar-item" type="button" data-sidebar-section="conversations"><span class="nav-icon">🗂️</span><span>Conversations</span><small>List</small></button>
        <button class="sidebar-item" type="button" data-sidebar-section="team"><span class="nav-icon">👥</span><span>Team</span><small>Routing</small></button>
        <button class="sidebar-item" type="button" data-sidebar-section="contacts"><span class="nav-icon">📇</span><span>Contacts</span><small>CRM</small></button>
        <button class="sidebar-item" type="button" data-sidebar-section="quick"><span class="nav-icon">⚡</span><span>Quick Replies</span><small>Ready</small></button>
        <button class="sidebar-item sidebar-item-disabled" type="button" data-sidebar-section="broadcast"><span class="nav-icon">📣</span><span>Broadcast</span><small>Safe off</small></button>
        <button class="sidebar-item sidebar-item-disabled" type="button" data-sidebar-section="media"><span class="nav-icon">🖼️</span><span>Files & Media</span><small>Soon</small></button>
        <button class="sidebar-item" type="button" data-sidebar-section="analytics"><span class="nav-icon">📈</span><span>Analytics</span><small>Basic</small></button>
        <button class="sidebar-item" type="button" data-sidebar-section="settings"><span class="nav-icon">⚙️</span><span>Settings</span><small>View</small></button>
      </nav>`;
s = s.replace(/      <nav class="sidebar-nav" aria-label="Team Inbox navigation">[\s\S]*?      <\/nav>/, navHtml);

if (!s.includes('id="sidebarViewPanel"')) {
  const panel = `

      <section class="sidebar-view-panel" id="sidebarViewPanel" aria-live="polite" hidden>
        <div class="sidebar-view-head">
          <div>
            <div class="sidebar-view-kicker" id="sidebarViewKicker">Iconic Workspace</div>
            <h2 id="sidebarViewTitle">Dashboard</h2>
            <p id="sidebarViewSubtitle">Quick operational overview for the team.</p>
          </div>
          <button type="button" class="sidebar-view-close" id="sidebarViewClose">Back to Inbox</button>
        </div>
        <div class="sidebar-view-grid" id="sidebarViewContent"></div>
      </section>`;
  s = s.replace('\n\n    <main class="app">', panel + '\n\n    <main class="app">');
}

const cssMarker = "V31.5.8.60.3.1.11 - Unified functional sidebar";
if (!s.includes(cssMarker)) {
  const css = `

    /* V31.5.8.60.3.1.11 - Unified functional sidebar */
    .main-sidebar { width: 248px !important; padding: 12px 13px 14px !important; display: flex !important; flex-direction: column !important; min-height: 100vh !important; background: radial-gradient(circle at 20% 0%, rgba(120,184,62,.16), transparent 30%), linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,252,243,.97)) !important; border-right: 1px solid rgba(198,219,190,.86) !important; }
    .sidebar-brand { min-height: 104px !important; padding: 6px 2px 18px !important; margin-bottom: 10px !important; display: flex !important; justify-content: center !important; align-items: center !important; border-bottom: 1px solid rgba(198,219,190,.70) !important; }
    .sidebar-brand > div:not(.sidebar-logo) { display: none !important; }
    .sidebar-logo { width: 188px !important; height: 86px !important; max-width: 100% !important; padding: 0 !important; margin: 0 auto !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
    .sidebar-logo img { width: 100% !important; height: 100% !important; object-fit: contain !important; object-position: center center !important; border-radius: 0 !important; filter: drop-shadow(0 8px 14px rgba(15,23,42,.08)) !important; }
    .sidebar-nav { display: grid !important; gap: 8px !important; margin-top: 2px !important; }
    .sidebar-item { width: 100% !important; appearance: none !important; border: 1px solid transparent !important; background: transparent !important; cursor: pointer !important; display: grid !important; grid-template-columns: 25px minmax(0,1fr) auto !important; align-items: center !important; gap: 8px !important; min-height: 40px !important; padding: 8px 10px !important; border-radius: 15px !important; color: #29443a !important; font-size: 13px !important; font-weight: 920 !important; text-align: left !important; }
    .sidebar-item:hover { transform: translateX(2px) !important; background: rgba(255,255,255,.78) !important; border-color: rgba(120,184,62,.18) !important; }
    .sidebar-item.active { background: linear-gradient(135deg, rgba(120,184,62,.22), rgba(18,140,126,.10)) !important; color: #16352b !important; border-color: rgba(120,184,62,.30) !important; box-shadow: 0 10px 24px rgba(120,184,62,.12), inset 0 1px 0 rgba(255,255,255,.70) !important; }
    .sidebar-item.sidebar-item-disabled { opacity: .72 !important; }
    .nav-icon { width: 25px !important; height: 25px !important; display: inline-grid !important; place-items: center !important; border-radius: 10px !important; background: rgba(255,255,255,.82) !important; border: 1px solid rgba(198,219,190,.72) !important; font-size: 13px !important; line-height: 1 !important; }
    .sidebar-item small { min-width: 34px !important; padding: 3px 6px !important; border-radius: 999px !important; background: rgba(233,246,228,.90) !important; color: #497642 !important; font-size: 8px !important; font-weight: 950 !important; text-transform: uppercase !important; letter-spacing: .03em !important; text-align: center !important; }
    .sidebar-branches { margin-top: auto !important; margin-bottom: 10px !important; padding: 14px 13px 13px !important; border-radius: 22px !important; background: radial-gradient(circle at 15% 0%, rgba(120,184,62,.16), transparent 34%), linear-gradient(180deg, rgba(255,255,255,.97), rgba(247,252,244,.96)) !important; border: 1px solid rgba(120,184,62,.28) !important; box-shadow: 0 16px 34px rgba(15,23,42,.075), inset 0 1px 0 rgba(255,255,255,.86) !important; }
    .sidebar-branches-head { display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: 10px !important; padding-bottom: 8px !important; border-bottom: 1px solid rgba(198,219,190,.58) !important; }
    .sidebar-section-title { margin: 0 !important; font-size: 10.5px !important; letter-spacing: .095em !important; font-weight: 950 !important; color: #667085 !important; }
    .sidebar-branch-add { width: 27px !important; height: 27px !important; border-radius: 10px !important; background: linear-gradient(135deg, #ffffff, #eef9e8) !important; border: 1px solid rgba(120,184,62,.32) !important; color: #16352b !important; font-size: 15px !important; font-weight: 950 !important; box-shadow: 0 8px 16px rgba(120,184,62,.12) !important; }
    .branch-row { min-height: 36px !important; padding: 8px 4px !important; border-radius: 13px !important; font-size: 12.5px !important; font-weight: 950 !important; color: #16352b !important; }
    .branch-row:hover { background: rgba(240,250,236,.82) !important; }
    .branch-row .branch-dot, .branch-dot { width: 9px !important; height: 9px !important; min-width: 9px !important; box-shadow: 0 0 0 4px rgba(120,184,62,.14) !important; }
    .branch-row b { height: 24px !important; min-width: 38px !important; padding: 0 9px !important; border-radius: 999px !important; background: linear-gradient(135deg, rgba(120,184,62,.22), rgba(233,246,228,.94)) !important; color: #3d7a34 !important; font-size: 11.5px !important; font-weight: 950 !important; }
    .sidebar-credit, .created-by, .sidebar-created-by { margin-top: 2px !important; padding: 8px 10px !important; border-radius: 16px !important; background: rgba(255,255,255,.76) !important; border: 1px solid rgba(198,219,190,.58) !important; transform: scale(.94) !important; transform-origin: bottom center !important; }
    .sidebar-view-panel { margin: 0 0 14px !important; padding: 16px !important; border-radius: 24px !important; background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(246,252,243,.96)) !important; border: 1px solid rgba(198,219,190,.86) !important; box-shadow: 0 18px 40px rgba(15,23,42,.07) !important; }
    .sidebar-view-head { display: flex !important; align-items: flex-start !important; justify-content: space-between !important; gap: 12px !important; margin-bottom: 14px !important; }
    .sidebar-view-kicker { color: #78b83e !important; font-size: 10px !important; font-weight: 950 !important; letter-spacing: .08em !important; text-transform: uppercase !important; }
    .sidebar-view-head h2 { margin: 3px 0 4px !important; color: #16352b !important; font-size: 22px !important; line-height: 1.05 !important; font-weight: 950 !important; }
    .sidebar-view-head p { margin: 0 !important; color: #667085 !important; font-size: 12px !important; font-weight: 750 !important; }
    .sidebar-view-close { height: 34px !important; padding: 0 13px !important; border-radius: 999px !important; border: 1px solid rgba(120,184,62,.28) !important; background: #fff !important; color: #16352b !important; font-weight: 900 !important; cursor: pointer !important; }
    .sidebar-view-grid { display: grid !important; grid-template-columns: repeat(3, minmax(0,1fr)) !important; gap: 10px !important; }
    .sidebar-view-card { padding: 13px !important; border-radius: 18px !important; background: #fff !important; border: 1px solid rgba(226,232,240,.86) !important; box-shadow: 0 8px 20px rgba(15,23,42,.045) !important; min-height: 94px !important; }
    .sidebar-view-card strong { display: block !important; color: #16352b !important; font-size: 13px !important; font-weight: 950 !important; margin-bottom: 6px !important; }
    .sidebar-view-card span { display: block !important; color: #667085 !important; font-size: 11px !important; line-height: 1.35 !important; font-weight: 750 !important; }
    .sidebar-view-card b { display: inline-flex !important; margin-top: 10px !important; padding: 5px 9px !important; border-radius: 999px !important; background: #e9f6e4 !important; color: #497642 !important; font-size: 11px !important; }
    @media (max-width: 1120px) { .sidebar-view-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } }
    @media (max-width: 650px) { .sidebar-view-grid { grid-template-columns: 1fr !important; } }
`;
  s = s.replace("</style>", css + "\n  </style>");
}

const jsMarker = "setupFunctionalSidebarNavigation";
if (!s.includes(jsMarker)) {
  const js = `

function setupFunctionalSidebarNavigation() {
  const buttons = Array.from(document.querySelectorAll(".sidebar-item[data-sidebar-section]"));
  const panel = document.getElementById("sidebarViewPanel");
  const title = document.getElementById("sidebarViewTitle");
  const subtitle = document.getElementById("sidebarViewSubtitle");
  const kicker = document.getElementById("sidebarViewKicker");
  const content = document.getElementById("sidebarViewContent");
  const closeBtn = document.getElementById("sidebarViewClose");
  const inboxApp = document.querySelector("main.app");
  if (!buttons.length || !panel || !title || !subtitle || !kicker || !content || !inboxApp) return;
  const views = {
    dashboard: { kicker: "Today Overview", title: "Dashboard", subtitle: "Quick operational snapshot without changing WhatsApp logic.", cards: [["Live conversations", "Current Team Inbox conversations remain active in the main inbox.", "Open inbox"], ["Human mode", "Customers transferred to staff stay visible for manual follow-up.", "Safe"], ["Booking requests", "Review pending requests from the right CRM panel.", "Manual confirm"]] },
    conversations: { kicker: "Inbox View", title: "Conversations", subtitle: "Focused shortcut back to the customer conversation list.", cards: [["All chats", "Return to the live conversation list and filters.", "Active"], ["Customer replies", "Watch customer actions and replies from WhatsApp.", "Tracked"], ["Bot / Staff", "Separate automated replies from human replies.", "Organized"]] },
    team: { kicker: "Team Routing", title: "Team", subtitle: "Branch assignment and human handoff controls stay inside CRM.", cards: [["Dubai Team", "Default route for Dubai branch conversations.", "Ready"], ["Abu Dhabi Team", "Default route for Abu Dhabi branch conversations.", "Ready"], ["Bot pause", "Team / Help keeps bot paused for human follow-up.", "Protected"]] },
    contacts: { kicker: "Private CRM", title: "Contacts", subtitle: "Customer identity, phone, source, and branch remain private.", cards: [["Customer profile", "Name, phone, branch, lead source, and status.", "CRM"], ["Branch history", "Dubai / Abu Dhabi routing stays visible.", "Branch"], ["Privacy", "No public broadcast action here.", "Safe"]] },
    quick: { kicker: "Reply Library", title: "Quick Replies", subtitle: "Prepared replies are available from the top Quick Replies button.", cards: [["Booking", "Use structured replies for consultation or service booking.", "Ready"], ["Results", "Send customer toward Results / Consultation safely.", "Ready"], ["Team", "Move conversation to human support when needed.", "Ready"]] },
    analytics: { kicker: "Basic Analytics", title: "Analytics", subtitle: "Simple operational indicators only; no ad changes.", cards: [["Dubai", "Branch conversation count appears in the sidebar.", "Live"], ["Abu Dhabi", "Branch conversation count appears in the sidebar.", "Live"], ["Status mix", "Open, human reply, and bot status remain filterable.", "Visible"]] },
    settings: { kicker: "Display Settings", title: "Settings", subtitle: "View-only area for now to avoid production setting mistakes.", cards: [["Safe mode", "No ENV, Flow IDs, cron, or reminder settings are changed here.", "Locked"], ["Interface", "Sidebar and panels are visual / navigation only.", "UI"], ["Deploy", "Changes still go through GitHub and Render deploy.", "Controlled"]] },
    broadcast: { kicker: "Coming Soon", title: "Broadcast", subtitle: "Disabled intentionally to prevent accidental customer messaging.", cards: [["Broadcast is OFF", "No message can be sent from this section in this phase.", "Protected"], ["Compliance", "We activate only after opt-in and template safety rules.", "Later"], ["Manual review", "Every broadcast flow needs a confirmation step first.", "Required"]] },
    media: { kicker: "Coming Soon", title: "Files & Media", subtitle: "Media library will be added later without changing sending logic now.", cards: [["Images", "Future area for approved brand images.", "Soon"], ["Videos", "Future area for approved result / details videos.", "Soon"], ["Safety", "No upload or send action is active yet.", "Off"]] }
  };
  function renderView(section) {
    if (section === "inbox") { panel.hidden = true; inboxApp.hidden = false; return; }
    const view = views[section] || views.dashboard;
    panel.hidden = false; inboxApp.hidden = true;
    kicker.textContent = view.kicker; title.textContent = view.title; subtitle.textContent = view.subtitle;
    content.innerHTML = view.cards.map(function(card) { return '<article class="sidebar-view-card"><strong>' + card[0] + '</strong><span>' + card[1] + '</span><b>' + card[2] + '</b></article>'; }).join("");
  }
  buttons.forEach(function(button) { button.addEventListener("click", function() { buttons.forEach(function(item) { item.classList.remove("active"); }); button.classList.add("active"); renderView(button.getAttribute("data-sidebar-section") || "inbox"); }); });
  if (closeBtn) closeBtn.addEventListener("click", function() { const inboxButton = document.querySelector('.sidebar-item[data-sidebar-section="inbox"]'); buttons.forEach(function(item) { item.classList.remove("active"); }); if (inboxButton) inboxButton.classList.add("active"); renderView("inbox"); });
}
setupFunctionalSidebarNavigation();
`;
  s = s.replace("\nloadMessages();", js + "\nloadMessages();");
}

const faviconMarker = "V31.5.8.60.3.1.11-favicon-bot-header-only";
if (!s.includes(faviconMarker)) {
  const faviconLinks = `
    <!-- ${faviconMarker}: browser tab icon only -->
    <link rel="icon" type="image/jpeg" href="${FAVICON_URL}">
    <link rel="shortcut icon" type="image/jpeg" href="${FAVICON_URL}">
`;
  s = s.includes("</head>") ? s.replace("</head>", `${faviconLinks}\n  </head>`) : s.replace("<title>", `${faviconLinks}\n    <title>`);
}

if (s !== source) {
  fs.writeFileSync(serverPath, s, "utf8");
  console.log("Stable live UI applied.");
} else {
  console.log("Stable live UI already active.");
}
