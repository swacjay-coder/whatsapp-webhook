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

const BOT_VERSION = "iconic-meta-dm-v1-smart-faq-intent-layer-phase1-instagram-page-sender-fix";
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
  return !value || ["hi", "hello", "hey", "مرحبا", "هلا", "السلام عليكم", "هاي", "menu", "start", "القائمة"].includes(value);
}

function isBooking(text) {
  const value = normalizeText(text);
  return ["booking", "book", "حجز", "موعد", "booking | حجز", "book appointment"].includes(value) ||
    value.includes("احجز") || value.includes("appointment") || value.includes("استشارة") || value.includes("استشاره");
}

function isConsult(text) {
  const value = normalizeText(text);
  return value === "consult" || value === "consultation" || value === "consult | استشارة" ||
    value.includes("استشارة") || value.includes("استشاره") || value.includes("consult");
}

function isService(text) {
  const value = normalizeText(text);
  return value === "service" || value === "service | سيرفس" || value === "سيرفس" || value === "خدمة" ||
    value.includes("صيانة") || value.includes("متابعة") || value.includes("تعديل") ||
    value.includes("fitting") || value.includes("follow up") || value.includes("adjustment") || value.includes("maintenance");
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

function detectSmartIntent(text) {
  const value = normalizeText(text);
  if (!value || isPayloadOnly(value.toUpperCase())) return "";

  const intents = [
    { name: "price", keywords: ["السعر", "الأسعار", "كم السعر", "كم التكلفة", "التكلفة", "بكم", "قديش", "كم يكلف", "price", "cost", "how much", "pricing", "charges", "rate"] },
    { name: "results", keywords: ["نتائج", "النتائج", "صور", "صورة", "فيديو", "قبل وبعد", "قبل و بعد", "شوف النتائج", "results", "photos", "photo", "video", "before after", "before and after", "see results"] },
    { name: "details", keywords: ["تفاصيل", "طريقة التركيب", "كيف بيتركب", "كيف يتم التركيب", "كيف يشتغل", "اشرحلي", "شرح", "details", "how it works", "how does it work", "how is it applied", "explain", "procedure"] },
    { name: "surgery", keywords: ["جراحة", "عملية", "في عملية", "بدون جراحة", "هل يحتاج عملية", "زراعة", "surgery", "operation", "surgical", "non surgical", "non-surgical", "without surgery", "hair transplant"] },
    { name: "natural", keywords: ["طبيعي", "بيبين طبيعي", "هل يبين طبيعي", "ما يبين تركيب", "الشكل", "يبان", "natural", "natural look", "does it look natural", "will it show", "detectable", "fake"] },
    { name: "duration", keywords: ["كم المدة", "قديش بياخد وقت", "مدة الجلسة", "وقت التركيب", "كم ساعة", "duration", "how long", "how much time", "session time", "how many hours"] },
    { name: "pain", keywords: ["ألم", "الم", "وجع", "بيوجع", "مؤلم", "في ألم", "هل يؤلم", "pain", "painful", "does it hurt", "hurt", "is it painful"] },
    { name: "booking", keywords: ["حجز", "احجز", "موعد", "بدي موعد", "استشارة", "احجز استشارة", "booking", "book", "appointment", "consultation", "book consultation", "reserve"] },
    { name: "location", keywords: ["الموقع", "وين", "العنوان", "الفرع", "دبي", "ابوظبي", "أبوظبي", "لوكيشن", "location", "where", "address", "branch", "dubai", "abu dhabi", "map"] },
    { name: "team", keywords: ["فريق", "موظف", "كلموني", "تواصل", "بدي احكي مع حدا", "مساعدة", "ساعدني", "team", "staff", "agent", "talk to team", "contact", "help", "support", "human"] }
  ];

  const match = intents.find((intent) => includesAny(value, intent.keywords));
  return match?.name || "";
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

function welcomeBody(lang = "en") {
  if (isAr(lang)) {
    return `مرحبا 👋\n\nمعك المساعد الذكي الخاص بـ\n\n${BUSINESS_NAME}\n\nنقدر نساعدك في:\nحجز استشارة للعميل الجديد\nخدمة أو متابعة للعميل الحالي\nمشاهدة النتائج\nأو التواصل مع الفريق`;
  }

  return `Hello 👋\n\nYou are chatting with the smart assistant of\n\n${BUSINESS_NAME}\n\nWe can help you with:\nbooking a consultation for new clients\nservice or follow-up for existing clients\nviewing results\nor connecting with our team`;
}

function bookingBody(lang = "en") {
  if (isAr(lang)) {
    return `تمام، اختر نوع الحجز المناسب لك:\n\nاستشارة: إذا كنت عميل جديد وتريد معرفة الحل الأنسب لك.\nسيرفس: إذا كنت عميل حالي وتحتاج متابعة، تركيب، تعديل، أو صيانة.`;
  }

  return `Sure, please choose the right booking type:\n\nConsultation: for new clients who want the best solution.\nService: for existing clients who need follow-up, fitting, adjustment, or maintenance.`;
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
    price: `أكيد 👋\n\nالسعر يختلف حسب الحالة، والمساحة المطلوبة، ونوع الخدمة المناسبة لك.\n\nالأفضل نعمل لك استشارة بسيطة حتى نحدد الحل الأنسب والسعر بشكل واضح، بدون أي التزام.`,
    surgery: `لا، الخدمة بدون جراحة وبدون عملية.\n\nهي حل غير جراحي يعطي مظهر طبيعي، ويتم داخل المركز بدون تدخل طبي جراحي.`,
    natural: `نعم، هدفنا الأساسي أن يكون الشكل طبيعي جدًا ومناسب لملامحك.\n\nنختار الكثافة، اللون، والتصميم حسب شكل الوجه حتى ما يعطي مظهر صناعي.`,
    duration: `مدة الجلسة تختلف حسب الحالة والخدمة المطلوبة.\n\nعادة يتم توضيح الوقت بعد الاستشارة، لأن كل حالة تختلف حسب المساحة والتفاصيل المطلوبة.`,
    pain: `لا، الخدمة غير جراحية ولا تحتاج عملية.\n\nعادة تكون مريحة، والفريق يشرح لك كل خطوة قبل البدء.`,
    booking: `أكيد 👋\n\nفينا نساعدك بحجز استشارة أو موعد خدمة.\n\nاختار نوع الحجز المناسب لك، والفريق يتابع معك التفاصيل.`,
    location: `عندنا فرعين:\n\nDubai branch\nAbu Dhabi branch\n\nاختار الفرع المناسب لك حتى نرسل لك الموقع الصحيح.`,
    team: `أكيد، رح نخلي أحد أعضاء الفريق يتابع معك.\n\nاكتب لنا سؤالك أو اختار الفرع المناسب حتى نوجهك بشكل أسرع.`
  };

  const en = {
    price: `Of course 👋\n\nThe price depends on your case, the area needed, and the best service option for you.\n\nThe best step is a quick consultation so we can recommend the right solution and give you a clear price with no obligation.`,
    surgery: `No, it does not require surgery.\n\nIt is a non-surgical solution designed to give a natural look, done inside the center without a surgical procedure.`,
    natural: `Yes, the main goal is a very natural look that suits your features.\n\nWe choose the density, color, and design based on your face shape so it does not look artificial.`,
    duration: `The session duration depends on the case and the service needed.\n\nUsually, we confirm the time after the consultation because every case is different depending on the area and details required.`,
    pain: `No, the service is non-surgical and does not require an operation.\n\nIt is usually comfortable, and the team explains every step before starting.`,
    booking: `Sure 👋\n\nWe can help you book a consultation or a service appointment.\n\nChoose the right booking type, and the team will follow up with the details.`,
    location: `We have two branches:\n\nDubai branch\nAbu Dhabi branch\n\nChoose the branch that suits you so we can send the correct location.`,
    team: `Sure, one of our team members will follow up with you.\n\nPlease write your question or choose the right branch so we can guide you faster.`
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
  const staff = state.staff || "";

  if (isAr(lang)) {
    const requestType = state.intent === "service" ? "موعد سيرفس" : "حجز استشارة";
    return `تم استلام طلبك ✅\n\nنوع الطلب: ${requestType}\nالفرع: ${branchAr}\nاليوم: ${day}\nالوقت: ${time}${staff ? `\nالمختص: ${staff}` : ""}\n\nالفريق سيراجع الطلب ويرد عليك قريباً لتأكيد الموعد.`;
  }

  const requestType = state.intent === "service" ? "Service Appointment" : "Consultation Booking";
  return `Your request has been received ✅\n\nRequest type: ${requestType}\nBranch: ${branch}\nDay: ${day}\nTime: ${time}${staff ? `\nSpecialist: ${staff}` : ""}\n\nOur team will review it and confirm your appointment shortly.`;
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
    ? `ممكن تساعدني أوجهك بشكل أسرع؟ اختر من القائمة:`
    : `Let me guide you faster. Please choose from the menu:`;
}

function getStaffNumberForBranch(branch) {
  return branch === "Abu Dhabi" ? ABU_DHABI_STAFF_NUMBER : DUBAI_STAFF_NUMBER;
}

function getStaffSenderPhoneNumberIdForBranch(branch) {
  return branch === "Abu Dhabi" ? ABU_DHABI_STAFF_NOTIFY_PHONE_NUMBER_ID : DUBAI_STAFF_NOTIFY_PHONE_NUMBER_ID;
}

function buildStaffBookingAlert(state, channel, senderId) {
  const isServiceRequest = state.intent === "service";
  const requestTypeAr = isServiceRequest ? "موعد سيرفس" : "حجز استشارة";
  const requestTypeEn = isServiceRequest ? "Service Appointment" : "Consultation Booking";
  const branchEn = state.branch || "Dubai";
  const branchAr = branchEn === "Abu Dhabi" ? "أبوظبي" : "دبي";
  const day = state.day || "Not selected | غير محدد";
  const time = state.time || "Flexible | مرن";
  const staff = state.staff || "Not selected | غير محدد";

  return `🔔 طلب حجز جديد من Instagram / Messenger\n\nالقناة: ${channel}\nنوع الطلب: ${requestTypeAr}\nالفرع: ${branchAr}\nاليوم: ${day}\nالوقت: ${time}\nالمختص: ${staff}\n\nرقم/معرّف العميل داخل Meta:\n${senderId}\n\nالرجاء متابعة العميل من Instagram / Meta Inbox.\n\n------------------------------\n\n🔔 New booking request from Instagram / Messenger\n\nChannel: ${channel}\nRequest type: ${requestTypeEn}\nBranch: ${branchEn}\nDay: ${day}\nTime: ${time}\nSpecialist: ${staff}\n\nMeta customer sender ID:\n${senderId}\n\nPlease follow up with the client from Instagram / Meta Inbox.`;
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

  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(senderPhoneNumberId)}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body }
  };

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
      console.log("[Staff Notify] failed", response.status, JSON.stringify(data));
      return { ok: false, status: response.status, data };
    }

    console.log("[Staff Notify] sent", JSON.stringify(data));
    return { ok: true, data };
  } catch (error) {
    console.log("[Staff Notify] error", error.message);
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
    return { ok: false, skipped: true, reason: "missing_env" };
  }

  const url = `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.senderId)}/messages`;
  const payload = { recipient: { id: recipientId }, message };

  if (channel !== "instagram") {
    payload.messaging_type = "RESPONSE";
  }

  try {
    const response = await fetch(`${url}?access_token=${encodeURIComponent(config.accessToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.log(`[Meta Send] failed ${channel}`, response.status, JSON.stringify(data));
      return { ok: false, status: response.status, data };
    }

    return { ok: true, data };
  } catch (error) {
    console.log(`[Meta Send] error ${channel}`, error.message);
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

    await sendText(channel, senderId, finalSummaryBody(state, lang), mainReplies(lang));

    const staffNumber = getStaffNumberForBranch(state.branch);
    const staffSenderPhoneNumberId = getStaffSenderPhoneNumberIdForBranch(state.branch);
    const alertBody = buildStaffBookingAlert(state, channel, senderId);
    await sendStaffWhatsAppText(staffNumber, alertBody, staffSenderPhoneNumberId);

    resetState(senderId);
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

async function handleIncomingEvent(entry, event) {
  const senderId = getSenderId(event);
  if (!senderId) return;

  const channel = getChannelFromEntry(entry, event);
  const text = getMessageText(event);
  const state = getState(senderId);
  const lang = getTurnLanguage(text, state);
  state.lang = lang;

  const payload = isPayloadOnly(text) ? text.toUpperCase().trim() : "";
  if (payload) {
    const handledPayload = await handlePayload({ channel, senderId, payload, state, lang });
    if (handledPayload) return;
  }

  if (isGreeting(text)) {
    await sendText(channel, senderId, welcomeBody(lang), mainReplies(lang));
    return;
  }

  if (isConsult(text)) {
    state.intent = "consult";
    await sendText(channel, senderId, askBranchBody("consult", lang), branchReplies(lang));
    return;
  }

  if (isService(text)) {
    state.intent = "service";
    await sendText(channel, senderId, askBranchBody("service", lang), branchReplies(lang));
    return;
  }

  const handledIntent = await handleSmartIntent({ channel, senderId, text, state, lang });
  if (handledIntent) return;

  if (isBooking(text)) {
    state.intent = "booking";
    await sendText(channel, senderId, bookingBody(lang), bookingReplies(lang));
    return;
  }

  if (isServices(text)) {
    await sendText(channel, senderId, servicesBody(lang), servicesReplies(lang));
    return;
  }

  if (isResults(text)) {
    await sendResultsContent(channel, senderId, lang);
    await sendText(channel, senderId, resultsBody(lang), resultsReplies(lang));
    return;
  }

  if (isDetails(text)) {
    await sendDetailsContent(channel, senderId, lang);
    await sendText(channel, senderId, detailsBody(lang), detailsReplies(lang));
    return;
  }

  if (isLocation(text)) {
    state.intent = "location";
    await sendText(channel, senderId, askBranchBody("location", lang), branchReplies(lang));
    return;
  }

  if (isTeam(text)) {
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
      phase: 1,
      intents: ["price", "results", "details", "surgery", "natural", "duration", "pain", "booking", "location", "team"]
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
