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

const BOT_VERSION = "iconic-meta-dm-v1-smart-language-branch-sender-v1";
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
  ""
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
    value.includes("team")
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
    ? [
        quickReply("حجز", "BOOKING"),
        quickReply("خدمات", "SERVICES"),
        quickReply("فريقنا", "TEAM")
      ]
    : [
        quickReply("Booking", "BOOKING"),
        quickReply("Services", "SERVICES"),
        quickReply("Team", "TEAM")
      ];
}

function bookingReplies(lang = "en") {
  return isAr(lang)
    ? [
        quickReply("استشارة", "CONSULT"),
        quickReply("سيرفس", "SERVICE"),
        quickReply("فريقنا", "TEAM")
      ]
    : [
        quickReply("Consult", "CONSULT"),
        quickReply("Service", "SERVICE"),
        quickReply("Team", "TEAM")
      ];
}

function servicesReplies(lang = "en") {
  return isAr(lang)
    ? [
        quickReply("نتائج", "RESULTS"),
        quickReply("تفاصيل", "DETAILS"),
        quickReply("الموقع", "LOCATION"),
        quickReply("استشارة", "CONSULT")
      ]
    : [
        quickReply("Results", "RESULTS"),
        quickReply("Details", "DETAILS"),
        quickReply("Location", "LOCATION"),
        quickReply("Consult", "CONSULT")
      ];
}

function resultsReplies(lang = "en") {
  return isAr(lang)
    ? [
        quickReply("تفاصيل", "DETAILS"),
        quickReply("حجز", "BOOKING"),
        quickReply("فريقنا", "TEAM")
      ]
    : [
        quickReply("Details", "DETAILS"),
        quickReply("Booking", "BOOKING"),
        quickReply("Team", "TEAM")
      ];
}

function detailsReplies(lang = "en") {
  return isAr(lang)
    ? [
        quickReply("نتائج", "RESULTS"),
        quickReply("حجز", "BOOKING"),
        quickReply("فريقنا", "TEAM")
      ]
    : [
        quickReply("Results", "RESULTS"),
        quickReply("Booking", "BOOKING"),
        quickReply("Team", "TEAM")
      ];
}

function branchReplies(lang = "en") {
  return isAr(lang)
    ? [
        quickReply("دبي", "BRANCH_DUBAI"),
        quickReply("أبوظبي", "BRANCH_ABUDHABI")
      ]
    : [
        quickReply("Dubai", "BRANCH_DUBAI"),
        quickReply("Abu Dhabi", "BRANCH_ABUDHABI")
      ];
}

function dayReplies(lang = "en") {
  return isAr(lang)
    ? [
        quickReply("اليوم", "DAY_TODAY"),
        quickReply("بكرا", "DAY_TOMORROW"),
        quickReply("هذا الأسبوع", "DAY_WEEK")
      ]
    : [
        quickReply("Today", "DAY_TODAY"),
        quickReply("Tomorrow", "DAY_TOMORROW"),
        quickReply("This week", "DAY_WEEK")
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
      ? [
          quickReply("أدهم", "STAFF_ADHAM"),
          quickReply("أسامة", "STAFF_OSAMA")
        ]
      : [
          quickReply("Adham", "STAFF_ADHAM"),
          quickReply("Osama", "STAFF_OSAMA")
        ];
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

function isGreeting(text) {
  const value = normalizeText(text);
  return !value || ["hi", "hello", "hey", "مرحبا", "هلا", "السلام عليكم", "هاي", "menu", "start"].includes(value);
}

function isBooking(text) {
  const value = normalizeText(text);
  return ["booking", "book", "حجز", "موعد", "booking | حجز", "book appointment"].includes(value) ||
    value.includes("احجز") ||
    value.includes("appointment");
}

function isConsult(text) {
  const value = normalizeText(text);
  return value === "consult" ||
    value === "consultation" ||
    value === "consult | استشارة" ||
    value.includes("استشارة") ||
    value.includes("استشاره") ||
    value.includes("consult");
}

function isService(text) {
  const value = normalizeText(text);
  return value === "service" ||
    value === "service | سيرفس" ||
    value === "سيرفس" ||
    value === "خدمة" ||
    value.includes("صيانة") ||
    value.includes("متابعة") ||
    value.includes("تعديل") ||
    value.includes("fitting") ||
    value.includes("follow up") ||
    value.includes("adjustment") ||
    value.includes("maintenance");
}

function isServices(text) {
  const value = normalizeText(text);
  return value === "services" ||
    value === "services | خدمات" ||
    value === "services | خدماتنا" ||
    value.includes("خدماتنا") ||
    value.includes("خدمات") ||
    value.includes("hair replacement");
}

function isResults(text) {
  const value = normalizeText(text);
  return value === "results" ||
    value === "results | نتائج" ||
    value.includes("نتائج") ||
    value.includes("صور") ||
    value.includes("صورة") ||
    value.includes("photo") ||
    value.includes("before") ||
    value.includes("قبل وبعد");
}

function isDetails(text) {
  const value = normalizeText(text);
  return value === "details" ||
    value === "details | تفاصيل" ||
    value === "how_it_works" ||
    value.includes("تفاصيل") ||
    value.includes("كيف") ||
    value.includes("how it works") ||
    value.includes("how works") ||
    value.includes("process");
}

function isLocation(text) {
  const raw = (text || "").toString().trim().toUpperCase();
  if (raw === "BRANCH_DUBAI" || raw === "BRANCH_ABUDHABI") return false;

  const value = normalizeText(text);
  return value === "location" ||
    value === "location | موقع" ||
    value.includes("موقع") ||
    value.includes("لوكيشن") ||
    value.includes("map") ||
    value === "branch" ||
    value === "branches";
}

function isTeam(text) {
  const value = normalizeText(text);
  return value === "team" ||
    value === "help" ||
    value === "help | فريقنا" ||
    value.includes("فريق") ||
    value.includes("ساعدني") ||
    value.includes("موظف") ||
    value.includes("human") ||
    value.includes("support");
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
    return `مرحبا 👋

معك المساعد الذكي الخاص بـ

${BUSINESS_NAME}

نقدر نساعدك في:
حجز استشارة للعميل الجديد
خدمة أو متابعة للعميل الحالي
مشاهدة النتائج
أو التواصل مع الفريق`;
  }

  return `Hello 👋

You are chatting with the smart assistant of

${BUSINESS_NAME}

We can help you with:
booking a consultation for new clients
service or follow-up for existing clients
viewing results
or connecting with our team`;
}

function bookingBody(lang = "en") {
  if (isAr(lang)) {
    return `تمام، اختر نوع الحجز المناسب لك:

استشارة: إذا كنت عميل جديد وتريد معرفة الحل الأنسب لك.
سيرفس: إذا كنت عميل حالي وتحتاج متابعة، تركيب، تعديل، أو صيانة.`;
  }

  return `Sure, please choose the right booking type:

Consultation: for new clients who want the best solution.
Service: for existing clients who need follow-up, fitting, adjustment, or maintenance.`;
}

function servicesBody(lang = "en") {
  if (isAr(lang)) {
    return `أكيد ✨

في Iconic Hair Care نقدم حلول Hair Replacement بمظهر طبيعي 100%، بدون جراحة، وبخصوصية عالية.

شو تحب تشوف أولاً؟`;
  }

  return `Sure ✨

At Iconic Hair Care, we provide non-surgical Hair Replacement with a 100% natural look and high privacy.

What would you like to check first?`;
}

function resultsBody(lang = "en") {
  if (isAr(lang)) {
    return `أكيد ✨

هذه بعض النتائج من Iconic Hair Care.
المظهر طبيعي، بدون جراحة، وبشكل يناسبك تماماً.

إذا لم يظهر الفيديو مباشرة، سنرسل لك رابط الفيديو أيضاً.

الخطوة التالية؟`;
  }

  return `Sure ✨

Here are some Iconic Hair Care results.
Natural look, non-surgical, and designed to suit you.

If the video does not open directly, we will also send you the video link.

What would you like to do next?`;
}

function detailsBody(lang = "en") {
  if (isAr(lang)) {
    return `أكيد ✨

الطريقة بسيطة ومريحة:
نبدأ بفهم الشكل المناسب لك، ثم نختار اللوك الأقرب لطبيعة شعرك، وبعدها يتم التطبيق بمظهر طبيعي بدون جراحة.

إذا لم يظهر الفيديو مباشرة، سنرسل لك رابط الفيديو أيضاً.

شو تحب تعمل الآن؟`;
  }

  return `Sure ✨

The process is simple and comfortable:
We start by understanding the look that suits you, choose the closest natural style for your hair, then apply it with a natural, non-surgical result.

If the video does not open directly, we will also send you the video link.

What would you like to do now?`;
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
  if (isAr(lang)) {
    return branch === "Abu Dhabi"
      ? `اختر مختص فرع أبوظبي:`
      : `اختر مختص فرع دبي:`;
  }

  return branch === "Abu Dhabi"
    ? `Choose your Abu Dhabi branch specialist:`
    : `Choose your Dubai branch specialist:`;
}

function askDayBody(lang = "en") {
  return isAr(lang) ? `تمام، اختر اليوم المناسب:` : `Great, please choose your preferred day:`;
}

function askTimeBody(dayPayload, lang = "en") {
  if (isTodayPayload(dayPayload) && getAvailableTimeSlots(dayPayload).length === 0) {
    return isAr(lang)
      ? `مواعيد اليوم خلصت حسب توقيت دبي.

اختر بكرا أو هذا الأسبوع.`
      : `Today's available slots are finished based on Dubai time.

Please choose Tomorrow or This week.`;
  }

  return isAr(lang)
    ? `تمام، اختر الوقت المفضل حسب توقيت دبي:`
    : `Great, please choose your preferred time based on Dubai time:`;
}

function finalSummaryBody(state, lang = "en") {
  const branch = state.branch || "Dubai";
  const branchAr = branch === "Abu Dhabi" ? "أبوظبي" : "دبي";
  const day = state.day || (isAr(lang) ? "غير محدد" : "Not selected");
  const time = state.time || (isAr(lang) ? "مرن" : "Flexible");
  const staff = state.staff || "";

  if (isAr(lang)) {
    const requestType = state.intent === "service" ? "موعد سيرفس" : "حجز استشارة";
    return `تم استلام طلبك ✅

نوع الطلب: ${requestType}
الفرع: ${branchAr}
اليوم: ${day}
الوقت: ${time}${staff ? `
المختص: ${staff}` : ""}

الفريق سيراجع الطلب ويرد عليك قريباً لتأكيد الموعد.`;
  }

  const requestType = state.intent === "service" ? "Service Appointment" : "Consultation Booking";
  return `Your request has been received ✅

Request type: ${requestType}
Branch: ${branch}
Day: ${day}
Time: ${time}${staff ? `
Specialist: ${staff}` : ""}

Our team will review it and confirm your appointment shortly.`;
}

function teamBody(lang = "en") {
  if (isAr(lang)) {
    return `تمام 👌

تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.`;
  }

  return `Done 👌

Your conversation has been forwarded to our team. One of our specialists will assist you shortly.`;
}

function locationBody(branch = "Dubai", lang = "en") {
  const locationUrl = branch === "Abu Dhabi" ? ABU_DHABI_LOCATION_URL : DUBAI_LOCATION_URL;
  const branchAr = branch === "Abu Dhabi" ? "أبوظبي" : "دبي";

  return isAr(lang)
    ? `هذا هو موقع فرع ${branchAr}:

${locationUrl}`
    : `This is our ${branch} branch location:

${locationUrl}`;
}

function getStaffNumberForBranch(branch) {
  return branch === "Abu Dhabi" ? ABU_DHABI_STAFF_NUMBER : DUBAI_STAFF_NUMBER;
}

function getStaffSenderPhoneNumberIdForBranch(branch) {
  return branch === "Abu Dhabi"
    ? ABU_DHABI_STAFF_NOTIFY_PHONE_NUMBER_ID
    : DUBAI_STAFF_NOTIFY_PHONE_NUMBER_ID;
}

function buildStaffBookingAlert(state, channel, senderId) {
  const isService = state.intent === "service";
  const requestTypeAr = isService ? "موعد سيرفس" : "حجز استشارة";
  const requestTypeEn = isService ? "Service Appointment" : "Consultation Booking";
  const branchEn = state.branch || "Dubai";
  const branchAr = branchEn === "Abu Dhabi" ? "أبوظبي" : "دبي";
  const day = state.day || "Not selected | غير محدد";
  const time = state.time || "Flexible | مرن";
  const staff = state.staff || "Not selected | غير محدد";

  return `🔔 طلب حجز جديد من Instagram / Messenger

القناة: ${channel}
نوع الطلب: ${requestTypeAr}
الفرع: ${branchAr}
اليوم: ${day}
الوقت: ${time}
المختص: ${staff}

رقم/معرّف العميل داخل Meta:
${senderId}

الرجاء متابعة العميل من Instagram / Meta Inbox.

------------------------------

🔔 New booking request from Instagram / Messenger

Channel: ${channel}
Request type: ${requestTypeEn}
Branch: ${branchEn}
Day: ${day}
Time: ${time}
Specialist: ${staff}

Meta customer sender ID:
${senderId}

Please follow up with the client from Instagram / Meta Inbox.`;
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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STAFF_WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: body.toString().slice(0, 4000)
      }
    })
  });

  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    result = { raw: text };
  }

  if (!response.ok) {
    console.log(`[Staff Notify] failed status=${response.status}`);
    console.log(JSON.stringify(result, null, 2));
  } else {
    const messageId = result?.messages?.[0]?.id || "no-message-id";
    console.log(`[Staff Notify] sent from ${senderPhoneNumberId} to ${to} messageId=${messageId}`);
    console.log(JSON.stringify(result, null, 2));
  }

  return { ok: response.ok, status: response.status, result };
}

async function notifyStaffBooking(state, channel, senderId) {
  const branch = state.branch || "Dubai";
  const staffNumber = getStaffNumberForBranch(branch);
  const senderPhoneNumberId = getStaffSenderPhoneNumberIdForBranch(branch);
  const alertText = buildStaffBookingAlert(state, channel, senderId);
  return sendStaffWhatsAppText(staffNumber, alertText, senderPhoneNumberId);
}


function isStaffAllowedForBranch(staffPayload, branch = "Dubai") {
  const abuDhabiStaff = ["STAFF_ADHAM", "STAFF_OSAMA"];
  const dubaiStaff = [
    "STAFF_AHMAD",
    "STAFF_WAEL",
    "STAFF_TAMER",
    "STAFF_BASHIR",
    "STAFF_EMAD",
    "STAFF_HAMOUDA",
    "STAFF_ANI",
    "STAFF_OMAR"
  ];

  return branch === "Abu Dhabi"
    ? abuDhabiStaff.includes(staffPayload)
    : dubaiStaff.includes(staffPayload);
}

function buildReply(text, key, hasAttachment) {
  const state = getState(key);
  const cleanText = (text || "").toString().trim();
  const upper = cleanText.toUpperCase();
  const lang = getTurnLanguage(cleanText, state);
  state.lang = lang;

  if (upper === "TEAM" || isTeam(cleanText)) {
    resetState(key);
    return { text: teamBody(lang), quickReplies: [] };
  }

  if (upper === "BOOKING" || isBooking(cleanText)) {
    conversationState.set(key, { intent: "booking", lang });
    return { text: bookingBody(lang), quickReplies: bookingReplies(lang) };
  }

  if (upper === "CONSULT" || isConsult(cleanText)) {
    conversationState.set(key, { intent: "consult", lang });
    return { text: askBranchBody("consult", lang), quickReplies: branchReplies(lang) };
  }

  if (upper === "SERVICE" || isService(cleanText)) {
    conversationState.set(key, { intent: "service", lang });
    return { text: askBranchBody("service", lang), quickReplies: branchReplies(lang) };
  }

  if (upper === "SERVICES" || isServices(cleanText)) {
    return { text: servicesBody(lang), quickReplies: servicesReplies(lang) };
  }

  if (upper === "RESULTS" || isResults(cleanText)) {
    return { text: resultsBody(lang), quickReplies: resultsReplies(lang), sendResultsMedia: true };
  }

  if (upper === "DETAILS" || isDetails(cleanText)) {
    return { text: detailsBody(lang), quickReplies: detailsReplies(lang), sendDetailsMedia: true };
  }

  const staff = payloadToStaff(upper);
  if (staff && state.intent === "service") {
    if (!state.branch) {
      return { text: askBranchBody("service", lang), quickReplies: branchReplies(lang) };
    }

    if (!isStaffAllowedForBranch(upper, state.branch)) {
      return { text: askStaffBody(state.branch, lang), quickReplies: staffReplies(state.branch, lang) };
    }

    state.staff = staff;
    state.lang = lang;
    return { text: askDayBody(lang), quickReplies: dayReplies(lang) };
  }

  const branch = payloadToBranch(upper);
  if (branch && state.intent === "location") {
    resetState(key);
    return { text: locationBody(branch, lang), quickReplies: mainReplies(lang) };
  }

  if (branch && state.intent === "service") {
    state.branch = branch;
    state.lang = lang;
    return { text: askStaffBody(branch, lang), quickReplies: staffReplies(branch, lang) };
  }

  if (branch && state.intent) {
    state.branch = branch;
    state.lang = lang;
    return { text: askDayBody(lang), quickReplies: dayReplies(lang) };
  }

  if (upper === "LOCATION" || isLocation(cleanText)) {
    conversationState.set(key, { intent: "location", lang });
    return { text: askBranchBody("location", lang), quickReplies: branchReplies(lang) };
  }

  const day = payloadToDay(upper);
  if (day && state.intent) {
    state.day = day;
    state.dayPayload = upper;
    state.lang = lang;

    if (isTodayPayload(upper) && getAvailableTimeSlots(upper).length === 0) {
      return {
        text: askTimeBody(upper, lang),
        quickReplies: [
          quickReply(isAr(lang) ? "بكرا" : "Tomorrow", "DAY_TOMORROW"),
          quickReply(isAr(lang) ? "هذا الأسبوع" : "This week", "DAY_WEEK")
        ]
      };
    }

    return { text: askTimeBody(upper, lang), quickReplies: timeReplies(upper, lang) };
  }

  const time = payloadToTime(upper);
  if (time && state.intent) {
    state.time = time;
    state.lang = lang;
    const done = { ...state };
    resetState(key);
    return { text: finalSummaryBody(done, lang), quickReplies: [], staffNotification: done };
  }

  if (hasAttachment) {
    return {
      text: isAr(lang)
        ? `وصلتنا الرسالة أو الملف ✅
فريقنا رح يراجعها ويرد عليك بأقرب وقت.`
        : `We received your message or file ✅
Our team will review it and reply as soon as possible.`,
      quickReplies: mainReplies(lang)
    };
  }

  if (isGreeting(cleanText)) {
    conversationState.set(key, { lang });
    return { text: welcomeBody(lang), quickReplies: mainReplies(lang) };
  }

  return {
    text: isAr(lang) ? `اختر كيف فينا نساعدك:` : `Please choose how we can help:`,
    quickReplies: mainReplies(lang)
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

async function sendVideoWithFallback(senderId, videoUrl, channel, label) {
  const url = (videoUrl || "").toString().trim();
  if (!url) return { ok: false, skipped: true };

  const result = await sendMedia(senderId, "video", url, channel);

  if (!result.ok) {
    console.log(`[Video fallback] ${label} video failed, sending link instead.`);
    await sendText(senderId, `${label}\n\n${url}`, [], channel);
  }

  return result;
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

  if (reply.staffNotification) {
    await notifyStaffBooking(reply.staffNotification, channel, senderId);
  }

  if (reply.sendResultsMedia) {
    if (META_RESULTS_IMAGE_URL) await sendMedia(senderId, "image", META_RESULTS_IMAGE_URL, channel);
    if (META_RESULTS_VIDEO_URL) {
      await sendVideoWithFallback(senderId, META_RESULTS_VIDEO_URL, channel, "Results video | فيديو النتائج");
    }
  }

  if (reply.sendDetailsMedia) {
    if (DETAILS_VIDEO_URL) {
      await sendVideoWithFallback(senderId, DETAILS_VIDEO_URL, channel, "Details video | فيديو التفاصيل");
    }
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
    detailsVideoConfigured: Boolean(DETAILS_VIDEO_URL),
    smartLanguageReplies: true,
    facebookGraphVersion: FACEBOOK_GRAPH_VERSION,
    instagramGraphVersion: INSTAGRAM_GRAPH_VERSION,
    instagramGraphBase: `https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}`,
    staffNotifyEnabled: STAFF_NOTIFY_ENABLED,
    staffWhatsAppConfigured: Boolean(STAFF_WHATSAPP_TOKEN && DUBAI_STAFF_NOTIFY_PHONE_NUMBER_ID && ABU_DHABI_STAFF_NOTIFY_PHONE_NUMBER_ID),
    dubaiStaffConfigured: Boolean(DUBAI_STAFF_NUMBER),
    abuDhabiStaffConfigured: Boolean(ABU_DHABI_STAFF_NUMBER),
    dubaiStaffSenderConfigured: Boolean(DUBAI_STAFF_NOTIFY_PHONE_NUMBER_ID),
    abuDhabiStaffSenderConfigured: Boolean(ABU_DHABI_STAFF_NOTIFY_PHONE_NUMBER_ID)
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
