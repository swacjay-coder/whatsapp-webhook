const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
let source = fs.readFileSync(serverPath, "utf8");
let next = source;

next = next.replace(
  /const BOT_VERSION = "[^"]*";/,
  'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-1-13-clear-chat-local";'
);

const cssMarker = "V31.5.8.60.3.1.13 - Clear Chat local button";
if (!next.includes(cssMarker)) {
  const css = `

    /* ${cssMarker} */
    .clear-chat-action-btn {
      height: 32px !important;
      padding: 0 12px !important;
      border-radius: 999px !important;
      border: 1px solid rgba(239,68,68,.22) !important;
      background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(254,242,242,.96)) !important;
      color: #b42318 !important;
      font-size: 11px !important;
      font-weight: 950 !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-shadow: 0 8px 16px rgba(180,35,24,.06) !important;
      margin-left: 8px !important;
    }
    .clear-chat-action-btn:hover {
      border-color: rgba(239,68,68,.34) !important;
      background: linear-gradient(135deg, #fff, #fee2e2) !important;
    }
    .restore-cleared-chats-btn {
      height: 28px !important;
      padding: 0 10px !important;
      border-radius: 999px !important;
      border: 1px solid rgba(120,184,62,.24) !important;
      background: rgba(255,255,255,.88) !important;
      color: #497642 !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      cursor: pointer !important;
      margin-left: 8px !important;
    }
`;
  next = next.replace("</style>", css + "\n  </style>");
}

const jsMarker = "setupLocalClearChatOption";
if (!next.includes(jsMarker)) {
  const js = `

function setupLocalClearChatOption() {
  const storageKey = "iconic_cleared_conversation_keys_v1";

  function loadClearedKeys() {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (e) { return []; }
  }

  function saveClearedKeys(keys) {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set(keys || []))));
  }

  function isClearedConversationKey(key) {
    return loadClearedKeys().indexOf(key) !== -1;
  }

  const originalBuildConversations = buildConversations;
  buildConversations = function() {
    return originalBuildConversations().filter(function(conversation) {
      return !isClearedConversationKey(conversation.key);
    });
  };

  function getSelectedConversationForClear() {
    return originalBuildConversations().find(function(item) { return item.key === selectedConversationKey; }) || null;
  }

  function clearSelectedConversationLocal() {
    const c = getSelectedConversationForClear();
    if (!c || !c.key) {
      alert("Select a conversation first.");
      return;
    }

    const ok = confirm("Clear this conversation from Team Inbox view only?\n\nThis will not remove WhatsApp history or Google Sheet records.");
    if (!ok) return;

    const keys = loadClearedKeys();
    keys.push(c.key);
    saveClearedKeys(keys);

    selectedConversationKey = "";
    selectedPhone = "";
    selectedBranch = "";
    renderAll();
  }

  function restoreClearedChatsLocal() {
    const ok = confirm("Restore all cleared conversations in this browser?");
    if (!ok) return;
    saveClearedKeys([]);
    renderAll();
  }

  function ensureClearControls() {
    const header = document.querySelector(".chat-header") || document.querySelector(".chat-top") || document.querySelector(".conversation-header");
    if (header && !document.getElementById("clearChatActionBtn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "clearChatActionBtn";
      btn.className = "clear-chat-action-btn";
      btn.textContent = "🧹 Clear Chat";
      btn.title = "Hide this conversation from Team Inbox view only";
      btn.addEventListener("click", clearSelectedConversationLocal);
      header.appendChild(btn);
    }

    const footer = document.getElementById("conversationFooterText") || document.querySelector(".conversation-footer");
    if (footer && !document.getElementById("restoreClearedChatsBtn")) {
      const restoreBtn = document.createElement("button");
      restoreBtn.type = "button";
      restoreBtn.id = "restoreClearedChatsBtn";
      restoreBtn.className = "restore-cleared-chats-btn";
      restoreBtn.textContent = "Restore cleared";
      restoreBtn.title = "Show cleared chats again in this browser";
      restoreBtn.addEventListener("click", restoreClearedChatsLocal);
      footer.appendChild(restoreBtn);
    }
  }

  const originalRenderAll = renderAll;
  renderAll = function() {
    originalRenderAll();
    ensureClearControls();
    const btn = document.getElementById("clearChatActionBtn");
    if (btn) btn.style.display = selectedConversationKey ? "inline-flex" : "none";
  };

  ensureClearControls();
}
setupLocalClearChatOption();
`;
  next = next.replace("\nloadMessages();", js + "\nloadMessages();");
}

if (next !== source) {
  fs.writeFileSync(serverPath, next, "utf8");
  console.log("Local Clear Chat option added.");
} else {
  console.log("Local Clear Chat option already active.");
}
