const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
let source = fs.readFileSync(serverPath, "utf8");
let next = source;

next = next.replace(
  /const BOT_VERSION = "[^"]*";/,
  'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-1-9-functional-sidebar-style";'
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

const oldLegacyChatBackground = `      background-image:
        linear-gradient(rgba(246, 252, 243, .46), rgba(241, 249, 238, .50)),
        var(--iconic-chat-logo-v2285),
        radial-gradient(circle at 18px 18px, rgba(120,184,62,.055) 1.4px, transparent 1.8px) !important;
      background-repeat: no-repeat, no-repeat, repeat !important;
      background-position: center center, center center, 0 0 !important;
      background-size: cover, min(900px, 84%) auto, 28px 28px !important;
      background-attachment: scroll, scroll, scroll !important;`;
const newLegacyChatBackground = `      background-image: var(--iconic-chat-logo-v2285) !important;
      background-repeat: no-repeat !important;
      background-position: center center !important;
      background-size: min(900px, 84%) auto !important;
      background-attachment: scroll !important;
      background-color: #ffffff !important;`;
const oldActiveChatBackground = `      background-image:
        linear-gradient(rgba(246, 252, 243, .43), rgba(241, 249, 238, .48)),
        var(--iconic-chat-logo-v2285),
        radial-gradient(circle at 18px 18px, rgba(120,184,62,.052) 1.4px, transparent 1.8px) !important;
      background-repeat: no-repeat, no-repeat, repeat !important;
      background-position: center center, center center, 0 0 !important;
      background-size: cover, 100% auto, 28px 28px !important;
      background-attachment: scroll, scroll, scroll !important;`;
const newActiveChatBackground = `      background-image: var(--iconic-chat-logo-v2285) !important;
      background-repeat: no-repeat !important;
      background-position: center center !important;
      background-size: 100% auto !important;
      background-attachment: scroll !important;
      background-color: #ffffff !important;`;
next = next.split(oldLegacyChatBackground).join(newLegacyChatBackground);
next = next.split(oldActiveChatBackground).join(newActiveChatBackground);

const oldSidebarNav = `      <nav class="sidebar-nav" aria-label="Team Inbox navigation">
        <div class="sidebar-item active"><span class="nav-icon">▣</span><span>Team Inbox</span></div>
        <div class="sidebar-item"><span class="nav-icon">⌂</span><span>Dashboard</span></div>
        <div class="sidebar-item"><span class="nav-icon">○</span><span>Conversations</span></div>
        <div class="sidebar-item"><span class="nav-icon">♢</span><span>Team</span></div>
        <div class="sidebar-item"><span class="nav-icon">◔</span><span>Contacts</span></div>
        <div class="sidebar-item"><span class="nav-icon">⌁</span><span>Quick Replies</span></div>
        <div class="sidebar-item"><span class="nav-icon">⌯</span><span>Broadcast</span></div>
        <div class="sidebar-item"><span class="nav-icon">□</span><span>Files & Media</span></div>
        <div class="sidebar-item"><span class="nav-icon">∥</span><span>Analytics</span></div>
        <div class="sidebar-item"><span class="nav-icon">⚙</span><span>Settings</span></div>
      </nav>`;
const newSidebarNav = `      <nav class="sidebar-nav" aria-label="Team Inbox navigation">
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
next = next.split(oldSidebarNav).join(newSidebarNav);

const viewPanelHtml = `

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
      </section>
`;
if (!next.includes('id="sidebarViewPanel"')) {
  next = next.replace('\n\n    <main class="app">', viewPanelHtml + '\n\n    <main class="app">');
}

const sidebarCssMarker = "V31.5.8.60.3.1.9 - Functional premium sidebar navigation";
const sidebarCss = `

    /* V31.5.8.60.3.1.9 - Functional premium sidebar navigation */
    .main-sidebar { width: 248px !important; padding: 16px 14px !important; background: radial-gradient(circle at 20% 0%, rgba(120,184,62,.16), transparent 30%), linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,252,243,.97)) !important; border-right: 1px solid rgba(198,219,190,.86) !important; }
    .sidebar-brand { justify-content: center !important; padding: 8px 8px 15px !important; }
    .sidebar-brand > div:not(.sidebar-logo) { display: none !important; }
    .sidebar-logo { width: 148px !important; height: 66px !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
    .sidebar-logo img { object-fit: contain !important; border-radius: 0 !important; }
    .sidebar-nav { display: grid !important; gap: 7px !important; }
    .sidebar-item { width: 100% !important; appearance: none !important; border: 1px solid transparent !important; background: transparent !important; cursor: pointer !important; display: grid !important; grid-template-columns: 25px minmax(0,1fr) auto !important; align-items: center !important; gap: 8px !important; min-height: 40px !important; padding: 8px 10px !important; border-radius: 15px !important; color: #29443a !important; font-size: 13px !important; font-weight: 920 !important; text-align: left !important; transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease !important; }
    .sidebar-item:hover { transform: translateX(2px) !important; background: rgba(255,255,255,.78) !important; border-color: rgba(120,184,62,.18) !important; }
    .sidebar-item.active { background: linear-gradient(135deg, rgba(120,184,62,.22), rgba(18,140,126,.10)) !important; color: #16352b !important; border-color: rgba(120,184,62,.30) !important; box-shadow: 0 10px 24px rgba(120,184,62,.12), inset 0 1px 0 rgba(255,255,255,.70) !important; }
    .sidebar-item.sidebar-item-disabled { opacity: .72 !important; }
    .nav-icon { width: 25px !important; height: 25px !important; display: inline-grid !important; place-items: center !important; border-radius: 10px !important; background: rgba(255,255,255,.82) !important; border: 1px solid rgba(198,219,190,.72) !important; font-size: 13px !important; line-height: 1 !important; }
    .sidebar-item small { min-width: 34px !important; padding: 3px 6px !important; border-radius: 999px !important; background: rgba(233,246,228,.90) !important; color: #497642 !important; font-size: 8px !important; font-weight: 950 !important; text-transform: uppercase !important; letter-spacing: .03em !important; text-align: center !important; }
    .sidebar-branches { padding: 13px !important; border-radius: 20px !important; background: rgba(255,255,255,.88) !important; border: 1px solid rgba(198,219,190,.88) !important; box-shadow: 0 12px 26px rgba(15,23,42,.055) !important; }
    .sidebar-branches-head { display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: 8px !important; }
    .sidebar-section-title { margin: 0 !important; font-size: 10px !important; letter-spacing: .08em !important; color: #667085 !important; }
    .sidebar-branch-add { width: 24px !important; height: 24px !important; border-radius: 9px !important; border: 1px solid rgba(120,184,62,.25) !important; background: #fff !important; color: #16352b !important; font-weight: 950 !important; }
    .branch-row { padding: 8px 2px !important; font-size: 12.5px !important; }
    .branch-row b { height: 22px !important; min-width: 31px !important; font-size: 11px !important; }
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
if (!next.includes(sidebarCssMarker)) {
  const styleEndIndex = next.lastIndexOf("</style>");
  if (styleEndIndex !== -1) {
    next = next.slice(0, styleEndIndex) + sidebarCss + "\n  " + next.slice(styleEndIndex);
  }
}

const sidebarJsMarker = "setupFunctionalSidebarNavigation";
const sidebarJs = `

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
    dashboard: { kicker: "Today Overview", title: "Dashboard", subtitle: "Quick operational snapshot without changing any WhatsApp logic.", cards: [["Live conversations", "Current Team Inbox conversations remain active in the main inbox.", "Open inbox"], ["Human mode", "Customers transferred to staff stay visible for manual follow-up.", "Safe"], ["Booking requests", "Review pending requests from the right CRM panel.", "Manual confirm"]] },
    conversations: { kicker: "Inbox View", title: "Conversations", subtitle: "Use this as a focused shortcut back to the customer conversation list.", cards: [["All chats", "Return to the live conversation list and filters.", "Active"], ["Customer replies", "Watch customer actions and replies from WhatsApp.", "Tracked"], ["Bot / Staff", "Separate automated replies from human replies.", "Organized"]] },
    team: { kicker: "Team Routing", title: "Team", subtitle: "Branch assignment and human handoff controls stay inside the CRM panel.", cards: [["Dubai Team", "Default route for Dubai branch conversations.", "Ready"], ["Abu Dhabi Team", "Default route for Abu Dhabi branch conversations.", "Ready"], ["Bot pause", "Team / Help keeps bot paused for human follow-up.", "Protected"]] },
    contacts: { kicker: "Private CRM", title: "Contacts", subtitle: "Customer identity, phone, source, and branch remain private inside CRM.", cards: [["Customer profile", "Name, phone, branch, lead source, and status.", "CRM"], ["Branch history", "Dubai / Abu Dhabi routing stays visible.", "Branch"], ["Privacy", "No public broadcast action here.", "Safe"]] },
    quick: { kicker: "Reply Library", title: "Quick Replies", subtitle: "Prepared replies are available from the top Quick Replies button.", cards: [["Booking", "Use structured replies for consultation or service booking.", "Ready"], ["Results", "Send customer toward Results / Consultation safely.", "Ready"], ["Team", "Move conversation to human support when needed.", "Ready"]] },
    analytics: { kicker: "Basic Analytics", title: "Analytics", subtitle: "Simple operational indicators only; no ad account changes.", cards: [["Dubai", "Branch conversation count appears in the sidebar.", "Live"], ["Abu Dhabi", "Branch conversation count appears in the sidebar.", "Live"], ["Status mix", "Open, human reply, and bot status remain filterable.", "Visible"]] },
    settings: { kicker: "Display Settings", title: "Settings", subtitle: "View-only area for now to avoid changing production settings accidentally.", cards: [["Safe mode", "No ENV, Flow IDs, cron, or reminder settings are changed here.", "Locked"], ["Interface", "Sidebar and panels are visual / navigation only.", "UI"], ["Deploy", "Changes still go through GitHub and Render deploy.", "Controlled"]] },
    broadcast: { kicker: "Coming Soon", title: "Broadcast", subtitle: "Disabled intentionally to prevent accidental customer messaging.", cards: [["Broadcast is OFF", "No message can be sent from this section in this phase.", "Protected"], ["Compliance", "We will activate only after opt-in and template safety rules.", "Later"], ["Manual review", "Every broadcast flow needs a confirmation step first.", "Required"]] },
    media: { kicker: "Coming Soon", title: "Files & Media", subtitle: "Media library will be added later without changing WhatsApp sending logic now.", cards: [["Images", "Future area for approved brand images.", "Soon"], ["Videos", "Future area for approved result / details videos.", "Soon"], ["Safety", "No upload or send action is active yet.", "Off"]] }
  };
  function renderView(section) {
    if (section === "inbox") { panel.hidden = true; inboxApp.hidden = false; return; }
    const view = views[section] || views.dashboard;
    panel.hidden = false; inboxApp.hidden = true;
    kicker.textContent = view.kicker; title.textContent = view.title; subtitle.textContent = view.subtitle;
    content.innerHTML = view.cards.map(function(card) { return '<article class="sidebar-view-card"><strong>' + card[0] + '</strong><span>' + card[1] + '</span><b>' + card[2] + '</b></article>'; }).join("");
  }
  buttons.forEach(function(button) { button.addEventListener("click", function() { buttons.forEach(function(item) { item.classList.remove("active"); }); button.classList.add("active"); renderView(button.getAttribute("data-sidebar-section") || "inbox"); }); });
  if (closeBtn) { closeBtn.addEventListener("click", function() { const inboxButton = document.querySelector('.sidebar-item[data-sidebar-section="inbox"]'); buttons.forEach(function(item) { item.classList.remove("active"); }); if (inboxButton) inboxButton.classList.add("active"); renderView("inbox"); }); }
}
setupFunctionalSidebarNavigation();
`;
if (!next.includes(sidebarJsMarker)) {
  next = next.replace("\nloadMessages();", sidebarJs + "\nloadMessages();");
}

if (next !== source) {
  fs.writeFileSync(serverPath, next, "utf8");
  console.log("UI polish applied: right panel + functional sidebar.");
} else {
  console.log("UI polish already applied.");
}
