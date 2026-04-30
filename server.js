const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
// Keep PHONE_NUMBER_ID as your default/Dubai number so old setup keeps working.
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const DUBAI_PHONE_NUMBER_ID = process.env.DUBAI_PHONE_NUMBER_ID || PHONE_NUMBER_ID || "1100042333191350";
const ABU_DHABI_PHONE_NUMBER_ID = process.env.ABU_DHABI_PHONE_NUMBER_ID || "1000146433192239";
const STAFF_NUMBER = process.env.STAFF_NUMBER;
const INBOX_USER = process.env.INBOX_USER || "admin";
const INBOX_PASS = process.env.INBOX_PASS || "123456";

function protectInbox(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Iconic Inbox"');
    return res.status(401).send("Authentication required");
  }

  const decoded = Buffer.from(auth.split(" ")[1], "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user === INBOX_USER && pass === INBOX_PASS) {
    return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Iconic Inbox"');
  return res.status(401).send("Invalid username or password");
}


const BUSINESS_NAME_SPACED = "I C O N I C   H A I R   C A R E";
const WEBSITE = "https://iconichaircare.com";

function getLineConfig(phoneNumberId) {
  if (phoneNumberId === ABU_DHABI_PHONE_NUMBER_ID) {
    return {
      phoneNumberId: ABU_DHABI_PHONE_NUMBER_ID,
      branch: "Abu Dhabi",
      callNumber: "02 562 2778",
      displayNumber: "+971 2 562 2778"
    };
  }

  return {
    phoneNumberId: phoneNumberId || DUBAI_PHONE_NUMBER_ID,
    branch: "Dubai",
    callNumber: "04 396 3333",
    displayNumber: "+971 4 396 3333"
  };
}

/* Mini Inbox مؤقت للعرض والتجربة */
const inboxMessages = [];
const conversationStatus = {};
const conversationPhoneNumberId = {};

function addInboxMessage(phone, sender, body, status = "Bot", phoneNumberId = null) {
  const finalPhoneNumberId = phoneNumberId || conversationPhoneNumberId[phone] || DUBAI_PHONE_NUMBER_ID;
  const lineConfig = getLineConfig(finalPhoneNumberId);

  const item = {
    time: new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" }),
    phone,
    sender,
    body,
    status: conversationStatus[phone] || status,
    phoneNumberId: finalPhoneNumberId,
    branch: lineConfig.branch
  };

  inboxMessages.unshift(item);

  if (inboxMessages.length > 300) {
    inboxMessages.pop();
  }
}

function setConversationStatus(phone, status) {
  conversationStatus[phone] = status;
  for (const item of inboxMessages) {
    if (item.phone === phone) {
      item.status = status;
    }
  }
}

function getDubaiHour() {
  const now = new Date();
  const dubaiTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Dubai" })
  );
  return dubaiTime.getHours();
}

function normalizeText(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .trim();
}

function getCustomerChatLink(customerNumber) {
  return `https://wa.me/${customerNumber}`;
}

async function sendWhatsAppMessage(to, body, phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const finalPhoneNumberId = phoneNumberId || DUBAI_PHONE_NUMBER_ID;
  const lineConfig = getLineConfig(finalPhoneNumberId);
  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body }
  };

  console.log(`Sending WhatsApp message from ${lineConfig.branch} (${finalPhoneNumberId}) to ${to}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    console.log("WhatsApp API send failed:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("WhatsApp message sent successfully:");
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

/* واجهة Inbox بسيطة */
app.get("/", (req, res) => {
  res.redirect("/inbox");
});

app.get("/api/messages", protectInbox, (req, res) => {
  res.json({
    ok: true,
    messages: inboxMessages
  });
});

app.post("/api/send", protectInbox, async (req, res) => {
  try {
    const to = (req.body?.to || "").toString().trim();
    const body = (req.body?.body || "").toString().trim();

    if (!to || !body) {
      return res.status(400).json({
        ok: false,
        error: "Missing to or body"
      });
    }

    const phoneNumberId =
      (req.body?.phoneNumberId || "").toString().trim() ||
      conversationPhoneNumberId[to] ||
      DUBAI_PHONE_NUMBER_ID;

    conversationPhoneNumberId[to] = phoneNumberId;

    await sendWhatsAppMessage(to, body, phoneNumberId);
    setConversationStatus(to, "Human Reply");
    addInboxMessage(to, "staff", body, "Human Reply", phoneNumberId);

    return res.json({ ok: true });
  } catch (error) {
    console.error("Inbox send failed:");
    console.error(error);
    return res.status(500).json({
      ok: false,
      error: "Send failed"
    });
  }
});


app.post("/api/status", protectInbox, (req, res) => {
  const phone = (req.body?.phone || "").toString().trim();
  const status = (req.body?.status || "").toString().trim();

  if (!phone || !status) {
    return res.status(400).json({
      ok: false,
      error: "Missing phone or status"
    });
  }

  setConversationStatus(phone, status);

  return res.json({ ok: true });
});

app.get("/inbox", protectInbox, (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Iconic Hair Care Team Inbox</title>
  <style>
    :root {
      --bg: #eef2f6;
      --card: #ffffff;
      --ink: #101828;
      --muted: #667085;
      --line: #e4e7ec;
      --green: #128c4a;
      --green-dark: #0b6f3a;
      --shadow: 0 18px 50px rgba(16, 24, 40, .08);
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: radial-gradient(circle at top left, #dff7ea 0, transparent 30%), var(--bg); color: var(--ink); }
    header { background: linear-gradient(135deg, #0b1f18, #123b2a 52%, #0f172a); color: white; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 10px 35px rgba(15, 23, 42, .18); }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { width: 44px; height: 44px; border-radius: 14px; background: white; color: #101828; display: grid; place-items: center; font-weight: 900; letter-spacing: -1px; box-shadow: 0 10px 25px rgba(0,0,0,.16); }
    .brand h1 { margin: 0; font-size: 19px; line-height: 1.1; }
    .brand p { margin: 4px 0 0; color: rgba(255,255,255,.75); font-size: 12px; }
    .header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .pill { border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.1); padding: 8px 10px; border-radius: 999px; color: white; font-size: 12px; }
    .container { padding: 16px; max-width: 1500px; margin: 0 auto; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
    .stat { background: rgba(255,255,255,.86); backdrop-filter: blur(10px); border: 1px solid rgba(228,231,236,.9); border-radius: var(--radius); padding: 14px; box-shadow: 0 10px 30px rgba(16,24,40,.05); }
    .stat .label { color: var(--muted); font-size: 12px; font-weight: 700; }
    .stat .value { margin-top: 5px; font-size: 25px; font-weight: 900; letter-spacing: -.5px; }
    .layout { display: grid; grid-template-columns: 350px minmax(0, 1fr) 370px; gap: 14px; align-items: stretch; }
    .panel { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); min-height: 680px; overflow: hidden; }
    .panel-head { padding: 14px; border-bottom: 1px solid var(--line); background: #fbfcfd; }
    .panel-head h2 { margin: 0; font-size: 15px; }
    .panel-head p { margin: 5px 0 0; color: var(--muted); font-size: 12px; }
    .toolbar { display: grid; gap: 8px; padding: 12px; border-bottom: 1px solid var(--line); }
    input, textarea, select { width: 100%; border: 1px solid #d0d5dd; border-radius: 12px; padding: 11px 12px; font-size: 14px; outline: none; background: white; color: var(--ink); }
    input:focus, textarea:focus, select:focus { border-color: #16a34a; box-shadow: 0 0 0 4px rgba(22,163,74,.10); }
    .filter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .customer-list { overflow-y: auto; max-height: 560px; padding: 8px; }
    .customer-card { border: 1px solid transparent; border-radius: 16px; padding: 12px; cursor: pointer; margin-bottom: 8px; transition: .15s ease; background: #fff; }
    .customer-card:hover { background: #f7fbf8; border-color: #d9f0e1; }
    .customer-card.active { background: #ecfdf3; border-color: #86efac; }
    .customer-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .phone { font-weight: 900; font-size: 14px; }
    .preview { color: var(--muted); font-size: 12px; margin-top: 8px; line-height: 1.35; max-height: 36px; overflow: hidden; }
    .meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .tag { font-size: 11px; border-radius: 999px; padding: 5px 8px; font-weight: 800; background: #f2f4f7; color: #344054; }
    .tag.green { background: #dcfae6; color: #067647; }
    .tag.blue { background: #dbeafe; color: #1d4ed8; }
    .tag.purple { background: #ede9fe; color: #6d28d9; }
    .tag.amber { background: #fef3c7; color: #92400e; }
    .tag.red { background: #fee4e2; color: #b42318; }
    .chat-panel { display: flex; flex-direction: column; }
    .conversation-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .chat-area { flex: 1; padding: 18px; overflow-y: auto; background: linear-gradient(180deg, #f8fafc, #ffffff); max-height: 560px; min-height: 560px; }
    .empty { height: 100%; display: grid; place-items: center; color: var(--muted); text-align: center; padding: 30px; }
    .bubble-row { display: flex; margin-bottom: 12px; }
    .bubble-row.customer { justify-content: flex-start; }
    .bubble-row.bot, .bubble-row.staff { justify-content: flex-end; }
    .bubble { max-width: min(680px, 82%); border-radius: 18px; padding: 11px 13px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; border: 1px solid var(--line); box-shadow: 0 5px 18px rgba(16,24,40,.05); }
    .bubble.customer { background: #ffffff; }
    .bubble.bot { background: #eff6ff; border-color: #bfdbfe; }
    .bubble.staff { background: #ecfdf3; border-color: #bbf7d0; }
    .bubble small { display: block; margin-bottom: 6px; color: var(--muted); font-weight: 800; }
    .reply-panel { padding: 14px; }
    .reply-panel h3 { margin: 0 0 10px; font-size: 16px; }
    label { display: block; color: #344054; font-size: 12px; font-weight: 900; margin: 12px 0 6px; }
    button { border: 0; border-radius: 12px; padding: 12px 14px; font-weight: 900; cursor: pointer; background: var(--green); color: white; transition: .15s ease; width: 100%; }
    button:hover { background: var(--green-dark); transform: translateY(-1px); }
    button.secondary { background: #f2f4f7; color: #344054; border: 1px solid #d0d5dd; }
    button.secondary:hover { background: #e4e7ec; }
    .button-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
    .quick-grid button { padding: 10px; font-size: 12px; }
    .result { min-height: 20px; margin-top: 10px; font-size: 12px; color: var(--muted); }
    .note { font-size: 12px; color: var(--muted); line-height: 1.45; background: #f8fafc; border: 1px dashed #d0d5dd; border-radius: 14px; padding: 10px; }
    @media (max-width: 1180px) { .layout { grid-template-columns: 320px 1fr; } .reply-panel-wrap { grid-column: 1 / -1; } }
    @media (max-width: 800px) { .stats { grid-template-columns: repeat(2, 1fr); } .layout { grid-template-columns: 1fr; } header { align-items: flex-start; flex-direction: column; } .panel { min-height: auto; } .chat-area { min-height: 430px; max-height: 430px; } }
  </style>
</head>
<body>
  <header>
    <div class="brand"><div class="logo">IC</div><div><h1>Iconic Hair Care Team Inbox</h1><p>Dubai & Abu Dhabi WhatsApp Cloud API inbox</p></div></div>
    <div class="header-actions"><div class="pill">Dubai: +971 4 396 3333</div><div class="pill">Abu Dhabi: +971 2 562 2778</div><div class="pill" id="lastRefresh">Loading...</div></div>
  </header>

  <main class="container">
    <section class="stats">
      <div class="stat"><div class="label">Customers</div><div class="value" id="statCustomers">0</div></div>
      <div class="stat"><div class="label">Messages</div><div class="value" id="statMessages">0</div></div>
      <div class="stat"><div class="label">Dubai Threads</div><div class="value" id="statDubai">0</div></div>
      <div class="stat"><div class="label">Abu Dhabi Threads</div><div class="value" id="statAuh">0</div></div>
    </section>

    <section class="layout">
      <aside class="panel">
        <div class="panel-head"><h2>Conversations</h2><p>اختار العميل من القائمة للرد من نفس الفرع.</p></div>
        <div class="toolbar">
          <input id="search" placeholder="Search phone, name, message..." oninput="render()" />
          <div class="filter-row"><select id="branchFilter" onchange="render()"><option value="all">All branches</option><option value="Dubai">Dubai</option><option value="Abu Dhabi">Abu Dhabi</option></select><select id="statusFilter" onchange="render()"><option value="all">All statuses</option><option value="Bot">Bot</option><option value="Consultation Request">Consultation</option><option value="Talk to Team">Talk to Team</option><option value="Human Reply">Human Reply</option><option value="Need Follow-up">Need Follow-up</option><option value="Booked">Booked</option><option value="Closed">Closed</option></select></div>
        </div>
        <div id="customerList" class="customer-list"></div>
      </aside>

      <section class="panel chat-panel">
        <div class="panel-head conversation-title"><div><h2 id="chatTitle">Select a conversation</h2><p id="chatSubtitle">No customer selected yet.</p></div><span class="tag green" id="chatBranch">Branch</span></div>
        <div id="chatArea" class="chat-area"><div class="empty">Select a customer from the left side.<br />اختار عميل من القائمة.</div></div>
      </section>

      <aside class="panel reply-panel-wrap">
        <div class="reply-panel">
          <h3>Reply Panel</h3>
          <div class="note">الرد الافتراضي يطلع من نفس رقم الفرع الذي استقبل رسالة العميل. لا تغيّر الفرع إلا إذا كنت متأكد.</div>
          <label>Customer phone</label><input id="to" placeholder="97150xxxxxxx" />
          <label>Reply from</label><select id="phoneNumberId"><option value="">Auto — same receiving branch</option><option value="${DUBAI_PHONE_NUMBER_ID}">Dubai +971 4 396 3333</option><option value="${ABU_DHABI_PHONE_NUMBER_ID}">Abu Dhabi +971 2 562 2778</option></select>
          <label>Status</label><select id="statusSelect" onchange="updateStatusFromSelect()"><option value="Bot">Bot</option><option value="Consultation Request">Consultation Request</option><option value="Talk to Team">Talk to Team</option><option value="Human Reply">Human Reply</option><option value="Need Follow-up">Need Follow-up</option><option value="Booked">Booked</option><option value="Closed">Closed</option></select>
          <label>Quick replies</label><div class="quick-grid"><button class="secondary" onclick="useTemplate('greeting')">Greeting</button><button class="secondary" onclick="useTemplate('consult')">Consultation</button><button class="secondary" onclick="useTemplate('location')">Location</button><button class="secondary" onclick="useTemplate('followup')">Follow-up</button></div>
          <label>Message</label><textarea id="body" rows="8" placeholder="مرحباً، معك فريق Iconic Hair Care. كيف فينا نساعدك؟"></textarea>
          <div class="button-row"><button onclick="sendReply()">Send reply</button><button class="secondary" onclick="clearComposer()">Clear</button></div><div id="result" class="result"></div>
        </div>
      </aside>
    </section>
  </main>

<script>
let allMessages = [];
let conversations = [];
let selectedPhone = '';
const DUBAI_ID = '${DUBAI_PHONE_NUMBER_ID}';
const AUH_ID = '${ABU_DHABI_PHONE_NUMBER_ID}';
function branchClass(branch) { return branch === 'Abu Dhabi' ? 'blue' : 'green'; }
function statusClass(status) { if (status === 'Consultation Request' || status === 'Talk to Team') return 'amber'; if (status === 'Need Follow-up') return 'red'; if (status === 'Booked') return 'purple'; if (status === 'Closed') return 'green'; return 'blue'; }
async function loadMessages() { try { const res = await fetch('/api/messages'); const data = await res.json(); allMessages = data.messages || []; buildConversations(); render(); document.getElementById('lastRefresh').textContent = 'Updated: ' + new Date().toLocaleTimeString('en-US'); } catch (e) { document.getElementById('lastRefresh').textContent = 'Connection issue'; } }
function buildConversations() { const map = {}; allMessages.forEach(function(m) { if (!map[m.phone]) { map[m.phone] = { phone: m.phone, branch: m.branch || 'Dubai', phoneNumberId: m.phoneNumberId || DUBAI_ID, status: m.status || 'Bot', lastTime: m.time || '', lastBody: m.body || '', messages: [] }; } map[m.phone].messages.push(m); if (m.phoneNumberId) map[m.phone].phoneNumberId = m.phoneNumberId; if (m.branch) map[m.phone].branch = m.branch; if (m.status) map[m.phone].status = m.status; }); conversations = Object.values(map).map(function(c) { c.messages.sort(function(a, b) { return new Date(a.time) - new Date(b.time); }); const latest = c.messages[c.messages.length - 1] || {}; c.lastTime = latest.time || c.lastTime; c.lastBody = latest.body || c.lastBody; c.status = latest.status || c.status; c.branch = latest.branch || c.branch; c.phoneNumberId = latest.phoneNumberId || c.phoneNumberId; return c; }); conversations.sort(function(a, b) { return b.messages.length - a.messages.length; }); }
function renderStats() { const phones = new Set(allMessages.map(function(m) { return m.phone; })); const dubaiPhones = new Set(conversations.filter(function(c) { return c.branch === 'Dubai'; }).map(function(c) { return c.phone; })); const auhPhones = new Set(conversations.filter(function(c) { return c.branch === 'Abu Dhabi'; }).map(function(c) { return c.phone; })); document.getElementById('statCustomers').textContent = phones.size; document.getElementById('statMessages').textContent = allMessages.length; document.getElementById('statDubai').textContent = dubaiPhones.size; document.getElementById('statAuh').textContent = auhPhones.size; }
function render() { const q = document.getElementById('search').value.toLowerCase().trim(); const branch = document.getElementById('branchFilter').value; const status = document.getElementById('statusFilter').value; let filtered = conversations.filter(function(c) { const hay = (c.phone + ' ' + c.branch + ' ' + c.status + ' ' + c.lastBody).toLowerCase(); if (q && hay.indexOf(q) === -1) return false; if (branch !== 'all' && c.branch !== branch) return false; if (status !== 'all' && c.status !== status) return false; return true; }); renderStats(); renderCustomerList(filtered); renderChat(); }
function renderCustomerList(list) { const el = document.getElementById('customerList'); if (!list.length) { el.innerHTML = '<div class="empty">No conversations found.</div>'; return; } el.innerHTML = list.map(function(c) { const active = c.phone === selectedPhone ? ' active' : ''; return '<div class="customer-card' + active + '" onclick="selectConversation(\'' + escapeAttr(c.phone) + '\')"><div class="customer-top"><div class="phone">' + escapeHtml(c.phone) + '</div><span class="tag ' + branchClass(c.branch) + '">' + escapeHtml(c.branch) + '</span></div><div class="preview">' + escapeHtml(cleanPreview(c.lastBody)) + '</div><div class="meta"><span class="tag ' + statusClass(c.status) + '">' + escapeHtml(c.status) + '</span><span class="tag">' + escapeHtml(c.messages.length + ' msgs') + '</span></div></div>'; }).join(''); }
function renderChat() { const c = conversations.find(function(x) { return x.phone === selectedPhone; }); const area = document.getElementById('chatArea'); if (!c) { document.getElementById('chatTitle').textContent = 'Select a conversation'; document.getElementById('chatSubtitle').textContent = 'No customer selected yet.'; document.getElementById('chatBranch').textContent = 'Branch'; area.innerHTML = '<div class="empty">Select a customer from the left side.<br />اختار عميل من القائمة.</div>'; return; } document.getElementById('chatTitle').textContent = c.phone; document.getElementById('chatSubtitle').textContent = c.status + ' • ' + c.lastTime; document.getElementById('chatBranch').textContent = c.branch; document.getElementById('chatBranch').className = 'tag ' + branchClass(c.branch); area.innerHTML = c.messages.map(function(m) { const sender = m.sender || 'bot'; return '<div class="bubble-row ' + sender + '"><div class="bubble ' + sender + '"><small>' + escapeHtml(sender.toUpperCase() + ' • ' + (m.time || '')) + '</small>' + escapeHtml(m.body || '') + '</div></div>'; }).join(''); area.scrollTop = area.scrollHeight; }
function selectConversation(phone) { selectedPhone = phone; const c = conversations.find(function(x) { return x.phone === phone; }); if (!c) return; document.getElementById('to').value = c.phone; document.getElementById('phoneNumberId').value = c.phoneNumberId || ''; document.getElementById('statusSelect').value = c.status || 'Bot'; render(); }
function cleanPreview(value) { return (value || '').replace(/\s+/g, ' ').slice(0, 120); }
function useTemplate(type) { const templates = { greeting: 'مرحباً، معك فريق Iconic Hair Care. كيف فينا نساعدك؟\n\nHello, this is Iconic Hair Care team. How can we help you?', consult: 'تم استلام طلب الاستشارة الخاص بك ✅\n\nيرجى إرسال صورة واضحة أو شرح قصير للحالة، وسيقوم الفريق بمساعدتك بالخيار الأنسب.\n\nYour consultation request has been received ✅\nPlease send a clear photo or short description, and our team will guide you to the best option.', location: 'فروعنا:\nDubai: https://maps.google.com/?q=Iconic+Hair+Care+Dubai\nAbu Dhabi: https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi\n\nWorking hours: 10:00 AM to 7:00 PM', followup: 'شكراً لتواصلك مع Iconic Hair Care. هل تحب نحجز لك استشارة أو تفضل أن يتواصل معك أحد أعضاء الفريق؟\n\nThank you for contacting Iconic Hair Care. Would you like to book a consultation, or should our team contact you?' }; document.getElementById('body').value = templates[type] || ''; }
async function updateStatusFromSelect() { const phone = document.getElementById('to').value.trim(); const status = document.getElementById('statusSelect').value; const result = document.getElementById('result'); if (!phone) return; result.textContent = 'Updating status...'; const res = await fetch('/api/status', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({phone: phone, status: status}) }); const data = await res.json(); if (data.ok) { result.textContent = 'Status updated.'; selectedPhone = phone; await loadMessages(); } else { result.textContent = 'Failed: ' + (data.error || 'Unknown error'); } }
async function sendReply() { const to = document.getElementById('to').value.trim(); const body = document.getElementById('body').value.trim(); const phoneNumberId = document.getElementById('phoneNumberId').value.trim(); const result = document.getElementById('result'); if (!to || !body) { result.textContent = 'Please enter customer phone and message.'; return; } result.textContent = 'Sending...'; const res = await fetch('/api/send', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({to: to, body: body, phoneNumberId: phoneNumberId}) }); const data = await res.json(); if (data.ok) { result.textContent = 'Sent successfully.'; document.getElementById('body').value = ''; selectedPhone = to; await loadMessages(); } else { result.textContent = 'Failed: ' + (data.error || 'Unknown error'); } }
function clearComposer() { document.getElementById('body').value = ''; document.getElementById('result').textContent = ''; }
function escapeHtml(value) { return (value || '').toString().replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function escapeAttr(value) { return escapeHtml(value).replaceAll('\\', '\\\\'); }
loadMessages(); setInterval(loadMessages, 3000);
</script>
</body>
</html>`);
});

/* تحقق من Webhook */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* استقبال الرسائل */
app.post("/webhook", async (req, res) => {
  console.log("New webhook payload:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const incomingPhoneNumberId = value?.metadata?.phone_number_id || DUBAI_PHONE_NUMBER_ID;
    const lineConfig = getLineConfig(incomingPhoneNumberId);
    const profileName = value?.contacts?.[0]?.profile?.name || "";

    conversationPhoneNumberId[from] = incomingPhoneNumberId;

    console.log("Incoming message received on:", lineConfig.branch, incomingPhoneNumberId);

    let text = "";

    if (message.type === "text") {
      text = normalizeText(message.text?.body);
    }

    if (!text) {
      text = "";
    }

    addInboxMessage(
      from,
      "customer",
      profileName ? `${profileName}: ${message.text?.body || ""}` : (message.text?.body || ""),
      "Bot",
      incomingPhoneNumberId
    );

    const hour = getDubaiHour();
    console.log("Dubai hour:", hour);

    let replyText = "";

    /* خارج أوقات العمل */
    if (hour < 10 || hour >= 19) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "شكراً لتواصلك معنا.\n\n" +
        "تم استلام رسالتك بنجاح، وسيقوم فريقنا بالرد عليك في أقرب وقت خلال ساعات العمل.\n\n" +
        "ساعات العمل:\n" +
        "10:00 صباحاً إلى 7:00 مساءً\n\n" +
        `📞 للاتصال المباشر من الهاتف:\n${lineConfig.callNumber}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Thank you for contacting us.\n\n" +
        "Your message has been received successfully. A member of our team will get back to you as soon as possible during working hours.\n\n" +
        "Working hours:\n" +
        "10:00 AM to 7:00 PM\n\n" +
        `📞 To call us directly:\n${lineConfig.callNumber}`;
    }

    /* 1 — حجز استشارة */
    else if (text === "1" || text === "١") {
      setConversationStatus(from, "Consultation Request");

      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تم استلام طلب الاستشارة الخاص بك ✅\n\n" +
        "سيقوم أحد أعضاء فريقنا بالتواصل معك قريباً لمعرفة التفاصيل ومساعدتك في اختيار الخدمة الأنسب.\n\n" +
        `📞 للاتصال المباشر من الهاتف:\n${lineConfig.callNumber}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Your consultation request has been received ✅\n\n" +
        "A member of our team will contact you shortly to understand your needs and guide you to the most suitable service.\n\n" +
        `📞 To call us directly:\n${lineConfig.callNumber}`;
    }

    /* 2 — الخدمات */
    else if (
      text === "2" ||
      text === "٢" ||
      text.includes("service") ||
      text.includes("services") ||
      text.includes("خدمات") ||
      text.includes("الخدمات")
    ) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "نقدم في Iconic Hair Care حلولاً مخصصة للعناية بالشعر حسب الحالة والاحتياج.\n\n" +
        "من خدماتنا:\n" +
        "• استشارات الشعر وفروة الرأس\n" +
        "• حلول التكثيف ومظهر الشعر الطبيعي\n" +
        "• عناية مخصصة حسب الحالة\n" +
        "• متابعة وتوجيه من فريق مختص\n\n" +
        "للمساعدة بشكل أدق، اختر:\n\n" +
        "1️⃣ حجز استشارة\n" +
        "6️⃣ التحدث مع أحد أعضاء الفريق\n\n" +
        `📞 للاتصال المباشر من الهاتف:\n${lineConfig.callNumber}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "At Iconic Hair Care, we provide personalized hair care solutions based on your needs.\n\n" +
        "Our services include:\n" +
        "• Hair and scalp consultation\n" +
        "• Natural-looking volume solutions\n" +
        "• Personalized hair care guidance\n" +
        "• Professional support from our team\n\n" +
        "For better assistance, please choose:\n\n" +
        "1️⃣ Book a consultation\n" +
        "6️⃣ Speak with our team\n\n" +
        `📞 To call us directly:\n${lineConfig.callNumber}`;
    }

    /* 3 — الأسعار والعروض */
    else if (
      text === "3" ||
      text === "٣" ||
      text.includes("price") ||
      text.includes("prices") ||
      text.includes("cost") ||
      text.includes("offer") ||
      text.includes("offers") ||
      text.includes("سعر") ||
      text.includes("الاسعار") ||
      text.includes("الأسعار") ||
      text.includes("عرض") ||
      text.includes("عروض")
    ) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تختلف الأسعار حسب نوع الخدمة والحالة المطلوبة.\n\n" +
        "لذلك ننصح بحجز استشارة قصيرة حتى يستطيع فريقنا توجيهك للخيار الأنسب وتوضيح التفاصيل بدقة.\n\n" +
        "اختر:\n" +
        "1️⃣ حجز استشارة\n" +
        "6️⃣ التحدث مع أحد أعضاء الفريق\n\n" +
        `📞 للاتصال المباشر من الهاتف:\n${lineConfig.callNumber}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Prices vary depending on the service and your specific needs.\n\n" +
        "We recommend booking a short consultation so our team can guide you to the most suitable option and explain the details clearly.\n\n" +
        "Please choose:\n" +
        "1️⃣ Book a consultation\n" +
        "6️⃣ Speak with our team\n\n" +
        `📞 To call us directly:\n${lineConfig.callNumber}`;
    }

    /* 5 — المواقع وساعات العمل */
    else if (
      text === "5" ||
      text === "٥" ||
      text.includes("location") ||
      text.includes("locations") ||
      text.includes("map") ||
      text.includes("موقع") ||
      text.includes("الموقع") ||
      text.includes("فرع") ||
      text.includes("فروع")
    ) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "فروع Iconic Hair Care:\n\n" +
        "دبي:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
        "أبوظبي:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi\n\n" +
        "ساعات العمل:\n" +
        "10:00 صباحاً إلى 7:00 مساءً\n\n" +
        `📞 للاتصال المباشر من الهاتف:\n${lineConfig.callNumber}\n\n` +
        `الموقع الرسمي:\n${WEBSITE}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Iconic Hair Care branches:\n\n" +
        "Dubai:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
        "Abu Dhabi:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi\n\n" +
        "Working hours:\n" +
        "10:00 AM to 7:00 PM\n\n" +
        `📞 To call us directly:\n${lineConfig.callNumber}\n\n` +
        `Website:\n${WEBSITE}`;
    }

    /* 6 — التحدث مع موظف */
    else if (
      text === "6" ||
      text === "٦" ||
      text.includes("موظف") ||
      text.includes("فريق") ||
      text.includes("استشارة") ||
      text.includes("support") ||
      text.includes("team") ||
      text.includes("human") ||
      text.includes("consultation")
    ) {
      setConversationStatus(from, "Talk to Team");

      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تم تحويل طلبك إلى فريق Iconic Hair Care ✅\n\n" +
        "سيقوم أحد أعضاء الفريق بالرد عليك قريباً.\n\n" +
        `📞 للاتصال المباشر من الهاتف:\n${lineConfig.callNumber}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Your request has been transferred to the Iconic Hair Care team ✅\n\n" +
        "A team member will reply to you shortly.\n\n" +
        `📞 To call us directly:\n${lineConfig.callNumber}`;
    }

    /* القائمة الرئيسية */
    else {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "مرحباً بك في Iconic Hair Care.\n\n" +
        "يسعدنا مساعدتك واختيار الخدمة الأنسب لك حسب حالتك واحتياجك.\n\n" +
        "يرجى اختيار الرقم المناسب:\n\n" +
        "1️⃣ حجز استشارة\n" +
        "2️⃣ خدمات الشعر والتكثيف\n" +
        "3️⃣ الأسعار والعروض\n" +
        "5️⃣ الموقع وساعات العمل\n" +
        "6️⃣ التحدث مع أحد أعضاء الفريق\n\n" +
        `📞 للاتصال المباشر من الهاتف:\n${lineConfig.callNumber}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Welcome to Iconic Hair Care.\n\n" +
        "Our team will be happy to guide you to the most suitable service based on your needs.\n\n" +
        "Please choose one of the following options:\n\n" +
        "1️⃣ Book a consultation\n" +
        "2️⃣ Hair care & volume solutions\n" +
        "3️⃣ Prices & offers\n" +
        "5️⃣ Locations & working hours\n" +
        "6️⃣ Speak with our team\n\n" +
        `📞 To call us directly:\n${lineConfig.callNumber}`;
    }

    /* إرسال الرد للعميل */
    await sendWhatsAppMessage(from, replyText, incomingPhoneNumberId);
    addInboxMessage(from, "bot", replyText, conversationStatus[from] || "Bot", incomingPhoneNumberId);

    /* إشعار الموظف عند طلب استشارة أو موظف */
    const shouldNotifyStaff =
      text === "1" || text === "١" ||
      text === "6" || text === "٦" ||
      text.includes("موظف") ||
      text.includes("فريق") ||
      text.includes("استشارة") ||
      text.includes("support") ||
      text.includes("team") ||
      text.includes("human") ||
      text.includes("consultation");

    if (shouldNotifyStaff && STAFF_NUMBER) {
      try {
        const customerChatLink = getCustomerChatLink(from);

        const staffBody =
          "طلب تواصل/استشارة جديد عبر واتساب\n\n" +
          "الفرع / الرقم المستلم:\n" +
          lineConfig.branch + " - " + lineConfig.displayNumber +
          "\n\n" +
          "رقم العميل:\n" +
          from +
          "\n\n" +
          "رابط محادثة العميل:\n" +
          customerChatLink +
          "\n\n" +
          "آخر رسالة من العميل:\n" +
          (message.text?.body || "") +
          "\n\n" +
          "افتح Mini Inbox لمتابعة المحادثة والرد من رقم الأرضي.\n\n" +
          "------------------------------\n\n" +
          "New WhatsApp team/consultation request\n\n" +
          "Receiving branch/line:\n" +
          lineConfig.branch + " - " + lineConfig.displayNumber +
          "\n\n" +
          "Customer Number:\n" +
          from +
          "\n\n" +
          "Open customer chat:\n" +
          customerChatLink +
          "\n\n" +
          "Last customer message:\n" +
          (message.text?.body || "") +
          "\n\n" +
          "Open Mini Inbox to review and reply from the landline number.";

        await sendWhatsAppMessage(STAFF_NUMBER, staffBody, incomingPhoneNumberId);
      } catch (staffError) {
        console.log("Staff notification failed:");
        console.log(staffError);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error handling webhook:");
    console.error(error);

    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
