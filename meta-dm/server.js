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

const BOT_VERSION = "iconic-meta-dm-independent-v1-ig-graph-routing-better-replies-v2-safe";
const FACEBOOK_GRAPH_VERSION = (process.env.FACEBOOK_GRAPH_VERSION || "v18.0").toString().trim();
const INSTAGRAM_GRAPH_VERSION = (process.env.INSTAGRAM_GRAPH_VERSION || "v25.0").toString().trim();
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

function getDubaiDateParts() {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short"
  });

  const parts = formatter.formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  const weekday = parts.find((part) => part.type === "weekday")?.value || "";

  return { hour, minute, minutes: hour * 60 + minute, weekday };
}

function isTodayPayload(payload) {
  return payload === "DAY_TODAY";
}

function getAvailableTimeSlots(dayPayload) {
  const allSlots = [
    { title: "10:00 AM", payload: "TIME_1000", minutes: 10 * 60 },
    { title: "11:00 AM", payload: "TIME_1100", minutes: 11 * 60 },
    { title: "12:00 PM", payload: "TIME_1200", minutes: 12 * 60 },
    { title: "1:00 PM", payload: "TIME_1300", minutes: 13 * 60 },
    { title: "2:00 PM", payload: "TIME_1400", minutes: 14 * 60 },
    { title: "3:00 PM", payload: "TIME_1500", minutes: 15 * 60 },
    { title: "4:00 PM", payload: "TIME_1600", minutes: 16 * 60 },
    { title: "5:00 PM", payload: "TIME_1700", minutes: 17 * 60 },
    { title: "6:00 PM", payload: "TIME_1800", minutes: 18 * 60 },
    { title: "6:30 PM", payload: "TIME_1830", minutes: 18 * 60 + 30 }
  ];

  if (!isTodayPayload(dayPayload)) return allSlots;

  const now = getDubaiDateParts();
  const bufferMinutes = 30;
  return allSlots.filter((slot) => slot.minutes >= now.minutes + bufferMinutes);
}

function getPreferredLanguage(text, state) {
  if (isArabic(text)) return "ar";
  if (state?.lang) return state.lang;
  return "en";
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

function mainReplies() {
  return [
    quickReply("Booking | حجز", "BOOKING"),
    quickReply("Services | خدمات", "SERVICES"),
    quickReply("Team | فريقنا", "TEAM")
  ];
}

function bookingReplies() {
  return [
    quickReply("Consult | استشارة", "CONSULT"),
    quickReply("Service | سيرفس", "SERVICE"),
    quickReply("Help | فريقنا", "TEAM")
  ];
}

function servicesReplies() {
  return [
    quickReply("Results | نتائج", "RESULTS"),
    quickReply("Location | موقع", "LOCATION"),
    quickReply("Consult | استشارة", "CONSULT")
  ];
}

function resultsReplies() {
  return [
    quickReply("Consult | استشارة", "CONSULT"),
    quickReply("Location | موقع", "LOCATION"),
    quickReply("Team | فريقنا", "TEAM")
  ];
}

function branchReplies() {
  return [
    quickReply("Dubai | دبي", "BRANCH_DUBAI"),
    quickReply("Abu Dhabi | أبوظبي", "BRANCH_ABUDHABI")
  ];
}

function dayReplies() {
  return [
    quickReply("Today | اليوم", "DAY_TODAY"),
    quickReply("Tomorrow | بكرا", "DAY_TOMORROW"),
    quickReply("This week | أسبوع", "DAY_WEEK")
  ];
}

function timeReplies(dayPayload) {
  const slots = getAvailableTimeSlots(dayPayload).map((slot) => quickReply(slot.title, slot.payload));
  slots.push(quickReply("Flexible | مرن", "TIME_FLEXIBLE"));
  return slots.slice(0, 13);
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

function payloadToDay(payload) {
  if (payload === "DAY_TODAY") return "Today | اليوم";
  if (payload === "DAY_TOMORROW") return "Tomorrow | بكرا";
  if (payload === "DAY_WEEK") return "This week | هذا الأسبوع";
  return "";
}

function payloadToTime(payload) {
  const times = {
    TIME_1000: "10:00 AM",
    TIME_1100: "11:00 AM",
    TIME_1200: "12:00 PM",
    TIME_1300: "1:00 PM",
    TIME_1400: "2:00 PM",
    TIME_1500: "3:00 PM",
    TIME_1600: "4:00 PM",
    TIME_1700: "5:00 PM",
    TIME_1800: "6:00 PM",
    TIME_1830: "6:30 PM",
    TIME_FLEXIBLE: "Flexible | مرن",
    TIME_5: "5:00 PM",
    TIME_6: "6:00 PM",
    TIME_630: "6:30 PM"
  };
  return times[payload] || "";
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

function welcomeBody() {
  return `Hello 👋

معك المساعد الذكي الخاص بـ

${BUSINESS_NAME}

نساعدك بحجز استشارة، خدمة للعميل الحالي، مشاهدة النتائج، أو التواصل مع الفريق.

You are chatting with the smart assistant of

${BUSINESS_NAME}

We can help with consultation booking, existing-client service, viewing results, or connecting you with the team.`;
}

function bookingBody() {
  return `أكيد، اختر نوع الحجز المناسب لك:

استشارة: للعميل الجديد لمعرفة الحل الأنسب.
سيرفس: للعميل الحالي للمتابعة، التركيب، التعديل، أو الصيانة.

Sure, please choose the right booking type:

Consultation: for new clients who want the best solution.
Service: for existing clients who need follow-up, fitting, adjustment, or maintenance.`;
}

function servicesBody() {
  return `أكيد ✨

في Iconic Hair Care نقدم حلول Hair Replacement بمظهر طبيعي 100%، بدون جراحة، وبخصوصية عالية.

At Iconic Hair Care, we provide non-surgical Hair Replacement with a 100% natural look and high privacy.

شو تحب تشوف أولاً؟ / What would you like to check first?`;
}

function resultsBody() {
  return `هذه بعض النتائج من Iconic Hair Care.

المظهر طبيعي، بدون جراحة، ويتم اختيار الشكل حسب الوجه والستايل المناسب لك.

Here are some Iconic Hair Care results.
Natural look, non-surgical, and customized to your face shape and style.

الخطوة التالية؟ / Next step?`;
}

function askBranchBody(intent) {
  const label = intent === "service" ? "Service | سيرفس" : intent === "location" ? "Location | الموقع" : "Consultation | استشارة";
  return `تمام، اختر الفرع المناسب لـ ${label}:

Great, please choose the branch for ${label}:`;
}

function askStaffBody() {
  return `اختر المختص المفضل للسيرفس، أو اختر أي مختص متاح.

Choose your preferred service specialist, or choose any available specialist.`;
}

function askDayBody() {
  return `تمام، اختر اليوم المناسب:

Great, please choose your preferred day:`;
}

function askTimeBody(dayPayload) {
  if (isTodayPayload(dayPayload) && getAvailableTimeSlots(dayPayload).length === 0) {
    return `مواعيد اليوم خلصت حسب توقيت دبي.

Today's available slots are finished based on Dubai time.

اختر بكرا أو هذا الأسبوع. / Please choose Tomorrow or This week.`;
  }

  return `تمام، اختر الوقت المفضل حسب توقيت دبي:

Great, please choose your preferred time based on Dubai time:`;
}

function finalSummaryBody(state) {
  const branch = state.branch || "Dubai";
  const day = state.day || "Not selected | غير محدد";
  const time = state.time || "Flexible | مرن";
  const staff = state.staff || "";
  const requestType = state.intent === "service" ? "Service Appointment | موعد سيرفس" : "Consultation Booking | حجز استشارة";

  return `تم استلام طلبك ✅

نوع الطلب: ${requestType}
الفرع: ${branch}
اليوم: ${day}
الوقت: ${time}${staff ? `
المختص: ${staff}` : ""}

الفريق سيراجع الطلب ويرد عليك قريباً لتأكيد الموعد.

Your request has been received ✅
Our team will review it and confirm your appointment shortly.`;
}

function teamBody() {
  return `تمام 👌

تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.

Done 👌
Your conversation has been forwarded to our team. One of our specialists will assist you shortly.`;
}

function locationBody(branch = "Dubai") {
  const locationUrl = branch === "Abu Dhabi" ? ABU_DHABI_LOCATION_URL : DUBAI_LOCATION_URL;
  const branchAr = branch === "Abu Dhabi" ? "أبوظبي" : "دبي";

  return `هذا هو موقع فرع ${branchAr}:

${locationUrl}

This is our ${branch} branch location:

${locationUrl}`;
}

function buildReply(text, key, hasAttachment) {
  const state = getState(key);
  const lang = getPreferredLanguage(text, state);
  const ar = lang === "ar";
  state.lang = lang;

  const cleanText = (text || "").toString().trim();
  const upper = cleanText.toUpperCase();

  if (upper === "TEAM" || isTeam(cleanText)) {
    resetState(key);
    return { text: teamBody(), quickReplies: [] };
  }

  if (upper === "BOOKING" || isBooking(cleanText)) {
    conversationState.set(key, { intent: "booking", lang });
    return { text: bookingBody(), quickReplies: bookingReplies() };
  }

  if (upper === "CONSULT" || isConsult(cleanText)) {
    conversationState.set(key, { intent: "consult", lang });
    return { text: askBranchBody("consult"), quickReplies: branchReplies() };
  }

  if (upper === "SERVICE" || isService(cleanText)) {
    conversationState.set(key, { intent: "service", lang });
    return { text: askStaffBody(), quickReplies: staffReplies(ar) };
  }

  if (upper === "LOCATION" || isLocation(cleanText)) {
    conversationState.set(key, { intent: "location", lang });
    return { text: askBranchBody("location"), quickReplies: branchReplies() };
  }

  if (upper === "SERVICES" || isServices(cleanText)) {
    return { text: servicesBody(), quickReplies: servicesReplies(), mediaUrl: BOT_HEADER_IMAGE_URL, mediaType: "image" };
  }

  if (upper === "RESULTS" || isResults(cleanText)) {
    return { text: resultsBody(), quickReplies: resultsReplies(), sendResultsMedia: true };
  }

  const staff = payloadToStaff(upper);
  if (staff && state.intent === "service") {
    state.staff = staff;
    return { text: askBranchBody("service"), quickReplies: branchReplies() };
  }

  const branch = payloadToBranch(upper);
  if (branch && state.intent === "location") {
    resetState(key);
    return { text: locationBody(branch), quickReplies: mainReplies() };
  }

  if (branch && state.intent) {
    state.branch = branch;
    return { text: askDayBody(), quickReplies: dayReplies() };
  }

  const day = payloadToDay(upper);
  if (day && state.intent) {
    state.day = day;
    state.dayPayload = upper;

    if (isTodayPayload(upper) && getAvailableTimeSlots(upper).length === 0) {
      return { text: askTimeBody(upper), quickReplies: [quickReply("Tomorrow | بكرا", "DAY_TOMORROW"), quickReply("This week | أسبوع", "DAY_WEEK")] };
    }

    return { text: askTimeBody(upper), quickReplies: timeReplies(upper) };
  }

  const time = payloadToTime(upper);
  if (time && state.intent) {
    state.time = time;
    const done = { ...state };
    resetState(key);
    return { text: finalSummaryBody(done), quickReplies: [] };
  }

  if (hasAttachment) {
    return {
      text: `وصلتنا الرسالة أو الملف ✅
فريقنا رح يراجعها ويرد عليك بأقرب وقت.

We received your message or file ✅
Our team will review it and reply as soon as possible.`,
      quickReplies: mainReplies()
    };
  }

  if (isGreeting(cleanText)) {
    conversationState.set(key, { lang });
    return { text: welcomeBody(), quickReplies: mainReplies(), mediaUrl: BOT_HEADER_IMAGE_URL, mediaType: "image" };
  }

  return {
    text: `اختر كيف فينا نساعدك:

Please choose how we can help:`,
    quickReplies: mainReplies()
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


function getGraphBaseUrl(channel) {
  if (channel === "Instagram") {
    return `https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}`;
  }
  return `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`;
}

async function sendMetaMessage(senderId, messagePayload, channel) {
  const config = getSendConfig(channel);
  if (!config.accountId || !config.token) {
    console.log(`[${channel}] missing env. Message skipped.`);
    return { ok: false, skipped: true };
  }

  const graphBaseUrl = getGraphBaseUrl(channel);
  const url = `${graphBaseUrl}/${encodeURIComponent(config.accountId)}/messages`;
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
    console.log(`[${channel}] send failed via ${graphBaseUrl}:`);
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
    resultsVideoConfigured: Boolean(META_RESULTS_VIDEO_URL),
    facebookGraphVersion: FACEBOOK_GRAPH_VERSION,
    instagramGraphVersion: INSTAGRAM_GRAPH_VERSION,
    instagramGraphBase: `https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}`
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
