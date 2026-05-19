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

const BOT_VERSION = "iconic-meta-dm-v1-instagram-booking-loop-fix";
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

const DETAILS_VIDEO_URL = (
  process.env.META_DETAILS_VIDEO_URL ||
  process.env.DETAILS_VIDEO_URL ||
  "https://iconichaircare.com/wp-content/uploads/2026/05/iconic-details-video-v2-compressed.mp4"
).toString().trim();

const META_RESULTS_IMAGE_URL = (process.env.META_RESULTS_IMAGE_URL || "").toString().trim();
const META_RESULTS_VIDEO_URL = (
  process.env.META_RESULTS_VIDEO_URL ||
  process.env.RESULTS_VIDEO_URL ||
  process.env.AUTO_REPLY_VIDEO_URL ||
  DETAILS_VIDEO_URL ||
  ""
).toString().trim();

const DUBAI_LOCATION_URL = process.env.DUBAI_LOCATION_URL || "https://maps.app.goo.gl/KyyhbpVVZJ2ixEEBA";
const ABU_DHABI_LOCATION_URL = process.env.ABU_DHABI_LOCATION_URL || "https://maps.app.goo.gl/twg5JEuP6JgKWP1s7";
const BUSINESS_NAME = "I C O N I C   H A I R   C A R E";

const STAFF_NOTIFY_ENABLED = (process.env.STAFF_NOTIFY_ENABLED || "true").toString().toLowerCase() !== "false";
const STAFF_WHATSAPP_TOKEN = (
  process.env.STAFF_WHATSAPP_TOKEN ||
  process.env.WHATSAPP_ACCESS_TOKEN ||
  process.env.WHATSAPP_TOKEN ||
  process.env.META_WA_TOKEN ||
  process.env.WHATSAPP_CLOUD_API_TOKEN ||
  ""
).toString().trim();

const STAFF_WHATSAPP_PHONE_NUMBER_ID = (
  process.env.STAFF_WHATSAPP_PHONE_NUMBER_ID ||
  process.env.WHATSAPP_PHONE_NUMBER_ID ||
  process.env.META_WA_PHONE_NUMBER_ID ||
  process.env.PHONE_NUMBER_ID ||
  ""
).toString().trim();

const DUBAI_STAFF_NOTIFY_PHONE_NUMBER_ID = (
  process.env.DUBAI_STAFF_NOTIFY_PHONE_NUMBER_ID ||
  process.env.DUBAI_WHATSAPP_PHONE_NUMBER_ID ||
  STAFF_WHATSAPP_PHONE_NUMBER_ID ||
  "1100042333191350"
).toString().trim();

const ABU_DHABI_STAFF_NOTIFY_PHONE_NUMBER_ID = (
  process.env.ABU_DHABI_STAFF_NOTIFY_PHONE_NUMBER_ID ||
  process.env.ABUDHABI_STAFF_NOTIFY_PHONE_NUMBER_ID ||
  process.env.ABU_DHABI_WHATSAPP_PHONE_NUMBER_ID ||
  "1000146433192239"
).toString().trim();

const DUBAI_STAFF_NUMBER = (
  process.env.DUBAI_STAFF_NUMBER ||
  "971503424811"
).toString().replace(/\D/g, "");

const ABU_DHABI_STAFF_NUMBER = (
  process.env.ABU_DHABI_STAFF_NUMBER ||
  process.env.ABUDHABI_STAFF_NUMBER ||
  process.env.ABU_DHABI_STAFF_WHATSAPP ||
  "971503750616"
).toString().replace(/\D/g, "");

const conversationState = new Map();
const staffNotificationCache = new Map();
const staffWhatsAppSendCache = new Map();
const staffSenderLockCache = new Map();
const bookingFinalizationCache = new Map();
const STAFF_NOTIFICATION_DEDUPE_MS = 10 * 60 * 1000;

const META_DM_DEBUG_LOGS_ENABLED = (process.env.META_DM_DEBUG_LOGS_ENABLED || "true").toString().toLowerCase() !== "false";

function debugLog(label, data = {}) {
  if (!META_DM_DEBUG_LOGS_ENABLED) return;

  try {
    console.log(`${label} ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(label, data);
  }
}

function previewText(value, maxLength = 220) {
  const text = (value || "").toString().replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function getEventType(event = {}) {
  if (event?.message?.quick_reply?.payload) return "quick_reply";
  if (event?.postback?.payload) return "postback";
  if (event?.message?.text) return "text";
  if (event?.message?.attachments?.length) return "attachment";
  return "unknown";
}

function summarizeQuickReplies(quickReplies = []) {
  return (quickReplies || []).map((reply) => ({
    title: reply?.title || "",
    payload: reply?.payload || ""
  }));
}

function summarizeState(state = {}) {
  return {
    intent: state.intent || "",
    branch: state.branch || "",
    staff: state.staff || "",
    day: state.day || "",
    dayPayload: state.dayPayload || "",
    time: state.time || "",
    lang: state.lang || "",
    bookingFinalized: Boolean(state.bookingFinalized)
  };
}

function getMetaErrorSummary(result = {}) {
  const error = result?.data?.error || result?.error || result?.data || result;
  if (!error) return {};

  return {
    message: error.message || "",
    type: error.type || "",
    code: error.code || "",
    error_subcode: error.error_subcode || "",
    fbtrace_id: error.fbtrace_id || "",
    raw: typeof error === "object" ? error : String(error)
  };
}

function getWhatsAppMessageId(data = {}) {
  return data?.messages?.[0]?.id || "";
}

function normalizeText(value) {
  return (value || "").toString().toLowerCase().trim().replace(/\s+/g, " ");
}

function isArabic(text) {
  return /[\u0600-\u06FF]/.test((text || "").toString());
}

function isPayloadOnly(text) {
  return /^[A-Z0-9_]+$/.test((text || "").toString().trim());
}

function getTurnLanguage(text, state) {
  const raw = (text || "").toString().trim();

  if (isArabic(raw)) return "ar";
  if (isPayloadOnly(raw) && state?.lang) return state.lang;
  if (/[A-Za-z]/.test(raw)) return "en";

  const value = normalizeText(raw);
  if (
    value.includes("hello") ||
    value.includes("hi") ||
    value.includes("booking") ||
    value.includes("service") ||
    value.includes("consult") ||
    value.includes("results") ||
    value.includes("details") ||
    value.includes("location") ||
    value.includes("team") ||
    value.includes("price") ||
    value.includes("cost") ||
    value.includes("how much") ||
    value.includes("how mutch") ||
    value.includes("much") ||
    value.includes("pricing") ||
    value.includes("charges") ||
    value.includes("rate") ||
    value.includes("surgery") ||
    value.includes("natural") ||
    value.includes("pain") ||
    value.includes("duration")
  ) {
    return "en";
  }

  return state?.lang || "en";
}

function isAr(lang) {
  return lang === "ar";
}

function quickReply(title, payload) {
  return {
    content_type: "text",
    title: title.toString().slice(0, 20),
    payload: payload.toString().slice(0, 1000)
  };
}

function mainReplies(lang = "en") {
  return isAr(lang)
    ? [quickReply("حجز", "BOOKING"), quickReply("خدمات", "SERVICES"), quickReply("فريقنا", "TEAM")]
    : [quickReply("Booking", "BOOKING"), quickReply("Services", "SERVICES"), quickReply("Team", "TEAM")];
}

function bookingReplies(lang = "en") {
  return isAr(lang)
    ? [quickReply("استشارة", "CONSULT"), quickReply("سيرفس", "SERVICE"), quickReply("فريقنا", "TEAM")]
    : [quickReply("Consult", "CONSULT"), quickReply("Service", "SERVICE"), quickReply("Team", "TEAM")];
}

function servicesReplies(lang = "en") {
  return isAr(lang)
    ? [quickReply("نتائج", "RESULTS"), quickReply("تفاصيل", "DETAILS"), quickReply("الموقع", "LOCATION"), quickReply("استشارة", "CONSULT")]
    : [quickReply("Results", "RESULTS"), quickReply("Details", "DETAILS"), quickReply("Location", "LOCATION"), quickReply("Consult", "CONSULT")];
}

function resultsReplies(lang = "en") {
  return isAr(lang)
    ? [quickReply("تفاصيل", "DETAILS"), quickReply("حجز", "BOOKING"), quickReply("فريقنا", "TEAM")]
    : [quickReply("Details", "DETAILS"), quickReply("Booking", "BOOKING"), quickReply("Team", "TEAM")];
}

function detailsReplies(lang = "en") {
  return isAr(lang)
    ? [quickReply("نتائج", "RESULTS"), quickReply("حجز", "BOOKING"), quickReply("فريقنا", "TEAM")]
    : [quickReply("Results", "RESULTS"), quickReply("Booking", "BOOKING"), quickReply("Team", "TEAM")];
}

function intentReplies(intent, lang = "en") {
  if (intent === "booking") return bookingReplies(lang);
  if (intent === "location") {
    return isAr(lang)
      ? [quickReply("دبي", "BRANCH_DUBAI"), quickReply("أبوظبي", "BRANCH_ABUDHABI"), quickReply("حجز", "BOOKING")]
      : [quickReply("Dubai", "BRANCH_DUBAI"), quickReply("Abu Dhabi", "BRANCH_ABUDHABI"), quickReply("Booking", "BOOKING")];
  }
  if (intent === "team") {
    return isAr(lang)
      ? [quickReply("دبي", "BRANCH_DUBAI"), quickReply("أبوظبي", "BRANCH_ABUDHABI"), quickReply("القائمة", "MAIN_MENU")]
      : [quickReply("Dubai", "BRANCH_DUBAI"), quickReply("Abu Dhabi", "BRANCH_ABUDHABI"), quickReply("Main Menu", "MAIN_MENU")];
  }
  if (intent === "details") return detailsReplies(lang);
  if (intent === "results") return resultsReplies(lang);
  if (intent === "price") {
    return isAr(lang)
      ? [quickReply("استشارة", "CONSULT"), quickReply("نتائج", "RESULTS"), quickReply("فريقنا", "TEAM")]
      : [quickReply("Consult", "CONSULT"), quickReply("Results", "RESULTS"), quickReply("Team", "TEAM")];
  }
  return isAr(lang)
    ? [quickReply("حجز", "BOOKING"), quickReply("نتائج", "RESULTS"), quickReply("فريقنا", "TEAM")]
    : [quickReply("Booking", "BOOKING"), quickReply("Results", "RESULTS"), quickReply("Team", "TEAM")];
}

function branchReplies(lang = "en") {
  return isAr(lang)
    ? [quickReply("دبي", "BRANCH_DUBAI"), quickReply("أبوظبي", "BRANCH_ABUDHABI")]
    : [quickReply("Dubai", "BRANCH_DUBAI"), quickReply("Abu Dhabi", "BRANCH_ABUDHABI")];
}

function dayReplies(lang = "en") {
  return isAr(lang)
    ? [quickReply("اليوم", "DAY_TODAY"), quickReply("بكرا", "DAY_TOMORROW"), quickReply("هذا الأسبوع", "DAY_WEEK")]
    : [quickReply("Today", "DAY_TODAY"), quickReply("Tomorrow", "DAY_TOMORROW"), quickReply("This week", "DAY_WEEK")];
}

function weekDayReplies(lang = "en") {
  return isAr(lang)
    ? [
        quickReply("الاثنين", "WEEKDAY_MON"),
        quickReply("الثلاثاء", "WEEKDAY_TUE"),
        quickReply("الأربعاء", "WEEKDAY_WED"),
        quickReply("الخميس", "WEEKDAY_THU"),
        quickReply("الجمعة", "WEEKDAY_FRI"),
        quickReply("السبت", "WEEKDAY_SAT"),
        quickReply("الأحد", "WEEKDAY_SUN")
      ]
    : [
        quickReply("Monday", "WEEKDAY_MON"),
        quickReply("Tuesday", "WEEKDAY_TUE"),
        quickReply("Wednesday", "WEEKDAY_WED"),
        quickReply("Thursday", "WEEKDAY_THU"),
        quickReply("Friday", "WEEKDAY_FRI"),
        quickReply("Saturday", "WEEKDAY_SAT"),
        quickReply("Sunday", "WEEKDAY_SUN")
      ];
}

function getDubaiMinutesNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  return hour * 60 + minute;
}

function isTodayPayload(payload) {
  return payload === "DAY_TODAY";
}

function allTimeSlots() {
  return [
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
}

function getAvailableTimeSlots(dayPayload) {
  if (!isTodayPayload(dayPayload)) return allTimeSlots();
  const now = getDubaiMinutesNow();
  const bufferMinutes = 30;
  return allTimeSlots().filter((slot) => slot.minutes >= now + bufferMinutes);
}

function timeReplies(dayPayload, lang = "en") {
  const replies = getAvailableTimeSlots(dayPayload).map((slot) => quickReply(slot.title, slot.payload));
  replies.push(quickReply(isAr(lang) ? "مرن" : "Flexible", "TIME_FLEXIBLE"));
  return replies.slice(0, 13);
}

function staffReplies(branch = "Dubai", lang = "en") {
  if (branch === "Abu Dhabi") {
    return isAr(lang)
      ? [quickReply("أدهم", "STAFF_ADHAM"), quickReply("أسامة", "STAFF_OSAMA")]
      : [quickReply("Adham", "STAFF_ADHAM"), quickReply("Osama", "STAFF_OSAMA")];
  }

  return isAr(lang)
    ? [
        quickReply("أحمد", "STAFF_AHMAD"),
        quickReply("وائل", "STAFF_WAEL"),
        quickReply("تامر", "STAFF_TAMER"),
        quickReply("بشير", "STAFF_BASHIR"),
        quickReply("عماد", "STAFF_EMAD"),
        quickReply("حمودة", "STAFF_HAMOUDA"),
        quickReply("اني", "STAFF_ANI"),
        quickReply("عمر", "STAFF_OMAR")
      ]
    : [
        quickReply("Ahmad", "STAFF_AHMAD"),
        quickReply("Wael", "STAFF_WAEL"),
        quickReply("Tamer", "STAFF_TAMER"),
        quickReply("Bashir", "STAFF_BASHIR"),
        quickReply("Emad", "STAFF_EMAD"),
        quickReply("Hamouda", "STAFF_HAMOUDA"),
        quickReply("Ani", "STAFF_ANI"),
        quickReply("Omar", "STAFF_OMAR")
      ];
}

function getState(key) {
  if (!conversationState.has(key)) conversationState.set(key, {});
  return conversationState.get(key);
}

function resetState(key) {
  conversationState.delete(key);
}

function includesAny(value, keywords) {
  return keywords.some((keyword) => value.includes(keyword));
}

function isGreeting(text) {
  const value = normalizeText(text);
  return !value ||
    ["hi", "hello", "hey", "مرحبا", "هلا", "السلام عليكم", "سلام عليكم", "هاي", "menu", "start", "القائمة"].includes(value) ||
    value.includes("السلام عليكم") ||
    value.includes("سلام عليكم") ||
    value.includes("مرحبا") ||
    value.includes("هلا");
}

function isSalamGreeting(text) {
  const value = normalizeText(text);
  return value.includes("السلام عليكم") || value.includes("سلام عليكم");
}

function isMarhabaGreeting(text) {
  const value = normalizeText(text);
  return value.includes("مرحبا") || value === "هلا" || value === "هاي";
}

function stripLeadingGreeting(text) {
  let value = (text || "").toString().trim();
  if (!value) return value;

  const patterns = [
    /^(السلام\s+عليكم\s+ورحمة\s+الله\s+وبركاته|السلام\s+عليكم\s+ورحمة\s+الله|السلام\s+عليكم|سلام\s+عليكم)\s*[،,.!؟?\-:]*\s*/i,
    /^(مرحبا|مراحب|هلا|هاي)\s*[،,.!؟?\-:]*\s*/i,
    /^(hello|hi|hey)\s*[،,.!؟?\-:]*\s*/i
  ];

  for (const pattern of patterns) {
    const stripped = value.replace(pattern, "").trim();
    if (stripped !== value && stripped.length > 0) return stripped;
  }

  return value;
}

function hasGreetingWithIntent(text) {
  const raw = (text || "").toString().trim();
  const stripped = stripLeadingGreeting(raw);
  return Boolean(raw && stripped && stripped !== raw);
}

function greetingBody(text, lang = "en") {
  if (isSalamGreeting(text)) {
    return `وعليكم السلام ورحمة الله 👋

أنا مساعد Iconic Hair Care الذكي.

فيك تختار من القائمة، أو تكتب سؤالك مباشرة مثل:
السعر، النتائج، طريقة التركيب، أو حجز موعد.

إذا قدرت أساعدك برد عليك فورًا، وإذا احتجت متابعة من الفريق بحوّلك لهم.`;
  }

  if (isMarhabaGreeting(text)) {
    return `مرااحب، كيفك اليوم؟ 👋

أنا مساعد Iconic Hair Care الذكي.

فيك تختار من القائمة، أو تكتب سؤالك مباشرة مثل:
السعر، النتائج، طريقة التركيب، أو حجز موعد.

إذا قدرت أساعدك برد عليك فورًا، وإذا احتجت متابعة من الفريق بحوّلك لهم.`;
  }

  if (isAr(lang)) {
    return `مرحبا 👋

أنا مساعد Iconic Hair Care الذكي.

فيك تختار من القائمة، أو تكتب سؤالك مباشرة مثل:
السعر، النتائج، طريقة التركيب، أو حجز موعد.

إذا قدرت أساعدك برد عليك فورًا، وإذا احتجت متابعة من الفريق بحوّلك لهم.`;
  }

  return `Hello 👋

I’m the smart assistant for Iconic Hair Care.

You can choose from the menu, or type your question directly, such as:
price, results, how it works, or booking an appointment.

If I can help, I’ll reply right away. If you need support from our team, I’ll connect you with them.`;
}

function isBooking(text) {
  const value = normalizeText(text);
  return ["booking", "book", "حجز", "موعد", "booking | حجز", "book appointment"].includes(value) ||
    value.includes("احجز") || value.includes("appointment") || value.includes("استشارة") || value.includes("استشاره");
}

function isExplicitConsultationRequest(text) {
  const value = normalizeText(text);
  return includesAny(value, ["consult", "consultation", "استشارة", "استشاره"]);
}

function isAppointmentRequestWithoutDetails(text) {
  const value = normalizeText(text);
  if (isExplicitConsultationRequest(value)) return false;
  if (!includesAny(value, ["appointment", "book appointment", "موعد", "احجز", "حجز", "بدي حجز", "بدي موعد"])) return false;
  return !findStaffFromText(value) && !findDayFromText(value) && !findBranchFromText(value) && !findTimeFromText(value);
}

function appointmentBookingBody(lang = "en") {
  if (isAr(lang)) {
    return `أكيد 👋

فينا نساعدك بحجز موعد.

اختار الفرع المناسب حتى نكمل الحجز:`;
  }

  return `Sure 👋

We can help you book an appointment.

Please choose the branch to continue:`;
}

function isConsult(text) {
  const value = normalizeText(text);
  return value === "consult" || value === "consultation" || value === "consult | استشارة" ||
    value.includes("استشارة") || value.includes("استشاره") || value.includes("consult");
}

function isService(text) {
  const value = normalizeText(text);
  return value === "service" || value === "service | سيرفس" || value === "سيرفس" || value === "خدمة" ||
    value.includes("متابعة") || value.includes("تعديل") ||
    value.includes("fitting") || value.includes("follow up") || value.includes("adjustment");
}

function isServices(text) {
  const value = normalizeText(text);
  return value === "services" || value === "services | خدمات" || value === "services | خدماتنا" ||
    value.includes("خدماتنا") || value.includes("خدمات") || value.includes("hair replacement");
}

function isResults(text) {
  const value = normalizeText(text);
  return value === "results" || value === "results | نتائج" ||
    includesAny(value, ["نتائج", "صور", "صورة", "فيديو", "قبل وبعد", "قبل و بعد", "photo", "photos", "video", "before after", "before and after", "see results"]);
}

function isDetails(text) {
  const value = normalizeText(text);
  return value === "details" || value === "details | تفاصيل" || value === "how_it_works" ||
    includesAny(value, ["تفاصيل", "طريقة التركيب", "كيف بيتركب", "كيف يتم التركيب", "كيف يشتغل", "اشرحلي", "شرح", "how it works", "how does it work", "how is it applied", "explain", "procedure", "process"]);
}

function isLocation(text) {
  const raw = (text || "").toString().trim().toUpperCase();
  if (raw === "BRANCH_DUBAI" || raw === "BRANCH_ABUDHABI") return false;

  const value = normalizeText(text);
  return value === "location" || value === "location | موقع" ||
    includesAny(value, ["موقع", "لوكيشن", "العنوان", "وين", "map", "address", "where", "branch", "branches"]);
}

function isTeam(text) {
  const value = normalizeText(text);
  return value === "team" || value === "help" || value === "help | فريقنا" ||
    includesAny(value, ["فريق", "ساعدني", "مساعدة", "موظف", "كلموني", "تواصل", "بدي احكي مع حدا", "human", "support", "staff", "agent", "talk to team", "contact"]);
}

function isBookingContextSmartFaqOverride(intent) {
  return [
    "price",
    "results",
    "details",
    "surgery",
    "natural",
    "duration",
    "pain",
    "location",
    "team",
    "suitability",
    "men_women",
    "privacy",
    "durability",
    "detectability",
    "consult_vs_service",
    "branch_help",
    "hesitation",
    "free_consultation",
    "color_density",
    "shaving",
    "lifestyle"
  ].includes(intent);
}

function detectSmartIntent(text) {
  const value = normalizeText(text);
  if (!value || isPayloadOnly(value.toUpperCase())) return "";

  const intents = [
    { name: "price", keywords: ["السعر", "الأسعار", "كم السعر", "كم التكلفة", "التكلفة", "بكم", "قديش", "كم يكلف", "price", "cost", "how much", "how mutch", "much", "pricing", "charges", "rate"] },
    { name: "results", keywords: ["نتائج", "النتائج", "صور", "صورة", "فيديو", "قبل وبعد", "قبل و بعد", "شوف النتائج", "results", "photos", "photo", "video", "before after", "before and after", "see results"] },
    { name: "details", keywords: ["تفاصيل", "طريقة التركيب", "كيف بيتركب", "كيف يتم التركيب", "كيف يشتغل", "اشرحلي", "شرح", "details", "how it works", "how does it work", "how is it applied", "explain", "procedure"] },
    { name: "surgery", keywords: ["جراحة", "عملية", "في عملية", "بدون جراحة", "هل يحتاج عملية", "زراعة", "surgery", "operation", "surgical", "non surgical", "non-surgical", "without surgery", "hair transplant"] },
    { name: "natural", keywords: ["طبيعي", "بيبين طبيعي", "هل يبين طبيعي", "ما يبين تركيب", "الشكل", "يبان", "natural", "natural look", "does it look natural", "will it show", "detectable", "fake"] },
    { name: "duration", keywords: ["كم المدة", "قديش بياخد وقت", "مدة الجلسة", "وقت التركيب", "كم ساعة", "duration", "how long", "how much time", "session time", "how many hours"] },
    { name: "pain", keywords: ["ألم", "الم", "وجع", "بيوجع", "مؤلم", "في ألم", "هل يؤلم", "pain", "painful", "does it hurt", "hurt", "is it painful"] },
    { name: "booking", keywords: ["حجز", "احجز", "موعد", "بدي موعد", "استشارة", "احجز استشارة", "booking", "book", "appointment", "consultation", "book consultation", "reserve"] },
    { name: "location", keywords: ["الموقع", "وين", "العنوان", "الفرع", "دبي", "ابوظبي", "أبوظبي", "لوكيشن", "location", "where", "address", "branch", "dubai", "abu dhabi", "map"] },
    { name: "team", keywords: ["فريق", "موظف", "كلموني", "تواصل", "بدي احكي مع حدا", "مساعدة", "ساعدني", "team", "staff", "agent", "talk to team", "contact", "help", "support", "human"] },

    { name: "suitability", keywords: ["يناسب حالتي", "ينفع لحالتي", "حالتي", "مناسب إلي", "مناسب لي", "هل يناسب", "suitable", "suit my case", "good for my case", "right for me", "my case"] },
    { name: "men_women", keywords: ["رجال ونساء", "رجال", "نساء", "للرجال", "للنساء", "men and women", "men", "women", "male", "female"] },
    { name: "privacy", keywords: ["خصوصية", "خاص", "سري", "ما بدي حدا يعرف", "privacy", "private", "confidential", "discreet"] },
    { name: "durability", keywords: ["يثبت", "ثبات", "كم يدوم", "يدوم", "مدة الثبات", "hold", "durable", "durability", "how long it lasts", "last"] },
    { name: "detectability", keywords: ["يبان تركيب", "هل يبان", "ما يبين", "حدا يعرف", "بان أنه تركيب", "detect", "detectable", "will people know", "will it show", "looks fake"] },
    { name: "service_followup", keywords: ["سيرفس", "متابعة", "عميل قديم", "عميل حالي", "تعديل", "service follow up", "existing client", "current client", "follow up", "adjustment"] },
    { name: "consult_vs_service", keywords: ["فرق بين استشارة وسيرفس", "الفرق بين الاستشارة والسيرفس", "استشارة ولا سيرفس", "consult vs service", "consultation or service", "difference between consult and service"] },
    { name: "branch_help", keywords: ["أي فرع", "اختار أي فرع", "فرع دبي أو أبوظبي", "dubai or abu dhabi", "which branch", "what branch"] },
    { name: "availability", keywords: ["أقرب موعد", "اقرب موعد", "متوفر اليوم", "في موعد", "availability", "available appointment", "earliest appointment", "soonest appointment"] },
    { name: "hesitation", keywords: ["متردد", "خايف", "مو متأكد", "قلقان", "مش متأكد", "hesitant", "worried", "not sure", "concerned"] },
    { name: "free_consultation", keywords: ["استشارة مجانية", "هل الاستشارة مجانية", "free consultation", "consultation free"] },
    { name: "color_density", keywords: ["اللون", "الكثافة", "نفس شعري", "لون شعري", "color", "density", "match my hair", "same hair"] },
    { name: "shaving", keywords: ["حلاقة", "احلق", "حلق", "بدون حلاقة", "shave", "shaving", "do i need to shave"] },
    { name: "lifestyle", keywords: ["حياتي طبيعي", "سباحة", "رياضة", "نوم", "أمارس حياتي", "daily life", "normal life", "swim", "sport", "sleep"] }
  ];

  const match = intents.find((intent) => includesAny(value, intent.keywords));
  return match?.name || "";
}

function payloadToBranch(payload) {
  if (payload === "BRANCH_ABUDHABI") return "Abu Dhabi";
  if (payload === "BRANCH_DUBAI") return "Dubai";
  return "";
}

function payloadToWeekDay(payload) {
  const days = {
    WEEKDAY_MON: "Monday | الاثنين",
    WEEKDAY_TUE: "Tuesday | الثلاثاء",
    WEEKDAY_WED: "Wednesday | الأربعاء",
    WEEKDAY_THU: "Thursday | الخميس",
    WEEKDAY_FRI: "Friday | الجمعة",
    WEEKDAY_SAT: "Saturday | السبت",
    WEEKDAY_SUN: "Sunday | الأحد"
  };
  return days[payload] || "";
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

const STAFF_DIRECTORY = [
  { canonical: "Ahmad", payload: "STAFF_AHMAD", branch: "Dubai", aliases: ["ahmad", "ahmed", "أحمد", "احمد"] },
  { canonical: "Wael", payload: "STAFF_WAEL", branch: "Dubai", aliases: ["wael", "وائل"] },
  { canonical: "Tamer", payload: "STAFF_TAMER", branch: "Dubai", aliases: ["tamer", "تامر"] },
  { canonical: "Bashir", payload: "STAFF_BASHIR", branch: "Dubai", aliases: ["bashir", "basheer", "بشير"] },
  { canonical: "Emad", payload: "STAFF_EMAD", branch: "Dubai", aliases: ["emad", "imad", "عماد"] },
  { canonical: "Hamouda", payload: "STAFF_HAMOUDA", branch: "Dubai", aliases: ["hamouda", "hamoda", "حمودة", "حموده"] },
  { canonical: "Ani", payload: "STAFF_ANI", branch: "Dubai", aliases: ["ani", "اني", "آني"] },
  { canonical: "Omar", payload: "STAFF_OMAR", branch: "Dubai", aliases: ["omar", "omer", "عمر"] },
  { canonical: "Adham", payload: "STAFF_ADHAM", branch: "Abu Dhabi", aliases: ["adham", "أدهم", "ادهم"] },
  { canonical: "Osama", payload: "STAFF_OSAMA", branch: "Abu Dhabi", aliases: ["osama", "أسامة", "اسامة"] }
];

function findStaffFromText(text) {
  const value = normalizeText(text);
  return STAFF_DIRECTORY.find((staff) => staff.aliases.some((alias) => value.includes(normalizeText(alias)))) || null;
}

function findBranchFromText(text) {
  const value = normalizeText(text);
  if (value.includes("abu dhabi") || value.includes("abudhabi") || value.includes("أبوظبي") || value.includes("ابوظبي")) return "Abu Dhabi";
  if (value.includes("dubai") || value.includes("دبي")) return "Dubai";
  return "";
}

function findDayFromText(text) {
  const value = normalizeText(text);
  const weekDays = [
    { payload: "WEEKDAY_MON", day: "Monday | الاثنين", aliases: ["monday", "الاثنين", "الإثنين"] },
    { payload: "WEEKDAY_TUE", day: "Tuesday | الثلاثاء", aliases: ["tuesday", "الثلاثاء"] },
    { payload: "WEEKDAY_WED", day: "Wednesday | الأربعاء", aliases: ["wednesday", "الأربعاء", "الاربعاء"] },
    { payload: "WEEKDAY_THU", day: "Thursday | الخميس", aliases: ["thursday", "الخميس"] },
    { payload: "WEEKDAY_FRI", day: "Friday | الجمعة", aliases: ["friday", "الجمعة"] },
    { payload: "WEEKDAY_SAT", day: "Saturday | السبت", aliases: ["saturday", "السبت"] },
    { payload: "WEEKDAY_SUN", day: "Sunday | الأحد", aliases: ["sunday", "الأحد", "الاحد"] }
  ];

  if (value.includes("today") || value.includes("اليوم") || value.includes("هاليوم")) return { payload: "DAY_TODAY", day: "Today | اليوم", kind: "day" };
  if (value.includes("tomorrow") || value.includes("بكرا") || value.includes("غدا") || value.includes("غداً")) return { payload: "DAY_TOMORROW", day: "Tomorrow | بكرا", kind: "day" };
  const weekDay = weekDays.find((item) => item.aliases.some((alias) => value.includes(normalizeText(alias))));
  if (weekDay) return { payload: weekDay.payload, day: weekDay.day, kind: "weekday" };
  if (value.includes("this week") || value.includes("هدا الأسبوع") || value.includes("هذا الأسبوع") || value.includes("هالأسبوع")) return { payload: "DAY_WEEK", day: "This week | هذا الأسبوع", kind: "week" };
  return null;
}

function normalizeArabicIndicDigits(value = "") {
  return (value || "").toString()
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit).toString())
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit).toString());
}

function findTimeFromText(text) {
  const value = normalizeArabicIndicDigits(normalizeText(text));

  const patterns = [
    /\bat\s*(1[0-2]|[1-9])(?::([0-5]\d))?\s*(am|pm)?\b/i,
    /\b(1[0-2]|[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i,
    /(?:الساعة|الساعه|ساعة|ساعه|عالساعة|عالساعه|ع الساعة|ع الساعه)\s*(1[0-2]|[1-9])(?::([0-5]\d))?\s*(am|pm|ص|م|صباح|مساء)?/i,
    /(?:time|موعد|وقت)\s*(1[0-2]|[1-9])(?::([0-5]\d))?\s*(am|pm)?/i,
    /^(1[0-2]|[1-9])(?::([0-5]\d))?\s*(am|pm)?$/i
  ];

  let match = null;
  for (const pattern of patterns) {
    match = value.match(pattern);
    if (match) break;
  }

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const suffix = (match[3] || "").toLowerCase();

  if ((suffix === "pm" || suffix === "م" || suffix === "مساء") && hour < 12) hour += 12;
  if ((suffix === "am" || suffix === "ص" || suffix === "صباح") && hour === 12) hour = 0;

  // If the customer writes a bare hour, map it to Iconic working slots.
  // Examples: "at 3" => 3:00 PM, "ساعة 5" => 5:00 PM, "الساعة 6:30" => 6:30 PM.
  if (!suffix && hour >= 1 && hour <= 6) hour += 12;

  const minutes = hour * 60 + minute;
  const slot = allTimeSlots().find((item) => item.minutes === minutes);
  if (!slot) return null;

  return { payload: slot.payload, time: slot.title, minutes };
}

function isBookingStateActive(state = {}) {
  return ["booking", "consult", "service", "location", "team"].includes(state.intent) ||
    Boolean(state.branch || state.staff || state.day || state.dayPayload || state.time);
}

function clearBookingAfterBranch(state) {
  delete state.staff;
  delete state.day;
  delete state.dayPayload;
  delete state.time;
}

function clearBookingAfterStaff(state) {
  delete state.day;
  delete state.dayPayload;
  delete state.time;
}

function clearBookingAfterDay(state) {
  delete state.time;
}

function hasAnyBookingWord(value, words) {
  return words.some((word) => value.includes(word));
}

function isCancelBookingText(value) {
  return hasAnyBookingWord(value, ["الغاء", "إلغاء", "الغِ", "ما بدي", "وقف", "رجعني", "القائمة", "cancel", "main menu", "start over", "stop"]);
}

function isChangeTimeText(value) {
  return hasAnyBookingWord(value, ["غير الموعد", "تغيير الموعد", "أغير الموعد", "اغير الموعد", "غير الوقت", "تغيير الوقت", "وقت تاني", "وقت ثاني", "موعد تاني", "موعد ثاني", "reschedule", "change appointment", "change time", "another time", "different time"]);
}

function isChangeDayText(value) {
  return hasAnyBookingWord(value, ["غير اليوم", "تغيير اليوم", "يوم تاني", "يوم ثاني", "اختار يوم", "change day", "another day", "different day"]);
}

function isChangeStaffText(value) {
  return hasAnyBookingWord(value, ["غير المختص", "تغيير المختص", "غير الموظف", "تغيير الموظف", "شخص تاني", "شخص ثاني", "مختص تاني", "مختص ثاني", "غير الفريق", "change specialist", "change staff", "different specialist", "another specialist"]);
}

function isChangeBranchText(value) {
  return hasAnyBookingWord(value, ["غير الفرع", "تغيير الفرع", "فرع تاني", "فرع ثاني", "change branch", "different branch", "another branch"]);
}

function directAppointmentTextLooksRelevant(text) {
  const value = normalizeText(text);
  if (hasAnyBookingWord(value, ["موعد", "حجز", "احجز", "بدي", "اريد", "أريد", "سيرفس", "appointment", "book", "booking", "service", "with", "مع"])) return true;

  // Smart memory: allow short natural booking fragments like "with Omar" / "مع عمر".
  // Time-only fragments are handled only when a booking state is already active.
  return Boolean(findStaffFromText(text));
}

function contextualBookingPrompt(state, lang = "en") {
  if (state.intent === "service" && state.branch && !state.staff) {
    return { body: askStaffBody(state.branch, lang), replies: staffReplies(state.branch, lang) };
  }

  if ((state.intent === "consult" || state.intent === "service" || state.intent === "booking") && !state.branch) {
    return { body: askBranchBody(state.intent === "service" ? "service" : "consult", lang), replies: branchReplies(lang) };
  }

  if (!state.dayPayload && !state.day) {
    return { body: askDayBody(lang), replies: dayReplies(lang) };
  }

  return { body: askTimeBody(state.dayPayload || "DAY_WEEK", lang), replies: timeReplies(state.dayPayload || "DAY_WEEK", lang) };
}

function canFinalizeBookingFromMemory(state = {}) {
  if (!state.branch) return false;
  if (!state.day && !state.dayPayload) return false;
  if (!state.time) return false;
  if (state.intent === "service" && !state.staff) return false;
  return true;
}

async function finalizeIfBookingMemoryComplete({ channel, senderId, state, lang }) {
  if (!canFinalizeBookingFromMemory(state)) return false;
  await finalizeBookingOnce({ channel, senderId, state, lang });
  return true;
}

function getDetectedBookingFactsCount({ staff = null, detectedDay = null, branchFromText = "", detectedTime = null } = {}) {
  return [staff, detectedDay, branchFromText, detectedTime].filter(Boolean).length;
}

function applyDetectedDayToState(state, detectedDay) {
  if (!detectedDay) return;

  if (detectedDay.kind === "weekday") {
    state.day = detectedDay.day;
    state.dayPayload = "DAY_WEEK";
    return;
  }

  state.day = detectedDay.day;
  state.dayPayload = detectedDay.payload;
}

async function handleCombinedBookingDetails({ channel, senderId, text, state, lang, staff = null, detectedDay = null, branchFromText = "", detectedTime = null }) {
  const factsCount = getDetectedBookingFactsCount({ staff, detectedDay, branchFromText, detectedTime });
  if (factsCount < 2) return false;

  state.lang = lang;
  state.intent = staff ? "service" : (state.intent || "booking");

  if (branchFromText) {
    if (state.branch && state.branch !== branchFromText) {
      delete state.staff;
    }
    state.branch = branchFromText;
  }

  if (staff) {
    state.intent = "service";
    state.branch = staff.branch;
    state.staff = staff.canonical;
  }

  if (detectedDay) {
    applyDetectedDayToState(state, detectedDay);
  }

  if (detectedTime) {
    state.time = detectedTime.time;
  }

  debugLog("[Booking Natural Details Merged]", {
    channel,
    senderId,
    textPreview: previewText(text),
    factsCount,
    staff: staff?.canonical || state.staff || "",
    branch: state.branch || "",
    day: state.day || "",
    time: state.time || "",
    intent: state.intent || ""
  });

  if (detectedDay?.payload === "DAY_WEEK" && detectedDay.kind === "week") {
    await sendText(channel, senderId, askWeekDayBody(lang), weekDayReplies(lang));
    return true;
  }

  if (await finalizeIfBookingMemoryComplete({ channel, senderId, state, lang })) return true;

  const next = contextualBookingPrompt(state, lang);
  await sendText(channel, senderId, next.body, next.replies);
  return true;
}

async function sendDayOrTimeAfterDetectedDay({ channel, senderId, state, lang, detectedDay }) {
  if (!detectedDay) {
    await sendText(channel, senderId, askDayBody(lang), dayReplies(lang));
    return true;
  }

  if (detectedDay.payload === "DAY_WEEK") {
    state.dayPayload = "DAY_WEEK";
    state.day = detectedDay.day;
    clearBookingAfterDay(state);
    await sendText(channel, senderId, askWeekDayBody(lang), weekDayReplies(lang));
    return true;
  }

  if (detectedDay.kind === "weekday") {
    state.day = detectedDay.day;
    state.dayPayload = "DAY_WEEK";
    if (await finalizeIfBookingMemoryComplete({ channel, senderId, state, lang })) return true;
    clearBookingAfterDay(state);
    await sendText(channel, senderId, askTimeBody("DAY_WEEK", lang), timeReplies("DAY_WEEK", lang));
    return true;
  }

  state.day = detectedDay.day;
  state.dayPayload = detectedDay.payload;
  if (await finalizeIfBookingMemoryComplete({ channel, senderId, state, lang })) return true;
  clearBookingAfterDay(state);

  if (isTodayPayload(detectedDay.payload) && getAvailableTimeSlots(detectedDay.payload).length === 0) {
    await sendText(channel, senderId, askTimeBody(detectedDay.payload, lang), dayReplies(lang).filter((reply) => reply.payload !== "DAY_TODAY"));
    return true;
  }

  await sendText(channel, senderId, askTimeBody(detectedDay.payload, lang), timeReplies(detectedDay.payload, lang));
  return true;
}

async function handleDirectAppointmentRequest({ channel, senderId, text, state, lang }) {
  if (!directAppointmentTextLooksRelevant(text)) return false;

  const staff = findStaffFromText(text);
  const detectedDay = findDayFromText(text);
  const branchFromText = findBranchFromText(text);
  const detectedTime = findTimeFromText(text);

  if (!staff && !detectedDay && !branchFromText && !detectedTime) return false;

  const handledCombinedDetails = await handleCombinedBookingDetails({
    channel,
    senderId,
    text,
    state,
    lang,
    staff,
    detectedDay,
    branchFromText,
    detectedTime
  });
  if (handledCombinedDetails) return true;

  state.lang = lang;
  state.intent = staff ? "service" : (state.intent || "booking");

  if (branchFromText) {
    state.branch = branchFromText;
    clearBookingAfterBranch(state);
  }

  if (staff) {
    state.branch = staff.branch;
    state.staff = staff.canonical;
    clearBookingAfterStaff(state);
  }

  if (detectedTime) {
    state.time = detectedTime.time;
  }

  if (!state.branch && state.intent !== "booking") {
    await sendText(channel, senderId, askBranchBody(state.intent, lang), branchReplies(lang));
    return true;
  }

  if (staff && detectedDay) {
    const branchAr = state.branch === "Abu Dhabi" ? "أبوظبي" : "دبي";

    if (detectedDay.payload === "DAY_WEEK") {
      state.dayPayload = "DAY_WEEK";
      state.day = detectedDay.day;
      await sendText(channel, senderId, isAr(lang) ? `أكيد 👌\n\nحجز سيرفس مع ${staff.canonical} في فرع ${branchAr} هذا الأسبوع.\n\nاختار اليوم المناسب:` : `Sure 👌\n\nService appointment with ${staff.canonical} at ${state.branch} branch this week.\n\nPlease choose the day that suits you:`, weekDayReplies(lang));
      return true;
    }

    if (detectedDay.kind === "weekday") {
      state.day = detectedDay.day;
      state.dayPayload = "DAY_WEEK";
    } else {
      state.day = detectedDay.day;
      state.dayPayload = detectedDay.payload;
    }

    if (detectedTime) {
      await finalizeBookingOnce({ channel, senderId, state, lang });
      return true;
    }

    const intro = isAr(lang)
      ? `أكيد 👌\n\nحجز سيرفس مع ${staff.canonical} في فرع ${branchAr}.\n\nاختار الوقت المناسب:`
      : `Sure 👌\n\nService appointment with ${staff.canonical} at ${state.branch} branch.\n\nPlease choose a suitable time:`;

    await sendText(channel, senderId, intro, timeReplies(state.dayPayload || "DAY_WEEK", lang));
    return true;
  }

  if (staff && !detectedDay) {
    const branchAr = state.branch === "Abu Dhabi" ? "أبوظبي" : "دبي";
    if (detectedTime) {
      await sendText(channel, senderId, isAr(lang) ? `أكيد 👌\n\nحجز سيرفس مع ${staff.canonical} في فرع ${branchAr} الساعة ${detectedTime.time}.\n\nاختار اليوم المناسب:` : `Sure 👌\n\nService appointment with ${staff.canonical} at ${state.branch} branch at ${detectedTime.time}.\n\nPlease choose the day:`, dayReplies(lang));
      return true;
    }

    await sendText(channel, senderId, isAr(lang) ? `أكيد، مع ${staff.canonical} في فرع ${branchAr}.\nاختار اليوم المناسب:` : `Sure, with ${staff.canonical} at ${state.branch} branch.\nPlease choose the day:`, dayReplies(lang));
    return true;
  }

  if (detectedDay) {
    if (!state.branch) {
      await sendText(channel, senderId, isAr(lang) ? `أكيد، اختار الفرع المناسب أولًا:` : `Sure, please choose the branch first:`, branchReplies(lang));
      return true;
    }
    return sendDayOrTimeAfterDetectedDay({ channel, senderId, state, lang, detectedDay });
  }

  if (detectedTime) {
    await sendText(channel, senderId, isAr(lang) ? `تمام، سجلت الوقت ${detectedTime.time}.\nاختار اليوم المناسب:` : `Got it, selected ${detectedTime.time}.\nPlease choose the day:`, dayReplies(lang));
    return true;
  }

  const next = contextualBookingPrompt(state, lang);
  await sendText(channel, senderId, next.body, next.replies);
  return true;
}

async function handleBookingContextText({ channel, senderId, text, state, lang }) {
  if (!isBookingStateActive(state)) return false;

  const value = normalizeText(text);
  state.lang = lang;

  if (isCancelBookingText(value)) {
    resetState(senderId);
    await sendText(channel, senderId, isAr(lang) ? `تمام، رجعتك للقائمة الرئيسية 👇` : `No problem, back to the main menu 👇`, mainReplies(lang));
    return true;
  }

  const explicitBranch = findBranchFromText(text);
  const staff = findStaffFromText(text);
  const detectedDay = findDayFromText(text);
  const detectedTime = findTimeFromText(text);

  const handledCombinedDetails = await handleCombinedBookingDetails({
    channel,
    senderId,
    text,
    state,
    lang,
    staff,
    detectedDay,
    branchFromText: explicitBranch,
    detectedTime
  });
  if (handledCombinedDetails) return true;

  if (isChangeBranchText(value) || explicitBranch) {
    if (explicitBranch) {
      state.branch = explicitBranch;
      clearBookingAfterBranch(state);
      if (state.intent === "service") {
        await sendText(channel, senderId, askStaffBody(state.branch, lang), staffReplies(state.branch, lang));
        return true;
      }
      await sendText(channel, senderId, askDayBody(lang), dayReplies(lang));
      return true;
    }

    delete state.branch;
    clearBookingAfterBranch(state);
    await sendText(channel, senderId, isAr(lang) ? `أكيد، اختار الفرع المناسب:` : `Sure, please choose the branch:`, branchReplies(lang));
    return true;
  }

  if (isChangeStaffText(value) || staff) {
    if (state.intent !== "service" && !staff) {
      await sendText(channel, senderId, isAr(lang) ? `اختيار المختص متاح لمسار السيرفس. إذا بدك سيرفس اختار Service، أو كمل حجز الاستشارة.` : `Specialist selection is available for Service bookings. Choose Service, or continue your consultation booking.`, bookingReplies(lang));
      return true;
    }

    if (staff) {
      state.intent = "service";
      state.branch = staff.branch;
      state.staff = staff.canonical;
      clearBookingAfterStaff(state);
      await sendText(channel, senderId, isAr(lang) ? `تمام، اخترنا ${staff.canonical}.\nاختار اليوم المناسب:` : `Done, selected ${staff.canonical}.\nPlease choose the day:`, dayReplies(lang));
      return true;
    }

    if (!state.branch) {
      await sendText(channel, senderId, askBranchBody("service", lang), branchReplies(lang));
      return true;
    }

    await sendText(channel, senderId, isAr(lang) ? `أكيد، اختار المختص المناسب:` : `Sure, please choose the specialist:`, staffReplies(state.branch, lang));
    return true;
  }

  if (detectedDay && detectedTime) {
    state.time = detectedTime.time;
    return sendDayOrTimeAfterDetectedDay({ channel, senderId, state, lang, detectedDay });
  }

  if (isChangeDayText(value) || detectedDay) {
    if (detectedDay) return sendDayOrTimeAfterDetectedDay({ channel, senderId, state, lang, detectedDay });
    delete state.day;
    delete state.dayPayload;
    clearBookingAfterDay(state);
    await sendText(channel, senderId, isAr(lang) ? `أكيد، اختار اليوم المناسب:` : `Sure, please choose the day:`, dayReplies(lang));
    return true;
  }

  if (isChangeTimeText(value)) {
    if (state.dayPayload) {
      await sendText(channel, senderId, isAr(lang) ? `أكيد، اختار وقت جديد من الأوقات المتاحة:` : `Sure, please choose a new available time:`, timeReplies(state.dayPayload, lang));
      return true;
    }

    await sendText(channel, senderId, isAr(lang) ? `أكيد، اختار اليوم أولًا حتى نعرض الأوقات:` : `Sure, please choose the day first so we can show times:`, dayReplies(lang));
    return true;
  }

  if (detectedTime) {
    state.time = detectedTime.time;
    if (!state.dayPayload && !state.day) {
      await sendText(channel, senderId, isAr(lang) ? `تمام، سجلت الوقت ${detectedTime.time}.\nاختار اليوم المناسب:` : `Got it, selected ${detectedTime.time}.\nPlease choose the day:`, dayReplies(lang));
      return true;
    }

    await finalizeBookingOnce({ channel, senderId, state, lang });
    return true;
  }

  const next = contextualBookingPrompt(state, lang);
  await sendText(channel, senderId, isAr(lang) ? `تمام، خلينا نكمل الحجز من هون:` : `Sure, let’s continue the booking from here:`, next.replies);
  return true;
}

function welcomeBody(lang = "en") {
  if (isAr(lang)) {
    return `مرحبا 👋

أنا مساعد Iconic Hair Care الذكي.

اختار أحد الخيارات من القائمة، أو اكتب سؤالك مباشرة وأنا بحاول أجاوبك.

إذا ما قدرت أساعدك، بحوّلك لفريقنا حتى يتابع معك.`;
  }

  return `Hello 👋

I’m the smart assistant for Iconic Hair Care.

Please choose one of the options below, or type your question directly and I’ll do my best to help.

If I can’t help, I’ll connect you with our team.`;
}

function bookingBody(lang = "en") {
  if (isAr(lang)) {
    return `تمام، اختر نوع الحجز المناسب لك:\n\nاستشارة: إذا كنت عميل جديد وتريد معرفة الحل الأنسب لك.\nسيرفس: إذا كنت عميل حالي وتحتاج متابعة، تركيب، تعديل، أو سيرفس.`;
  }

  return `Sure, please choose the right booking type:\n\nConsultation: for new clients who want the best solution.\nService: for existing clients who need follow-up, fitting, adjustment, or service.`;
}

function servicesBody(lang = "en") {
  if (isAr(lang)) {
    return `أكيد ✨\n\nفي Iconic Hair Care نقدم حلول Hair Replacement بمظهر طبيعي 100%، بدون جراحة، وبخصوصية عالية.\n\nشو تحب تشوف أولاً؟`;
  }

  return `Sure ✨\n\nAt Iconic Hair Care, we provide non-surgical Hair Replacement with a 100% natural look and high privacy.\n\nWhat would you like to check first?`;
}

function resultsBody(lang = "en") {
  if (isAr(lang)) {
    return `أكيد، فيك تشوف بعض النتائج الطبيعية لعملائنا.\n\nالهدف دائمًا يكون شكل طبيعي، مرتب، ومناسب لملامح كل شخص.\n\nإذا لم يظهر الفيديو مباشرة، سنرسل لك رابط الفيديو أيضاً.`;
  }

  return `Sure, you can see some of our natural-looking client results.\n\nOur goal is always a clean, natural look that matches each person's features.\n\nIf the video does not open directly, we will also send you the video link.`;
}

function detailsBody(lang = "en") {
  if (isAr(lang)) {
    return `الفكرة بسيطة:\n\nنختار الحل المناسب حسب حالتك، ثم يتم تركيب الشعر بطريقة احترافية تعطي مظهر طبيعي بدون جراحة.\n\nكل شيء يتم داخل المركز وبخصوصية.\n\nإذا لم يظهر الفيديو مباشرة، سنرسل لك رابط الفيديو أيضاً.`;
  }

  return `The idea is simple:\n\nWe choose the right solution for your case, then apply it professionally to give a natural look without surgery.\n\nEverything is done in the center with privacy.\n\nIf the video does not open directly, we will also send you the video link.`;
}

function smartIntentBody(intent, lang = "en") {
  const ar = {
    price: `أكيد 👋

السعر يختلف حسب الحالة، والمساحة المطلوبة، ونوع الخدمة المناسبة لك.

الأفضل نعمل لك استشارة بسيطة حتى نحدد الحل الأنسب والسعر بشكل واضح، بدون أي التزام.`,
    surgery: `لا، الخدمة بدون جراحة وبدون عملية.

هي حل غير جراحي يعطي مظهر طبيعي، ويتم داخل المركز بدون تدخل طبي جراحي.`,
    natural: `نعم، هدفنا الأساسي أن يكون الشكل طبيعي جدًا ومناسب لملامحك.

نختار الكثافة، اللون، والتصميم حسب شكل الوجه حتى ما يعطي مظهر صناعي.`,
    duration: `مدة الجلسة تختلف حسب الحالة والخدمة المطلوبة.

عادة يتم توضيح الوقت بعد الاستشارة، لأن كل حالة تختلف حسب المساحة والتفاصيل المطلوبة.`,
    pain: `لا، الخدمة غير جراحية ولا تحتاج عملية.

عادة تكون مريحة، والفريق يشرح لك كل خطوة قبل البدء.`,
    booking: `أكيد 👋

فينا نساعدك بحجز استشارة أو موعد سيرفس.

اختار نوع الحجز المناسب لك، والفريق يتابع معك التفاصيل.`,
    location: `عندنا فرعين:

Dubai branch
Abu Dhabi branch

اختار الفرع المناسب لك حتى نرسل لك الموقع الصحيح.`,
    team: `أكيد، رح نخلي أحد أعضاء الفريق يتابع معك.

اكتب لنا سؤالك أو اختار الفرع المناسب حتى نوجهك بشكل أسرع.`,

    suitability: `غالبًا نقدر نساعدك، لكن الأفضل نشوف حالتك بالاستشارة حتى نحدد الحل الأنسب لك بشكل واضح.`,
    men_women: `نعم، خدماتنا مناسبة للرجال والنساء حسب الحالة واللوك المطلوب.`,
    privacy: `خصوصيتك مهمة جدًا. كل شيء يتم داخل المركز وبطريقة مريحة وخاصة.`,
    durability: `الثبات والمدة تختلف حسب الحالة وطريقة العناية ونوع الخدمة. الفريق يوضح لك التفاصيل بعد الاستشارة.`,
    detectability: `هدفنا أن الشكل يكون طبيعي وما يبان كأنه تركيب، من خلال اختيار اللون والكثافة والتصميم المناسبين لك.`,
    service_followup: `إذا أنت عميل حالي وتحتاج سيرفس أو متابعة، فينا نساعدك بحجز موعد سيرفس مباشرة.`,
    consult_vs_service: `الاستشارة للعميل الجديد حتى نحدد الحل الأنسب.

السيرفس للعميل الحالي الذي يحتاج متابعة أو تعديل أو زيارة.`,
    branch_help: `عندنا فرع دبي وفرع أبوظبي. اختار الأقرب لك، وإذا محتار فريقنا يساعدك.`,
    availability: `نقدر نساعدك بأقرب موعد متاح. اختار نوع الحجز والفرع، وبعدها نعرض الأيام والأوقات.`,
    hesitation: `طبيعي تكون متردد. الاستشارة تساعدك تشوف الخيارات المناسبة لك بدون ضغط أو التزام.`,
    free_consultation: `الاستشارة هدفها نحدد الحل المناسب لك ونوضح التفاصيل. الفريق يؤكد لك أي تفاصيل قبل الموعد.`,
    color_density: `نختار اللون والكثافة والتصميم حسب شعرك وملامحك حتى تكون النتيجة طبيعية قدر الإمكان.`,
    shaving: `موضوع الحلاقة يعتمد على الحالة والخدمة المناسبة. الفريق يوضح لك ذلك خلال الاستشارة قبل أي خطوة.`,
    lifestyle: `بعد اختيار الحل المناسب وشرح طريقة العناية، تقدر تمارس حياتك بشكل طبيعي حسب تعليمات الفريق.`
  };

  const en = {
    price: `Of course 👋

The price depends on your case, the area needed, and the best service option for you.

The best step is a quick consultation so we can recommend the right solution and give you a clear price with no obligation.`,
    surgery: `No, it does not require surgery.

It is a non-surgical solution designed to give a natural look, done inside the center without a surgical procedure.`,
    natural: `Yes, the main goal is a very natural look that suits your features.

We choose the density, color, and design based on your face shape so it does not look artificial.`,
    duration: `The session duration depends on the case and the service needed.

Usually, we confirm the time after the consultation because every case is different depending on the area and details required.`,
    pain: `No, the service is non-surgical and does not require an operation.

It is usually comfortable, and the team explains every step before starting.`,
    booking: `Sure 👋

We can help you book a consultation or a service appointment.

Choose the right booking type, and the team will follow up with the details.`,
    location: `We have two branches:

Dubai branch
Abu Dhabi branch

Choose the branch that suits you so we can send the correct location.`,
    team: `Sure, one of our team members will follow up with you.

Please write your question or choose the right branch so we can guide you faster.`,

    suitability: `In most cases, we can help, but the best step is a consultation so we can check your case and recommend the right solution.`,
    men_women: `Yes, our services are suitable for men and women depending on the case and desired look.`,
    privacy: `Your privacy is very important. Everything is handled inside the center in a private and comfortable way.`,
    durability: `Hold and durability depend on the case, care routine, and service type. Our team explains the details after consultation.`,
    detectability: `Our goal is a natural look that does not appear artificial, by matching color, density, and design to you.`,
    service_followup: `If you are an existing client and need service or follow-up, we can help you book a service appointment directly.`,
    consult_vs_service: `Consultation is for new clients to find the best solution.

Service is for existing clients who need follow-up, adjustment, or a visit.`,
    branch_help: `We have Dubai and Abu Dhabi branches. Choose the closest one, or our team can guide you.`,
    availability: `We can help with the nearest available appointment. Choose the booking type and branch, then we’ll show days and times.`,
    hesitation: `It is normal to feel unsure. A consultation helps you understand your options clearly, with no pressure.`,
    free_consultation: `The consultation is to check your case and explain the suitable solution. Our team can confirm any details before the appointment.`,
    color_density: `We match color, density, and design to your natural hair and features for the most natural result possible.`,
    shaving: `Shaving depends on your case and the suitable service. The team explains this during consultation before any step.`,
    lifestyle: `After choosing the right solution and understanding the care steps, you can continue daily life according to the team’s guidance.`
  };

  return isAr(lang) ? ar[intent] : en[intent];
}

function askBranchBody(intent, lang = "en") {
  if (isAr(lang)) {
    const label = intent === "service" ? "السيرفس" : intent === "location" ? "الموقع" : "الاستشارة";
    return `تمام، اختر الفرع المناسب لـ ${label}:`;
  }

  const label = intent === "service" ? "Service" : intent === "location" ? "Location" : "Consultation";
  return `Great, please choose the branch for ${label}:`;
}

function askStaffBody(branch = "Dubai", lang = "en") {
  if (isAr(lang)) return branch === "Abu Dhabi" ? `اختر مختص فرع أبوظبي:` : `اختر مختص فرع دبي:`;
  return branch === "Abu Dhabi" ? `Choose your Abu Dhabi branch specialist:` : `Choose your Dubai branch specialist:`;
}

function askDayBody(lang = "en") {
  return isAr(lang) ? `تمام، اختر اليوم المناسب:` : `Great, please choose your preferred day:`;
}

function askWeekDayBody(lang = "en") {
  return isAr(lang)
    ? `تمام، اختر اليوم المناسب خلال هذا الأسبوع:`
    : `Great, please choose the day that suits you this week:`;
}

function askTimeBody(dayPayload, lang = "en") {
  if (isTodayPayload(dayPayload) && getAvailableTimeSlots(dayPayload).length === 0) {
    return isAr(lang)
      ? `مواعيد اليوم خلصت حسب توقيت دبي.\n\nاختر بكرا أو هذا الأسبوع.`
      : `Today's available slots are finished based on Dubai time.\n\nPlease choose Tomorrow or This week.`;
  }

  return isAr(lang) ? `تمام، اختر الوقت المفضل حسب توقيت دبي:` : `Great, please choose your preferred time based on Dubai time:`;
}

function finalSummaryBody(state, lang = "en") {
  const branch = state.branch || "Dubai";
  const branchAr = branch === "Abu Dhabi" ? "أبوظبي" : "دبي";
  const day = state.day || (isAr(lang) ? "غير محدد" : "Not selected");
  const time = state.time || (isAr(lang) ? "مرن" : "Flexible");
  const staff = state.staff || (isAr(lang) ? "غير محدد" : "Not selected");

  if (isAr(lang)) {
    return `⚠️ تم استلام طلب الحجز، لكنه ليس تأكيدًا نهائيًا بعد.\n\nتفاصيل الطلب:\nالفرع: ${branchAr}\nالمختص: ${staff}\nاليوم: ${day}\nالوقت: ${time}\n\nسيقوم الفريق بمراجعة توفر الوقت والمختص، وسنرجع لك خلال 2 إلى 5 دقائق لتأكيد الموعد.`;
  }

  return `⚠️ Your booking request has been received, but it is not confirmed yet.\n\nRequest details:\nBranch: ${branch}\nSpecialist: ${staff}\nDay: ${day}\nTime: ${time}\n\nOur team will check the availability of the time and specialist, and we’ll get back to you within 2 to 5 minutes to confirm the appointment.`;
}


function teamBody(lang = "en") {
  if (isAr(lang)) {
    return `تمام 👌\n\nتم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.`;
  }

  return `Done 👌\n\nYour conversation has been forwarded to our team. One of our specialists will assist you shortly.`;
}

function locationBody(branch = "Dubai", lang = "en") {
  const locationUrl = branch === "Abu Dhabi" ? ABU_DHABI_LOCATION_URL : DUBAI_LOCATION_URL;
  const branchAr = branch === "Abu Dhabi" ? "أبوظبي" : "دبي";
  return isAr(lang) ? `هذا هو موقع فرع ${branchAr}:\n\n${locationUrl}` : `This is our ${branch} branch location:\n\n${locationUrl}`;
}

function fallbackBody(lang = "en") {
  return isAr(lang)
    ? `أنا هون لمساعدتك 👋
اختار أحد الخيارات من القائمة:`
    : `I’m here to help 👋
Please choose one of the options below:`;
}

function getStaffNumberForBranch(branch) {
  return branch === "Abu Dhabi" ? ABU_DHABI_STAFF_NUMBER : DUBAI_STAFF_NUMBER;
}

function getStaffSenderPhoneNumberIdForBranch(branch) {
  return branch === "Abu Dhabi" ? ABU_DHABI_STAFF_NOTIFY_PHONE_NUMBER_ID : DUBAI_STAFF_NOTIFY_PHONE_NUMBER_ID;
}

function buildStaffNotificationKey(state, channel, senderId) {
  return [
    senderId || "unknown",
    channel || "unknown",
    state.intent || "booking",
    state.branch || "Dubai",
    state.staff || "not-selected",
    state.day || "not-selected",
    state.time || "Flexible"
  ].join("|");
}

function buildStaffSenderLockKey(senderId) {
  return `booking-alert|${senderId || "unknown"}`;
}

function pruneStaffNotificationCaches(now) {
  for (const [cacheKey, sentAt] of staffNotificationCache.entries()) {
    if (now - sentAt > STAFF_NOTIFICATION_DEDUPE_MS) staffNotificationCache.delete(cacheKey);
  }

  for (const [cacheKey, sentAt] of staffSenderLockCache.entries()) {
    if (now - sentAt > STAFF_NOTIFICATION_DEDUPE_MS) staffSenderLockCache.delete(cacheKey);
  }
}

function shouldSendStaffNotification(state, channel, senderId) {
  const key = buildStaffNotificationKey(state, channel, senderId);
  const senderLockKey = buildStaffSenderLockKey(senderId);
  const now = Date.now();
  pruneStaffNotificationCaches(now);

  const lastSenderAlertAt = staffSenderLockCache.get(senderLockKey) || 0;
  if (now - lastSenderAlertAt < STAFF_NOTIFICATION_DEDUPE_MS) {
    console.log("[Staff Notify] skipped duplicate sender booking alert", senderLockKey);
    return false;
  }

  const lastSentAt = staffNotificationCache.get(key) || 0;
  if (now - lastSentAt < STAFF_NOTIFICATION_DEDUPE_MS) {
    console.log("[Staff Notify] skipped duplicate booking alert", key);
    return false;
  }

  // Pre-lock before any async WhatsApp send, so duplicate webhook events arriving
  // at the same time cannot send the staff alert twice.
  staffSenderLockCache.set(senderLockKey, now);
  staffNotificationCache.set(key, now);
  return true;
}

function formatStaffAlertDay(day) {
  const raw = (day || "Not selected").toString().trim();
  const firstPart = raw.split("|")[0].trim();
  const value = firstPart || raw;
  const normalized = normalizeText(value);

  const dayMap = {
    "اليوم": "Today",
    "بكرا": "Tomorrow",
    "غدا": "Tomorrow",
    "غداً": "Tomorrow",
    "هذا الأسبوع": "This week",
    "هدا الأسبوع": "This week",
    "الاثنين": "Monday",
    "الإثنين": "Monday",
    "الثلاثاء": "Tuesday",
    "الأربعاء": "Wednesday",
    "الاربعاء": "Wednesday",
    "الخميس": "Thursday",
    "الجمعة": "Friday",
    "السبت": "Saturday",
    "الأحد": "Sunday",
    "الاحد": "Sunday"
  };

  return dayMap[normalized] || value;
}

function buildInstagramInboxLink() {
  return "https://www.instagram.com/direct/inbox/";
}

function buildStaffBookingAlert(state, channel, senderId) {
  const isServiceRequest = state.intent === "service";
  const requestType = isServiceRequest ? "Service Appointment" : "Consultation Booking";
  const branch = state.branch || "Dubai";
  const day = formatStaffAlertDay(state.day || "Not selected");
  const time = state.time || "Flexible";
  const staff = state.staff || "Not selected";
  const greeting = branch === "Dubai" ? "Hello Angel," : "Hello Abu Dhabi team,";
  const inboxLink = buildInstagramInboxLink();

  return `${greeting}

A new client booking request has been received from Instagram.

Please follow up with the client.

Booking details:
Branch: ${branch}
Request type: ${requestType}
Specialist: ${staff}
Day: ${day}
Time: ${time}

Open Instagram inbox:
${inboxLink}

Meta customer ID:
${senderId}

Important:
This is not a confirmed booking yet.
Please check the specialist and time availability, then confirm with the client within 2 to 5 minutes.`;
}

async function sendStaffBookingAlertOnce(state, channel, senderId) {
  if (!shouldSendStaffNotification(state, channel, senderId)) return { ok: false, skipped: true, reason: "duplicate_booking_alert" };

  const staffNumber = getStaffNumberForBranch(state.branch);
  const staffSenderPhoneNumberId = getStaffSenderPhoneNumberIdForBranch(state.branch);
  const alertBody = buildStaffBookingAlert(state, channel, senderId);

  debugLog("[Staff Notify Preparing]", {
    channel,
    senderId,
    branch: state.branch || "Dubai",
    staffNumber,
    fromPhoneNumberId: staffSenderPhoneNumberId,
    state: summarizeState(state),
    bodyPreview: previewText(alertBody)
  });

  return sendStaffWhatsAppText(staffNumber, alertBody, staffSenderPhoneNumberId);
}

function buildBookingFinalizationKey(senderId) {
  return `booking-finalized|${senderId || "unknown"}`;
}

function shouldFinalizeBooking(senderId) {
  const key = buildBookingFinalizationKey(senderId);
  const now = Date.now();

  for (const [cacheKey, finalizedAt] of bookingFinalizationCache.entries()) {
    if (now - finalizedAt > STAFF_NOTIFICATION_DEDUPE_MS) bookingFinalizationCache.delete(cacheKey);
  }

  const lastFinalizedAt = bookingFinalizationCache.get(key) || 0;
  if (now - lastFinalizedAt < STAFF_NOTIFICATION_DEDUPE_MS) {
    console.log("[Booking Finalize] skipped duplicate finalization", key);
    return false;
  }

  bookingFinalizationCache.set(key, now);
  return true;
}

async function finalizeBookingOnce({ channel, senderId, state, lang }) {
  if (state.bookingFinalized) {
    console.log("[Booking Finalize] skipped duplicate state finalization", senderId);
    debugLog("[Booking Finalize Debug]", {
      senderId,
      reason: "duplicate_state_finalization",
      state: summarizeState(state)
    });
    return { ok: false, skipped: true, reason: "duplicate_state_finalization" };
  }

  if (!shouldFinalizeBooking(senderId)) {
    debugLog("[Booking Finalize Debug]", {
      senderId,
      reason: "duplicate_sender_finalization",
      state: summarizeState(state)
    });
    return { ok: false, skipped: true, reason: "duplicate_sender_finalization" };
  }

  // Lock before any async send so two parallel webhook events cannot both notify staff.
  state.bookingFinalized = true;

  debugLog("[Booking Finalize Start]", {
    channel,
    senderId,
    lang,
    state: summarizeState(state)
  });

  const summaryBody = finalSummaryBody(state, lang);
  const customerReply = await sendText(channel, senderId, summaryBody, mainReplies(lang));

  if (!customerReply?.ok) {
    console.log("[Customer Final Reply] failed, staff notify will continue", customerReply?.status || "no-status", JSON.stringify(getMetaErrorSummary(customerReply)));
    debugLog("[Customer Final Reply Debug]", {
      channel,
      senderId,
      status: customerReply?.status || "no-status",
      reason: customerReply?.reason || "",
      error: getMetaErrorSummary(customerReply),
      replyPreview: previewText(summaryBody),
      buttons: summarizeQuickReplies(mainReplies(lang))
    });
  } else {
    debugLog("[Customer Final Reply Sent]", {
      channel,
      senderId,
      result: customerReply?.data || {},
      replyPreview: previewText(summaryBody)
    });
  }

  const staffResult = await sendStaffBookingAlertOnce(state, channel, senderId);
  const staffWamid = getWhatsAppMessageId(staffResult?.data || {});

  if (staffResult?.ok) {
    debugLog("[Booking Finalize Completed]", {
      channel,
      senderId,
      customerReplyOk: Boolean(customerReply?.ok),
      staffNotifyOk: true,
      staffWamid
    });
  } else {
    debugLog("[Booking Finalize Staff Notify Issue]", {
      channel,
      senderId,
      customerReplyOk: Boolean(customerReply?.ok),
      staffNotifyOk: false,
      skipped: Boolean(staffResult?.skipped),
      reason: staffResult?.reason || "",
      status: staffResult?.status || "",
      error: getMetaErrorSummary(staffResult)
    });
  }

  resetState(senderId);

  return {
    ok: Boolean(customerReply?.ok || staffResult?.ok),
    customerReply,
    staffResult,
    customerReplyFailed: !customerReply?.ok
  };
}



function buildStaffWhatsAppDedupeKey(to, body, phoneNumberId) {
  return [
    (to || "").toString().replace(/\D/g, ""),
    (phoneNumberId || "").toString().trim(),
    (body || "").toString().trim()
  ].join("|");
}

function shouldSendStaffWhatsAppText(to, body, phoneNumberId) {
  const key = buildStaffWhatsAppDedupeKey(to, body, phoneNumberId);
  const now = Date.now();
  const lastSentAt = staffWhatsAppSendCache.get(key) || 0;

  for (const [cacheKey, sentAt] of staffWhatsAppSendCache.entries()) {
    if (now - sentAt > STAFF_NOTIFICATION_DEDUPE_MS) staffWhatsAppSendCache.delete(cacheKey);
  }

  if (now - lastSentAt < STAFF_NOTIFICATION_DEDUPE_MS) {
    console.log("[Staff Notify] skipped duplicate WhatsApp send");
    return { ok: false, skipped: true, reason: "duplicate_whatsapp_send", key };
  }

  staffWhatsAppSendCache.set(key, now);
  return { ok: true, key };
}

async function sendStaffWhatsAppText(to, body, phoneNumberId) {
  if (!STAFF_NOTIFY_ENABLED) {
    console.log("[Staff Notify] skipped because STAFF_NOTIFY_ENABLED=false");
    return { ok: false, skipped: true };
  }

  if (!to) {
    console.log("[Staff Notify] skipped: staff number missing");
    return { ok: false, skipped: true, reason: "missing_staff_number" };
  }

  const senderPhoneNumberId = (phoneNumberId || STAFF_WHATSAPP_PHONE_NUMBER_ID || "").toString().trim();

  if (!STAFF_WHATSAPP_TOKEN || !senderPhoneNumberId) {
    console.log("[Staff Notify] skipped: WhatsApp token or sender phone number ID missing");
    return { ok: false, skipped: true, reason: "missing_whatsapp_env" };
  }

  const dedupe = shouldSendStaffWhatsAppText(to, body, senderPhoneNumberId);
  if (!dedupe.ok) {
    debugLog("[Staff Notify Skipped]", {
      to,
      fromPhoneNumberId: senderPhoneNumberId,
      reason: dedupe.reason || "dedupe",
      bodyPreview: previewText(body)
    });
    return dedupe;
  }

  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(senderPhoneNumberId)}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body }
  };

  debugLog("[Staff Notify Send Attempt]", {
    to,
    fromPhoneNumberId: senderPhoneNumberId,
    bodyPreview: previewText(body),
    bodyLength: (body || "").toString().length
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STAFF_WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      staffWhatsAppSendCache.delete(dedupe.key);
      console.log("[Staff Notify] failed", response.status, JSON.stringify(data));
      debugLog("[Staff Notify Failed Debug]", {
        to,
        fromPhoneNumberId: senderPhoneNumberId,
        status: response.status,
        error: getMetaErrorSummary({ data })
      });
      return { ok: false, status: response.status, data };
    }

    const wamid = getWhatsAppMessageId(data);
    console.log(`[Staff Notify] sent to=${to} fromPhoneNumberId=${senderPhoneNumberId} wamid=${wamid}`);
    return { ok: true, data };
  } catch (error) {
    console.log("[Staff Notify] error", error.message);
    debugLog("[Staff Notify Error Debug]", {
      to,
      fromPhoneNumberId: senderPhoneNumberId,
      error: error.message
    });
    return { ok: false, error: error.message };
  }
}

function getChannelConfig(channel) {
  if (channel === "instagram") {
    return {
      graphVersion: FACEBOOK_GRAPH_VERSION,
      senderId: MESSENGER_PAGE_ID || "me",
      accessToken: MESSENGER_PAGE_ACCESS_TOKEN || INSTAGRAM_ACCESS_TOKEN
    };
  }

  return {
    graphVersion: FACEBOOK_GRAPH_VERSION,
    senderId: MESSENGER_PAGE_ID || "me",
    accessToken: MESSENGER_PAGE_ACCESS_TOKEN
  };
}

async function sendMetaMessage(channel, recipientId, message) {
  const config = getChannelConfig(channel);

  if (!config.accessToken || !config.senderId) {
    console.log(`[Meta Send] skipped: missing env for ${channel}`);
    debugLog("[Meta Send Skipped]", {
      channel,
      recipientId,
      reason: "missing_env",
      hasAccessToken: Boolean(config.accessToken),
      senderId: config.senderId || ""
    });
    return { ok: false, skipped: true, reason: "missing_env" };
  }

  const url = `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.senderId)}/messages`;
  const payload = { recipient: { id: recipientId }, message };

  if (channel !== "instagram") {
    payload.messaging_type = "RESPONSE";
  }

  debugLog("[Meta Send Attempt]", {
    channel,
    recipientId,
    senderId: config.senderId,
    messageTextPreview: previewText(message?.text || ""),
    quickReplies: summarizeQuickReplies(message?.quick_replies || []),
    attachmentType: message?.attachment?.type || ""
  });

  try {
    const response = await fetch(`${url}?access_token=${encodeURIComponent(config.accessToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorCode = data?.error?.code;
      const errorSubcode = data?.error?.error_subcode;

      // Instagram DMs can sometimes be mirrored through the Messenger webhook path.
      // When that happens, Facebook returns "No matching user found" because the
      // Instagram sender is not a Messenger PSID. The real Instagram reply may still
      // be delivered, so keep this silent to avoid scary red log noise.
      if (channel === "messenger" && errorCode === 100 && errorSubcode === 2018001) {
        debugLog("[Meta Send Skipped]", {
          channel,
          recipientId,
          status: response.status,
          reason: "messenger_no_matching_user",
          error: getMetaErrorSummary({ data })
        });
        return { ok: false, skipped: true, reason: "messenger_no_matching_user", status: response.status, data };
      }

      console.log(`[Meta Send] failed ${channel}`, response.status, JSON.stringify(data));
      debugLog("[Meta Send Failed Debug]", {
        channel,
        recipientId,
        senderId: config.senderId,
        status: response.status,
        error: getMetaErrorSummary({ data }),
        messageTextPreview: previewText(message?.text || ""),
        quickReplies: summarizeQuickReplies(message?.quick_replies || [])
      });
      return { ok: false, status: response.status, data };
    }

    debugLog("[Meta Send Sent]", {
      channel,
      recipientId,
      senderId: config.senderId,
      data,
      messageTextPreview: previewText(message?.text || "")
    });
    return { ok: true, data };
  } catch (error) {
    console.log(`[Meta Send] error ${channel}`, error.message);
    debugLog("[Meta Send Error Debug]", {
      channel,
      recipientId,
      senderId: config.senderId,
      error: error.message,
      messageTextPreview: previewText(message?.text || "")
    });
    return { ok: false, error: error.message };
  }
}


async function sendText(channel, recipientId, text, quickReplies = []) {
  const message = { text };
  if (quickReplies && quickReplies.length) {
    message.quick_replies = quickReplies.slice(0, 13);
  }
  return sendMetaMessage(channel, recipientId, message);
}

async function sendMedia(channel, recipientId, type, url) {
  if (!url) return { ok: false, skipped: true, reason: "missing_media_url" };
  const safeType = type === "video" ? "video" : "image";
  return sendMetaMessage(channel, recipientId, {
    attachment: {
      type: safeType,
      payload: {
        url,
        is_reusable: true
      }
    }
  });
}

async function sendResultsContent(channel, recipientId, lang) {
  let mediaResult = { ok: false };
  if (META_RESULTS_VIDEO_URL) mediaResult = await sendMedia(channel, recipientId, "video", META_RESULTS_VIDEO_URL);
  if (!mediaResult.ok && META_RESULTS_IMAGE_URL) mediaResult = await sendMedia(channel, recipientId, "image", META_RESULTS_IMAGE_URL);

  if (!mediaResult.ok && META_RESULTS_VIDEO_URL) {
    await sendText(channel, recipientId, isAr(lang) ? `رابط النتائج:\n${META_RESULTS_VIDEO_URL}` : `Results video link:\n${META_RESULTS_VIDEO_URL}`);
  }
}

async function sendDetailsContent(channel, recipientId, lang) {
  const mediaResult = await sendMedia(channel, recipientId, "video", DETAILS_VIDEO_URL);
  if (!mediaResult.ok && DETAILS_VIDEO_URL) {
    await sendText(channel, recipientId, isAr(lang) ? `رابط التفاصيل:\n${DETAILS_VIDEO_URL}` : `Details video link:\n${DETAILS_VIDEO_URL}`);
  }
}

async function handlePayload({ channel, senderId, payload, state, lang }) {
  if (payload === "MAIN_MENU") {
    resetState(senderId);
    await sendText(channel, senderId, welcomeBody(lang), mainReplies(lang));
    return true;
  }

  if (payload === "BOOKING") {
    state.intent = "booking";
    await sendText(channel, senderId, bookingBody(lang), bookingReplies(lang));
    return true;
  }

  if (payload === "SERVICES") {
    await sendText(channel, senderId, servicesBody(lang), servicesReplies(lang));
    return true;
  }

  if (payload === "CONSULT") {
    state.intent = "consult";
    state.lang = lang;
    await sendText(channel, senderId, askBranchBody("consult", lang), branchReplies(lang));
    return true;
  }

  if (payload === "SERVICE") {
    state.intent = "service";
    state.lang = lang;
    await sendText(channel, senderId, askBranchBody("service", lang), branchReplies(lang));
    return true;
  }

  if (payload === "RESULTS") {
    await sendResultsContent(channel, senderId, lang);
    await sendText(channel, senderId, resultsBody(lang), resultsReplies(lang));
    return true;
  }

  if (payload === "DETAILS") {
    await sendDetailsContent(channel, senderId, lang);
    await sendText(channel, senderId, detailsBody(lang), detailsReplies(lang));
    return true;
  }

  if (payload === "LOCATION") {
    state.intent = "location";
    state.lang = lang;
    await sendText(channel, senderId, askBranchBody("location", lang), branchReplies(lang));
    return true;
  }

  if (payload === "TEAM") {
    await sendText(channel, senderId, teamBody(lang), mainReplies(lang));
    return true;
  }

  const branch = payloadToBranch(payload);
  if (branch) {
    state.branch = branch;
    state.lang = lang;

    if (state.intent === "location") {
      await sendText(channel, senderId, locationBody(branch, lang), intentReplies("location", lang));
      return true;
    }

    if (state.intent === "service") {
      await sendText(channel, senderId, askStaffBody(branch, lang), staffReplies(branch, lang));
      return true;
    }

    if (!state.intent || state.intent === "team") {
      await sendText(channel, senderId, teamBody(lang), mainReplies(lang));
      return true;
    }

    await sendText(channel, senderId, askDayBody(lang), dayReplies(lang));
    return true;
  }

  const staff = payloadToStaff(payload);
  if (staff) {
    state.staff = staff;
    state.lang = lang;
    await sendText(channel, senderId, askDayBody(lang), dayReplies(lang));
    return true;
  }

  if (payload === "DAY_WEEK") {
    state.dayPayload = "DAY_WEEK";
    state.lang = lang;
    await sendText(channel, senderId, askWeekDayBody(lang), weekDayReplies(lang));
    return true;
  }

  const weekDay = payloadToWeekDay(payload);
  if (weekDay) {
    state.day = weekDay;
    state.dayPayload = "DAY_WEEK";
    state.lang = lang;
    await sendText(channel, senderId, askTimeBody("DAY_WEEK", lang), timeReplies("DAY_WEEK", lang));
    return true;
  }

  const day = payloadToDay(payload);
  if (day) {
    state.day = day;
    state.dayPayload = payload;
    state.lang = lang;

    if (isTodayPayload(payload) && getAvailableTimeSlots(payload).length === 0) {
      await sendText(channel, senderId, askTimeBody(payload, lang), dayReplies(lang).filter((reply) => reply.payload !== "DAY_TODAY"));
      return true;
    }

    await sendText(channel, senderId, askTimeBody(payload, lang), timeReplies(payload, lang));
    return true;
  }

  const time = payloadToTime(payload);
  if (time) {
    state.time = time;
    state.lang = lang;

    await finalizeBookingOnce({ channel, senderId, state, lang });
    return true;
  }

  return false;
}

async function handleSmartIntent({ channel, senderId, text, state, lang }) {
  const intent = detectSmartIntent(text);
  if (!intent) return false;

  state.lang = lang;

  if (intent === "results") {
    await sendResultsContent(channel, senderId, lang);
    await sendText(channel, senderId, resultsBody(lang), resultsReplies(lang));
    return true;
  }

  if (intent === "details") {
    await sendDetailsContent(channel, senderId, lang);
    await sendText(channel, senderId, detailsBody(lang), detailsReplies(lang));
    return true;
  }

  if (intent === "booking") {
    if (isAppointmentRequestWithoutDetails(text)) {
      state.intent = "service";
      await sendText(channel, senderId, appointmentBookingBody(lang), branchReplies(lang));
      return true;
    }

    state.intent = "booking";
    await sendText(channel, senderId, smartIntentBody("booking", lang), bookingReplies(lang));
    return true;
  }

  if (intent === "location") {
    state.intent = "location";
    await sendText(channel, senderId, smartIntentBody("location", lang), intentReplies("location", lang));
    return true;
  }

  if (intent === "team") {
    state.intent = "team";
    await sendText(channel, senderId, smartIntentBody("team", lang), intentReplies("team", lang));
    return true;
  }

  await sendText(channel, senderId, smartIntentBody(intent, lang), intentReplies(intent, lang));
  return true;
}

function getMessageText(event) {
  if (event?.message?.quick_reply?.payload) return event.message.quick_reply.payload;
  if (event?.postback?.payload) return event.postback.payload;
  if (event?.message?.text) return event.message.text;
  return "";
}

function getSenderId(event) {
  return event?.sender?.id || event?.from?.id || event?.sender_id || "";
}

function getChannelFromEntry(entry, event) {
  const object = (entry?.object || "").toString().toLowerCase();
  if (object.includes("instagram")) return "instagram";
  if (entry?.messaging_product === "instagram") return "instagram";
  if (event?.recipient?.id && INSTAGRAM_BUSINESS_ACCOUNT_ID && event.recipient.id === INSTAGRAM_BUSINESS_ACCOUNT_ID) return "instagram";
  return "messenger";
}

// Instagram-only safety mode:
// Messenger is handled by Meta Business AI, so this service must not answer
// Messenger events or send staff WhatsApp notifications for Messenger events.
// This prevents duplicate Angel alerts when Meta sends both Messenger-like and
// Instagram webhook events for the same customer action.
function shouldSkipIncomingChannel(channel) {
  return channel === "messenger";
}

async function handleIncomingEvent(entry, event) {
  const senderId = getSenderId(event);
  if (!senderId) return;

  const channel = getChannelFromEntry(entry, event);
  const text = getMessageText(event);

  if (shouldSkipIncomingChannel(channel)) {
    debugLog("[Meta Incoming Skipped]", {
      channel,
      senderId,
      reason: "messenger_disabled_business_ai_handles_messenger"
    });
    return;
  }

  const state = getState(senderId);
  const lang = getTurnLanguage(text, state);
  state.lang = lang;

  debugLog("[Meta Incoming]", {
    channel,
    senderId,
    eventType: getEventType(event),
    textPreview: previewText(text),
    lang,
    currentState: summarizeState(state)
  });

  const intentText = hasGreetingWithIntent(text) ? stripLeadingGreeting(text) : text;

  const payload = isPayloadOnly(text) ? text.toUpperCase().trim() : "";
  if (payload) {
    debugLog("[Meta Incoming Payload]", {
      channel,
      senderId,
      payload,
      state: summarizeState(state)
    });
    const handledPayload = await handlePayload({ channel, senderId, payload, state, lang });
    if (handledPayload) return;
  }

  if (isGreeting(text) && !hasGreetingWithIntent(text)) {
    await sendText(channel, senderId, greetingBody(text, lang), mainReplies(lang));
    return;
  }

  const handledDirectAppointment = await handleDirectAppointmentRequest({ channel, senderId, text: intentText, state, lang });
  if (handledDirectAppointment) return;

  if (isLocation(intentText)) {
    const requestedBranch = findBranchFromText(intentText);
    if (requestedBranch) {
      resetState(senderId);
      await sendText(channel, senderId, locationBody(requestedBranch, lang), intentReplies("location", lang));
      return;
    }

    state.intent = "location";
    state.lang = lang;
    await sendText(channel, senderId, smartIntentBody("location", lang), intentReplies("location", lang));
    return;
  }

  if (isBookingStateActive(state)) {
    const bookingContextIntent = detectSmartIntent(intentText);
    if (isBookingContextSmartFaqOverride(bookingContextIntent)) {
      if (bookingContextIntent === "results") {
        await sendResultsContent(channel, senderId, lang);
        await sendText(channel, senderId, resultsBody(lang), resultsReplies(lang));
        return;
      }

      if (bookingContextIntent === "details") {
        await sendDetailsContent(channel, senderId, lang);
        await sendText(channel, senderId, detailsBody(lang), detailsReplies(lang));
        return;
      }

      if (bookingContextIntent === "team") {
        await sendText(channel, senderId, teamBody(lang), mainReplies(lang));
        return;
      }

      await sendText(channel, senderId, smartIntentBody(bookingContextIntent, lang), intentReplies(bookingContextIntent, lang));
      return;
    }
  }

  const handledBookingContext = await handleBookingContextText({ channel, senderId, text: intentText, state, lang });
  if (handledBookingContext) return;

  if (isConsult(intentText)) {
    state.intent = "consult";
    await sendText(channel, senderId, askBranchBody("consult", lang), branchReplies(lang));
    return;
  }

  if (isService(intentText)) {
    state.intent = "service";
    await sendText(channel, senderId, askBranchBody("service", lang), branchReplies(lang));
    return;
  }

  const handledIntent = await handleSmartIntent({ channel, senderId, text: intentText, state, lang });
  if (handledIntent) return;

  if (isBooking(intentText)) {
    if (isAppointmentRequestWithoutDetails(intentText)) {
      state.intent = "service";
      await sendText(channel, senderId, appointmentBookingBody(lang), branchReplies(lang));
      return;
    }

    state.intent = "booking";
    await sendText(channel, senderId, bookingBody(lang), bookingReplies(lang));
    return;
  }

  if (isServices(intentText)) {
    await sendText(channel, senderId, servicesBody(lang), servicesReplies(lang));
    return;
  }

  if (isResults(intentText)) {
    await sendResultsContent(channel, senderId, lang);
    await sendText(channel, senderId, resultsBody(lang), resultsReplies(lang));
    return;
  }

  if (isDetails(intentText)) {
    await sendDetailsContent(channel, senderId, lang);
    await sendText(channel, senderId, detailsBody(lang), detailsReplies(lang));
    return;
  }

  if (isTeam(intentText)) {
    await sendText(channel, senderId, teamBody(lang), mainReplies(lang));
    return;
  }

  await sendText(channel, senderId, fallbackBody(lang), mainReplies(lang));
}

function collectMessagingEvents(body) {
  const events = [];
  const entries = Array.isArray(body?.entry) ? body.entry : [];

  for (const entry of entries) {
    const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const event of messaging) events.push({ entry, event });

    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const messages = Array.isArray(change?.value?.messages) ? change.value.messages : [];
      for (const message of messages) {
        events.push({
          entry: { ...entry, object: body?.object || entry?.object || "instagram" },
          event: {
            sender: { id: message.from || message.sender?.id },
            message: { text: message.text?.body || message.text || "" }
          }
        });
      }
    }
  }

  return events;
}

app.get("/", (req, res) => {
  res.status(200).json({ ok: true, service: "iconic-meta-dm", version: BOT_VERSION });
});

app.get("/api/version", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "iconic-meta-dm",
    version: BOT_VERSION,
    instagramConfigured: Boolean(INSTAGRAM_ACCESS_TOKEN && INSTAGRAM_BUSINESS_ACCOUNT_ID),
    messengerConfigured: Boolean(MESSENGER_PAGE_ACCESS_TOKEN && MESSENGER_PAGE_ID),
    staffNotifyEnabled: STAFF_NOTIFY_ENABLED,
    staffNotifyConfigured: Boolean(STAFF_WHATSAPP_TOKEN && (DUBAI_STAFF_NOTIFY_PHONE_NUMBER_ID || STAFF_WHATSAPP_PHONE_NUMBER_ID)),
    smartIntentLayer: {
      enabled: true,
      phase: 2,
      intents: ["price", "results", "details", "surgery", "natural", "duration", "pain", "booking", "location", "team", "suitability", "men_women", "privacy", "durability", "detectability", "service_followup", "consult_vs_service", "branch_help", "availability", "hesitation", "direct_appointment", "smart_booking_memory"]
    }
  });
});

app.get(["/webhook", "/webhook/meta", "/api/webhook"], (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post(["/webhook", "/webhook/meta", "/api/webhook"], async (req, res) => {
  res.sendStatus(200);

  try {
    const events = collectMessagingEvents(req.body);
    debugLog("[Webhook Received]", {
      object: req.body?.object || "",
      eventCount: events.length
    });
    for (const { entry, event } of events) {
      await handleIncomingEvent(entry, event);
    }
  } catch (error) {
    console.log("[Webhook] error", error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Iconic Meta DM Bot running on port ${PORT}`);
  console.log(`BOT_VERSION=${BOT_VERSION}`);
});
