const express = require("express");

const fetch = (...args) => {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch(...args);
  }
  return import("node-fetch").then(({ default: nodeFetch }) => nodeFetch(...args));
};

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "12mb" }));

const BOT_VERSION = "iconic-meta-dm-independent-v1";
const VERIFY_TOKEN = (process.env.VERIFY_TOKEN || "").toString().trim();

const MESSENGER_PAGE_ACCESS_TOKEN = (
  process.env.MESSENGER_PAGE_ACCESS_TOKEN ||
  process.env.META_PAGE_ACCESS_TOKEN ||
  ""
).toString().trim();

const MESSENGER_PAGE_ID = (
  process.env.MESSENGER_PAGE_ID ||
  process.env.META_PAGE_ID ||
  ""
).toString().trim();

const INSTAGRAM_ACCESS_TOKEN = (
  process.env.INSTAGRAM_ACCESS_TOKEN ||
  process.env.IG_ACCESS_TOKEN ||
  process.env.META_PAGE_ACCESS_TOKEN ||
  ""
).toString().trim();

const INSTAGRAM_BUSINESS_ACCOUNT_ID = (
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ||
  process.env.IG_BUSINESS_ACCOUNT_ID ||
  ""
).toString().trim();

const BOT_HEADER_IMAGE_URL = (
  process.env.BOT_HEADER_IMAGE_URL ||
  "https://iconichaircare.com/wp-content/uploads/2026/05/BE6F2E6E-357D-486A-ADC3-0A8F70D22A26.jpg"
).toString().trim();

const META_RESULTS_IMAGE_URL = (process.env.META_RESULTS_IMAGE_URL || "").toString().trim();
const META_RESULTS_VIDEO_URL = (process.env.META_RESULTS_VIDEO_URL || "").toString().trim();
const DETAILS_VIDEO_URL = (
  process.env.DETAILS_VIDEO_URL ||
  "https://iconichaircare.com/wp-content/uploads/2026/05/iconic-details-video-v2-compressed.mp4"
).toString().trim();

const DUBAI_LOCATION_URL = process.env.DUBAI_LOCATION_URL || "https://maps.app.goo.gl/KyyhbpVVZJ2ixEEBA";
const ABU_DHABI_LOCATION_URL = process.env.ABU_DHABI_LOCATION_URL || "https://maps.app.goo.gl/twg5JEuP6JgKWP1s7";
const BUSINESS_NAME = "I C O N I C   H A I R   C A R E";

const conversationState = new Map();

function normalizeText(value) {
  return (value || "").toString().toLowerCase().trim().replace(/\s+/g, " ");
}

function isArabic(text) {
  return /[\u0600-\u06FF]/.test((text || "").toString());
}

function quickReply(title, payload) {
  return {
    content_type: "text",
    title: title.toString().slice(0, 20),
    payload: payload.toString().slice(0, 1000)
  };
}

function mainReplies(ar) {
  return ar
    ? [quickReply("حجز", "BOOKING"), quickReply("خدماتنا", "SERVICES"), quickReply("فريقنا", "TEAM")]
    : [quickReply("Booking", "BOOKING"), quickReply("Services", "SERVICES"), quickReply("Team", "TEAM")];
}

function bookingReplies(ar) {
  return ar
    ? [quickReply("استشارة", "CONSULT"), quickReply("سيرفس", "SERVICE"), quickReply("ساعدني", "TEAM")]
    : [quickReply("Consult", "CONSULT"), quickReply("Service", "SERVICE"), quickReply("Help", "TEAM")];
}

function servicesReplies(ar) {
  return ar
    ? [quickReply("نتائج", "RESULTS"), quickReply("موقعنا", "LOCATION"), quickReply("استشارة", "CONSULT")]
    : [quickReply("Results", "RESULTS"), quickReply("Location", "LOCATION"), quickReply("Consult", "CONSULT")];
}

function resultsReplies(ar) {
  return ar
    ? [quickReply("استشارة", "CONSULT"), quickReply("فريقنا", "TEAM")]
    : [quickReply("Consult", "CONSULT"), quickReply("Team", "TEAM")];
}

function branchReplies(ar) {
  return ar
    ? [quickReply("دبي", "BRANCH_DUBAI"), quickReply("أبوظبي", "BRANCH_ABUDHABI")]
    : [quickReply("Dubai", "BRANCH_DUBAI"), quickReply("Abu Dhabi", "BRANCH_ABUDHABI")];
}

function dayReplies(ar) {
  return ar
    ? [quickReply("اليوم", "DAY_TODAY"), quickReply("بكرا", "DAY_TOMORROW"), quickReply("هذا الأسبوع", "DAY_WEEK")]
    : [quickReply("Today", "DAY_TODAY"), quickReply("Tomorrow", "DAY_TOMORROW"), quickReply("This week", "DAY_WEEK")];
}

function timeReplies(ar) {
  return ar
    ? [quickReply("5:00", "TIME_5"), quickReply("6:00", "TIME_6"), quickReply("6:30", "TIME_630")]
    : [quickReply("5:00 PM", "TIME_5"), quickReply("6:00 PM", "TIME_6"), quickReply("6:30 PM", "TIME_630")];
}

function staffReplies(ar) {
  return ar
    ? [
        quickReply("أحمد", "STAFF_AHMAD"),
        quickReply("وائل", "STAFF_WAEL"),
        quickReply("تامر", "STAFF_TAMER"),
        quickReply("بشير", "STAFF_BASHIR"),
        quickReply("عماد", "STAFF_EMAD"),
        quickReply("حمودة", "STAFF_HAMOUDA"),
        quickReply("اني", "STAFF_ANI"),
        quickReply("عمر", "STAFF_OMAR"),
        quickReply("أسامة", "STAFF_OSAMA"),
        quickReply("أدهم", "STAFF_ADHAM"),
        quickReply("أي مختص", "STAFF_ANY")
      ]
    : [
        quickReply("Ahmad", "STAFF_AHMAD"),
        quickReply("Wael", "STAFF_WAEL"),
        quickReply("Tamer", "STAFF_TAMER"),
        quickReply("Bashir", "STAFF_BASHIR"),
        quickReply("Emad", "STAFF_EMAD"),
        quickReply("Hamouda", "STAFF_HAMOUDA"),
        quickReply("Ani", "STAFF_ANI"),
        quickReply("Omar", "STAFF_OMAR"),
        quickReply("Osama", "STAFF_OSAMA"),
        quickReply("Adham", "STAFF_ADHAM"),
        quickReply("Any specialist", "STAFF_ANY")
      ];
}

function getState(key) {
  if (!conversationState.has(key)) conversationState.set(key, {});
  return conversationState.get(key);
}

function resetState(key) {
  conversationState.delete(key);
}

function isGreeting(text) {
  const value = normalizeText(text);
  return !value || ["hi", "hello", "hey", "مرحبا", "هلا", "السلام عليكم", "هاي"].includes(value);
}

function isBooking(text) {
  const value = normalizeText(text);
  return ["booking", "book", "حجز", "موعد", "booking | حجز", "book appointment", "BOOKING".toLowerCase()].includes(value) || value.includes("احجز") || value.includes("appointment");
}

function isConsult(text) {
  const value = normalizeText(text);
  return value === "consult" || value === "consultation" || value === "consult | استشارة" || value.includes("استشارة") || value.includes("استشاره") || value.includes("consult");
}

function isService(text) {
  const value = normalizeText(text);
  return value === "service" || value === "service | سيرفس" || value.includes("سيرفس") || value.includes("service") || value.includes("fitting") || value.includes("follow up") || value.includes("adjustment") || value.includes("تركيب") || value.includes("متابعة") || value.includes("تعديل");
}

function isServices(text) {
  const value = normalizeText(text);
  return value === "services" || value === "services | خدماتنا" || value.includes("خدمات") || value.includes("hair replacement");
}

function isResults(text) {
  const value = normalizeText(text);
  return value === "results" || value.includes("نتائج") || value.includes("صور") || value.includes("صورة") || value.includes("photo") || value.includes("video") || value.includes("before") || value.includes("قبل وبعد");
}

function isLocation(text) {
  const value = normalizeText(text);
  return value === "location" || value.includes("موقع") || value.includes("لوكيشن") || value.includes("map") || value.includes("branch");
}

function isTeam(text) {
  const value = normalizeText(text);
  return value === "team" || value === "help" || value.includes("فريق") || value.includes("ساعدني") || value.includes("موظف") || value.includes("human") || value.includes("support");
}

function payloadToBranch(payload) {
  if (payload === "BRANCH_ABUDHABI") return "Abu Dhabi";
  if (payload === "BRANCH_DUBAI") return "Dubai";
  return "";
}

function payloadToDay(payload, ar) {
  if (payload === "DAY_TODAY") return ar ? "اليوم" : "Today";
  if (payload === "DAY_TOMORROW") return ar ? "بكرا" : "Tomorrow";
  if (payload === "DAY_WEEK") return ar ? "هذا الأسبوع" : "This week";
  return "";
}

function payloadToTime(payload) {
  if (payload === "TIME_5") return "5:00 PM";
  if (payload === "TIME_6") return "6:00 PM";
  if (payload === "TIME_630") return "6:30 PM";
  return "";
}

function payloadToStaff(payload) {
  const names = {
    STAFF_AHMAD: "Ahmad",
    STAFF_WAEL: "Wael",
    STAFF_TAMER: "Tamer",
    STAFF_BASHIR: "Bashir",
    STAFF_EMAD: "Emad",
    STAFF_HAMOUDA: "Hamouda",
    STAFF_ANI: "Ani",
    STAFF_OMAR: "Omar",
    STAFF_OSAMA: "Osama",
    STAFF_ADHAM: "Adham",
    STAFF_ANY: "Any available specialist"
  };
  return names[payload] || "";
}

function welcomeBody(ar) {
  return ar
    ? `Hello 👋\n\nمعك ${BUSINESS_NAME}\n\nكيف فينا نساعدك؟`
    : `Hello 👋\n\nYou are chatting with ${BUSINESS_NAME}.\n\nHow can we help you?`;
}

function bookingBody(ar) {
  return ar
    ? "أكيد، اختر نوع الحجز المناسب لك:\n\nإذا كنت عميل حالي وتريد خدمة / متابعة / تركيب / تعديل، اختر سيرفس.\n\nإذا كنت عميل جديد وتريد معرفة الحل الأنسب، اختر استشارة.\n\n------------------------------\n\nSure, please choose the right booking type."
    : "Sure, please choose the right booking type:\n\nIf you are an existing client and need service / follow-up / fitting / adjustment, choose Service.\n\nIf you are a new client and want to know the best solution, choose Consultation.";
}

function servicesBody(ar) {
  return ar
    ? "أكيد ✨\n\nفي Iconic Hair Care نقدم حلول Hair Replacement بمظهر طبيعي 100%، بدون جراحة.\n\nشو تحب تشوف أولاً؟"
    : "Sure ✨\n\nAt Iconic Hair Care, we provide Hair Replacement solutions with a 100% natural look, without surgery.\n\nWhat would you like to check first?";
}

function resultsBody(ar) {
  return ar
    ? "هذه بعض النتائج الحقيقية من Iconic Hair Care.\n\nمظهر طبيعي، بدون جراحة، وبشكل يناسبك تماماً.\n\nشو تحب تعمل بعد ما شفت النتائج؟"
    : "Here are some real results from Iconic Hair Care.\n\nNatural look, non-surgical, and designed to suit you.\n\nWhat would you like to do next?";
}

function askBranchBody(ar, intent) {
  const label = intent === "service" ? "Service" : "Consultation";
  return ar
    ? `تمام، اختر الفرع المناسب لـ ${label}:`
    : `Great, please choose the branch for your ${label}:`;
}

function askStaffBody(ar) {
  return ar
    ? "اختر المختص المفضل للسيرفس، أو اختر أي مختص متاح:"
    : "Choose your preferred service specialist, or choose any available specialist:";
}

function askDayBody(ar) {
  return ar ? "تمام، اختر اليوم المناسب:" : "Great, please choose your preferred day:";
}

function askTimeBody(ar) {
  return ar ? "تمام، اختر الوقت المفضل:" : "Great, please choose your preferred time:";
}

function finalSummaryBody(state, ar) {
  const branch = state.branch || "Dubai";
  const day = state.day || (ar ? "غير محدد" : "Not selected");
  const time = state.time || "Flexible";
  const staff = state.staff || "";
  const requestType = state.intent === "service" ? "Service Appointment" : "Consultation Booking";
  return ar
    ? `تم استلام طلبك ✅\n\nنوع الطلب: ${requestType}\nالفرع: ${branch}\nاليوم: ${day}\nالوقت: ${time}${staff ? `\nالمختص: ${staff}` : ""}\n\nالفريق سيراجع الطلب ويرد عليك قريباً للتأكيد.\n\n------------------------------\n\nYour request has been received ✅\nOur team will confirm shortly.`
    : `Your request has been received ✅\n\nRequest type: ${requestType}\nBranch: ${branch}\nDay: ${day}\nTime: ${time}${staff ? `\nSpecialist: ${staff}` : ""}\n\nOur team will review the request and confirm shortly.`;
}

function teamBody(ar) {
  return ar
    ? "تمام 👌\n\nتم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.\n\nملاحظة: تم إيقاف الردود التلقائية مؤقتاً لهذه المحادثة."
    : "Done 👌\n\nYour conversation has been forwarded to our team. One of our specialists will assist you shortly.\n\nNote: Automatic replies have been paused for this conversation.";
}

function locationBody(ar, branch = "Dubai") {
  const locationUrl = branch === "Abu Dhabi" ? ABU_DHABI_LOCATION_URL : DUBAI_LOCATION_URL;
  return ar
    ? `هذا هو موقع فرع ${branch === "Abu Dhabi" ? "أبوظبي" : "دبي"}:\n\n${locationUrl}`
    : `This is our ${branch} branch location:\n\n${locationUrl}`;
}

function buildReply(text, key, hasAttachment) {
  const ar = isArabic(text);
  const state = getState(key);
  const cleanText = (text || "").toString().trim();
  const upper = cleanText.toUpperCase();

  if (upper === "TEAM" || isTeam(cleanText)) {
    resetState(key);
    return { text: teamBody(ar), quickReplies: [] };
  }

  if (upper === "BOOKING" || isBooking(cleanText)) {
    conversationState.set(key, { intent: "booking" });
    return { text: bookingBody(ar), quickReplies: bookingReplies(ar) };
  }

  if (upper === "CONSULT" || isConsult(cleanText)) {
    conversationState.set(key, { intent: "consult" });
    return { text: askBranchBody(ar, "consult"), quickReplies: branchReplies(ar) };
  }

  if (upper === "SERVICE" || isService(cleanText)) {
    conversationState.set(key, { intent: "service" });
    return { text: askStaffBody(ar), quickReplies: staffReplies(ar) };
  }

  const staff = payloadToStaff(upper);
  if (staff && state.intent === "service") {
    state.staff = staff;
    return { text: askBranchBody(ar, "service"), quickReplies: branchReplies(ar) };
  }

  const branch = payloadToBranch(upper);
  if (branch && state.intent) {
    state.branch = branch;
    return { text: askDayBody(ar), quickReplies: dayReplies(ar) };
  }

  const day = payloadToDay(upper, ar);
  if (day && state.intent) {
    state.day = day;
    return { text: askTimeBody(ar), quickReplies: timeReplies(ar) };
  }

  const time = payloadToTime(upper);
  if (time && state.intent) {
    state.time = time;
    const done = { ...state };
    resetState(key);
    return { text: finalSummaryBody(done, ar), quickReplies: [] };
  }

  if (upper === "RESULTS" || isResults(cleanText)) {
    return { text: resultsBody(ar), quickReplies: resultsReplies(ar), sendResultsMedia: true };
  }

  if (upper === "LOCATION" || isLocation(cleanText)) {
    return { text: locationBody(ar, state.branch || "Dubai"), quickReplies: mainReplies(ar) };
  }

  if (upper === "SERVICES" || isServices(cleanText)) {
    return { text: servicesBody(ar), quickReplies: servicesReplies(ar), mediaUrl: BOT_HEADER_IMAGE_URL, mediaType: "image" };
  }

  if (hasAttachment) {
    return {
      text: ar ? "وصلتنا الرسالة أو الملف ✅\nفريقنا رح يراجعها ويرد عليك بأقرب وقت." : "We received your message or file ✅\nOur team will review it and reply as soon as possible.",
      quickReplies: mainReplies(ar)
    };
  }

  if (isGreeting(cleanText)) {
    conversationState.set(key, {});
    return { text: welcomeBody(ar), quickReplies: mainReplies(ar), mediaUrl: BOT_HEADER_IMAGE_URL, mediaType: "image" };
  }

  return {
    text: ar ? "اختر كيف فينا نساعدك:" : "Please choose how we can help:",
    quickReplies: mainReplies(ar)
  };
}

function getChannel(body) {
  const objectName = (body?.object || "").toString().toLowerCase();
  return objectName.includes("instagram") ? "Instagram" : "Messenger";
}

function getSendConfig(channel) {
  const isInstagram = channel === "Instagram";
  return {
    accountId: isInstagram ? INSTAGRAM_BUSINESS_ACCOUNT_ID : MESSENGER_PAGE_ID,
    token: isInstagram ? INSTAGRAM_ACCESS_TOKEN : MESSENGER_PAGE_ACCESS_TOKEN
  };
}

function getIncomingText(event) {
  return (
    event?.message?.quick_reply?.payload ||
    event?.message?.text ||
    event?.postback?.payload ||
    event?.postback?.title ||
    ""
  ).toString().trim();
}

function hasAttachment(event) {
  return Array.isArray(event?.message?.attachments) && event.message.attachments.length > 0;
}

function isSystemEvent(event) {
  return Boolean(
    event?.message?.is_echo ||
    event?.delivery ||
    event?.read ||
    event?.optin ||
    event?.account_linking ||
    event?.take_thread_control ||
    event?.pass_thread_control ||
    event?.request_thread_control
  );
}

async function sendMetaMessage(senderId, messagePayload, channel) {
  const config = getSendConfig(channel);
  if (!config.accountId || !config.token) {
    console.log(`[${channel}] missing env. Message skipped.`);
    return { ok: false, skipped: true };
  }

  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(config.accountId)}/messages`;
  const payload = {
    recipient: { id: senderId },
    messaging_type: "RESPONSE",
    message: messagePayload
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    result = { raw: text };
  }

  if (!response.ok) {
    console.log(`[${channel}] send failed:`);
    console.log(JSON.stringify(result, null, 2));
  }

  return { ok: response.ok, status: response.status, result };
}

async function sendText(senderId, text, quickReplies, channel) {
  const message = { text: text.toString().slice(0, 2000) };
  if (Array.isArray(quickReplies) && quickReplies.length) {
    message.quick_replies = quickReplies.slice(0, 13);
  }
  return sendMetaMessage(senderId, message, channel);
}

async function sendMedia(senderId, mediaType, mediaUrl, channel) {
  const url = (mediaUrl || "").toString().trim();
  if (!url) return { ok: false, skipped: true };
  return sendMetaMessage(senderId, {
    attachment: {
      type: mediaType === "video" ? "video" : "image",
      payload: { url, is_reusable: true }
    }
  }, channel);
}

async function handleEvent(event, channel) {
  if (isSystemEvent(event)) return;

  const senderId = (event?.sender?.id || "").toString().trim();
  if (!senderId) return;

  const incomingText = getIncomingText(event);
  const key = `${channel}:${senderId}`;
  const reply = buildReply(incomingText, key, hasAttachment(event));

  if (reply.mediaUrl) {
    await sendMedia(senderId, reply.mediaType || "image", reply.mediaUrl, channel);
  }

  await sendText(senderId, reply.text, reply.quickReplies || [], channel);

  if (reply.sendResultsMedia) {
    if (META_RESULTS_IMAGE_URL) await sendMedia(senderId, "image", META_RESULTS_IMAGE_URL, channel);
    if (META_RESULTS_VIDEO_URL) await sendMedia(senderId, "video", META_RESULTS_VIDEO_URL, channel);
  }
}

app.get("/", (req, res) => {
  res.status(200).send("Iconic Hair Care Meta DM bot is running");
});

app.get("/api/version", (req, res) => {
  res.json({
    ok: true,
    version: BOT_VERSION,
    routes: ["GET /webhook", "POST /webhook", "GET /api/version"],
    messengerConfigured: Boolean(MESSENGER_PAGE_ACCESS_TOKEN && MESSENGER_PAGE_ID),
    instagramConfigured: Boolean(INSTAGRAM_ACCESS_TOKEN && INSTAGRAM_BUSINESS_ACCOUNT_ID),
    resultsImageConfigured: Boolean(META_RESULTS_IMAGE_URL),
    resultsVideoConfigured: Boolean(META_RESULTS_VIDEO_URL)
  });
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Meta DM webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const channel = getChannel(req.body);
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];

    for (const entry of entries) {
      const events = Array.isArray(entry?.messaging) ? entry.messaging : [];
      for (const event of events) {
        await handleEvent(event, channel);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Meta DM webhook failed:");
    console.error(error);
    return res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${BOT_VERSION} is running on port ${PORT}`);
});
