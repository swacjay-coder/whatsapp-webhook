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

app.get("/inbox", protectInbox, (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Iconic WhatsApp Inbox</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f5f7fb; color: #111827; }
    header { background: #0f172a; color: white; padding: 16px 22px; font-size: 20px; font-weight: 700; }
    .wrap { display: grid; grid-template-columns: 1fr 360px; gap: 16px; padding: 16px; }
    .card { background: white; border-radius: 14px; box-shadow: 0 2px 12px rgba(15,23,42,.08); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; font-size: 14px; }
    th { background: #f8fafc; color: #475569; }
    .customer { color: #047857; font-weight: 700; }
    .bot { color: #2563eb; font-weight: 700; }
    .staff { color: #7c3aed; font-weight: 700; }
    .status { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #e0f2fe; color: #075985; font-size: 12px; }
    textarea, input { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; margin-top: 6px; font-size: 14px; }
    label { font-size: 13px; color: #475569; font-weight: 700; }
    button { width: 100%; padding: 12px; border: 0; border-radius: 10px; background: #16a34a; color: white; font-weight: 700; cursor: pointer; margin-top: 10px; }
    .small { color: #64748b; font-size: 12px; padding: 10px 12px; }
    .msg { max-width: 520px; white-space: pre-wrap; }
    @media (max-width: 900px) { .wrap { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>Iconic Hair Care — Mini WhatsApp Inbox</header>
  <div class="wrap">
    <div class="card">
      <div class="small">Auto refresh every 3 seconds. Open this page to see customer messages, bot replies, and staff replies.</div>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Phone</th>
            <th>Branch</th>
            <th>Sender</th>
            <th>Message</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="rows">
          <tr><td colspan="6">Loading...</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card" style="padding:16px;">
      <h3>Reply from landline</h3>
      <p class="small" style="padding:0;">اكتب رقم العميل والرسالة. الرد سيخرج من رقم الأرضي Cloud API.</p>

      <label>Customer phone</label>
      <input id="to" placeholder="97150xxxxxxx" />

      <label style="display:block;margin-top:12px;">Reply from</label>
      <select id="phoneNumberId" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:10px;margin-top:6px;font-size:14px;">
        <option value="">Auto — نفس الرقم الذي استقبل رسالة العميل</option>
        <option value="${DUBAI_PHONE_NUMBER_ID}">Dubai +971 4 396 3333</option>
        <option value="${ABU_DHABI_PHONE_NUMBER_ID}">Abu Dhabi +971 2 562 2778</option>
      </select>

      <label style="display:block;margin-top:12px;">Message</label>
      <textarea id="body" rows="7" placeholder="مرحباً، معك فريق Iconic Hair Care. كيف فينا نساعدك؟"></textarea>

      <button onclick="sendReply()">Send reply</button>
      <div id="result" class="small"></div>
    </div>
  </div>

<script>
async function loadMessages() {
  const res = await fetch('/api/messages');
  const data = await res.json();
  const rows = document.getElementById('rows');

  if (!data.messages || data.messages.length === 0) {
    rows.innerHTML = '<tr><td colspan="6">No messages yet.</td></tr>';
    return;
  }

  rows.innerHTML = data.messages.map(m => {
    const senderClass = m.sender === 'customer' ? 'customer' : (m.sender === 'bot' ? 'bot' : 'staff');
    return '<tr>' +
      '<td>' + escapeHtml(m.time) + '</td>' +
      '<td><button style="width:auto;padding:6px 8px;margin:0;background:#0ea5e9" data-phone="' + escapeHtml(m.phone) + '" data-phone-number-id="' + escapeHtml(m.phoneNumberId || '') + '" onclick="fillPhoneFromButton(this)">' + escapeHtml(m.phone) + '</button></td>' +
      '<td>' + escapeHtml(m.branch || '') + '</td>' +
      '<td class="' + senderClass + '">' + escapeHtml(m.sender) + '</td>' +
      '<td class="msg">' + escapeHtml(m.body) + '</td>' +
      '<td><span class="status">' + escapeHtml(m.status) + '</span></td>' +
      '</tr>';
  }).join('');
}

function fillPhoneFromButton(button) {
  fillPhone(button.dataset.phone || '', button.dataset.phoneNumberId || '');
}

function fillPhone(phone, phoneNumberId) {
  document.getElementById('to').value = phone;
  if (phoneNumberId) {
    document.getElementById('phoneNumberId').value = phoneNumberId;
  }
}

function escapeHtml(value) {
  return (value || '').toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendReply() {
  const to = document.getElementById('to').value.trim();
  const body = document.getElementById('body').value.trim();
  const phoneNumberId = document.getElementById('phoneNumberId').value.trim();
  const result = document.getElementById('result');

  result.textContent = 'Sending...';

  const res = await fetch('/api/send', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({to, body, phoneNumberId})
  });

  const data = await res.json();

  if (data.ok) {
    result.textContent = 'Sent successfully.';
    document.getElementById('body').value = '';
    loadMessages();
  } else {
    result.textContent = 'Failed: ' + (data.error || 'Unknown error');
  }
}

loadMessages();
setInterval(loadMessages, 3000);
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
