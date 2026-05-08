const express = require("express");
const fs = require("fs");
const path = require("path");

// Render-safe fetch:
// Uses Node 18+ built-in fetch first, and falls back to node-fetch only if needed.
// This avoids deploy crashes when node-fetch is installed as ESM-only.
const fetch = (...args) => {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch(...args);
  }

  return import("node-fetch").then(({ default: nodeFetch }) => nodeFetch(...args));
};

const app = express();
app.set("trust proxy", true);

app.get("/api/wake", (req, res) => {
  return res.status(200).json({
    ok: true,
    message: "Iconic server is awake",
    time: new Date().toISOString()
  });
});
app.use(express.json({ limit: "12mb" }));

app.get("/assets/:filename", (req, res) => {
  try {
    const requestedFilename = (req.params?.filename || "").toString().trim();

    const allowedAssets = {
      [AUTO_REPLY_VIDEO_FILENAME]: {
        path: path.join(__dirname, AUTO_REPLY_VIDEO_FILENAME),
        contentType: "video/mp4",
        missingLog: "Auto-reply video file is missing:",
        missingMessage: "Auto-reply video file not found"
      },
      "iconic-chat-background-logo.png": {
        path: path.join(__dirname, "iconic-chat-background-logo.png"),
        contentType: "image/png",
        missingLog: "Chat background logo file is missing:",
        missingMessage: "Chat background logo file not found"
      }
    };

    const asset = allowedAssets[requestedFilename];

    if (!asset) {
      return res.status(404).send("Asset not found");
    }

    if (!fs.existsSync(asset.path)) {
      console.log(asset.missingLog, asset.path);
      return res.status(404).send(asset.missingMessage);
    }

    res.setHeader("Content-Type", asset.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(asset.path);
  } catch (error) {
    console.error("Asset delivery failed:");
    console.error(error);
    return res.status(500).send("Asset delivery failed");
  }
});

const BOT_VERSION = "iconic-team-inbox-v31-5-8-23-replace-chat-background-logo";

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
// Keep PHONE_NUMBER_ID as your default/Dubai number so old setup keeps working.
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const DUBAI_PHONE_NUMBER_ID = process.env.DUBAI_PHONE_NUMBER_ID || PHONE_NUMBER_ID || "1100042333191350";
const ABU_DHABI_PHONE_NUMBER_ID = process.env.ABU_DHABI_PHONE_NUMBER_ID || "1000146433192239";
const STAFF_NUMBER = process.env.STAFF_NUMBER;
const DUBAI_STAFF_NUMBER = process.env.DUBAI_STAFF_NUMBER || STAFF_NUMBER || "";
const ABU_DHABI_STAFF_NUMBER = process.env.ABU_DHABI_STAFF_NUMBER || STAFF_NUMBER || "";
const INBOX_USER = process.env.INBOX_USER || "admin";
const INBOX_PASS = process.env.INBOX_PASS || "123456";

// V31.5 Auto Video Reply:
// Put iconic-auto-reply-video-13s.mp4 in the same GitHub/Render folder as server.js.
// If you prefer hosting the video elsewhere, set AUTO_REPLY_VIDEO_URL to a direct public MP4 link.
const AUTO_REPLY_VIDEO_FILENAME = process.env.AUTO_REPLY_VIDEO_FILENAME || "iconic-auto-reply-video-13s.mp4";
const AUTO_REPLY_VIDEO_URL = (process.env.AUTO_REPLY_VIDEO_URL || "").toString().trim();

// Follow-up reminder templates:
// Use separate templates for Dubai and Abu Dhabi so each branch can have its own Call button.
const FOLLOW_UP_TEMPLATE_NAME = process.env.FOLLOW_UP_TEMPLATE_NAME || "service_review_follow_up";
const FOLLOW_UP_TEMPLATE_NAME_DUBAI =
  process.env.FOLLOW_UP_TEMPLATE_NAME_DUBAI ||
  process.env.DUBAI_FOLLOW_UP_TEMPLATE_NAME ||
  "service_review_follow_up_dubai";
const FOLLOW_UP_TEMPLATE_NAME_ABU_DHABI =
  process.env.FOLLOW_UP_TEMPLATE_NAME_ABU_DHABI ||
  process.env.ABU_DHABI_FOLLOW_UP_TEMPLATE_NAME ||
  "service_review_follow_up_abudhabi";
const FOLLOW_UP_TEMPLATE_LANGUAGE = process.env.FOLLOW_UP_TEMPLATE_LANGUAGE || "en";
const FOLLOW_UP_HEADER_IMAGE_URL = process.env.FOLLOW_UP_HEADER_IMAGE_URL || "";
const MAIN_MENU_HEADER_IMAGE_URL =
  process.env.MAIN_MENU_HEADER_IMAGE_URL ||
  process.env.AUTO_REPLY_HEADER_IMAGE_URL ||
  FOLLOW_UP_HEADER_IMAGE_URL ||
  "https://iconichaircare.com/wp-content/uploads/2026/05/iconic-template-header-logo.jpg";
const INBOX_FAVICON_DATA_URI = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#ffffff"/><rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="#78b83e" stroke-width="4"/><circle cx="32" cy="32" r="22" fill="#f2faee"/><text x="32" y="39" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900" fill="#16352b">IC</text><path d="M43 17c5 3 7 8 6 13-6-1-11-4-14-10 2-2 5-3 8-3z" fill="#78b83e" opacity="0.95"/></svg>');

// Call Now templates:
// These templates contain the real WhatsApp call-to-action phone button.
const CALL_NOW_TEMPLATE_NAME_DUBAI =
  process.env.CALL_NOW_TEMPLATE_NAME_DUBAI ||
  process.env.DUBAI_CALL_NOW_TEMPLATE_NAME ||
  "iconic__call_dubai";
const CALL_NOW_TEMPLATE_NAME_ABU_DHABI =
  process.env.CALL_NOW_TEMPLATE_NAME_ABU_DHABI ||
  process.env.ABU_DHABI_CALL_NOW_TEMPLATE_NAME ||
  "iconic_call_now_abudhabi";
const CALL_NOW_TEMPLATE_LANGUAGE = process.env.CALL_NOW_TEMPLATE_LANGUAGE || "en";

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
const DUBAI_LOCATION_URL = process.env.DUBAI_LOCATION_URL || "https://maps.app.goo.gl/4MXKKF6faQx4WQSy9";
const ABU_DHABI_LOCATION_URL = process.env.ABU_DHABI_LOCATION_URL || "https://maps.app.goo.gl/twg5JEuP6JgKWP1s7";

function normalizePhoneNumberId(value) {
  return (value || "").toString().trim();
}

function normalizePhoneDigits(value) {
  return (value || "").toString().replace(/\D/g, "");
}

function isAbuDhabiLine(phoneNumberId, displayPhoneNumber = "") {
  const id = normalizePhoneNumberId(phoneNumberId);
  const abuDhabiId = normalizePhoneNumberId(ABU_DHABI_PHONE_NUMBER_ID);
  const displayDigits = normalizePhoneDigits(displayPhoneNumber);

  return (
    id === abuDhabiId ||
    displayDigits.endsWith("97125622778") ||
    displayDigits.endsWith("25622778")
  );
}

function getIncomingPhoneNumberId(value) {
  const incomingId = normalizePhoneNumberId(value?.metadata?.phone_number_id);
  const displayPhoneNumber = value?.metadata?.display_phone_number || "";

  if (isAbuDhabiLine(incomingId, displayPhoneNumber)) {
    return ABU_DHABI_PHONE_NUMBER_ID;
  }

  return incomingId || DUBAI_PHONE_NUMBER_ID;
}

function getLineConfig(phoneNumberId, displayPhoneNumber = "") {
  const id = normalizePhoneNumberId(phoneNumberId);

  if (isAbuDhabiLine(id, displayPhoneNumber)) {
    return {
      phoneNumberId: ABU_DHABI_PHONE_NUMBER_ID,
      branch: "Abu Dhabi",
      callNumber: "02 562 2778",
      displayNumber: "+971 2 562 2778",
      locationUrl: ABU_DHABI_LOCATION_URL
    };
  }

  return {
    phoneNumberId: id || DUBAI_PHONE_NUMBER_ID,
    branch: "Dubai",
    callNumber: "04 396 3333",
    displayNumber: "+971 4 396 3333",
    locationUrl: DUBAI_LOCATION_URL
  };
}

function getStaffNotificationRouting(phoneNumberId, displayPhoneNumber = "") {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const isAbuDhabi = isAbuDhabiLine(finalPhoneNumberId, displayPhoneNumber);
  const branchEnvName = isAbuDhabi ? "ABU_DHABI_STAFF_NUMBER" : "DUBAI_STAFF_NUMBER";
  const branchStaffNumber = (process.env[branchEnvName] || "").toString().trim();
  const fallbackStaffNumber = (process.env.STAFF_NUMBER || "").toString().trim();
  const number = branchStaffNumber || fallbackStaffNumber || "";
  const usedEnvName = branchStaffNumber ? branchEnvName : (fallbackStaffNumber ? "STAFF_NUMBER" : "NONE");
  const resolvedPhoneNumberId = isAbuDhabi ? ABU_DHABI_PHONE_NUMBER_ID : (finalPhoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const lineConfig = getLineConfig(resolvedPhoneNumberId, displayPhoneNumber);

  return {
    number,
    branch: lineConfig.branch,
    phoneNumberId: resolvedPhoneNumberId,
    envName: usedEnvName,
    branchEnvName,
    fallbackUsed: !branchStaffNumber && Boolean(fallbackStaffNumber),
    hasNumber: Boolean(number)
  };
}

function getStaffNotificationNumber(phoneNumberId, displayPhoneNumber = "") {
  return getStaffNotificationRouting(phoneNumberId, displayPhoneNumber).number;
}

async function sendStaffNotificationTextMessage(to, body, phoneNumberId = DUBAI_PHONE_NUMBER_ID, routing = {}) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const lineConfig = getLineConfig(finalPhoneNumberId);
  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body }
  };

  console.log(`[Staff Notify Send] preparing branch=${routing.branch || lineConfig.branch} fromPhoneNumberId=${finalPhoneNumberId} to=${to} env=${routing.envName || "UNKNOWN"} fallback=${Boolean(routing.fallbackUsed)}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  let result;

  try {
    result = JSON.parse(responseText);
  } catch (error) {
    result = { raw: responseText || "" };
  }

  if (!response.ok) {
    console.log(`[Staff Notify Send] failed branch=${routing.branch || lineConfig.branch} status=${response.status} env=${routing.envName || "UNKNOWN"}`);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[Staff Notify Send] success branch=${routing.branch || lineConfig.branch} status=${response.status} env=${routing.envName || "UNKNOWN"}`);
    console.log(JSON.stringify(result, null, 2));
  }

  return {
    ok: response.ok,
    status: response.status,
    result
  };
}

/* Mini Inbox مؤقت للعرض والتجربة */
const inboxMessages = [];
const conversationStatus = {};
const conversationPhoneNumberId = {};

function getDefaultMessageType(sender, status) {
  if (sender === "customer") return "Customer Message";
  if (sender === "bot") return "Bot Reply";
  if (sender === "staff") return "Human Reply";
  return status || "Message";
}

function addInboxMessage(phone, sender, body, status = "Bot", phoneNumberId = null, options = {}) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || conversationPhoneNumberId[phone] || DUBAI_PHONE_NUMBER_ID);
  const lineConfig = getLineConfig(finalPhoneNumberId);

  const item = {
    time: new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" }),
    phone,
    customerName: options.customerName || "",
    branch: lineConfig.branch,
    sender,
    body,
    status: conversationStatus[phone] || status,
    messageType: options.messageType || getDefaultMessageType(sender, status),
    phoneNumberId: finalPhoneNumberId
  };

  // Extra fields are used for opt-in / opt-out rows.
  // Existing Google Sheet logging still receives the normal message fields.
  if (options.extraFields && typeof options.extraFields === "object") {
    Object.assign(item, options.extraFields);
  }

  inboxMessages.unshift(item);

  if (inboxMessages.length > 300) {
    inboxMessages.pop();
  }

  saveMessageToGoogleSheet(item).catch((error) => {
    console.log("Google Sheet log failed:");
    console.log(error);
  });
}

async function saveMessageToGoogleSheet(item) {
  const sheetUrl = process.env.SHEET_WEBHOOK_URL;

  if (!sheetUrl) {
    console.log("SHEET_WEBHOOK_URL is missing. Google Sheet log skipped.");
    return;
  }

  const response = await fetch(sheetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(item)
  });

  const text = await response.text();

  if (!response.ok) {
    console.log("Google Sheet log HTTP failed:");
    console.log(response.status, text);
    return;
  }

  console.log("Google Sheet log saved:");
  console.log(text);
}

async function loadMessagesFromGoogleSheet() {
  const sheetUrl = process.env.SHEET_WEBHOOK_URL;

  if (!sheetUrl) {
    console.log("SHEET_WEBHOOK_URL is missing. Loading messages from memory only.");
    return { messages: [], conversationStates: [], bookingRequests: [] };
  }

  try {
    const response = await fetch(sheetUrl, { method: "GET" });
    const text = await response.text();

    if (!response.ok) {
      console.log("Google Sheet load HTTP failed:");
      console.log(response.status, text);
      return { messages: [], conversationStates: [], bookingRequests: [] };
    }

    const data = JSON.parse(text);

    if (!data.ok || !Array.isArray(data.messages)) {
      console.log("Google Sheet load returned unexpected data:");
      console.log(text);
      return { messages: [], conversationStates: [], bookingRequests: [] };
    }

    const messages = data.messages.map((message) => ({
      time: message.time || "",
      phone: message.phone || "",
      customerName: message.customerName || "",
      branch: message.branch || "",
      sender: message.sender || "",
      body: message.body || "",
      status: message.status || "",
      messageType: message.messageType || "",
      phoneNumberId: message.phoneNumberId || "",
      opt_in: message.opt_in || "",
      opt_in_date: message.opt_in_date || "",
      opt_in_source: message.opt_in_source || "",
      opt_out: message.opt_out || "",
      opt_out_date: message.opt_out_date || ""
    }));

    const conversationStates = Array.isArray(data.conversationStates)
      ? data.conversationStates.map((state) => ({
          phone: state.phone || "",
          phoneNumberId: state.phoneNumberId || "",
          branch: state.branch || "",
          conversation_status: state.conversation_status || "",
          assigned_to: state.assigned_to || "",
          tags: state.tags || "",
          last_updated_by: state.last_updated_by || "",
          last_updated_at: state.last_updated_at || ""
        }))
      : [];

    const bookingRequests = Array.isArray(data.bookingRequests)
      ? data.bookingRequests.map((booking) => ({
          rowNumber: booking.rowNumber || "",
          date: booking.date || "",
          customerName: booking.customerName || "",
          phone: booking.phone || "",
          branch: booking.branch || "",
          phoneNumberId: booking.phoneNumberId || "",
          requestType: booking.requestType || "",
          message: booking.message || "",
          status: booking.status || "",
          notes: booking.notes || "",
          lastUpdated: booking.lastUpdated || ""
        }))
      : [];

    return { messages, conversationStates, bookingRequests };
  } catch (error) {
    console.log("Google Sheet load failed:");
    console.log(error);
    return { messages: [], conversationStates: [], bookingRequests: [] };
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

function getArabicBranchName(branch) {
  const value = normalizeText(typeof branch === "string" ? branch : branch?.branch || "");
  return value.includes("abu") ? "أبوظبي" : "دبي";
}

function getDubaiTimestamp() {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" });
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function isOptInText(text) {
  const value = compactText(text);
  return value === "yes, i agree to receive appointment reminders and service follow-ups from iconic hair care." ||
    value === "yes, i agree to receive appointment reminders and service follow-ups from iconic hair care" ||
    value.includes("yes, i agree to receive appointment reminders and service follow-ups from iconic hair care") ||
    value === "أوافق / yes" ||
    value === "اوافق / yes" ||
    value === "yes, remind me" ||
    value === "yes remind me" ||
    value === "yes reminders" ||
    value === "yes offers" ||
    value.includes("أوافق على التذكير") ||
    value.includes("اوافق على التذكير") ||
    value.includes("أوافق على تذكير") ||
    value.includes("اوافق على تذكير") ||
    value.includes("أوافق على العروض") ||
    value.includes("اوافق على العروض") ||
    value.includes("remind me after service") ||
    value.includes("service follow-up reminder");
}

function isOptOutText(text) {
  const value = compactText(text);
  return value === "stop" ||
    value === "unsubscribe" ||
    value === "cancel" ||
    value === "إيقاف" ||
    value === "ايقاف" ||
    value === "الغاء" ||
    value === "إلغاء";
}

function isReminderOptInDeclineText(text) {
  const value = compactText(text);
  return value === "لا شكراً / no" ||
    value === "لا شكرا / no" ||
    value === "لا / no" ||
    value === "no" ||
    value === "no, thanks" ||
    value === "no thanks" ||
    value === "not now" ||
    value === "لا شكراً" ||
    value === "لا شكرا" ||
    value === "ليس الآن" ||
    value === "ليس الان";
}

function isAutoVideoRequestText(text) {
  const value = compactText(text);

  if (!value) return false;

  return value === "video" ||
    value === "فيديو" ||
    value.includes("video") ||
    value.includes("فيديو") ||
    value.includes("مقطع") ||
    value.includes("ميديا") ||
    value.includes("media") ||
    value.includes("شوف") ||
    value.includes("show") ||
    value.includes("result") ||
    value.includes("results") ||
    value.includes("before after") ||
    value.includes("before/after") ||
    value.includes("قبل وبعد") ||
    value.includes("صور") ||
    value.includes("صورة") ||
    value.includes("photo") ||
    value.includes("photos") ||
    value.includes("image") ||
    value.includes("images");
}

function buildAutoVideoCaption() {
  return `${BUSINESS_NAME_SPACED} ✨\n\n` +
    "أكيد، هذا فيديو قصير يوضح فكرة الخدمة من Iconic Hair Care.\n\n" +
    "لخصوصيتك، فريقنا يقدر يساعدك بالتفاصيل المناسبة لحالتك داخل المحادثة.\n\n" +
    "------------------------------\n\n" +
    `${BUSINESS_NAME_SPACED} ✨\n\n` +
    "Sure, here is a short video showing the service idea from Iconic Hair Care.\n\n" +
    "For your privacy, our team can guide you with the details that fit your case inside this chat.";
}

function buildAfterVideoBody() {
  return `${BUSINESS_NAME_SPACED} ✨\n\n` +
    "إذا حاب تعرف الأنسب لحالتك، تقدر تحجز استشارة أو تتواصل مع الفريق مباشرة.\n\n" +
    "------------------------------\n\n" +
    `${BUSINESS_NAME_SPACED} ✨\n\n` +
    "If you would like to know what fits your case best, you can book a consultation or talk to the team directly.";
}

function getPublicBaseUrl(req) {
  const configuredBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "").toString().trim().replace(/\/$/, "");

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const host = (req?.get?.("host") || "").toString().trim();

  if (!host) {
    return "";
  }

  return `https://${host}`;
}

function getAutoReplyVideoUrl(req) {
  if (AUTO_REPLY_VIDEO_URL) {
    return AUTO_REPLY_VIDEO_URL;
  }

  const baseUrl = getPublicBaseUrl(req);

  if (!baseUrl) {
    return "";
  }

  return `${baseUrl}/assets/${AUTO_REPLY_VIDEO_FILENAME}`;
}

function getIncomingMessageText(message) {
  if (!message) return "";

  if (message.type === "text") {
    return message.text?.body || "";
  }

  if (message.type === "button") {
    return message.button?.text || message.button?.payload || "";
  }

  if (message.type === "interactive") {
    return message.interactive?.button_reply?.title ||
      message.interactive?.button_reply?.id ||
      message.interactive?.list_reply?.title ||
      message.interactive?.list_reply?.id ||
      "";
  }

  // V30.10: use image caption as text input only when a customer sends an image with caption.
  if (message.type === "image") {
    return message.image?.caption || "";
  }

  return "";
}

function getCustomerChatLink(customerNumber) {
  return `https://wa.me/${customerNumber}`;
}

async function sendWhatsAppMessage(to, body, phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
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


function parseImageDataUrl(imageDataUrl) {
  const value = (imageDataUrl || "").toString().trim();
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    return null;
  }

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const buffer = Buffer.from(match[2], "base64");

  return { mimeType, buffer };
}

function sanitizeMediaFilename(filename, mimeType) {
  const safeBase = (filename || "iconic-image")
    .toString()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "iconic-image";

  if (safeBase.includes(".")) {
    return safeBase;
  }

  const extensionMap = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
  };

  return safeBase + (extensionMap[mimeType] || ".jpg");
}

async function uploadWhatsAppMediaFromBuffer(buffer, mimeType, filename, phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/media`;

  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  form.append("messaging_product", "whatsapp");
  form.append("type", mimeType);
  form.append("file", blob, sanitizeMediaFilename(filename, mimeType));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`
    },
    body: form
  });

  const result = await response.json();

  if (!response.ok) {
    console.log("WhatsApp media upload failed:");
    console.log(JSON.stringify(result, null, 2));
    return { ok: false, status: response.status, result };
  }

  return { ok: true, status: response.status, mediaId: result.id, result };
}

async function sendWhatsAppImageMessage(to, imageDataUrl, caption = "", filename = "iconic-image.jpg", phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const parsedImage = parseImageDataUrl(imageDataUrl);

  if (!parsedImage) {
    return {
      ok: false,
      status: 400,
      result: { error: "Invalid image format. Please upload JPG, PNG, or WEBP." }
    };
  }

  if (parsedImage.buffer.length > 5 * 1024 * 1024) {
    return {
      ok: false,
      status: 400,
      result: { error: "Image is too large. Please upload an image under 5MB." }
    };
  }

  const uploadResult = await uploadWhatsAppMediaFromBuffer(
    parsedImage.buffer,
    parsedImage.mimeType,
    filename,
    finalPhoneNumberId
  );

  if (!uploadResult.ok) {
    return uploadResult;
  }

  const lineConfig = getLineConfig(finalPhoneNumberId);
  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;
  const cleanCaption = (caption || "").toString().trim().slice(0, 900);

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: {
      id: uploadResult.mediaId,
      ...(cleanCaption ? { caption: cleanCaption } : {})
    }
  };

  console.log(`Sending WhatsApp image from ${lineConfig.branch} (${finalPhoneNumberId}) to ${to}`);

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
    console.log("WhatsApp image send failed:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("WhatsApp image sent successfully:");
    console.log(JSON.stringify(result, null, 2));
  }

  return {
    ok: response.ok,
    status: response.status,
    mediaId: uploadResult.mediaId,
    result
  };
}

async function sendWhatsAppVideoMessage(to, videoUrl, caption = "", phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const lineConfig = getLineConfig(finalPhoneNumberId);
  const cleanVideoUrl = (videoUrl || "").toString().trim();

  if (!cleanVideoUrl) {
    return {
      ok: false,
      status: 400,
      result: { error: "Missing auto-reply video URL" }
    };
  }

  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;
  const cleanCaption = (caption || "").toString().trim().slice(0, 900);

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "video",
    video: {
      link: cleanVideoUrl,
      ...(cleanCaption ? { caption: cleanCaption } : {})
    }
  };

  console.log(`Sending WhatsApp auto-reply video from ${lineConfig.branch} (${finalPhoneNumberId}) to ${to}`);

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
    console.log("WhatsApp video send failed:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("WhatsApp video sent successfully:");
    console.log(JSON.stringify(result, null, 2));
  }

  return {
    ok: response.ok,
    status: response.status,
    result
  };
}

async function sendWhatsAppButtonMessage(to, body, buttons, phoneNumberId = DUBAI_PHONE_NUMBER_ID, options = {}) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const lineConfig = getLineConfig(finalPhoneNumberId);
  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;

  const headerImageUrl = (options.headerImageUrl || "").toString().trim();

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      ...(headerImageUrl
        ? {
            header: {
              type: "image",
              image: { link: headerImageUrl }
            }
          }
        : {}),
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((button, index) => ({
          type: "reply",
          reply: {
            id: button.id || `btn_${index + 1}`,
            title: button.title
          }
        }))
      }
    }
  };

  console.log(`Sending WhatsApp button message from ${lineConfig.branch} (${finalPhoneNumberId}) to ${to}`);

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
    console.log("WhatsApp API interactive send failed:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("WhatsApp interactive message sent successfully:");
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

async function sendWhatsAppCtaUrlMessage(to, body, displayText, targetUrl, phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const lineConfig = getLineConfig(finalPhoneNumberId);
  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: body },
      action: {
        name: "cta_url",
        parameters: {
          display_text: displayText,
          url: targetUrl
        }
      }
    }
  };

  console.log(`Sending WhatsApp CTA URL message from ${lineConfig.branch} (${finalPhoneNumberId}) to ${to}`);

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
    console.log("WhatsApp API CTA URL send failed:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("WhatsApp CTA URL message sent successfully:");
    console.log(JSON.stringify(result, null, 2));
  }

  return {
    ok: response.ok,
    status: response.status,
    result
  };
}

function getLocationBodyForLog(phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const lineConfig = getLineConfig(phoneNumberId);
  return `Location CTA sent: ${lineConfig.branch} (${lineConfig.locationUrl})`;
}

function buildLocationMessageBody(phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const lineConfig = getLineConfig(phoneNumberId);
  const branchNameAr = getArabicBranchName(lineConfig.branch);

  return `${BUSINESS_NAME_SPACED} ✨\n\n` +
    `هذا هو موقع فرع ${branchNameAr} المناسب لك.\n\n` +
    "اضغط الزر بالأسفل لفتح Google Maps والوصول مباشرة.\n\n" +
    "------------------------------\n\n" +
    `${BUSINESS_NAME_SPACED} ✨\n\n` +
    `This is the correct ${lineConfig.branch} branch location for you.\n\n` +
    "Tap the button below to open Google Maps directly.";
}

function getMainMenuButtons() {
  // WhatsApp reply button titles must stay short.
  // Bilingual labels are kept under the safe button-title length.
  return [
    { id: "book_appointment", title: "حجز موعد / Book" },
    { id: "services", title: "الخدمات / Services" },
    { id: "location_branch", title: "الموقع / Location" }
  ];
}

function getServicesDeepMenuButtons() {
  return [
    { id: "natural_look", title: "طبيعي / Natural" },
    { id: "price_info", title: "السعر / Price" },
    { id: "private_consult", title: "استشارة/Consultation" }
  ];
}

function getActionButtons() {
  return [
    { id: "book_appointment", title: "احجز / Book" },
    { id: "call_branch", title: "اتصل / Call" },
    { id: "location_branch", title: "الموقع / Location" }
  ];
}

function getConsultActionButtons() {
  return [
    { id: "call_branch", title: "اتصل / Call" },
    { id: "location_branch", title: "الموقع / Location" },
    { id: "talk_to_team", title: "الفريق / Team" }
  ];
}

function getAfterCallButtons() {
  return [
    { id: "book_appointment", title: "احجز / Book" },
    { id: "services", title: "الخدمات / Services" },
    { id: "location_branch", title: "الموقع / Location" }
  ];
}

function getReminderOptInButtons() {
  return [
    { id: "reminder_opt_in_yes", title: "أوافق / Yes" },
    { id: "reminder_opt_in_no", title: "لا / No" },
    { id: "talk_to_team", title: "الفريق / Team" }
  ];
}

function buildReminderOptInBody() {
  return `${BUSINESS_NAME_SPACED} ✨\n\n` +
    "إذا بتحب، فينا نرسل لك من وقت لآخر تذكيرات متابعة للخدمة وعروض خاصة من Iconic Hair Care.\n\n" +
    "الموافقة اختيارية، وتقدر توقف التذكيرات والعروض بأي وقت بإرسال STOP أو إيقاف.\n\n" +
    "------------------------------\n\n" +
    `${BUSINESS_NAME_SPACED} ✨\n\n` +
    "If you’d like, we can send you occasional service follow-up reminders and special offers from Iconic Hair Care.\n\n" +
    "This is optional. You can stop reminders and offers anytime by sending STOP.";
}

function formatButtonLog(body, buttons) {
  const buttonText = buttons.map((button) => `• ${button.title}`).join("\n");
  return `${body}\n\nButtons:\n${buttonText}`;
}

function getFollowUpTemplateName(phoneNumberId) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);

  if (isAbuDhabiLine(finalPhoneNumberId)) {
    return FOLLOW_UP_TEMPLATE_NAME_ABU_DHABI;
  }

  return FOLLOW_UP_TEMPLATE_NAME_DUBAI;
}

function getFollowUpTemplateMap() {
  return {
    dubai: FOLLOW_UP_TEMPLATE_NAME_DUBAI,
    abuDhabi: FOLLOW_UP_TEMPLATE_NAME_ABU_DHABI
  };
}

function getCallNowTemplateName(phoneNumberId) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);

  if (isAbuDhabiLine(finalPhoneNumberId)) {
    return CALL_NOW_TEMPLATE_NAME_ABU_DHABI;
  }

  return CALL_NOW_TEMPLATE_NAME_DUBAI;
}

function getCallNowTemplateMap() {
  return {
    dubai: CALL_NOW_TEMPLATE_NAME_DUBAI,
    abuDhabi: CALL_NOW_TEMPLATE_NAME_ABU_DHABI
  };
}

function getCallNowBodyForLog(phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const lineConfig = getLineConfig(phoneNumberId);
  return `Call Now template sent: ${getCallNowTemplateName(phoneNumberId)} (${lineConfig.branch})`;
}

function buildTemplateComponents(options = {}) {
  const components = [];

  // Some templates, such as Call Now CTA templates, do not have a header.
  // If we send the follow-up header image to those templates, WhatsApp rejects the send.
  const includeHeaderImage = options.includeHeaderImage !== false;
  const headerImageUrl = includeHeaderImage
    ? (options.headerImageUrl || FOLLOW_UP_HEADER_IMAGE_URL || "").toString().trim()
    : "";

  if (headerImageUrl) {
    components.push({
      type: "header",
      parameters: [
        {
          type: "image",
          image: {
            link: headerImageUrl
          }
        }
      ]
    });
  }

  return components;
}

async function sendWhatsAppTemplate(to, templateName = FOLLOW_UP_TEMPLATE_NAME, phoneNumberId = DUBAI_PHONE_NUMBER_ID, languageCode = FOLLOW_UP_TEMPLATE_LANGUAGE, options = {}) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const lineConfig = getLineConfig(finalPhoneNumberId);
  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;
  const components = buildTemplateComponents(options);

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      ...(components.length > 0 ? { components } : {})
    }
  };

  console.log(`Sending WhatsApp template "${templateName}" from ${lineConfig.branch} (${finalPhoneNumberId}) to ${to}`);

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
    console.log("WhatsApp template send failed:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("WhatsApp template sent successfully:");
    console.log(JSON.stringify(result, null, 2));
  }

  return {
    ok: response.ok,
    status: response.status,
    result
  };
}

function parseSheetDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  return null;
}

function getReminderKey(message) {
  const phone = normalizePhoneDigits(message.phone);
  const phoneNumberId = normalizePhoneNumberId(message.phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  return `${phone}|${phoneNumberId}`;
}

function isFollowUpReminderRow(message) {
  const messageType = normalizeText(message.messageType);
  const status = normalizeText(message.status);
  const body = normalizeText(message.body);

  return (
    messageType === "service follow-up reminder" ||
    messageType === "service follow-up template test" ||
    status === "follow-up sent" ||
    status === "follow-up test" ||
    body.includes(FOLLOW_UP_TEMPLATE_NAME.toLowerCase()) ||
    body.includes(FOLLOW_UP_TEMPLATE_NAME_DUBAI.toLowerCase()) ||
    body.includes(FOLLOW_UP_TEMPLATE_NAME_ABU_DHABI.toLowerCase())
  );
}

function buildLatestOptInRecords(messages) {
  const records = new Map();
  const sorted = [...messages].sort((a, b) => {
    const dateA = parseSheetDate(a.time || a.opt_in_date || a.opt_out_date)?.getTime() || 0;
    const dateB = parseSheetDate(b.time || b.opt_in_date || b.opt_out_date)?.getTime() || 0;
    return dateA - dateB;
  });

  for (const message of sorted) {
    const phone = normalizePhoneDigits(message.phone);
    if (!phone) continue;

    const phoneNumberId = normalizePhoneNumberId(message.phoneNumberId || DUBAI_PHONE_NUMBER_ID);
    const key = getReminderKey({ phone, phoneNumberId });
    const current = records.get(key) || {
      phone,
      customerName: message.customerName || "",
      branch: getLineConfig(phoneNumberId).branch,
      phoneNumberId,
      optedIn: false,
      optedOut: false,
      optInDate: null,
      optOutDate: null,
      reminderSentDate: null
    };

    if (message.customerName) {
      current.customerName = message.customerName;
    }

    if (message.opt_in === "yes" || normalizeText(message.messageType) === "opt-in") {
      current.optedIn = true;
      current.optedOut = false;
      current.optInDate = parseSheetDate(message.opt_in_date || message.time) || current.optInDate || new Date();
      current.optOutDate = null;
      current.phoneNumberId = phoneNumberId;
      current.branch = getLineConfig(phoneNumberId).branch;
    }

    if (message.opt_out === "yes" || normalizeText(message.messageType) === "opt-out") {
      current.optedOut = true;
      current.optedIn = false;
      current.optOutDate = parseSheetDate(message.opt_out_date || message.time) || current.optOutDate || new Date();
      current.phoneNumberId = phoneNumberId;
      current.branch = getLineConfig(phoneNumberId).branch;
    }

    if (isFollowUpReminderRow(message)) {
      const reminderDate = parseSheetDate(message.time) || new Date();
      if (!current.reminderSentDate || reminderDate > current.reminderSentDate) {
        current.reminderSentDate = reminderDate;
      }
    }

    records.set(key, current);
  }

  return Array.from(records.values());
}

function getDueFollowUpReminders(messages, delayDays = FOLLOW_UP_DELAY_DAYS) {
  const now = new Date();
  const delayMs = Number(delayDays) * 24 * 60 * 60 * 1000;

  return buildLatestOptInRecords(messages).filter((record) => {
    if (!record.optedIn) return false;
    if (record.optedOut) return false;
    if (!record.optInDate) return false;
    if (record.reminderSentDate && record.reminderSentDate >= record.optInDate) return false;

    return now.getTime() - record.optInDate.getTime() >= delayMs;
  });
}

function getReminderBodyForLog(phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  return `Template sent: ${getFollowUpTemplateName(phoneNumberId)}`;
}

function normalizeIntentTags(tags) {
  const seen = new Set();
  return (Array.isArray(tags) ? tags : []).map((tag) => (tag || "").toString().trim()).filter((tag) => {
    if (!tag || seen.has(tag)) return false;
    seen.add(tag);
    return true;
  });
}

function getAutoIntentWorkflow(text) {
  const value = compactText(text);

  if (!value) return null;

  const hasAny = (items) => items.some((item) => value.includes(item));

  if (
    value === "1" ||
    value === "١" ||
    hasAny(["book_appointment", "حجز موعد", "احجز", "موعد", "appointment", "book consultation", "book appointment", "book"])
  ) {
    return {
      status: "Booking Request",
      tags: ["Booking", "Need Details"],
      assignee: "Consultation Team",
      notifyStaff: false
    };
  }

  if (
    hasAny(["private_consult", "consult", "consultation", "استشارة", "خاص", "خاصة"])
  ) {
    return {
      status: "Consultation Request",
      tags: ["Consultation", "Need Details"],
      assignee: "Consultation Team",
      notifyStaff: true
    };
  }

  if (
    value === "6" ||
    value === "٦" ||
    hasAny(["talk_to_team", "موظف", "فريق", "support", "team", "human"])
  ) {
    return {
      status: "Talk to Team",
      tags: ["Human Support", "Need Details"],
      assignee: "Consultation Team",
      notifyStaff: false
    };
  }

  if (
    hasAny(["call_branch", "call", "اتصل", "اتصال"])
  ) {
    return {
      status: "Call Requested",
      tags: ["Call Requested", "Need Details"],
      assignee: "Consultation Team",
      notifyStaff: false
    };
  }

  if (
    value === "3" ||
    value === "٣" ||
    hasAny(["price_info", "price", "prices", "cost", "سعر", "السعر", "الاسعار", "الأسعار"])
  ) {
    return {
      status: "Price Question",
      tags: ["Price", "Need Details"],
      assignee: "Consultation Team",
      notifyStaff: false
    };
  }

  if (
    hasAny(["location_branch", "open_location", "location", "locations", "map", "maps", "موقع", "الموقع", "فرع", "فروع"])
  ) {
    return {
      status: "Location Requested",
      tags: ["Location"],
      assignee: "Unassigned",
      notifyStaff: false
    };
  }

  if (
    hasAny(["natural_look", "natural", "طبيعي", "طبيعية", "مظهر طبيعي"])
  ) {
    return {
      status: "Service Interest",
      tags: ["Service Interest", "Natural Look"],
      assignee: "Unassigned",
      notifyStaff: false
    };
  }

  if (
    value === "2" ||
    value === "٢" ||
    hasAny(["services", "service", "خدمات", "الخدمات"])
  ) {
    return {
      status: "Service Interest",
      tags: ["Service Interest"],
      assignee: "Unassigned",
      notifyStaff: false
    };
  }

  if (isAutoVideoRequestText(value)) {
    return {
      status: "Media Requested",
      tags: ["Media Requested", "Service Interest"],
      assignee: "Unassigned",
      notifyStaff: false
    };
  }

  return null;
}

async function saveConversationStateToGoogleSheetFromServer({ phone, phoneNumberId, branch, status, assignee, tags, updatedBy = "Auto Intent Tags" }) {
  const sheetUrl = process.env.SHEET_WEBHOOK_URL;

  if (!sheetUrl) {
    console.log("SHEET_WEBHOOK_URL is missing. Auto intent state save skipped.");
    return;
  }

  const cleanPhone = (phone || "").toString().trim();
  const cleanPhoneNumberId = normalizePhoneNumberId(phoneNumberId || "");

  if (!cleanPhone || !cleanPhoneNumberId) {
    console.log("Auto intent state save skipped: missing phone or phoneNumberId.");
    return;
  }

  const payload = {
    action: "saveConversationState",
    phone: cleanPhone,
    phoneNumberId: cleanPhoneNumberId,
    branch: (branch || getLineConfig(cleanPhoneNumberId).branch || "").toString().trim(),
    conversation_status: (status || "Open").toString().trim(),
    assigned_to: (assignee || "Unassigned").toString().trim(),
    tags: normalizeIntentTags(tags || []),
    last_updated_by: updatedBy
  };

  try {
    const response = await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.log("Auto intent state save HTTP failed:");
      console.log(response.status, responseText);
      return;
    }

    console.log("Auto intent state saved:");
    console.log(responseText);
  } catch (error) {
    console.log("Auto intent state save failed:");
    console.log(error);
  }
}

async function saveBookingRequestToGoogleSheetFromServer({ phone, phoneNumberId, customerName = "", branch = "", message = "", requestType = "Booking Request", bookingStatus = "Pending" }) {
  const sheetUrl = process.env.SHEET_WEBHOOK_URL;

  if (!sheetUrl) {
    console.log("SHEET_WEBHOOK_URL is missing. Booking request save skipped.");
    return;
  }

  const cleanPhone = (phone || "").toString().trim();
  const cleanPhoneNumberId = normalizePhoneNumberId(phoneNumberId || "");

  if (!cleanPhone || !cleanPhoneNumberId) {
    console.log("Booking request save skipped: missing phone or phoneNumberId.");
    return;
  }

  const now = getDubaiTimestamp();
  const payload = {
    action: "saveBookingRequest",
    date: now,
    phone: cleanPhone,
    phoneNumberId: cleanPhoneNumberId,
    customerName: (customerName || "").toString().trim(),
    branch: (branch || getLineConfig(cleanPhoneNumberId).branch || "").toString().trim(),
    requestType: requestType || "Booking Request",
    message: (message || "").toString().trim() || "Customer selected Book / Booking Request",
    bookingStatus: bookingStatus || "Pending",
    notes: "",
    lastUpdated: now
  };

  try {
    const response = await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.log("Booking request save HTTP failed:");
      console.log(response.status, responseText);
      return;
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      result = { ok: false, raw: responseText };
    }

    if (!result.ok) {
      console.log("Booking request save returned failure:");
      console.log(responseText);
      return;
    }

    console.log("Booking request saved:");
    console.log(responseText);
  } catch (error) {
    console.log("Booking request save failed:");
    console.log(error);
  }
}


async function loadBookingRequestsFromGoogleSheetFromServer() {
  const sheetUrl = process.env.SHEET_WEBHOOK_URL;

  if (!sheetUrl) {
    console.log("SHEET_WEBHOOK_URL is missing. Booking requests load skipped.");
    return { ok: false, bookingRequests: [], error: "SHEET_WEBHOOK_URL is missing" };
  }

  try {
    const response = await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "loadBookingRequests" })
    });

    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      result = { ok: false, error: responseText || "Invalid Apps Script response" };
    }

    if (!response.ok || !result.ok) {
      console.log("Booking requests load failed:");
      console.log(response.status, responseText);
      return {
        ok: false,
        bookingRequests: [],
        error: result.error || "Booking requests load failed"
      };
    }

    return {
      ok: true,
      bookingRequests: Array.isArray(result.bookingRequests) ? result.bookingRequests : []
    };
  } catch (error) {
    console.log("Booking requests load error:");
    console.log(error);
    return { ok: false, bookingRequests: [], error: "Booking requests load error" };
  }
}

async function updateBookingRequestStatusInGoogleSheetFromServer({ rowNumber, phone, phoneNumberId, status, notes = "" }) {
  const sheetUrl = process.env.SHEET_WEBHOOK_URL;

  if (!sheetUrl) {
    return { ok: false, error: "SHEET_WEBHOOK_URL is missing" };
  }

  const payload = {
    action: "updateBookingRequestStatus",
    rowNumber,
    phone: (phone || "").toString().trim(),
    phoneNumberId: normalizePhoneNumberId(phoneNumberId || ""),
    status: (status || "").toString().trim(),
    notes: (notes || "").toString().trim()
  };

  if (!payload.status) {
    return { ok: false, error: "Missing status" };
  }

  try {
    const response = await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      result = { ok: false, error: responseText || "Invalid Apps Script response" };
    }

    if (!response.ok || !result.ok) {
      console.log("Booking status update failed:");
      console.log(response.status, responseText);
      return result;
    }

    console.log("Booking status updated:");
    console.log(responseText);
    return result;
  } catch (error) {
    console.log("Booking status update error:");
    console.log(error);
    return { ok: false, error: "Booking status update error" };
  }
}

function buildBookingCustomerUpdateBody(status, notes = "") {
  const cleanStatus = (status || "").toString().trim();
  const statusValue = cleanStatus.toLowerCase();
  const cleanNotes = (notes || "").toString().trim();

  if (!cleanStatus) {
    return { ok: false, error: "Missing booking status" };
  }

  if (statusValue.includes("suggest")) {
    if (!cleanNotes) {
      return {
        ok: false,
        error: "Please write the suggested time in Notes before sending to customer."
      };
    }

    return {
      ok: true,
      body: [
        BUSINESS_NAME_SPACED + " ✨",
        "",
        "شكراً لك، بخصوص طلب الحجز الخاص بك.",
        "الوقت المقترح من فريقنا هو:",
        "",
        cleanNotes,
        "",
        "إذا كان الوقت مناسباً، يرجى الرد على هذه الرسالة للتأكيد.",
        "",
        "------------------------------",
        "",
        BUSINESS_NAME_SPACED + " ✨",
        "",
        "Thank you, regarding your booking request.",
        "The suggested time from our team is:",
        "",
        cleanNotes,
        "",
        "If this time works for you, please reply to this message to confirm."
      ].join("\n")
    };
  }

  if (statusValue.includes("approved")) {
    return {
      ok: true,
      body: [
        BUSINESS_NAME_SPACED + " ✨",
        "",
        "تمت الموافقة على طلب الحجز الخاص بك.",
        "سيتواصل معك فريقنا لتأكيد التفاصيل النهائية.",
        "",
        "------------------------------",
        "",
        BUSINESS_NAME_SPACED + " ✨",
        "",
        "Your booking request has been approved.",
        "Our team will contact you to confirm the final details."
      ].join("\n")
    };
  }

  if (statusValue.includes("follow")) {
    return {
      ok: true,
      body: [
        BUSINESS_NAME_SPACED + " ✨",
        "",
        "شكراً لك، طلبك قيد المتابعة من فريقنا.",
        "سنتواصل معك قريباً لتأكيد التفاصيل.",
        "",
        "------------------------------",
        "",
        BUSINESS_NAME_SPACED + " ✨",
        "",
        "Thank you, your request is being reviewed by our team.",
        "We will contact you shortly to confirm the details."
      ].join("\n")
    };
  }

  if (statusValue.includes("cancel")) {
    return {
      ok: true,
      body: [
        BUSINESS_NAME_SPACED + " ✨",
        "",
        "تم تحديث حالة طلب الحجز الخاص بك.",
        "إذا كنت ترغب بالمساعدة، يمكنك التواصل معنا في أي وقت.",
        "",
        "------------------------------",
        "",
        BUSINESS_NAME_SPACED + " ✨",
        "",
        "Your booking request status has been updated.",
        "If you need assistance, you can contact us anytime."
      ].join("\n")
    };
  }

  return {
    ok: false,
    error: "Choose Approved, Suggest another time, Need follow-up, or Cancelled before sending to customer."
  };
}

/* واجهة Inbox بسيطة */
app.get("/", (req, res) => {
  res.redirect("/inbox");
});

app.get("/api/version", (req, res) => {
  res.json({
    ok: true,
    version: BOT_VERSION,
    callNowTemplates: getCallNowTemplateMap(),
    locations: {
      dubai: DUBAI_LOCATION_URL,
      abuDhabi: ABU_DHABI_LOCATION_URL
    },
    note: "Call Now uses approved templates. Location uses WhatsApp CTA URL buttons."
  });
});


app.get("/api/reminders/preview", protectInbox, async (req, res) => {
  try {
    const sheetData = await loadMessagesFromGoogleSheet();
    const messages = sheetData.messages || [];
    const due = getDueFollowUpReminders(messages);
    const allOptIns = buildLatestOptInRecords(messages);

    return res.json({
      ok: true,
      mode: "preview_only",
      templateMode: "branch_specific",
      templates: getFollowUpTemplateMap(),
      headerImageConfigured: Boolean(FOLLOW_UP_HEADER_IMAGE_URL),
      delayDays: FOLLOW_UP_DELAY_DAYS,
      scannedMessages: messages.length,
      totalOptInRecords: allOptIns.length,
      dueCount: due.length,
      due
    });
  } catch (error) {
    console.error("Reminder preview failed:");
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Reminder preview failed"
    });
  }
});

app.get("/api/reminders/test", protectInbox, async (req, res) => {
  try {
    const to = normalizePhoneDigits(req.query.to || "");
    const branch = normalizeText(req.query.branch || "dubai");
    const requestedPhoneNumberId = normalizePhoneNumberId(req.query.phoneNumberId || "");

    if (!to) {
      return res.status(400).json({
        ok: false,
        error: "Missing to query parameter. Example: /api/reminders/test?to=9715XXXXXXX&branch=dubai"
      });
    }

    const phoneNumberId = requestedPhoneNumberId ||
      (branch.includes("abu") ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID);

    const templateName = getFollowUpTemplateName(phoneNumberId);
    const sendResult = await sendWhatsAppTemplate(to, templateName, phoneNumberId, FOLLOW_UP_TEMPLATE_LANGUAGE);

    if (sendResult.ok) {
      addInboxMessage(
        to,
        "bot",
        getReminderBodyForLog(phoneNumberId),
        "Follow-up Test",
        phoneNumberId,
        {
          messageType: "Service Follow-up Template Test"
        }
      );
    }

    return res.json({
      ok: sendResult.ok,
      template: templateName,
      language: FOLLOW_UP_TEMPLATE_LANGUAGE,
      to,
      phoneNumberId,
      branch: getLineConfig(phoneNumberId).branch,
      result: sendResult.result
    });
  } catch (error) {
    console.error("Reminder test failed:");
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Reminder test failed"
    });
  }
});

app.get("/api/call-now/test", protectInbox, async (req, res) => {
  try {
    const to = normalizePhoneDigits(req.query.to || "");
    const branch = normalizeText(req.query.branch || "dubai");
    const requestedPhoneNumberId = normalizePhoneNumberId(req.query.phoneNumberId || "");

    if (!to) {
      return res.status(400).json({
        ok: false,
        error: "Missing to query parameter. Example: /api/call-now/test?to=9715XXXXXXX&branch=dubai"
      });
    }

    const phoneNumberId = requestedPhoneNumberId ||
      (branch.includes("abu") ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID);

    const templateName = getCallNowTemplateName(phoneNumberId);
    const sendResult = await sendWhatsAppTemplate(
      to,
      templateName,
      phoneNumberId,
      CALL_NOW_TEMPLATE_LANGUAGE,
      { includeHeaderImage: false }
    );

    if (sendResult.ok) {
      addInboxMessage(
        to,
        "bot",
        getCallNowBodyForLog(phoneNumberId),
        "Call Now Test",
        phoneNumberId,
        {
          messageType: "Call Now Template Test"
        }
      );
    }

    return res.json({
      ok: sendResult.ok,
      template: templateName,
      language: CALL_NOW_TEMPLATE_LANGUAGE,
      templates: getCallNowTemplateMap(),
      to,
      phoneNumberId,
      branch: getLineConfig(phoneNumberId).branch,
      result: sendResult.result
    });
  } catch (error) {
    console.error("Call Now test failed:");
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Call Now test failed"
    });
  }
});

app.get("/api/location/test", protectInbox, async (req, res) => {
  try {
    const to = normalizePhoneDigits(req.query.to || "");
    const branch = normalizeText(req.query.branch || "dubai");
    const requestedPhoneNumberId = normalizePhoneNumberId(req.query.phoneNumberId || "");

    if (!to) {
      return res.status(400).json({
        ok: false,
        error: "Missing to query parameter. Example: /api/location/test?to=9715XXXXXXX&branch=dubai"
      });
    }

    const phoneNumberId = requestedPhoneNumberId ||
      (branch.includes("abu") ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID);
    const lineConfig = getLineConfig(phoneNumberId);
    const locationBody = buildLocationMessageBody(phoneNumberId);
    const sendResult = await sendWhatsAppCtaUrlMessage(
      to,
      locationBody,
      "Open Location",
      lineConfig.locationUrl,
      phoneNumberId
    );

    if (sendResult.ok) {
      addInboxMessage(
        to,
        "bot",
        getLocationBodyForLog(phoneNumberId),
        "Location Test",
        phoneNumberId,
        {
          messageType: "Location CTA Test"
        }
      );
    }

    return res.json({
      ok: sendResult.ok,
      to,
      phoneNumberId,
      branch: lineConfig.branch,
      locationUrl: lineConfig.locationUrl,
      result: sendResult.result
    });
  } catch (error) {
    console.error("Location test failed:");
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Location test failed"
    });
  }
});

app.get("/api/reminders/send-due", protectInbox, async (req, res) => {
  try {
    const confirm = (req.query.confirm || "").toString().trim();

    if (confirm !== "SEND") {
      return res.status(400).json({
        ok: false,
        error: "Safety check: add ?confirm=SEND to send due reminders.",
        preview_url: "/api/reminders/preview"
      });
    }

    const sheetData = await loadMessagesFromGoogleSheet();
    const messages = sheetData.messages || [];
    const due = getDueFollowUpReminders(messages);
    const sent = [];
    const failed = [];

    for (const record of due) {
      const templateName = getFollowUpTemplateName(record.phoneNumberId);
      const sendResult = await sendWhatsAppTemplate(record.phone, templateName, record.phoneNumberId, FOLLOW_UP_TEMPLATE_LANGUAGE);

      if (sendResult.ok) {
        addInboxMessage(
          record.phone,
          "bot",
          getReminderBodyForLog(record.phoneNumberId),
          "Follow-up Sent",
          record.phoneNumberId,
          {
            customerName: record.customerName || "",
            messageType: "Service Follow-up Reminder"
          }
        );

        sent.push({
          phone: record.phone,
          branch: record.branch,
          phoneNumberId: record.phoneNumberId,
          template: templateName
        });
      } else {
        failed.push({
          phone: record.phone,
          branch: record.branch,
          phoneNumberId: record.phoneNumberId,
          template: templateName,
          result: sendResult.result
        });
      }
    }

    return res.json({
      ok: failed.length === 0,
      templateMode: "branch_specific",
      templates: getFollowUpTemplateMap(),
      headerImageConfigured: Boolean(FOLLOW_UP_HEADER_IMAGE_URL),
      delayDays: FOLLOW_UP_DELAY_DAYS,
      dueCount: due.length,
      sentCount: sent.length,
      failedCount: failed.length,
      sent,
      failed
    });
  } catch (error) {
    console.error("Sending due reminders failed:");
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Sending due reminders failed"
    });
  }
});

  app.get("/api/messages", async (req, res) => {
  const sheetData = await loadMessagesFromGoogleSheet();
  const sheetMessages = sheetData.messages || [];
  const conversationStates = sheetData.conversationStates || [];
  const bookingRequests = sheetData.bookingRequests || [];

  if (sheetMessages.length > 0) {
    return res.json({
      ok: true,
      source: "google_sheet",
      messages: sheetMessages,
      conversationStates,
      bookingRequests
    });
  }

  return res.json({
    ok: true,
    source: "memory",
    messages: inboxMessages,
    conversationStates,
    bookingRequests
  });
});

app.get("/api/bookings", protectInbox, async (req, res) => {
  try {
    const result = await loadBookingRequestsFromGoogleSheetFromServer();

    return res.status(result.ok ? 200 : 500).json(result);
  } catch (error) {
    console.error("Booking requests API failed:");
    console.error(error);
    return res.status(500).json({ ok: false, bookingRequests: [], error: "Booking requests API failed" });
  }
});

app.post("/api/bookings/status", protectInbox, async (req, res) => {
  try {
    const result = await updateBookingRequestStatusInGoogleSheetFromServer({
      rowNumber: req.body?.rowNumber || req.body?.row || "",
      phone: req.body?.phone || "",
      phoneNumberId: req.body?.phoneNumberId || "",
      status: req.body?.status || req.body?.bookingStatus || "",
      notes: req.body?.notes || ""
    });

    return res.status(result.ok ? 200 : 500).json(result);
  } catch (error) {
    console.error("Booking status API failed:");
    console.error(error);
    return res.status(500).json({ ok: false, error: "Booking status API failed" });
  }
});

app.post("/api/bookings/send-update", protectInbox, async (req, res) => {
  try {
    const to = normalizePhoneDigits(req.body?.to || req.body?.phone || "");
    const phoneNumberId = normalizePhoneNumberId(req.body?.phoneNumberId || DUBAI_PHONE_NUMBER_ID);
    const status = (req.body?.status || req.body?.bookingStatus || "").toString().trim();
    const notes = (req.body?.notes || "").toString().trim();

    if (!to) {
      return res.status(400).json({ ok: false, error: "Missing customer phone" });
    }

    const messageBuild = buildBookingCustomerUpdateBody(status, notes);

    if (!messageBuild.ok) {
      return res.status(400).json(messageBuild);
    }

    const sendResult = await sendWhatsAppMessage(to, messageBuild.body, phoneNumberId);

    if (sendResult?.error) {
      return res.status(500).json({
        ok: false,
        error: sendResult.error?.message || "WhatsApp booking update send failed",
        result: sendResult
      });
    }

    addInboxMessage(
      to,
      "staff",
      messageBuild.body,
      "Human Reply",
      phoneNumberId,
      {
        messageType: "Booking Customer Update"
      }
    );

    return res.json({
      ok: true,
      to,
      phoneNumberId,
      status,
      result: sendResult
    });
  } catch (error) {
    console.error("Booking customer update send failed:");
    console.error(error);
    return res.status(500).json({ ok: false, error: "Booking customer update send failed" });
  }
});

app.post("/api/conversation-state", protectInbox, async (req, res) => {
  try {
    const sheetUrl = process.env.SHEET_WEBHOOK_URL;

    if (!sheetUrl) {
      return res.status(500).json({ ok: false, error: "SHEET_WEBHOOK_URL is missing" });
    }

    const payload = {
      action: "saveConversationState",
      phone: (req.body?.phone || "").toString().trim(),
      phoneNumberId: (req.body?.phoneNumberId || "").toString().trim(),
      branch: (req.body?.branch || "").toString().trim(),
      conversation_status: (req.body?.conversation_status || req.body?.status || "").toString().trim(),
      assigned_to: (req.body?.assigned_to || req.body?.assignedTo || "").toString().trim(),
      tags: Array.isArray(req.body?.tags) ? req.body.tags : (req.body?.tags || ""),
      last_updated_by: (req.body?.last_updated_by || "Team Inbox").toString().trim()
    };

    if (!payload.phone || !payload.phoneNumberId) {
      return res.status(400).json({ ok: false, error: "Missing phone or phoneNumberId" });
    }

    const response = await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      result = { ok: false, error: text || "Invalid Apps Script response" };
    }

    if (!response.ok || !result.ok) {
      return res.status(response.ok ? 500 : response.status).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Conversation state save failed:");
    console.error(error);
    return res.status(500).json({ ok: false, error: "Conversation state save failed" });
  }
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

    const phoneNumberId = normalizePhoneNumberId(
      (req.body?.phoneNumberId || "").toString().trim() ||
      conversationPhoneNumberId[to] ||
      DUBAI_PHONE_NUMBER_ID
    );

    conversationPhoneNumberId[to] = phoneNumberId;

    await sendWhatsAppMessage(to, body, phoneNumberId);
    setConversationStatus(to, "Human Reply");
    addInboxMessage(to, "staff", body, "Human Reply", phoneNumberId, { messageType: "Human Reply" });

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




function buildInlineImageMessageBody(mediaId, filename, caption) {
  const payload = {
    mediaId: (mediaId || "").toString().trim(),
    filename: (filename || "iconic-image.jpg").toString().trim(),
    caption: (caption || "").toString().trim()
  };

  return "[[ICONIC_INLINE_IMAGE]] " + JSON.stringify(payload);
}

function buildIncomingCustomerImageBody(message) {
  const image = message?.image || {};
  const mediaId = (image.id || "").toString().trim();

  if (!mediaId) {
    return "";
  }

  const mimeType = (image.mime_type || "image/jpeg").toString().trim();
  const filename = sanitizeMediaFilename("customer-image-" + mediaId, mimeType);
  const caption = (image.caption || "").toString().trim();

  return buildInlineImageMessageBody(mediaId, filename, caption);
}

app.post("/api/send-image", protectInbox, async (req, res) => {
  try {
    const to = (req.body?.to || "").toString().trim();
    const caption = (req.body?.caption || "").toString().trim();
    const imageDataUrl = (req.body?.imageDataUrl || "").toString().trim();
    const filename = (req.body?.filename || "iconic-image.jpg").toString().trim();

    if (!to || !imageDataUrl) {
      return res.status(400).json({
        ok: false,
        error: "Missing customer phone or image"
      });
    }

    const phoneNumberId = normalizePhoneNumberId(
      (req.body?.phoneNumberId || "").toString().trim() ||
      conversationPhoneNumberId[to] ||
      DUBAI_PHONE_NUMBER_ID
    );

    conversationPhoneNumberId[to] = phoneNumberId;

    const sendResult = await sendWhatsAppImageMessage(to, imageDataUrl, caption, filename, phoneNumberId);

    if (!sendResult.ok) {
      return res.status(sendResult.status || 500).json({
        ok: false,
        error: sendResult.result?.error?.message || sendResult.result?.error || "Image send failed",
        result: sendResult.result
      });
    }

    setConversationStatus(to, "Human Reply");

    const safeImageFilename = sanitizeMediaFilename(
      filename,
      (req.body?.mimeType || "image/jpeg").toString().trim()
    );

    addInboxMessage(
      to,
      "staff",
      buildInlineImageMessageBody(sendResult.mediaId, safeImageFilename, caption),
      "Human Reply",
      phoneNumberId,
      { messageType: "Human Image Reply" }
    );

    return res.json({ ok: true, mediaId: sendResult.mediaId, result: sendResult.result });
  } catch (error) {
    console.error("Inbox image send failed:");
    console.error(error);
    return res.status(500).json({
      ok: false,
      error: "Image send failed"
    });
  }
});


app.get("/api/media/:mediaId", protectInbox, async (req, res) => {
  try {
    const mediaId = (req.params?.mediaId || "").toString().trim().replace(/[^a-zA-Z0-9_-]/g, "");

    if (!mediaId) {
      return res.status(400).send("Missing media id");
    }

    const mediaMetaResponse = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`
      }
    });

    const mediaMeta = await mediaMetaResponse.json();

    if (!mediaMetaResponse.ok || !mediaMeta.url) {
      console.log("WhatsApp media metadata failed:");
      console.log(JSON.stringify(mediaMeta, null, 2));
      return res.status(mediaMetaResponse.status || 500).send("Could not load media metadata");
    }

    const imageResponse = await fetch(mediaMeta.url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`
      }
    });

    if (!imageResponse.ok) {
      const text = await imageResponse.text();
      console.log("WhatsApp media download failed:");
      console.log(imageResponse.status, text);
      return res.status(imageResponse.status || 500).send("Could not download media");
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const contentType = mediaMeta.mime_type || imageResponse.headers.get("content-type") || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Media proxy failed:");
    console.error(error);
    return res.status(500).send("Media proxy failed");
  }
});

app.post("/api/status", protectInbox, (req, res) => {
  try {
    const phone = (req.body?.phone || "").toString().trim();
    const status = (req.body?.status || "").toString().trim();

    if (!phone || !status) {
      return res.status(400).json({
        ok: false,
        error: "Missing phone or status"
      });
    }

    setConversationStatus(phone, status);

    return res.json({
      ok: true,
      phone,
      status
    });
  } catch (error) {
    console.error("Status update failed:");
    console.error(error);
    return res.status(500).json({
      ok: false,
      error: "Status update failed"
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
  <title>Iconic Hair Care — Team Inbox</title>
  <link rel="icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />
  <link rel="shortcut icon" href="${INBOX_FAVICON_DATA_URI}" type="image/svg+xml" />
  <style>
    :root {
      --whatsapp: #25d366;
      --whatsapp-dark: #128c7e;
      --iconic-green: #78b83e;
      --iconic-green-dark: #4f8f25;
      --ink: #111827;
      --panel: rgba(255,255,255,.93);
      --panel-solid: #ffffff;
      --line: #e2e8e2;
      --muted: #64748b;
      --chat-bg: rgba(229, 241, 224, .72);
      --shadow: 0 16px 38px rgba(15, 23, 42, .10);
      --soft-shadow: 0 8px 22px rgba(15, 23, 42, .07);
      --radius: 24px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      min-height: 100vh;
      color: var(--ink);
      background:
        radial-gradient(circle at 4% 0%, rgba(120,184,62,.22), transparent 30%),
        radial-gradient(circle at 96% 6%, rgba(18,140,126,.14), transparent 28%),
        linear-gradient(180deg, #fbfdf9 0%, #eef5ec 100%);
      overflow-x: hidden;
      position: relative;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image: url("/assets/iconic-chat-background-logo.png");
      background-repeat: no-repeat;
      background-position: center center;
      background-size: min(860px, 72vw);
      opacity: .115;
      pointer-events: none;
      z-index: 0;
    }

    body::after {
      content: "";
      position: fixed;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(255,255,255,.55), transparent 28%, transparent 72%, rgba(255,255,255,.55)),
        linear-gradient(180deg, rgba(255,255,255,.38), transparent 42%, rgba(255,255,255,.50));
      pointer-events: none;
      z-index: 0;
    }

    .page {
      position: relative;
      z-index: 1;
      max-width: 1780px;
      margin: 0 auto;
      padding: 16px 16px 60px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
      padding: 12px 16px;
      border-radius: 24px;
      background: rgba(255,255,255,.88);
      border: 1px solid rgba(226,232,226,.95);
      box-shadow: var(--soft-shadow);
      backdrop-filter: blur(9px);
    }

    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .topbar-logo {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(240,247,237,.92));
      border: 1px solid rgba(226,232,226,.95);
      display: grid;
      place-items: center;
      box-shadow: 0 10px 24px rgba(15,23,42,.08);
      flex: 0 0 auto;
      padding: 6px;
    }

    .topbar-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 12px;
    }

    .topbar-copy {
      min-width: 0;
    }

    .topbar-title {
      font-size: 18px;
      font-weight: 950;
      color: #0f172a;
      line-height: 1.1;
    }

    .topbar-sub {
      color: var(--muted);
      font-size: 12px;
      margin-top: 3px;
      line-height: 1.4;
    }

    .topbar-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .topbar-pill {
      padding: 9px 12px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(120,184,62,.12), rgba(18,140,126,.08));
      border: 1px solid rgba(120,184,62,.18);
      color: #0f172a;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 30px;
      background: linear-gradient(135deg, #0b141a 0%, #102c27 52%, #45652f 100%);
      color: white;
      min-height: 116px;
      padding: 20px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      box-shadow: var(--shadow);
      margin-bottom: 14px;
    }

    .hero::after {
      content: "";
      position: absolute;
      right: -70px;
      bottom: -92px;
      width: 390px;
      height: 390px;
      background-image: url("/assets/iconic-chat-background-logo.png");
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: .16;
      pointer-events: none;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
      z-index: 1;
      min-width: 0;
    }

    .brand-logo {
      width: 92px;
      height: 92px;
      border-radius: 26px;
      background: white;
      padding: 10px;
      box-shadow: 0 16px 30px rgba(0,0,0,.25);
      flex: 0 0 auto;
    }

    .brand-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 16px;
    }

    .hero-title {
      font-size: 30px;
      font-weight: 950;
      line-height: 1.05;
      letter-spacing: -.4px;
      margin: 0 0 7px;
    }

    .hero-sub {
      color: rgba(255,255,255,.78);
      font-size: 14px;
      line-height: 1.5;
      max-width: 850px;
    }

    .pills {
      display: flex;
      gap: 9px;
      flex-wrap: wrap;
      justify-content: flex-end;
      position: relative;
      z-index: 1;
    }

    .pill {
      padding: 10px 13px;
      border-radius: 999px;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.14);
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .stat {
      background: var(--panel);
      border: 1px solid rgba(226,232,226,.95);
      border-radius: 22px;
      padding: 15px 16px;
      box-shadow: var(--soft-shadow);
      backdrop-filter: blur(9px);
      overflow: hidden;
      position: relative;
    }

    .stat::after {
      content: "";
      position: absolute;
      right: -8px;
      bottom: -10px;
      width: 104px;
      height: 104px;
      border-radius: 24px;
      background:
        linear-gradient(135deg, rgba(120,184,62,.10), rgba(18,140,126,.08)),
        url("/assets/iconic-chat-background-logo.png");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 66px 66px;
      opacity: .54;
      pointer-events: none;
      filter: saturate(1.06);
    }

    .stat-label {
      color: var(--muted);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: .8px;
      text-transform: uppercase;
    }

    .stat-value {
      margin-top: 7px;
      font-size: 29px;
      font-weight: 950;
      color: #0f172a;
    }

    .app {
      display: grid;
      grid-template-columns: 360px minmax(0, 1fr) 390px;
      gap: 14px;
      align-items: stretch;
      min-height: calc(100vh - 248px);
    }

    .panel {
      background: var(--panel);
      border: 1px solid rgba(226,232,226,.95);
      border-radius: var(--radius);
      box-shadow: var(--soft-shadow);
      backdrop-filter: blur(9px);
      overflow: hidden;
      min-height: 0;
    }

    .panel-head {
      padding: 15px 16px;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,.72);
    }

    .panel-title {
      font-size: 18px;
      font-weight: 950;
      color: #0f172a;
    }

    .panel-sub {
      color: var(--muted);
      font-size: 12px;
      margin-top: 4px;
      line-height: 1.45;
    }

    .panel-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      justify-content: space-between;
    }

    .panel-brand-main {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .panel-brand-logo {
      width: 50px;
      height: 50px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(240,247,237,.95));
      border: 1px solid rgba(226,232,226,.95);
      box-shadow: 0 10px 20px rgba(15,23,42,.08);
      padding: 6px;
      flex: 0 0 auto;
    }

    .panel-brand-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 12px;
    }

    .panel-brand-copy {
      min-width: 0;
    }

    .panel-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 8px 10px;
      background: linear-gradient(135deg, rgba(120,184,62,.14), rgba(18,140,126,.10));
      border: 1px solid rgba(120,184,62,.18);
      color: #0f172a;
      font-size: 11px;
      font-weight: 950;
      white-space: nowrap;
      box-shadow: 0 8px 18px rgba(15,23,42,.05);
    }

    .filters {
      padding: 12px;
      display: grid;
      gap: 9px;
      border-bottom: 1px solid var(--line);
      background: rgba(248,251,247,.72);
    }

    .filter-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    input, select, textarea {
      width: 100%;
      border: 1px solid #d7e2d4;
      background: white;
      color: #111827;
      border-radius: 15px;
      padding: 12px 13px;
      outline: none;
      font-size: 14px;
    }

    input:focus, select:focus, textarea:focus {
      border-color: var(--iconic-green);
      box-shadow: 0 0 0 4px rgba(120,184,62,.14);
    }

    .conversation-list {
      padding: 8px;
      max-height: calc(100vh - 396px);
      overflow: auto;
      position: relative;
      isolation: isolate;
    }

    .conversation-list::before {
      content: "";
      position: absolute;
      inset: 20px 10px 20px 10px;
      background-image: url("/assets/iconic-chat-background-logo.png");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 68%;
      opacity: .055;
      pointer-events: none;
      z-index: -1;
    }

    .conversation-card {
      width: 100%;
      display: grid;
      grid-template-columns: 50px 1fr;
      gap: 12px;
      padding: 13px;
      border: 1px solid rgba(222, 232, 220, .72);
      border-radius: 22px;
      background: rgba(255,255,255,.70);
      cursor: pointer;
      text-align: left;
      margin-bottom: 9px;
      transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;
      position: relative;
      box-shadow: 0 8px 20px rgba(15, 23, 42, .045);
      overflow: hidden;
    }

    .conversation-card::before {
      content: "";
      position: absolute;
      left: 0;
      top: 12px;
      bottom: 12px;
      width: 4px;
      border-radius: 0 999px 999px 0;
      background: transparent;
      transition: .16s ease;
    }

    .conversation-card:hover {
      transform: translateY(-1px);
      background: rgba(255,255,255,.94);
      border-color: rgba(120,184,62,.26);
      box-shadow: 0 13px 28px rgba(15, 23, 42, .075);
    }

    .conversation-card.active {
      background: linear-gradient(135deg, rgba(232,246,225,.98), rgba(255,255,255,.92));
      border-color: rgba(120,184,62,.48);
      box-shadow: 0 16px 34px rgba(80, 143, 37, .14);
    }

    .conversation-card.active::before {
      background: linear-gradient(180deg, var(--iconic-green), var(--whatsapp-dark));
    }

    .conversation-card.unread {
      background: linear-gradient(135deg, rgba(231,250,238,.98), rgba(255,255,255,.88));
      border-color: rgba(37,211,102,.32);
    }

    .conversation-card.unread::after {
      content: "";
      position: absolute;
      right: 13px;
      top: 18px;
      width: 10px;
      height: 10px;
      background: var(--whatsapp);
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(37,211,102,.16);
    }

    .conversation-main {
      min-width: 0;
      display: grid;
      gap: 5px;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 999px;
      background:
        linear-gradient(135deg, rgba(37,211,102,.98), rgba(18,140,126,.98));
      color: white;
      font-size: 14px;
      font-weight: 950;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 18px rgba(18,140,126,.20);
      overflow: hidden;
    }

    .avatar img {
      width: 70%;
      height: 70%;
      object-fit: contain;
      filter: brightness(0) invert(1);
      opacity: .95;
    }

    .conv-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding-right: 12px;
    }

    .conv-identity {
      min-width: 0;
      display: grid;
      gap: 2px;
    }

    .conv-name {
      font-size: 14px;
      font-weight: 950;
      color: #0f172a;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      letter-spacing: -.01em;
    }

    .conv-phone {
      font-size: 11px;
      font-weight: 800;
      color: #7a8a7f;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .conv-time {
      font-size: 11px;
      color: var(--muted);
      white-space: nowrap;
      padding-top: 2px;
      font-weight: 800;
    }

    .conv-preview {
      color: #4f5f55;
      font-size: 12px;
      line-height: 1.42;
      min-height: 34px;
      max-height: 36px;
      overflow: hidden;
      padding-right: 8px;
    }

    .badges {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
    }

    .conv-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 2px;
    }

    .conv-count {
      color: #7a8a7f;
      font-size: 11px;
      font-weight: 850;
      white-space: nowrap;
    }

    .branch, .status, .sender-badge, .unread-badge, .message-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 5px 9px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 950;
      white-space: nowrap;
    }

    .branch-dubai {
      background: rgba(14,165,233,.12);
      color: #0369a1;
    }

    .branch-abu {
      background: rgba(120,184,62,.17);
      color: var(--iconic-green-dark);
    }

    .status {
      background: #eef6ef;
      color: #35563d;
    }

    .unread-badge {
      background: rgba(37,211,102,.18);
      color: #0f7c3d;
    }

    .message-count-badge {
      background: rgba(15,23,42,.06);
      color: #526057;
    }

    .sender-customer { background: rgba(16,185,129,.10); color: #047857; }
    .sender-bot { background: rgba(14,165,233,.10); color: #0369a1; }
    .sender-staff { background: rgba(124,58,237,.10); color: #6d28d9; }

    .chat-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      position: relative;
      background:
        linear-gradient(rgba(236,246,231,.84), rgba(236,246,231,.84)),
        radial-gradient(circle at 20% 20%, rgba(37,211,102,.10), transparent 24%),
        radial-gradient(circle at 90% 70%, rgba(18,140,126,.08), transparent 28%);
    }

    .chat-panel::before {
      content: "";
      position: absolute;
      inset: 84px 0 0 0;
      background-image: url("/assets/iconic-chat-background-logo.png");
      background-repeat: no-repeat;
      background-position: center center;
      background-size: min(760px, 76%);
      opacity: .12;
      pointer-events: none;
      z-index: 0;
      filter: saturate(1.05);
    }

    .chat-panel::after {
      content: "";
      position: absolute;
      inset: 84px 0 0 0;
      background:
        radial-gradient(circle at center, rgba(255,255,255,.06), transparent 40%);
      pointer-events: none;
      z-index: 0;
    }

    .chat-head {
      position: relative;
      z-index: 1;
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,.86);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .chat-customer {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .chat-title {
      font-size: 18px;
      font-weight: 950;
      color: #0f172a;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .chat-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 5px;
    }

    .chat-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .mini-btn {
      border: 1px solid #d7e2d4;
      background: white;
      color: #0f172a;
      border-radius: 999px;
      padding: 9px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 950;
    }

    .mini-btn:hover {
      background: #f6fbf3;
    }

    .chat-body {
      position: relative;
      z-index: 1;
      padding: 18px;
      overflow: auto;
      flex: 1;
      min-height: 430px;
      max-height: calc(100vh - 390px);
      isolation: isolate;
    }

    .chat-watermark {
      position: sticky;
      top: 42%;
      height: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
      z-index: -1;
      opacity: .42;
      transform: translateY(-50%);
      margin-bottom: 0;
    }

    .chat-watermark img {
      width: min(760px, 84%);
      max-height: 360px;
      object-fit: contain;
      filter: saturate(1.08);
    }

    .chat-body::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at center, rgba(255,255,255,.05), transparent 34%),
        linear-gradient(180deg, rgba(236,246,231,.08), rgba(236,246,231,.08));
      pointer-events: none;
      z-index: -2;
    }

    .empty {
      color: var(--muted);
      text-align: center;
      padding: 32px;
      line-height: 1.6;
    }

    .bubble-row {
      display: flex;
      margin-bottom: 11px;
    }

    .bubble-row.customer { justify-content: flex-start; }
    .bubble-row.bot, .bubble-row.staff { justify-content: flex-end; }

    .bubble {
      max-width: min(680px, 82%);
      border-radius: 20px;
      padding: 12px 14px;
      line-height: 1.48;
      white-space: pre-wrap;
      font-size: 14px;
      box-shadow: 0 8px 18px rgba(15,23,42,.06);
      border: 1px solid rgba(226,232,226,.82);
    }

    .bubble.customer {
      background: rgba(255,255,255,.87);
      border-bottom-left-radius: 7px;
    }

    .bubble.bot {
      background: rgba(220,248,198,.87);
      border-color: rgba(37,211,102,.26);
      border-bottom-right-radius: 7px;
    }

    .bubble.staff {
      background: rgba(238,242,255,.87);
      border-color: rgba(124,58,237,.20);
      border-bottom-right-radius: 7px;
    }

    .bubble-info {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 7px;
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
    }

    .reply-body {
      padding: 16px;
      position: relative;
      overflow: hidden;
    }

    .reply-body::before {
      content: "";
      position: absolute;
      top: 95px;
      left: 0;
      right: 0;
      margin: auto;
      width: 280px;
      height: 280px;
      background-image: url("/assets/iconic-chat-background-logo.png");
      background-position: center;
      background-size: contain;
      background-repeat: no-repeat;
      opacity: .075;
      pointer-events: none;
    }

    .reply-inner {
      position: relative;
      z-index: 1;
    }

    label {
      display: block;
      margin: 13px 0 7px;
      font-size: 13px;
      color: #475569;
      font-weight: 950;
    }

    .quick-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 9px;
    }

    .quick-btn, .status-btn {
      border: 1px solid #d7e2d4;
      background: white;
      color: #243229;
      border-radius: 14px;
      padding: 10px 11px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      text-align: left;
      min-height: 48px;
    }

    .quick-btn:hover, .status-btn:hover {
      border-color: var(--iconic-green);
      background: #f7fbf5;
    }

    .status-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 9px;
    }

    .media-box {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid #d7e2d4;
      border-radius: 16px;
      background: rgba(248,251,247,.78);
      display: grid;
      gap: 9px;
    }

    .media-hint {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .send-image-btn {
      width: 100%;
      padding: 13px;
      border: 1px solid rgba(120,184,62,.34);
      border-radius: 15px;
      background: #ffffff;
      color: var(--iconic-green-dark);
      font-size: 14px;
      font-weight: 950;
      cursor: pointer;
      box-shadow: 0 8px 18px rgba(15,23,42,.06);
    }

    .send-image-btn:hover {
      border-color: var(--iconic-green);
      background: #f7fbf5;
    }

    .send-btn {
      width: 100%;
      margin-top: 13px;
      padding: 14px;
      border: 0;
      border-radius: 15px;
      background: linear-gradient(135deg, var(--whatsapp-dark), var(--whatsapp));
      color: white;
      font-size: 15px;
      font-weight: 950;
      cursor: pointer;
      box-shadow: 0 12px 22px rgba(37,211,102,.22);
    }

    .send-btn:hover {
      filter: brightness(.98);
    }

    .result {
      margin-top: 10px;
      padding: 11px 12px;
      min-height: 40px;
      border-radius: 13px;
      border: 1px dashed #d7e2d4;
      background: rgba(255,255,255,.78);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .credit-tag {
      position: fixed;
      left: 14px;
      bottom: 12px;
      z-index: 3;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,.84);
      border: 1px solid rgba(215,226,212,.96);
      box-shadow: 0 8px 22px rgba(15,23,42,.08);
      color: #0f172a;
      font-size: 12px;
      font-weight: 900;
      backdrop-filter: blur(8px);
    }

    .credit-tag span {
      color: var(--iconic-green-dark);
    }

    @media (max-width: 1320px) {
      .app {
        grid-template-columns: 350px minmax(0, 1fr);
      }

      .reply-panel {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 920px) {
      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .app {
        grid-template-columns: 1fr;
      }

      .conversation-list {
        max-height: 360px;
      }

      .chat-body {
        max-height: none;
        height: 520px;
      }
    }

    @media (max-width: 650px) {
      .page { padding: 10px 10px 58px; }
      .hero { border-radius: 22px; align-items: flex-start; }
      .brand-logo { width: 74px; height: 74px; border-radius: 19px; }
      .hero-title { font-size: 24px; }
      .stats { grid-template-columns: 1fr; }
      .quick-grid, .status-grid { grid-template-columns: 1fr; }
      .bubble { max-width: 92%; }
      .credit-tag { left: 10px; right: 10px; bottom: 10px; text-align: center; }
    }
  
    @media (max-width: 1200px) {
      .stats {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 980px) {
      .topbar {
        flex-direction: column;
        align-items: stretch;
      }

      .topbar-pills {
        justify-content: flex-start;
      }

      .panel-brand {
        align-items: flex-start;
        flex-direction: column;
      }

      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    /* v14: remove small Conversations logo only */
    .panel-head .panel-brand-logo { display: none !important; }
    .panel-head .panel-brand-main { gap: 0; }

  

    /* V18.1: Sidebar + Top Header only. Safe visual layer; message logic untouched. */
    .workspace-shell {
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
      min-height: 100vh;
      gap: 0;
      position: relative;
      z-index: 1;
    }

    .main-sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 16px 14px;
      background:
        linear-gradient(180deg, rgba(255,255,255,.96), rgba(244,250,241,.96)),
        radial-gradient(circle at 0% 0%, rgba(120,184,62,.14), transparent 34%);
      border-right: 1px solid rgba(215,226,212,.95);
      box-shadow: 12px 0 32px rgba(15, 23, 42, .045);
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: auto;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 8px 14px;
      border-bottom: 1px solid rgba(215,226,212,.8);
    }

    .sidebar-logo {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid rgba(215,226,212,.95);
      box-shadow: 0 12px 26px rgba(15,23,42,.08);
      padding: 7px;
      flex: 0 0 auto;
    }

    .sidebar-logo img,
    .topbar-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 12px;
    }

    .sidebar-brand-title {
      font-size: 18px;
      line-height: 1;
      font-weight: 950;
      letter-spacing: .9px;
      color: #16352b;
    }

    .sidebar-brand-sub {
      margin-top: 3px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.7px;
      color: var(--iconic-green-dark);
    }

    .sidebar-nav {
      display: grid;
      gap: 6px;
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 40px;
      padding: 10px 11px;
      border-radius: 15px;
      color: #385047;
      font-size: 13px;
      font-weight: 850;
      border: 1px solid transparent;
      user-select: none;
    }

    .sidebar-item.active {
      background: linear-gradient(135deg, rgba(120,184,62,.20), rgba(18,140,126,.09));
      color: #16352b;
      border-color: rgba(120,184,62,.20);
      box-shadow: 0 10px 24px rgba(120,184,62,.10);
    }

    .sidebar-branches {
      margin-top: auto;
      padding: 12px;
      border-radius: 20px;
      background: rgba(255,255,255,.76);
      border: 1px solid rgba(215,226,212,.95);
      box-shadow: 0 10px 24px rgba(15,23,42,.045);
    }

    .sidebar-section-title {
      color: var(--muted);
      font-size: 11px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: .7px;
      margin-bottom: 9px;
    }

    .branch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 2px;
      font-size: 13px;
      font-weight: 900;
      color: #16352b;
    }

    .branch-row span {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .branch-row i {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--iconic-green);
      box-shadow: 0 0 0 4px rgba(120,184,62,.13);
      display: inline-block;
    }

    .branch-row b {
      min-width: 28px;
      height: 24px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      padding: 0 8px;
      background: #e9f6e4;
      color: var(--iconic-green-dark);
      font-size: 12px;
    }

    .sidebar-user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px;
      border-radius: 18px;
      background: linear-gradient(135deg, #16352b, #36562c);
      color: #fff;
      box-shadow: 0 14px 28px rgba(22,53,43,.16);
    }

    .sidebar-user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: rgba(255,255,255,.14);
      border: 1px solid rgba(255,255,255,.18);
      font-weight: 950;
    }

    .sidebar-user-name {
      font-size: 13px;
      font-weight: 950;
    }

    .sidebar-user-role {
      margin-top: 2px;
      font-size: 11px;
      color: rgba(255,255,255,.72);
      font-weight: 800;
    }

    .page {
      max-width: none;
      width: 100%;
      padding: 16px 16px 60px;
    }

    .v18-topbar {
      min-height: 82px;
      border-radius: 26px;
      background: rgba(255,255,255,.91);
    }

    .v18-topbar .topbar-title {
      font-size: 23px;
      letter-spacing: -.25px;
    }

    .v18-topbar .topbar-logo {
      width: 58px;
      height: 58px;
    }

    @media (max-width: 1120px) {
      .workspace-shell {
        grid-template-columns: 1fr;
      }

      .main-sidebar {
        position: relative;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid rgba(215,226,212,.95);
      }

      .sidebar-nav {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 650px) {
      .sidebar-nav { grid-template-columns: 1fr; }
      .main-sidebar { padding: 12px; }
      .v18-topbar { align-items: flex-start; }
    }

  

    /* V18.3 - Chat Window UI only: visual polish, no data/send logic changes */
    .chat-panel {
      background:
        linear-gradient(180deg, rgba(247,251,244,.96) 0%, rgba(232,244,226,.92) 100%),
        radial-gradient(circle at 18% 12%, rgba(120,184,62,.16), transparent 30%),
        radial-gradient(circle at 88% 84%, rgba(18,140,126,.10), transparent 28%) !important;
    }

    .chat-head {
      min-height: 82px;
      padding: 16px 18px !important;
      background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(250,253,248,.92)) !important;
      border-bottom: 1px solid rgba(214,226,210,.92) !important;
      box-shadow: 0 10px 24px rgba(15,23,42,.035);
      position: relative;
      z-index: 2;
    }

    .chat-head::after {
      content: "";
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(120,184,62,.38), transparent);
    }

    .chat-customer .avatar {
      width: 46px;
      height: 46px;
      box-shadow: 0 12px 22px rgba(120,184,62,.18);
      border: 2px solid rgba(255,255,255,.92);
    }

    .chat-title {
      font-size: 19px !important;
      letter-spacing: -.02em;
    }

    .chat-meta .branch,
    .chat-meta .status,
    .chat-meta .sender-badge {
      padding: 6px 10px;
      border-radius: 999px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.62);
    }

    .chat-actions .mini-btn {
      min-height: 36px;
      padding: 9px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,.88);
      box-shadow: 0 8px 16px rgba(15,23,42,.045);
    }

    .chat-actions .mini-btn:first-child {
      color: #14532d;
      border-color: rgba(120,184,62,.36);
      background: linear-gradient(180deg, #ffffff, #f3faef);
    }

    .chat-body {
      padding: 22px 22px 18px !important;
      background:
        radial-gradient(circle at 12px 12px, rgba(120,184,62,.045) 1.2px, transparent 1.4px) 0 0/26px 26px,
        linear-gradient(180deg, rgba(246,251,242,.58), rgba(236,246,231,.58));
      scroll-behavior: smooth;
    }

    .chat-watermark {
      opacity: .24 !important;
      filter: blur(.1px);
    }

    .bubble-row {
      margin-bottom: 13px !important;
      gap: 8px;
      animation: softMessageIn .18s ease-out;
    }

    @keyframes softMessageIn {
      from { opacity: .78; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .bubble {
      max-width: min(700px, 78%) !important;
      padding: 12px 14px 10px !important;
      border-radius: 18px !important;
      font-size: 14.2px !important;
      line-height: 1.52 !important;
      box-shadow: 0 9px 22px rgba(15,23,42,.065) !important;
      border: 1px solid rgba(226,232,226,.92) !important;
      position: relative;
      overflow-wrap: anywhere;
    }

    .bubble.customer {
      background: rgba(255,255,255,.94) !important;
      border-bottom-left-radius: 6px !important;
    }

    .bubble.bot {
      background: linear-gradient(180deg, rgba(220,248,198,.98), rgba(209,243,189,.96)) !important;
      border-color: rgba(37,211,102,.28) !important;
      border-bottom-right-radius: 6px !important;
    }

    .bubble.staff {
      background: linear-gradient(180deg, rgba(239,246,255,.98), rgba(238,242,255,.96)) !important;
      border-color: rgba(99,102,241,.20) !important;
      border-bottom-right-radius: 6px !important;
    }

    .bubble.customer::before,
    .bubble.bot::before,
    .bubble.staff::before {
      content: "";
      position: absolute;
      bottom: 0;
      width: 12px;
      height: 12px;
      background: inherit;
      border: inherit;
      transform: rotate(45deg);
      z-index: -1;
    }

    .bubble.customer::before {
      left: -4px;
      border-top: 0;
      border-right: 0;
    }

    .bubble.bot::before,
    .bubble.staff::before {
      right: -4px;
      border-bottom: 0;
      border-left: 0;
    }

    .bubble-info {
      margin-top: 9px !important;
      padding-top: 6px;
      border-top: 1px solid rgba(100,116,139,.10);
      color: rgba(71,85,105,.78) !important;
      font-size: 10.5px !important;
      letter-spacing: .01em;
    }

    .reply-body {
      padding: 14px 16px 16px !important;
      background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(250,253,248,.94));
      border-top: 1px solid rgba(214,226,210,.92);
      box-shadow: 0 -12px 26px rgba(15,23,42,.04);
    }

    .reply-inner {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .reply-body label[for="body"] {
      margin-top: 0;
      color: #183d26;
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }

    .reply-body label[for="body"]::before {
      content: "Reply";
      font-size: 11px;
      color: white;
      background: linear-gradient(135deg, var(--iconic-green), var(--whatsapp-dark));
      padding: 5px 9px;
      border-radius: 999px;
      letter-spacing: .02em;
    }

    textarea#body {
      min-height: 96px !important;
      border-radius: 20px !important;
      border: 1px solid rgba(120,184,62,.24) !important;
      background: rgba(255,255,255,.96) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 10px 22px rgba(15,23,42,.035);
      padding: 14px 15px !important;
      font-size: 14px !important;
      line-height: 1.45;
      resize: vertical;
    }

    textarea#body:focus {
      outline: none;
      border-color: rgba(120,184,62,.72) !important;
      box-shadow: 0 0 0 4px rgba(120,184,62,.13), inset 0 1px 0 rgba(255,255,255,.9) !important;
    }

    .reply-body .actions,
    .reply-body .send-row,
    .reply-body .image-row {
      background: rgba(255,255,255,.72);
      border: 1px solid rgba(214,226,210,.72);
      border-radius: 18px;
      padding: 10px;
    }

    .reply-body button,
    .reply-body .quick-btn,
    .reply-body .status-btn {
      border-radius: 14px !important;
      transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
    }

    .reply-body button:hover,
    .reply-body .quick-btn:hover,
    .reply-body .status-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 18px rgba(15,23,42,.055);
    }


    /* V18.3.1 - Visible Chat UI + Correct Version Label */
    .topbar-sub {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #475569 !important;
    }

    .topbar-sub::after {
      content: "LIVE: V21";
      font-size: 11px;
      font-weight: 900;
      color: #14532d;
      background: linear-gradient(135deg, #dcfce7, #bbf7d0);
      border: 1px solid rgba(34,197,94,.35);
      padding: 5px 9px;
      border-radius: 999px;
      box-shadow: 0 8px 18px rgba(34,197,94,.12);
    }

    .chat-panel {
      border: 2px solid rgba(120,184,62,.28) !important;
      box-shadow: 0 22px 48px rgba(15,23,42,.10) !important;
    }

    .chat-head {
      background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(238,248,233,.96)) !important;
    }

    .chat-title::after {
      content: "  • Chat UI upgraded";
      font-size: 11px;
      font-weight: 800;
      color: #2f7d32;
      background: #edf9e9;
      border: 1px solid rgba(120,184,62,.30);
      padding: 4px 8px;
      border-radius: 999px;
      margin-left: 8px;
      vertical-align: middle;
    }

    .bubble {
      font-size: 15px !important;
      line-height: 1.6 !important;
      padding: 14px 16px 12px !important;
    }

    .bubble.customer {
      border-left: 4px solid rgba(15,118,110,.45) !important;
    }

    .bubble.bot {
      border-right: 4px solid rgba(34,197,94,.55) !important;
    }

    .bubble.staff {
      border-right: 4px solid rgba(99,102,241,.48) !important;
    }

    .reply-body {
      border-top: 2px solid rgba(120,184,62,.25) !important;
    }



    /* V18.3.2 - Real Chat UI Upgrade: stronger visible chat polish only; no data/send logic touched */
    .chat-panel {
      border-radius: 30px !important;
      border: 1px solid rgba(198, 219, 190, .95) !important;
      box-shadow: 0 24px 60px rgba(22, 53, 43, .10), inset 0 1px 0 rgba(255,255,255,.85) !important;
      overflow: hidden !important;
      background:
        linear-gradient(180deg, rgba(255,255,255,.96), rgba(242,249,238,.95)) !important;
    }

    .chat-panel::before {
      opacity: .42 !important;
      background:
        radial-gradient(circle at 18% 18%, rgba(120,184,62,.16), transparent 32%),
        radial-gradient(circle at 82% 72%, rgba(18,140,126,.12), transparent 34%) !important;
    }

    .chat-head {
      min-height: 92px !important;
      padding: 18px 22px !important;
      background:
        linear-gradient(135deg, rgba(255,255,255,.98), rgba(244,251,241,.96)) !important;
      border-bottom: 1px solid rgba(198,219,190,.95) !important;
      box-shadow: 0 16px 34px rgba(15,23,42,.055) !important;
    }

    .chat-title {
      font-size: 22px !important;
      font-weight: 950 !important;
      color: #132f26 !important;
    }

    .chat-meta {
      margin-top: 8px !important;
      gap: 7px !important;
    }

    .chat-meta .branch,
    .chat-meta .status,
    .chat-meta .sender-badge {
      padding: 7px 11px !important;
      font-size: 11px !important;
      border-radius: 999px !important;
      font-weight: 950 !important;
    }

    .chat-actions .mini-btn {
      min-height: 38px !important;
      border-radius: 999px !important;
      font-weight: 950 !important;
      background: rgba(255,255,255,.96) !important;
      border-color: rgba(198,219,190,.95) !important;
    }

    .chat-body {
      padding: 28px 28px 22px !important;
      background:
        linear-gradient(rgba(246,252,243,.80), rgba(236,247,230,.82)),
        radial-gradient(circle at 18px 18px, rgba(120,184,62,.06) 1.4px, transparent 1.8px) 0 0/28px 28px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 0 !important;
    }

    #chatBody .chat-watermark {
      opacity: .12 !important;
      transform: translate(-50%, -48%) scale(.78) !important;
    }

    #chatBody .bubble-row {
      width: min(930px, 100%) !important;
      margin: 0 auto 16px !important;
      display: flex !important;
      align-items: flex-end !important;
    }

    #chatBody .bubble-row.customer {
      justify-content: flex-start !important;
      padding-left: 8px !important;
    }

    #chatBody .bubble-row.bot,
    #chatBody .bubble-row.staff {
      justify-content: flex-end !important;
      padding-right: 8px !important;
    }

    #chatBody .bubble {
      max-width: min(660px, 72%) !important;
      min-width: 220px !important;
      padding: 15px 17px 11px !important;
      border-radius: 22px !important;
      font-size: 14.8px !important;
      line-height: 1.6 !important;
      letter-spacing: .01em !important;
      box-shadow: 0 16px 34px rgba(15,23,42,.09) !important;
      white-space: pre-wrap !important;
    }

    #chatBody .bubble.customer {
      background: linear-gradient(180deg, #ffffff, #fbfdf9) !important;
      border: 1px solid rgba(204,214,209,.98) !important;
      border-bottom-left-radius: 7px !important;
      color: #1f2937 !important;
    }

    #chatBody .bubble.bot {
      background: linear-gradient(180deg, #d9f8c9, #c9f0b7) !important;
      border: 1px solid rgba(94, 178, 75, .42) !important;
      border-bottom-right-radius: 7px !important;
      color: #183d26 !important;
    }

    #chatBody .bubble.staff {
      background: linear-gradient(180deg, #f1f5ff, #e8edff) !important;
      border: 1px solid rgba(99,102,241,.34) !important;
      border-bottom-right-radius: 7px !important;
      color: #1e293b !important;
    }

    #chatBody .bubble.bot::after,
    #chatBody .bubble.staff::after,
    #chatBody .bubble.customer::after {
      content: "";
      position: absolute;
      top: 10px;
      width: 7px;
      height: 42px;
      border-radius: 999px;
      opacity: .85;
    }

    #chatBody .bubble.customer::after {
      left: -13px;
      background: linear-gradient(180deg, #cfd8d2, #aebdb5);
    }

    #chatBody .bubble.bot::after {
      right: -13px;
      background: linear-gradient(180deg, #78b83e, #25d366);
    }

    #chatBody .bubble.staff::after {
      right: -13px;
      background: linear-gradient(180deg, #8b5cf6, #60a5fa);
    }

    #chatBody .bubble-info {
      margin-top: 12px !important;
      padding-top: 9px !important;
      display: flex !important;
      justify-content: space-between !important;
      gap: 12px !important;
      align-items: center !important;
      font-size: 10.8px !important;
      color: rgba(51,65,85,.68) !important;
      border-top: 1px solid rgba(51,65,85,.12) !important;
    }

    #chatBody .sender-badge {
      padding: 5px 9px !important;
      border-radius: 999px !important;
      font-size: 10px !important;
      font-weight: 950 !important;
    }

    .reply-body {
      padding: 16px 18px 18px !important;
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(249,253,247,.98)) !important;
      border-top: 1px solid rgba(198,219,190,.95) !important;
    }

    .reply-inner {
      max-width: 930px !important;
      margin: 0 auto !important;
    }

    textarea#body {
      min-height: 112px !important;
      border-radius: 24px !important;
      font-size: 14.5px !important;
      background: #fff !important;
      border: 1px solid rgba(120,184,62,.35) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 14px 30px rgba(15,23,42,.05) !important;
    }

    .reply-body .actions,
    .reply-body .send-row,
    .reply-body .image-row {
      border-radius: 20px !important;
      background: rgba(255,255,255,.88) !important;
      border-color: rgba(198,219,190,.88) !important;
    }

    .topbar-sub::after {
      content: " • final UI polish";
      color: #15803d;
      font-weight: 950;
    }



    /* V18.4 - Right Panel UI: visual-only upgrade. Keeps existing input IDs and send logic intact. */
    .reply-panel {
      position: relative;
      overflow: hidden;
      border-radius: 28px !important;
      border: 1px solid rgba(198,219,190,.95) !important;
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,252,246,.96)) !important;
      box-shadow: 0 22px 48px rgba(15,23,42,.08) !important;
    }

    .reply-panel::before {
      content: "";
      position: absolute;
      top: -90px;
      right: -90px;
      width: 230px;
      height: 230px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(120,184,62,.18), transparent 64%);
      pointer-events: none;
    }

    .reply-panel::after {
      content: "V19";
      position: absolute;
      top: 18px;
      right: 18px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(220,248,198,.88);
      border: 1px solid rgba(34,197,94,.30);
      color: #166534;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: .05em;
      z-index: 3;
    }

    .reply-panel .panel-head {
      position: relative;
      z-index: 2;
      padding: 22px 22px 18px !important;
      border-bottom: 1px solid rgba(198,219,190,.9) !important;
      background:
        linear-gradient(135deg, rgba(255,255,255,.98), rgba(240,250,236,.92));
    }

    .reply-panel .panel-title {
      font-size: 22px !important;
      line-height: 1.05;
      color: #0f2f1e !important;
      font-weight: 950 !important;
      letter-spacing: -.03em;
    }

    .reply-panel .panel-title::before {
      content: "↗";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      margin-right: 10px;
      border-radius: 12px;
      background: linear-gradient(135deg, #e9f9df, #ffffff);
      border: 1px solid rgba(120,184,62,.28);
      color: #2f7d20;
      box-shadow: 0 8px 18px rgba(15,23,42,.055);
      font-size: 15px;
      vertical-align: middle;
    }

    .reply-panel .panel-sub {
      margin-top: 8px;
      max-width: 260px;
      color: #64748b !important;
      font-size: 12px !important;
      font-weight: 750;
      line-height: 1.45;
    }

    .reply-panel .reply-body {
      position: relative;
      z-index: 2;
      padding: 18px !important;
      background: transparent !important;
      border-top: 0 !important;
      box-shadow: none !important;
    }

    .reply-panel .reply-body::before {
      opacity: .035 !important;
      top: 160px !important;
      width: 260px !important;
      height: 260px !important;
    }

    .reply-panel .reply-inner {
      display: block !important;
      max-width: none !important;
      margin: 0 !important;
    }

    .reply-panel label {
      margin: 16px 0 8px !important;
      color: #334155 !important;
      font-size: 11px !important;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-weight: 950 !important;
    }

    .reply-panel input,
    .reply-panel select,
    .reply-panel textarea {
      border-radius: 16px !important;
      border: 1px solid rgba(198,219,190,.95) !important;
      background: rgba(255,255,255,.92) !important;
      color: #10251b !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.95), 0 8px 18px rgba(15,23,42,.035) !important;
    }

    .reply-panel input:focus,
    .reply-panel select:focus,
    .reply-panel textarea:focus {
      outline: none !important;
      border-color: rgba(120,184,62,.72) !important;
      box-shadow: 0 0 0 4px rgba(120,184,62,.13), inset 0 1px 0 rgba(255,255,255,.95) !important;
    }

    .reply-panel .status-grid,
    .reply-panel .quick-grid {
      gap: 10px !important;
      margin-top: 10px !important;
    }

    .reply-panel .status-btn,
    .reply-panel .quick-btn {
      min-height: 50px !important;
      border-radius: 16px !important;
      border: 1px solid rgba(198,219,190,.9) !important;
      background: rgba(255,255,255,.86) !important;
      color: #193322 !important;
      box-shadow: 0 8px 18px rgba(15,23,42,.035) !important;
      position: relative;
      overflow: hidden;
    }

    .reply-panel .status-btn::before,
    .reply-panel .quick-btn::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: linear-gradient(180deg, rgba(120,184,62,.75), rgba(18,140,126,.42));
      opacity: .0;
      transition: opacity .12s ease;
    }

    .reply-panel .status-btn:hover::before,
    .reply-panel .quick-btn:hover::before {
      opacity: 1;
    }

    .reply-panel textarea#body {
      min-height: 126px !important;
      border-radius: 22px !important;
      padding: 15px 16px !important;
      background: rgba(255,255,255,.94) !important;
    }

    .reply-panel .media-box {
      margin-top: 10px !important;
      padding: 14px !important;
      border-radius: 22px !important;
      border: 1px solid rgba(198,219,190,.95) !important;
      background: linear-gradient(180deg, rgba(255,255,255,.92), rgba(244,251,241,.88)) !important;
      box-shadow: 0 12px 24px rgba(15,23,42,.05) !important;
    }

    .reply-panel .media-box::before {
      content: "Image attachment";
      display: inline-flex;
      width: max-content;
      margin-bottom: 4px;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(220,248,198,.82);
      color: #166534;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .reply-panel .send-image-btn {
      border-radius: 17px !important;
      min-height: 46px !important;
      background: rgba(255,255,255,.94) !important;
      border-color: rgba(120,184,62,.42) !important;
      color: #3f7d20 !important;
    }

    .reply-panel .send-btn {
      margin-top: 16px !important;
      min-height: 52px !important;
      border-radius: 18px !important;
      background: linear-gradient(135deg, #159957, #25d366) !important;
      box-shadow: 0 16px 30px rgba(37,211,102,.23) !important;
      letter-spacing: .01em;
    }

    .reply-panel .result {
      border-radius: 18px !important;
      background: rgba(255,255,255,.82) !important;
      border-color: rgba(198,219,190,.9) !important;
      color: #64748b !important;
    }


    .right-panel-summary {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 14px;
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(240,250,236,.96), rgba(255,255,255,.94));
      border: 1px solid rgba(198,219,190,.9);
      box-shadow: 0 12px 26px rgba(15,23,42,.05);
      margin-bottom: 12px;
    }

    .summary-dot {
      width: 42px;
      height: 42px;
      border-radius: 15px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e9f9df, #fff);
      color: #2f7d20;
      border: 1px solid rgba(120,184,62,.28);
      font-size: 12px;
      font-weight: 950;
      flex: 0 0 auto;
    }

    .summary-title {
      color: #10251b;
      font-size: 13px;
      font-weight: 950;
    }

    .summary-sub {
      margin-top: 3px;
      color: #64748b;
      font-size: 11px;
      line-height: 1.35;
      font-weight: 750;
    }


    /* V18.5 - Bottom Send / Composer Block: visual-only. Keeps IDs and send logic intact. */
    .reply-panel::after {
      content: "V19" !important;
      background: linear-gradient(135deg, rgba(220,248,198,.95), rgba(255,255,255,.94)) !important;
      border-color: rgba(34,197,94,.38) !important;
    }

    .composer-block {
      margin-top: 18px;
      padding: 14px;
      border-radius: 24px;
      border: 1px solid rgba(120,184,62,.25);
      background:
        linear-gradient(180deg, rgba(255,255,255,.97), rgba(247,252,244,.96));
      box-shadow: 0 18px 36px rgba(15,23,42,.075);
      position: relative;
      overflow: hidden;
    }

    .composer-block::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 12% 8%, rgba(120,184,62,.13), transparent 28%),
        radial-gradient(circle at 86% 12%, rgba(37,211,102,.10), transparent 26%);
      pointer-events: none;
    }

    .composer-block > * {
      position: relative;
      z-index: 2;
    }

    .composer-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .composer-title strong {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #10251b;
      font-size: 14px;
      font-weight: 950;
      letter-spacing: -.01em;
    }

    .composer-title strong::before {
      content: "✦";
      width: 26px;
      height: 26px;
      border-radius: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #2f7d20;
      background: rgba(220,248,198,.78);
      border: 1px solid rgba(120,184,62,.26);
    }

    .composer-title span {
      color: #64748b;
      font-size: 10px;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: .07em;
      white-space: nowrap;
    }

    .reply-panel .composer-block label {
      margin-top: 10px !important;
    }

    .reply-panel .composer-block textarea#body {
      min-height: 150px !important;
      resize: vertical;
      border-radius: 20px !important;
      padding: 16px 16px 46px !important;
      background: rgba(255,255,255,.98) !important;
      font-size: 13px !important;
      line-height: 1.55 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.98), 0 12px 26px rgba(15,23,42,.045) !important;
    }

    .composer-tools {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-top: 10px;
    }

    .reply-panel .composer-block .media-box {
      margin-top: 0 !important;
      padding: 12px !important;
      border-radius: 20px !important;
      background: rgba(255,255,255,.72) !important;
      box-shadow: none !important;
    }

    .reply-panel .composer-block .media-box::before {
      content: "Attach image" !important;
      background: rgba(239,246,255,.95) !important;
      color: #075985 !important;
    }

    .reply-panel .composer-block #imageFile {
      padding: 10px !important;
      min-height: 44px !important;
      cursor: pointer;
    }

    .reply-panel .composer-block #imageCaption {
      min-height: 44px !important;
    }

    .composer-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-top: 12px;
    }

    .reply-panel .composer-block .send-image-btn {
      min-height: 48px !important;
      border-radius: 17px !important;
      background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(241,250,236,.96)) !important;
      border: 1px solid rgba(120,184,62,.45) !important;
      color: #2f7d20 !important;
      font-weight: 950 !important;
    }

    .reply-panel .composer-block .send-image-btn::before {
      content: "▧ ";
    }

    .reply-panel .composer-block .send-btn {
      margin-top: 0 !important;
      min-height: 56px !important;
      border-radius: 18px !important;
      font-size: 14px !important;
      font-weight: 950 !important;
      background: linear-gradient(135deg, #0f8f4f, #25d366) !important;
      box-shadow: 0 18px 34px rgba(37,211,102,.28) !important;
    }

    .reply-panel .composer-block .send-btn::after {
      content: "  ➤";
      font-size: 13px;
    }

    .reply-panel .composer-block .media-hint {
      text-align: center;
      font-size: 10.5px !important;
      color: #64748b !important;
      font-weight: 750;
      margin-top: 7px;
    }

    .reply-panel .composer-block .result {
      margin-top: 10px !important;
      min-height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-style: dashed !important;
      background: rgba(255,255,255,.72) !important;
    }

    .quick-grid.composer-mini-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 10px 0 4px !important;
    }

    .composer-mini-actions .quick-btn {
      min-height: 40px !important;
      font-size: 11px !important;
      border-radius: 14px !important;
      background: rgba(255,255,255,.82) !important;
    }


    /* V18.6 - Clean Final Polish base layer. V21 adds tags UI only. */
    :root {
      --v186-cream: #fbfdf8;
      --v186-card: rgba(255,255,255,.96);
      --v186-border: rgba(197,219,190,.72);
      --v186-green: #149447;
      --v186-green-soft: #e9f8e4;
      --v186-text: #10251b;
      --v186-muted: #6b7a69;
    }

    body {
      background:
        radial-gradient(circle at 8% 0%, rgba(120,184,62,.16), transparent 28%),
        radial-gradient(circle at 92% 3%, rgba(37,211,102,.10), transparent 24%),
        linear-gradient(180deg, #fcfef9 0%, #eef7ea 100%) !important;
    }

    .workspace-shell {
      gap: 18px !important;
      padding: 14px !important;
    }

    .main-sidebar,
    .topbar,
    .metric-card,
    .messages-panel,
    .chat-panel,
    .reply-panel {
      border-color: var(--v186-border) !important;
      box-shadow: 0 18px 42px rgba(15, 23, 42, .07) !important;
      backdrop-filter: blur(14px);
    }

    .topbar {
      min-height: 78px !important;
      border-radius: 28px !important;
      background:
        linear-gradient(135deg, rgba(255,255,255,.98), rgba(247,253,244,.96)) !important;
    }

    .topbar-title {
      letter-spacing: -.045em !important;
      color: var(--v186-text) !important;
    }

    .topbar-sub::after {
      content: " • clean polish" !important;
      color: #149447 !important;
      font-weight: 900 !important;
    }

    .topbar-logo,
    .sidebar-logo {
      box-shadow: 0 12px 24px rgba(15,23,42,.08) !important;
    }

    .main-nav a,
    .branch-card,
    .user-card {
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
    }

    .main-nav a:hover,
    .branch-card:hover,
    .user-card:hover,
    .conversation-item:hover,
    .status-btn:hover,
    .quick-btn:hover {
      transform: translateY(-1px);
    }

    .metric-card {
      border-radius: 24px !important;
      min-height: 88px !important;
      background:
        linear-gradient(135deg, rgba(255,255,255,.98), rgba(248,253,245,.94)) !important;
    }

    .metric-value {
      letter-spacing: -.05em !important;
    }

    .messages-panel {
      border-radius: 28px !important;
      background: rgba(255,255,255,.93) !important;
    }

    .filters {
      gap: 11px !important;
    }

    .filters input,
    .filters select,
    .reply-panel input,
    .reply-panel select,
    .reply-panel textarea {
      border-radius: 18px !important;
      border-color: rgba(180,210,171,.9) !important;
    }

    .conversation-item {
      border-radius: 24px !important;
      padding: 15px 14px !important;
      background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(250,253,248,.92)) !important;
      border-color: rgba(202,221,195,.72) !important;
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
    }

    .conversation-item.active {
      background:
        linear-gradient(135deg, rgba(236,250,230,.98), rgba(255,255,255,.94)) !important;
      border-color: rgba(37,211,102,.58) !important;
      box-shadow: 0 18px 36px rgba(37,211,102,.12) !important;
    }

    .avatar {
      box-shadow: 0 12px 24px rgba(16, 185, 129, .16) !important;
      border: 2px solid rgba(255,255,255,.92) !important;
    }

    .branch,
    .status,
    .sender-badge,
    .message-count-badge {
      border-radius: 999px !important;
      font-weight: 950 !important;
    }

    .chat-panel {
      border-radius: 30px !important;
      background:
        radial-gradient(circle at 50% 18%, rgba(255,255,255,.72), transparent 28%),
        linear-gradient(180deg, rgba(247,253,244,.92), rgba(236,248,230,.88)) !important;
    }

    .chat-head {
      min-height: 82px !important;
      background:
        linear-gradient(135deg, rgba(255,255,255,.92), rgba(247,253,244,.86)) !important;
      border-bottom-color: rgba(188,216,178,.92) !important;
    }

    #chatBody {
      padding: 28px 32px !important;
      scroll-behavior: smooth;
    }

    #chatBody::-webkit-scrollbar,
    .conversation-list::-webkit-scrollbar,
    .reply-body::-webkit-scrollbar {
      width: 10px;
    }

    #chatBody::-webkit-scrollbar-thumb,
    .conversation-list::-webkit-scrollbar-thumb,
    .reply-body::-webkit-scrollbar-thumb {
      background: rgba(120,184,62,.42);
      border-radius: 999px;
      border: 3px solid rgba(255,255,255,.72);
    }

    #chatBody .bubble {
      border-radius: 22px !important;
      padding: 15px 17px 13px !important;
      line-height: 1.58 !important;
      font-size: 13px !important;
      box-shadow: 0 16px 34px rgba(15,23,42,.075) !important;
    }

    #chatBody .bubble.customer {
      background: rgba(255,255,255,.96) !important;
      border-left: 4px solid rgba(20,148,71,.38) !important;
    }

    #chatBody .bubble.bot {
      background: linear-gradient(135deg, rgba(213,247,191,.96), rgba(231,252,220,.96)) !important;
      border-right: 4px solid rgba(20,148,71,.48) !important;
    }

    #chatBody .bubble.staff {
      background: linear-gradient(135deg, rgba(240,246,255,.96), rgba(248,250,255,.98)) !important;
      border-right: 4px solid rgba(124,92,255,.42) !important;
    }

    .bubble-info {
      margin-top: 10px !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(15,23,42,.06);
    }

    .reply-panel {
      border-radius: 30px !important;
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(247,253,244,.95)) !important;
    }

    .reply-panel::after {
      content: "V19" !important;
      color: #166534 !important;
      border-color: rgba(34,197,94,.38) !important;
    }

    .right-panel-summary,
    .composer-block,
    .media-box {
      border-color: rgba(188,216,178,.75) !important;
    }

    .composer-block {
      border-radius: 26px !important;
      box-shadow: 0 20px 42px rgba(15,23,42,.08) !important;
    }

    .reply-panel .composer-block textarea#body {
      min-height: 136px !important;
      border-radius: 22px !important;
    }

    .reply-panel .composer-block .send-btn {
      min-height: 54px !important;
      border-radius: 18px !important;
      letter-spacing: -.01em !important;
    }

    .credit-tag {
      border: 1px solid rgba(120,184,62,.28) !important;
      box-shadow: 0 10px 26px rgba(15,23,42,.10) !important;
    }

    @media (max-width: 1300px) {
      #chatBody { padding: 22px 22px !important; }
      .workspace-shell { gap: 12px !important; }
    }



    /* V19 - Conversation Status UI only. No Google Sheets/send logic changes. */
    .conversation-status-select {
      min-width: 148px;
      width: auto;
      border-radius: 999px;
      padding: 9px 34px 9px 13px;
      font-size: 12px;
      font-weight: 950;
      color: #1f4b16;
      border: 1px solid rgba(120,184,62,.42);
      background: linear-gradient(135deg, #ffffff, #f3fbef);
      box-shadow: 0 8px 18px rgba(80,143,37,.08);
      cursor: pointer;
    }

    .workflow-status-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .workflow-status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 950;
      border: 1px solid rgba(120,184,62,.26);
      background: rgba(255,255,255,.82);
      color: #24511a;
      box-shadow: 0 8px 18px rgba(15,23,42,.045);
    }

    .workflow-status-chip::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--iconic-green);
      box-shadow: 0 0 0 4px rgba(120,184,62,.13);
    }

    .workflow-status-chip.status-waiting::before { background: #f59e0b; box-shadow: 0 0 0 4px rgba(245,158,11,.13); }
    .workflow-status-chip.status-closed::before { background: #64748b; box-shadow: 0 0 0 4px rgba(100,116,139,.13); }
    .workflow-status-chip.status-team::before { background: #8b5cf6; box-shadow: 0 0 0 4px rgba(139,92,246,.13); }
    .workflow-status-chip.status-follow::before { background: #ef7d22; box-shadow: 0 0 0 4px rgba(239,125,34,.13); }

    .status.status-waiting,
    .workflow-status-chip.status-waiting { color: #9a5a00; background: #fff7e6; border-color: rgba(245,158,11,.32); }
    .status.status-closed,
    .workflow-status-chip.status-closed { color: #475569; background: #f1f5f9; border-color: rgba(100,116,139,.24); }
    .status.status-team,
    .workflow-status-chip.status-team { color: #5b21b6; background: #f3edff; border-color: rgba(139,92,246,.28); }
    .status.status-follow,
    .workflow-status-chip.status-follow { color: #b45309; background: #fff3e6; border-color: rgba(239,125,34,.28); }

    .conversation-card[data-status="Closed"] { opacity: .82; }
    .conversation-card[data-status="Talk to Team"] { border-color: rgba(139,92,246,.30); }
    .conversation-card[data-status="Need Follow-up"] { border-color: rgba(239,125,34,.30); }

    .v19-status-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
      margin-bottom: 14px;
    }

    .v19-status-actions .status-btn[data-status="Open"] { border-color: rgba(120,184,62,.38); background: #f5fbf1; }
    .v19-status-actions .status-btn[data-status="Waiting"] { border-color: rgba(245,158,11,.34); background: #fff8ea; }
    .v19-status-actions .status-btn[data-status="Closed"] { border-color: rgba(100,116,139,.28); background: #f8fafc; }



    /* V20 - Assign to Team UI only. Local browser assignment map, no backend changes. */
    .assign-team-card {
      margin: 14px 0 18px;
      padding: 14px;
      border: 1px solid rgba(120,184,62,.22);
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(245,251,241,.92));
      box-shadow: 0 10px 24px rgba(15, 23, 42, .06);
    }

    .assign-team-card .assign-top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .assign-team-card .assign-icon {
      width: 34px;
      height: 34px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: #eff9ea;
      color: #4f8f25;
      font-weight: 900;
      border: 1px solid rgba(120,184,62,.22);
    }

    .assign-team-card .assign-title {
      font-size: 13px;
      font-weight: 900;
      color: #16352b;
    }

    .assign-team-card .assign-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      line-height: 1.35;
    }

    .assignee-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 900;
      color: #315c20;
      background: #f3faef;
      border: 1px solid rgba(120,184,62,.24);
      white-space: nowrap;
    }

    .assignee-chip::before {
      content: "👤";
      font-size: 11px;
    }

    .assignee-chip.assignee-unassigned {
      color: #64748b;
      background: #f8fafc;
      border-color: rgba(100,116,139,.18);
    }

    .assignee-chip.assignee-dubai { color: #2f6e18; background: #eff9ea; }
    .assignee-chip.assignee-abu { color: #075985; background: #eef7ff; border-color: rgba(14,165,233,.22); }
    .assignee-chip.assignee-consultation { color: #6d4c00; background: #fff8df; border-color: rgba(245,158,11,.25); }
    .assignee-chip.assignee-followup { color: #5b21b6; background: #f3edff; border-color: rgba(139,92,246,.25); }

    .workflow-status-bar .assignee-chip {
      margin-left: 6px;
    }

    .conversation-card .assignee-chip {
      max-width: 145px;
      overflow: hidden;
      text-overflow: ellipsis;
    }


    /* V21 - Tags UI only. Local browser tag map, no backend/Google Sheets changes. */
    .tags-team-card {
      margin: 14px 0 18px;
      padding: 14px;
      border: 1px solid rgba(120,184,62,.22);
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(246,252,243,.94));
      box-shadow: 0 10px 24px rgba(15, 23, 42, .055);
    }

    .tags-team-card .tags-top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .tags-team-card .tags-icon {
      width: 34px;
      height: 34px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: #f0f9e9;
      color: #4f8f25;
      font-weight: 900;
      border: 1px solid rgba(120,184,62,.22);
    }

    .tags-team-card .tags-title {
      font-size: 13px;
      font-weight: 900;
      color: #16352b;
    }

    .tags-team-card .tags-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      line-height: 1.35;
    }

    .tag-picker-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }

    .tag-option {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 9px;
      border-radius: 14px;
      border: 1px solid rgba(120,184,62,.18);
      background: rgba(255,255,255,.82);
      color: #24421f;
      font-size: 11px;
      font-weight: 850;
      cursor: pointer;
      user-select: none;
      transition: transform .12s ease, border-color .12s ease, background .12s ease;
    }

    .tag-option:hover {
      transform: translateY(-1px);
      background: #f7fcf3;
      border-color: rgba(120,184,62,.34);
    }

    .tag-option input {
      width: 13px;
      height: 13px;
      accent-color: #78b83e;
    }

    .tag-chip,
    .conversation-tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 8px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 900;
      color: #24511a;
      background: #f2faee;
      border: 1px solid rgba(120,184,62,.24);
      white-space: nowrap;
      max-width: 132px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tag-chip::before,
    .conversation-tag-chip::before {
      content: "#";
      color: #78b83e;
      font-weight: 950;
    }

    .tag-chip.tag-vip,
    .conversation-tag-chip.tag-vip { color: #7c4a03; background: #fff8dd; border-color: rgba(245,158,11,.26); }

    .tag-chip.tag-private,
    .conversation-tag-chip.tag-private { color: #6d28d9; background: #f5f3ff; border-color: rgba(124,58,237,.24); }
    .tag-chip.tag-follow-up,
    .conversation-tag-chip.tag-follow-up { color: #b45309; background: #fff3e6; border-color: rgba(239,125,34,.26); }
    .tag-chip.tag-price,
    .conversation-tag-chip.tag-price { color: #075985; background: #eef7ff; border-color: rgba(14,165,233,.22); }
    .tag-chip.tag-booking,
    .conversation-tag-chip.tag-booking { color: #5b21b6; background: #f3edff; border-color: rgba(139,92,246,.24); }
    .tag-chip.tag-need-details,
    .conversation-tag-chip.tag-need-details { color: #9a3412; background: #fff1ed; border-color: rgba(249,115,22,.22); }

    .tag-display-row,
    .conversation-tags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .conversation-tags-row {
      margin-top: 8px;
      max-height: 24px;
      overflow: hidden;
    }

    .workflow-status-bar .tag-chip {
      margin-left: 2px;
    }


    /* V22 - Move Send Composer under Chat. UI-only: IDs and send logic preserved. */
    .topbar-sub::after {
      content: "LIVE: V30.7.2" !important;
      font-size: 11px !important;
      font-weight: 950 !important;
      color: #14532d !important;
      background: linear-gradient(135deg, #dcfce7, #bbf7d0) !important;
      border: 1px solid rgba(34,197,94,.35) !important;
      padding: 5px 9px !important;
      border-radius: 999px !important;
      box-shadow: 0 8px 18px rgba(34,197,94,.12) !important;
    }

    .chat-panel {
      overflow: hidden !important;
    }

    .chat-body {
      max-height: calc(100vh - 535px) !important;
      min-height: 330px !important;
      padding-bottom: 24px !important;
    }

    .chat-composer-wrap {
      position: relative;
      z-index: 3;
      padding: 12px 14px 14px;
      border-top: 1px solid rgba(197,219,190,.82);
      background:
        linear-gradient(180deg, rgba(255,255,255,.90), rgba(247,253,244,.98)),
        radial-gradient(circle at 15% 0%, rgba(120,184,62,.12), transparent 30%);
      box-shadow: 0 -16px 36px rgba(15,23,42,.045);
    }

    .chat-composer-wrap .composer-block {
      margin: 0 !important;
      padding: 13px !important;
      border-radius: 24px !important;
      border: 1px solid rgba(120,184,62,.30) !important;
      background: rgba(255,255,255,.96) !important;
      box-shadow: 0 14px 32px rgba(15,23,42,.07) !important;
    }

    .chat-composer-wrap .composer-title {
      margin-bottom: 8px !important;
    }

    .chat-composer-wrap .composer-title strong {
      font-size: 13px !important;
    }

    .chat-composer-wrap label {
      display: block;
      margin: 8px 0 6px;
      color: #344256;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: .06em;
      text-transform: uppercase;
    }

    .chat-composer-wrap textarea#body {
      width: 100%;
      min-height: 82px !important;
      max-height: 160px;
      resize: vertical;
      border-radius: 20px !important;
      padding: 14px 16px !important;
      border: 1px solid rgba(120,184,62,.32) !important;
      background: rgba(255,255,255,.98) !important;
      color: #10251b;
      font-size: 13px !important;
      line-height: 1.55 !important;
      outline: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.98), 0 10px 22px rgba(15,23,42,.035) !important;
    }

    .chat-composer-wrap textarea#body:focus,
    .chat-composer-wrap input:focus {
      border-color: rgba(34,197,94,.58) !important;
      box-shadow: 0 0 0 4px rgba(34,197,94,.10), inset 0 1px 0 rgba(255,255,255,.98) !important;
    }

    .chat-composer-wrap .composer-mini-actions {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      margin-top: 9px;
    }

    .chat-composer-wrap .composer-tools {
      margin-top: 10px !important;
    }

    .chat-composer-wrap .media-box {
      margin: 0 !important;
      padding: 11px !important;
      border-radius: 18px !important;
      background: linear-gradient(135deg, rgba(248,252,246,.98), rgba(255,255,255,.96)) !important;
      border: 1px solid rgba(120,184,62,.22) !important;
      box-shadow: none !important;
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
    }

    .chat-composer-wrap .media-box::before {
      content: "Send image" !important;
      position: static !important;
      grid-column: 1 / -1;
      justify-self: start;
      transform: none !important;
      font-size: 10px !important;
      color: #166534 !important;
      background: #eff9ea !important;
      border: 1px solid rgba(120,184,62,.24) !important;
      padding: 4px 8px !important;
      border-radius: 999px !important;
      margin-bottom: 2px;
    }

    .chat-composer-wrap #imageFile,
    .chat-composer-wrap #imageCaption {
      width: 100%;
      min-height: 42px !important;
      border-radius: 14px !important;
      border: 1px solid rgba(120,184,62,.24) !important;
      background: rgba(255,255,255,.95) !important;
      padding: 9px 11px !important;
      font-size: 12px !important;
    }

    .chat-composer-wrap .send-image-btn {
      min-height: 42px !important;
      white-space: nowrap;
      border-radius: 14px !important;
      padding: 10px 14px !important;
      border: 1px solid rgba(120,184,62,.42) !important;
      color: #2f7d20 !important;
      background: linear-gradient(135deg, #ffffff, #f2faee) !important;
      font-weight: 950 !important;
      cursor: pointer;
    }

    .chat-composer-wrap .media-hint {
      grid-column: 1 / -1;
      color: #64748b !important;
      font-size: 10.5px !important;
      font-weight: 750;
      text-align: left !important;
      margin-top: 2px !important;
    }

    .chat-composer-wrap .composer-actions {
      margin-top: 10px !important;
      display: flex !important;
      flex-direction: row-reverse;
      gap: 10px;
      align-items: stretch;
    }

    .chat-composer-wrap .send-btn {
      width: 220px !important;
      min-height: 50px !important;
      margin-top: 0 !important;
      border-radius: 17px !important;
      background: linear-gradient(135deg, #0f8f4f, #25d366) !important;
      box-shadow: 0 16px 30px rgba(37,211,102,.24) !important;
      font-size: 13px !important;
      font-weight: 950 !important;
    }

    .chat-composer-wrap .result {
      flex: 1;
      margin-top: 0 !important;
      min-height: 50px !important;
      display: flex;
      align-items: center;
      padding: 10px 13px !important;
      border-radius: 16px !important;
      background: rgba(255,255,255,.78) !important;
    }

    .composer-moved-note {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin: 14px 0 18px;
      padding: 13px;
      border-radius: 20px;
      border: 1px solid rgba(120,184,62,.26);
      background: linear-gradient(135deg, rgba(240,249,236,.96), rgba(255,255,255,.94));
      box-shadow: 0 10px 24px rgba(15,23,42,.05);
    }

    .moved-note-icon {
      width: 34px;
      height: 34px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: #dcfce7;
      border: 1px solid rgba(34,197,94,.25);
      color: #166534;
      font-weight: 950;
    }

    .moved-note-title {
      color: #16352b;
      font-size: 13px;
      font-weight: 950;
    }

    .moved-note-sub {
      margin-top: 3px;
      color: #64748b;
      font-size: 11px;
      line-height: 1.42;
      font-weight: 650;
    }

    @media (max-width: 1300px) {
      .chat-body { max-height: none !important; }
      .chat-composer-wrap .media-box { grid-template-columns: 1fr; }
      .chat-composer-wrap .composer-actions { flex-direction: column; }
      .chat-composer-wrap .send-btn { width: 100% !important; }
    }



    /* V22.1 - Layout sizing + internal scroll fix.
       Goal: keep the full Team Inbox usable inside one screen. UI-only. */
    html, body {
      height: 100% !important;
      overflow: hidden !important;
    }

    .workspace-shell {
      min-height: 100vh !important;
      height: 100vh !important;
      overflow: hidden !important;
      grid-template-columns: 248px minmax(0, 1fr) !important;
    }

    .main-sidebar {
      height: 100vh !important;
      max-height: 100vh !important;
      overflow: hidden !important;
      padding: 14px 12px !important;
      gap: 12px !important;
    }

    .main-sidebar:hover {
      overflow-y: auto !important;
    }

    .page {
      height: 100vh !important;
      max-height: 100vh !important;
      overflow: hidden !important;
      padding: 12px 14px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
    }

    .topbar.v18-topbar,
    .topbar {
      flex: 0 0 70px !important;
      min-height: 70px !important;
      height: 70px !important;
      padding: 10px 14px !important;
      border-radius: 24px !important;
      margin: 0 !important;
    }

    .topbar-logo,
    .v18-topbar .topbar-logo {
      width: 48px !important;
      height: 48px !important;
      border-radius: 16px !important;
    }

    .topbar-title,
    .v18-topbar .topbar-title {
      font-size: 22px !important;
      line-height: 1.05 !important;
    }

    .topbar-sub {
      font-size: 11px !important;
      margin-top: 2px !important;
    }

    .topbar-pill {
      padding: 8px 11px !important;
      font-size: 11px !important;
    }

    .stats {
      flex: 0 0 74px !important;
      height: 74px !important;
      margin: 0 !important;
      gap: 10px !important;
    }

    .stat,
    .metric-card {
      min-height: 74px !important;
      height: 74px !important;
      padding: 12px 14px !important;
      border-radius: 20px !important;
    }

    .stat-label,
    .metric-label {
      font-size: 10px !important;
      letter-spacing: .07em !important;
    }

    .stat-value,
    .metric-value {
      font-size: 27px !important;
      margin-top: 5px !important;
    }

    .app {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      height: auto !important;
      max-height: none !important;
      overflow: hidden !important;
      grid-template-columns: 350px minmax(0, 1fr) 378px !important;
      gap: 12px !important;
      align-items: stretch !important;
    }

    .panel,
    .messages-panel,
    .chat-panel,
    .reply-panel {
      min-height: 0 !important;
      height: 100% !important;
      max-height: 100% !important;
      overflow: hidden !important;
    }

    .messages-panel {
      display: flex !important;
      flex-direction: column !important;
    }

    .messages-panel .filters {
      flex: 0 0 auto !important;
      padding: 10px !important;
      gap: 8px !important;
    }

    .messages-panel .filters input,
    .messages-panel .filters select {
      min-height: 42px !important;
      padding: 9px 12px !important;
      font-size: 12px !important;
      border-radius: 15px !important;
    }

    .conversation-list {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow-y: auto !important;
      padding: 8px !important;
    }

    .conversation-item {
      padding: 12px 12px !important;
      border-radius: 20px !important;
      margin-bottom: 8px !important;
    }

    .conversation-item .avatar,
    .conversation-item .conversation-avatar,
    .avatar {
      width: 44px !important;
      height: 44px !important;
      min-width: 44px !important;
    }

    .conversation-name {
      font-size: 13px !important;
    }

    .conversation-preview {
      font-size: 11px !important;
      line-height: 1.3 !important;
      max-height: 34px !important;
      overflow: hidden !important;
    }

    .chat-panel {
      display: flex !important;
      flex-direction: column !important;
      border-radius: 26px !important;
    }

    .chat-head {
      flex: 0 0 auto !important;
      min-height: 72px !important;
      padding: 12px 14px !important;
    }

    .chat-title {
      font-size: 18px !important;
    }

    .chat-meta {
      margin-top: 4px !important;
      gap: 5px !important;
    }

    .workflow-status-bar {
      margin-top: 5px !important;
      gap: 6px !important;
    }

    .workflow-status-chip,
    .assignee-chip,
    .tag-chip,
    .branch,
    .status,
    .sender-badge {
      padding: 4px 8px !important;
      font-size: 10px !important;
    }

    .chat-actions {
      gap: 6px !important;
    }

    .chat-actions .mini-btn,
    .mini-btn,
    .conversation-status-select {
      min-height: 34px !important;
      padding: 8px 11px !important;
      font-size: 11px !important;
    }

    .chat-body {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow-y: auto !important;
      padding: 16px 18px !important;
    }

    #chatBody .bubble,
    .bubble {
      max-width: min(640px, 78%) !important;
      padding: 11px 13px 10px !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      border-radius: 18px !important;
    }

    .bubble-row {
      margin-bottom: 9px !important;
    }

    .bubble-info {
      margin-top: 7px !important;
      padding-top: 6px !important;
    }

    .chat-composer-wrap {
      flex: 0 0 auto !important;
      padding: 8px 10px 10px !important;
      box-shadow: 0 -10px 24px rgba(15,23,42,.04) !important;
      border-top: 1px solid rgba(197,219,190,.72) !important;
    }

    .chat-composer-wrap .composer-block {
      padding: 10px !important;
      border-radius: 20px !important;
    }

    .chat-composer-wrap .composer-title {
      margin-bottom: 5px !important;
    }

    .chat-composer-wrap .composer-title strong {
      font-size: 12px !important;
    }

    .chat-composer-wrap .composer-title strong::before {
      width: 22px !important;
      height: 22px !important;
      border-radius: 9px !important;
    }

    .chat-composer-wrap label {
      margin: 5px 0 4px !important;
      font-size: 10px !important;
    }

    .chat-composer-wrap textarea#body {
      min-height: 54px !important;
      max-height: 92px !important;
      padding: 10px 12px !important;
      border-radius: 16px !important;
      font-size: 12px !important;
      resize: none !important;
    }

    .chat-composer-wrap .composer-mini-actions {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 7px !important;
      margin-top: 7px !important;
    }

    .chat-composer-wrap .composer-mini-actions .quick-btn {
      min-height: 34px !important;
      padding: 7px 10px !important;
      font-size: 11px !important;
      border-radius: 13px !important;
    }

    .chat-composer-wrap .composer-tools {
      margin-top: 7px !important;
    }

    .chat-composer-wrap .media-box {
      grid-template-columns: minmax(0, .95fr) minmax(0, 1fr) auto !important;
      gap: 7px !important;
      padding: 8px !important;
      border-radius: 16px !important;
    }

    .chat-composer-wrap .media-box::before {
      display: none !important;
    }

    .chat-composer-wrap #imageFile,
    .chat-composer-wrap #imageCaption,
    .chat-composer-wrap .send-image-btn {
      min-height: 36px !important;
      height: 36px !important;
      padding: 7px 9px !important;
      font-size: 11px !important;
      border-radius: 12px !important;
    }

    .chat-composer-wrap .media-hint {
      display: none !important;
    }

    .chat-composer-wrap .composer-actions {
      margin-top: 8px !important;
      gap: 8px !important;
    }

    .chat-composer-wrap .send-btn {
      width: 190px !important;
      min-height: 42px !important;
      height: 42px !important;
      font-size: 12px !important;
      border-radius: 15px !important;
    }

    .chat-composer-wrap .result {
      min-height: 42px !important;
      height: 42px !important;
      padding: 8px 11px !important;
      font-size: 11px !important;
      border-radius: 14px !important;
    }

    .reply-panel {
      display: flex !important;
      flex-direction: column !important;
      border-radius: 26px !important;
    }

    .reply-panel::after {
      content: "V31.4" !important;
    }

    .reply-panel .panel-head {
      flex: 0 0 auto !important;
      padding: 12px 14px !important;
    }

    .reply-panel .panel-title {
      font-size: 17px !important;
    }

    .reply-panel .panel-sub {
      font-size: 11px !important;
    }

    .reply-panel .reply-body {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow-y: auto !important;
      padding: 12px !important;
    }

    .right-panel-summary,
    .assign-team-card,
    .tags-card,
    .composer-moved-note {
      padding: 10px !important;
      border-radius: 18px !important;
      margin-bottom: 10px !important;
    }

    .summary-dot,
    .assign-icon,
    .tags-icon,
    .moved-note-icon {
      width: 32px !important;
      height: 32px !important;
      border-radius: 12px !important;
      font-size: 11px !important;
    }

    .summary-title,
    .assign-title,
    .tags-title {
      font-size: 12px !important;
    }

    .summary-sub,
    .assign-sub,
    .tags-sub,
    .composer-moved-note div:last-child {
      font-size: 10px !important;
      line-height: 1.25 !important;
    }

    .reply-panel label {
      margin: 10px 0 6px !important;
      font-size: 10px !important;
    }

    .reply-panel input,
    .reply-panel select {
      min-height: 40px !important;
      padding: 8px 11px !important;
      font-size: 12px !important;
      border-radius: 14px !important;
    }

    .reply-panel .status-grid,
    .reply-panel .quick-grid,
    .tag-options {
      gap: 8px !important;
      margin-top: 7px !important;
    }

    .reply-panel .status-btn,
    .reply-panel .quick-btn,
    .tag-option {
      min-height: 38px !important;
      padding: 8px 10px !important;
      font-size: 11px !important;
      border-radius: 14px !important;
    }

    .composer-moved-note {
      display: none !important;
    }

    @media (max-width: 1500px) {
      .app { grid-template-columns: 330px minmax(0, 1fr) 350px !important; }
      .main-sidebar, .workspace-shell { grid-template-columns: 228px minmax(0, 1fr) !important; }
      .chat-composer-wrap .send-btn { width: 170px !important; }
    }

    @media (max-width: 1180px) {
      html, body { overflow: auto !important; }
      .workspace-shell, .page { height: auto !important; max-height: none !important; overflow: visible !important; }
      .app { grid-template-columns: 1fr !important; height: auto !important; overflow: visible !important; }
      .messages-panel, .chat-panel, .reply-panel { height: auto !important; max-height: none !important; }
      .chat-body, .conversation-list, .reply-panel .reply-body { max-height: 520px !important; }
    }


    /* V22.2 - Conversation list scroll fix preserved.
       V22.4 - Conversation list blank block fix.
       Fixes the customer conversation column so staff can scroll inside it
       without scrolling the whole page. UI-only; no API/send/Google Sheets changes. */
    .app {
      height: calc(100vh - 166px) !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }

    .messages-panel {
      display: flex !important;
      flex-direction: column !important;
      min-height: 0 !important;
      height: 100% !important;
      max-height: 100% !important;
      overflow: hidden !important;
    }

    .messages-panel .filters {
      flex: 0 0 auto !important;
    }

    #conversationList.conversation-list,
    .messages-panel > .conversation-list {
      flex: 1 1 0 !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow-y: scroll !important;
      overflow-x: hidden !important;
      overscroll-behavior: contain !important;
      scrollbar-gutter: stable !important;
      padding-bottom: 14px !important;
    }

    #conversationList.conversation-list::-webkit-scrollbar {
      width: 10px !important;
    }

    #conversationList.conversation-list::-webkit-scrollbar-thumb {
      background: rgba(120,184,62,.36) !important;
      border-radius: 999px !important;
      border: 2px solid rgba(255,255,255,.88) !important;
    }

    #conversationList.conversation-list::-webkit-scrollbar-track {
      background: rgba(241,247,238,.65) !important;
      border-radius: 999px !important;
    }

    .conversation-card,
    .conversation-item {
      scroll-margin: 10px !important;
    }

    @media (max-width: 920px) {
      .app {
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }

      #conversationList.conversation-list,
      .messages-panel > .conversation-list {
        height: 420px !important;
        flex: 0 0 420px !important;
      }
    }


    /* V22.3 - Quick replies are now part of the composer, not the right panel. */
    .chat-composer-wrap .composer-quick-replies {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 7px !important;
    }

    .chat-composer-wrap .composer-quick-replies .quick-btn {
      min-height: 34px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .quick-replies-moved-note {
      display: flex !important;
      margin-top: 10px !important;
    }

    .reply-panel .quick-grid:not(.composer-mini-actions) {
      display: none !important;
    }

    @media (max-width: 1500px) {
      .chat-composer-wrap .composer-quick-replies { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    }


    /* V22.4 - Conversation list blank block fix.
       Keeps the customer conversation column usable and removes the empty visual block.
       UI-only CSS fix; no Google Sheets, send message, send image, status, assign, or tags logic changed. */
    .messages-panel {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) !important;
      min-height: 0 !important;
      height: 100% !important;
      max-height: 100% !important;
      overflow: hidden !important;
    }

    .messages-panel .filters {
      position: relative !important;
      z-index: 3 !important;
      flex: none !important;
    }

    #conversationList.conversation-list,
    .messages-panel > .conversation-list {
      position: relative !important;
      z-index: 2 !important;
      display: block !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding: 8px 10px 14px !important;
      background: rgba(255,255,255,.74) !important;
      border-top: 1px solid rgba(215,226,212,.76) !important;
      overscroll-behavior: contain !important;
      scrollbar-gutter: stable !important;
    }

    #conversationList.conversation-list::before,
    .messages-panel > .conversation-list::before {
      display: none !important;
      content: none !important;
    }

    #conversationList .conversation-card {
      display: grid !important;
      grid-template-columns: 44px minmax(0, 1fr) !important;
      gap: 10px !important;
      width: 100% !important;
      position: relative !important;
      z-index: 4 !important;
      opacity: 1 !important;
      visibility: visible !important;
      margin: 0 0 9px !important;
      transform: none !important;
    }

    #conversationList .conversation-card:hover {
      transform: translateY(-1px) !important;
    }

    #conversationList .empty {
      margin: 10px !important;
      min-height: 120px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 18px !important;
      background: rgba(255,255,255,.82) !important;
      border: 1px dashed rgba(180,210,171,.85) !important;
    }

    @media (min-width: 1181px) {
      .app {
        height: calc(100vh - 166px) !important;
        overflow: hidden !important;
      }
    }


    /* V22.5 - Conversation list scroll final fix.
       This version forces the customer conversations column to be a real
       internal scroll area, so staff can choose any customer without
       shrinking browser zoom or scrolling the whole page. UI-only CSS fix. */
    @media (min-width: 1181px) {
      html,
      body {
        height: 100vh !important;
        max-height: 100vh !important;
        overflow: hidden !important;
      }

      .workspace-shell {
        height: 100vh !important;
        max-height: 100vh !important;
        overflow: hidden !important;
      }

      .page {
        height: 100vh !important;
        max-height: 100vh !important;
        overflow: hidden !important;
        display: grid !important;
        grid-template-rows: 72px 78px minmax(0, 1fr) !important;
        gap: 10px !important;
      }

      .topbar.v18-topbar,
      .topbar {
        height: 72px !important;
        min-height: 72px !important;
        max-height: 72px !important;
        padding: 10px 14px !important;
      }

      .stats {
        height: 78px !important;
        min-height: 78px !important;
        max-height: 78px !important;
        gap: 10px !important;
        overflow: hidden !important;
      }

      .stat-card,
      .metric-card {
        min-height: 0 !important;
        height: 78px !important;
        padding: 10px 14px !important;
      }

      .stat-value,
      .metric-value {
        font-size: 26px !important;
        line-height: 1 !important;
        margin-top: 3px !important;
      }

      .app {
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        overflow: hidden !important;
        grid-template-columns: 330px minmax(0, 1fr) 360px !important;
        align-items: stretch !important;
      }

      .messages-panel,
      .chat-panel,
      .reply-panel {
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        overflow: hidden !important;
      }

      .messages-panel {
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) !important;
      }

      .messages-panel .filters {
        min-height: 0 !important;
        padding: 10px !important;
        gap: 8px !important;
      }

      .messages-panel .filters input,
      .messages-panel .filters select {
        min-height: 38px !important;
        height: 38px !important;
        padding: 8px 11px !important;
        font-size: 12px !important;
      }

      #conversationList.conversation-list,
      .messages-panel > .conversation-list {
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        display: block !important;
        padding: 8px 10px 12px !important;
        overscroll-behavior: contain !important;
        scrollbar-gutter: stable both-edges !important;
        touch-action: pan-y !important;
      }

      #conversationList .conversation-card {
        min-height: auto !important;
        padding: 10px !important;
        margin-bottom: 8px !important;
      }

      #conversationList .conversation-card .avatar,
      #conversationList .conversation-card .conversation-avatar {
        width: 42px !important;
        height: 42px !important;
        min-width: 42px !important;
      }

      #conversationList .conv-preview,
      #conversationList .conversation-preview {
        display: block !important;
        max-height: 30px !important;
        overflow: hidden !important;
        line-height: 1.25 !important;
      }

      .chat-panel {
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) auto !important;
      }

      .chat-body {
        min-height: 0 !important;
        height: 100% !important;
        max-height: 100% !important;
        overflow-y: auto !important;
      }

      .chat-composer-wrap {
        flex: 0 0 auto !important;
        max-height: 245px !important;
        overflow: hidden !important;
        padding: 10px !important;
      }

      .chat-composer-wrap textarea {
        min-height: 58px !important;
        max-height: 78px !important;
      }

      .reply-panel .reply-body,
      .reply-body {
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding-bottom: 14px !important;
      }
    }


    /* V24 - Send button visible with no internal scroll.
       UI-only: keeps V22.5 conversation list scroll and composer under chat.
       Goal: Reply Panel + Team assignment + Tags fit in the visible right column. */
    .reply-panel::after {
      content: "V30.7.3" !important;
    }

    .app {
      grid-template-columns: 350px minmax(0, 1fr) 360px !important;
    }

    .reply-panel {
      overflow: hidden !important;
    }

    .reply-panel .panel-head {
      padding: 9px 12px !important;
      min-height: 52px !important;
      flex: 0 0 52px !important;
    }

    .reply-panel .panel-title {
      font-size: 15px !important;
      line-height: 1.05 !important;
    }

    .reply-panel .panel-sub {
      font-size: 10px !important;
      line-height: 1.15 !important;
      margin-top: 3px !important;
    }

    .reply-panel .reply-body {
      padding: 8px 9px !important;
      overflow: hidden !important;
    }

    .reply-panel .reply-inner {
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
      overflow: hidden !important;
    }

    .right-panel-summary,
    .composer-moved-note,
    .quick-replies-moved-note {
      display: none !important;
    }

    .reply-panel label {
      margin: 4px 0 3px !important;
      font-size: 9px !important;
      letter-spacing: .08em !important;
      line-height: 1 !important;
    }

    .reply-panel input,
    .reply-panel select {
      min-height: 31px !important;
      height: 31px !important;
      padding: 6px 9px !important;
      font-size: 11px !important;
      border-radius: 12px !important;
    }

    .reply-panel .status-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 5px !important;
      margin-top: 4px !important;
    }

    .reply-panel .status-btn {
      min-height: 30px !important;
      height: 30px !important;
      padding: 5px 8px !important;
      font-size: 10px !important;
      border-radius: 11px !important;
      line-height: 1 !important;
    }

    .assign-team-card,
    .tags-team-card {
      margin: 5px 0 !important;
      padding: 8px !important;
      border-radius: 15px !important;
      box-shadow: 0 8px 18px rgba(15, 23, 42, .045) !important;
    }

    .assign-team-card .assign-top,
    .tags-team-card .tags-top {
      gap: 7px !important;
      margin-bottom: 6px !important;
    }

    .assign-team-card .assign-icon,
    .tags-team-card .tags-icon {
      width: 26px !important;
      height: 26px !important;
      min-width: 26px !important;
      border-radius: 10px !important;
      font-size: 10px !important;
    }

    .assign-team-card .assign-title,
    .tags-team-card .tags-title {
      font-size: 11px !important;
      line-height: 1.05 !important;
    }

    .assign-team-card .assign-sub,
    .tags-team-card .tags-sub {
      display: none !important;
    }

    .assign-team-card select#assigneeSelect {
      height: 31px !important;
      min-height: 31px !important;
      margin-top: 0 !important;
    }

    .assign-team-card div[style*="margin-top:10px"] {
      margin-top: 5px !important;
    }

    .assignee-chip,
    .tag-chip,
    .tag-display-row .tag-chip {
      padding: 4px 7px !important;
      font-size: 9px !important;
      line-height: 1 !important;
    }

    .tag-picker-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 5px !important;
      margin-top: 6px !important;
    }

    .tag-option {
      min-height: 29px !important;
      height: 29px !important;
      padding: 5px 7px !important;
      border-radius: 11px !important;
      font-size: 9px !important;
      letter-spacing: .06em !important;
      gap: 5px !important;
    }

    .tag-option input {
      width: 12px !important;
      height: 12px !important;
      min-height: 12px !important;
      padding: 0 !important;
    }

    #tagDisplay.tag-display-row {
      margin-top: 5px !important;
      min-height: 18px !important;
    }

    @media (max-width: 1500px) {
      .app { grid-template-columns: 330px minmax(0, 1fr) 330px !important; }
      .reply-panel .status-btn { font-size: 9px !important; }
      .tag-option { font-size: 8.5px !important; }
    }


    /* V24 - Send button visible fix.
       UI-only: keeps V24 send button visible, V22.5 scroll fixes, and V22.3 quick replies inside composer.
       Goal: keep Send WhatsApp Reply visible without page zooming or scrolling. */
    .reply-panel::after {
      content: "V30.7.3" !important;
    }

    .chat-composer-wrap {
      flex: 0 0 auto !important;
      max-height: 238px !important;
      min-height: 0 !important;
      overflow: hidden !important;
      padding: 8px 10px !important;
    }

    .chat-composer-wrap .composer-block {
      padding: 8px 9px !important;
      border-radius: 18px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
    }

    .chat-composer-wrap .composer-title {
      margin: 0 !important;
      min-height: 22px !important;
    }

    .chat-composer-wrap .composer-title strong {
      font-size: 11px !important;
    }

    .chat-composer-wrap .composer-title strong::before {
      width: 20px !important;
      height: 20px !important;
      border-radius: 8px !important;
    }

    .chat-composer-wrap label {
      margin: 0 !important;
      font-size: 9px !important;
      line-height: 1 !important;
    }

    .chat-composer-wrap textarea#body {
      min-height: 42px !important;
      height: 42px !important;
      max-height: 42px !important;
      padding: 8px 10px !important;
      font-size: 12px !important;
      line-height: 1.25 !important;
      border-radius: 14px !important;
      resize: none !important;
    }

    .chat-composer-wrap .composer-quick-replies {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 6px !important;
      margin: 0 !important;
    }

    .chat-composer-wrap .composer-quick-replies .quick-btn {
      min-height: 28px !important;
      height: 28px !important;
      padding: 5px 8px !important;
      font-size: 10px !important;
      border-radius: 11px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .chat-composer-wrap .composer-tools {
      margin: 0 !important;
    }

    .chat-composer-wrap .media-box {
      grid-template-columns: minmax(0, .9fr) minmax(0, 1fr) 116px !important;
      gap: 6px !important;
      padding: 6px !important;
      border-radius: 14px !important;
    }

    .chat-composer-wrap #imageFile,
    .chat-composer-wrap #imageCaption,
    .chat-composer-wrap .send-image-btn {
      min-height: 32px !important;
      height: 32px !important;
      padding: 5px 8px !important;
      font-size: 10px !important;
      border-radius: 10px !important;
    }

    .chat-composer-wrap .media-hint {
      display: none !important;
    }

    .chat-composer-wrap .composer-actions {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 190px !important;
      gap: 8px !important;
      margin: 0 !important;
      align-items: stretch !important;
    }

    .chat-composer-wrap .result {
      order: 1 !important;
      height: 36px !important;
      min-height: 36px !important;
      padding: 8px 10px !important;
      font-size: 10px !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      white-space: nowrap !important;
      text-overflow: ellipsis !important;
    }

    .chat-composer-wrap .send-btn {
      order: 2 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 190px !important;
      height: 36px !important;
      min-height: 36px !important;
      padding: 8px 14px !important;
      font-size: 11px !important;
      border-radius: 13px !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 5 !important;
    }

    @media (max-width: 1500px) {
      .chat-composer-wrap { max-height: 230px !important; padding: 7px !important; }
      .chat-composer-wrap .composer-block { gap: 5px !important; padding: 7px !important; }
      .chat-composer-wrap textarea#body { height: 38px !important; min-height: 38px !important; max-height: 38px !important; }
      .chat-composer-wrap .composer-quick-replies .quick-btn { height: 26px !important; min-height: 26px !important; font-size: 9px !important; }
      .chat-composer-wrap #imageFile,
      .chat-composer-wrap #imageCaption,
      .chat-composer-wrap .send-image-btn { height: 30px !important; min-height: 30px !important; }
      .chat-composer-wrap .composer-actions { grid-template-columns: minmax(0, 1fr) 175px !important; }
      .chat-composer-wrap .send-btn { width: 175px !important; height: 34px !important; min-height: 34px !important; }
      .chat-composer-wrap .result { height: 34px !important; min-height: 34px !important; }
    }

  
    /* V22.8.1: real creator card fix + safe bigger chat logo */
    .sidebar-user {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 11px 12px !important;
      border-radius: 18px !important;
      background: rgba(255,255,255,.96) !important;
      border: 1px solid rgba(215,226,212,.95) !important;
      color: #0f172a !important;
      box-shadow: 0 10px 24px rgba(15,23,42,.07) !important;
      margin-top: 12px !important;
    }

    .sidebar-user-avatar {
      width: 42px !important;
      height: 42px !important;
      border-radius: 999px !important;
      display: grid !important;
      place-items: center !important;
      background: linear-gradient(135deg, rgba(120,184,62,.24), rgba(18,140,126,.14)) !important;
      border: 1px solid rgba(120,184,62,.22) !important;
      color: #16352b !important;
      font-weight: 950 !important;
      flex: 0 0 auto !important;
    }

    .sidebar-user-copy {
      min-width: 0 !important;
      flex: 1 !important;
    }

    .sidebar-user-name {
      font-size: 12px !important;
      font-weight: 950 !important;
      color: #16352b !important;
      line-height: 1.2 !important;
    }

    .sidebar-user-role {
      margin-top: 2px !important;
      font-size: 11px !important;
      color: #64748b !important;
      font-weight: 800 !important;
    }

    .sidebar-user-caret {
      color: #64748b !important;
      font-size: 13px !important;
      font-weight: 900 !important;
      flex: 0 0 auto !important;
    }

    .credit-tag {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }

    .chat-watermark {
      top: 46% !important;
      opacity: .68 !important;
      transform: translateY(-50%) scale(1.35) !important;
      z-index: -1 !important;
    }

    .chat-watermark img {
      width: min(1080px, 96%) !important;
      max-height: 480px !important;
      object-fit: contain !important;
      filter: saturate(1.08) contrast(1.02) !important;
      opacity: 1 !important;
    }

  
    /* V22.8.2: bigger chat logo width */
    .chat-watermark {
      left: 50% !important;
      top: 45% !important;
      width: 100% !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      opacity: .76 !important;
      transform: translate(-50%, -50%) scale(1.65) !important;
      z-index: -1 !important;
      pointer-events: none !important;
    }

    .chat-watermark img {
      width: min(1320px, 99%) !important;
      max-width: 99% !important;
      max-height: 590px !important;
      object-fit: contain !important;
      filter: saturate(1.08) contrast(1.02) !important;
      opacity: 1 !important;
    }

  
    /* V22.8.3: center chat logo fix */
    #chatBody,
    .chat-body {
      position: relative !important;
      overflow: auto !important;
      isolation: isolate !important;
    }

    #chatBody .chat-watermark,
    .chat-body .chat-watermark,
    .chat-watermark {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      top: 0 !important;
      left: 0 !important;
      transform: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: .58 !important;
      z-index: 0 !important;
      pointer-events: none !important;
    }

    #chatBody .chat-watermark img,
    .chat-body .chat-watermark img,
    .chat-watermark img {
      width: min(760px, 72%) !important;
      max-width: 72% !important;
      max-height: 330px !important;
      object-fit: contain !important;
      object-position: center center !important;
      opacity: 1 !important;
      filter: saturate(1.08) contrast(1.02) !important;
    }

    #chatBody .bubble-row,
    .chat-body .bubble-row,
    #chatBody .empty,
    .chat-body .empty {
      position: relative !important;
      z-index: 2 !important;
    }

  
    /* V22.8.5: fixed persistent chat logo background - CSS only.
       Reason: V22.8.4 used background-attachment: local, so the logo could scroll out
       when chatBody jumped to the latest message after selecting a conversation. */
    #chatBody,
    .chat-body {
      --iconic-chat-logo-v2285: url("/assets/iconic-chat-background-logo.png");
      position: relative !important;
      overflow-y: auto !important;
      isolation: isolate !important;
      background-image:
        linear-gradient(rgba(246, 252, 243, .46), rgba(241, 249, 238, .50)),
        var(--iconic-chat-logo-v2285),
        radial-gradient(circle at 18px 18px, rgba(120,184,62,.055) 1.4px, transparent 1.8px) !important;
      background-repeat: no-repeat, no-repeat, repeat !important;
      background-position: center center, center center, 0 0 !important;
      background-size: cover, min(900px, 84%) auto, 28px 28px !important;
      background-attachment: scroll, scroll, scroll !important;
    }

    #chatBody .chat-watermark,
    .chat-body .chat-watermark,
    .chat-watermark {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }

    #chatBody .bubble-row,
    .chat-body .bubble-row,
    #chatBody .bubble,
    .chat-body .bubble,
    #chatBody .empty,
    .chat-body .empty {
      position: relative !important;
      z-index: 2 !important;
    }


    /* V23 - Customer Profile Upgrade. UI-only: no Google Sheets, webhook, send message, or send image changes. */
    .customer-profile-card {
      align-items: flex-start !important;
      background: linear-gradient(135deg, #f7fff2, #ffffff) !important;
      border: 1px solid rgba(120,184,62,.22) !important;
    }

    .customer-profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 12px 0 16px;
    }

    .profile-item {
      padding: 10px 11px;
      border: 1px solid rgba(226,232,226,.92);
      border-radius: 16px;
      background: rgba(255,255,255,.86);
      box-shadow: 0 8px 16px rgba(15,23,42,.04);
      min-width: 0;
    }

    .profile-item-wide {
      grid-column: 1 / -1;
    }

    .profile-item span {
      display: block;
      margin-bottom: 5px;
      color: #64748b;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .profile-item strong {
      display: block;
      color: #10231d;
      font-size: 12px;
      font-weight: 900;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .profile-assignee-select {
      margin-top: 8px !important;
      min-height: 38px !important;
      padding: 8px 12px !important;
      border-radius: 13px !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      color: #16352b !important;
      background: linear-gradient(135deg, #ffffff, #f5fbf1) !important;
      border: 1px solid rgba(120,184,62,.32) !important;
      box-shadow: 0 8px 16px rgba(15,23,42,.045) !important;
      cursor: pointer !important;
    }

    .profile-assignee-select:disabled {
      color: #94a3b8 !important;
      background: #f8fafc !important;
      cursor: not-allowed !important;
    }


    /* V23.3 - Tags selector in visible Customer Profile. UI-only/localStorage; no backend changes. */
    .profile-tags-editor {
      padding-bottom: 9px !important;
    }

    .profile-tags-editor #customerProfileTags {
      margin-bottom: 7px !important;
      color: #295a30 !important;
      font-size: 11px !important;
    }

    .profile-tag-picker-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 5px !important;
      margin-top: 6px !important;
    }

    .profile-tag-picker-grid .tag-option {
      min-height: 27px !important;
      height: 27px !important;
      padding: 4px 7px !important;
      border-radius: 11px !important;
      font-size: 8.7px !important;
      letter-spacing: .045em !important;
      justify-content: flex-start !important;
    }

    .profile-tag-picker-grid .tag-option input {
      width: 11px !important;
      height: 11px !important;
      min-height: 11px !important;
      padding: 0 !important;
    }

    .profile-tag-display {
      margin-top: 6px !important;
      min-height: 18px !important;
    }

    .customer-profile-note {
      padding: 12px;
      margin: 10px 0 16px;
      border-radius: 18px;
      border: 1px solid rgba(226,232,226,.95);
      background: #ffffff;
      box-shadow: 0 8px 18px rgba(15,23,42,.045);
    }

    .profile-note-title {
      color: #0f2d23;
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 6px;
    }

    .profile-note-text {
      color: #64748b;
      font-size: 12px;
      line-height: 1.55;
    }

    @media (max-width: 1180px) {
      .customer-profile-grid { grid-template-columns: 1fr; }
    }



    /* V30.2 - Restore Reply From selector inside composer so staff can always see which branch number sends the reply. */
    .composer-reply-source {
      display: grid;
      grid-template-columns: 130px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      margin: 8px 0 10px;
      padding: 9px 10px;
      border: 1px solid rgba(120,184,62,.32);
      border-radius: 16px;
      background: rgba(255,255,255,.72);
    }

    .composer-reply-source label {
      margin: 0;
      font-size: 10px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #587069;
      font-weight: 900;
    }

    .composer-reply-source select {
      width: 100%;
      min-height: 34px;
      border: 1px solid rgba(120,184,62,.55);
      border-radius: 12px;
      padding: 7px 10px;
      background: #fff;
      color: #16352b;
      font-weight: 800;
      outline: none;
    }

    .about-iconic-card {
      padding: 13px;
      margin: 10px 0 2px;
      border-radius: 18px;
      border: 1px solid rgba(120,184,62,.22);
      background:
        linear-gradient(135deg, rgba(247,255,242,.98), rgba(255,255,255,.97)),
        radial-gradient(circle at 100% 0%, rgba(120,184,62,.10), transparent 28%);
      box-shadow: 0 10px 22px rgba(15,23,42,.045);
    }

    .about-iconic-title {
      color: #0f2d23;
      font-size: 12px;
      font-weight: 950;
      margin-bottom: 7px;
    }

    .about-iconic-text {
      color: #64748b;
      font-size: 11.5px;
      line-height: 1.55;
      margin-bottom: 10px;
    }

    .about-iconic-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .about-iconic-badges span {
      padding: 5px 8px;
      border-radius: 999px;
      background: #f2faee;
      color: #24511a;
      border: 1px solid rgba(120,184,62,.20);
      font-size: 10px;
      font-weight: 900;
      white-space: nowrap;
    }

    /* V23.1: sidebar logo + Created by avatar visual upgrade only */
    .sidebar-brand {
      align-items: center !important;
      gap: 15px !important;
      padding: 10px 8px 22px !important;
      min-height: 88px !important;
    }

    .sidebar-logo {
      width: 74px !important;
      height: 74px !important;
      border-radius: 20px !important;
      padding: 7px !important;
      background: rgba(255,255,255,.98) !important;
      border: 1px solid rgba(205,223,199,.95) !important;
      box-shadow: 0 12px 26px rgba(15,23,42,.10) !important;
      flex: 0 0 74px !important;
    }

    .sidebar-logo img {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      border-radius: 14px !important;
      display: block !important;
      filter: saturate(1.08) contrast(1.04) !important;
    }

    .sidebar-brand-title {
      font-size: 22px !important;
      letter-spacing: 4px !important;
      line-height: 1.05 !important;
      font-weight: 950 !important;
      color: #123326 !important;
    }

    .sidebar-brand-sub {
      font-size: 12px !important;
      letter-spacing: 5px !important;
      margin-top: 6px !important;
      color: #4f8f25 !important;
      font-weight: 950 !important;
    }

    .sidebar-user-avatar {
      width: 50px !important;
      height: 50px !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: #050505 !important;
      border: 2px solid rgba(120,184,62,.24) !important;
      box-shadow: 0 9px 20px rgba(15,23,42,.10) !important;
    }

    .sidebar-user-avatar img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
    }



    /* V26 - Customer Timeline / Activity View. UI-only: computed from loaded messages and local workflow state. */
    .customer-timeline-card {
      margin-top: 12px;
      padding: 14px;
      border: 1px solid rgba(226, 232, 226, .95);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,252,246,.94));
      box-shadow: 0 8px 18px rgba(15, 23, 42, .045);
    }

    .timeline-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .timeline-title {
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: #16352b;
    }

    .timeline-pill {
      font-size: 10px;
      font-weight: 900;
      color: #4f8f25;
      background: rgba(120,184,62,.12);
      border: 1px solid rgba(120,184,62,.22);
      border-radius: 999px;
      padding: 5px 8px;
      white-space: nowrap;
    }

    .timeline-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .timeline-metric {
      border: 1px solid rgba(226, 232, 226, .88);
      border-radius: 14px;
      background: rgba(255,255,255,.78);
      padding: 9px 10px;
      min-width: 0;
    }

    .timeline-metric span {
      display: block;
      font-size: 10px;
      color: var(--muted);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .03em;
      margin-bottom: 4px;
    }

    .timeline-metric strong {
      display: block;
      font-size: 12px;
      color: var(--ink);
      font-weight: 900;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .timeline-metric-wide {
      grid-column: 1 / -1;
    }

    /* V24 - Filters Upgrade: UI/local filtering only. */
    .filter-clear-btn {
      width: 100%;
      border: 1px solid rgba(120,184,62,.28);
      background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(242,250,238,.96));
      color: #2f6e18;
      border-radius: 15px;
      padding: 11px 13px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .02em;
      cursor: pointer;
      box-shadow: 0 6px 14px rgba(15,23,42,.04);
    }

    .filter-clear-btn:hover {
      border-color: rgba(120,184,62,.55);
      background: #eff9ea;
    }


    /* V30 - Persistence Polish / Stability Check. Google Sheets Conversation State remains the primary source for Status, Assigned, and Tags after refresh; localStorage remains a safe fallback. No send/image/webhook/auto-reply changes. */
    .customer-profile-note {
      margin-top: 12px !important;
      padding: 16px !important;
      border-radius: 18px !important;
      background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(245,252,240,.92)) !important;
      border: 1px solid rgba(120,184,62,.22) !important;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .06) !important;
    }

    .profile-note-title {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      color: #16352b !important;
      font-weight: 950 !important;
      letter-spacing: .02em !important;
    }

    .profile-note-title::after {
      content: "Live" !important;
      font-size: 10px !important;
      line-height: 1 !important;
      color: #2f7d18 !important;
      background: rgba(120,184,62,.14) !important;
      border: 1px solid rgba(120,184,62,.22) !important;
      border-radius: 999px !important;
      padding: 5px 8px !important;
      text-transform: uppercase !important;
      letter-spacing: .06em !important;
    }

    .profile-note-text {
      margin-top: 8px !important;
      color: #475569 !important;
      line-height: 1.55 !important;
      font-size: 12px !important;
    }

    .customer-timeline-card {
      border-color: rgba(120,184,62,.24) !important;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .055) !important;
    }


    /* V30.2.1 - Composer safety fix: reply-from selector stays visible while Send Image and Send WhatsApp Reply remain visible. UI-only; no send/image/webhook logic changes. */
    .chat-composer-wrap {
      max-height: 286px !important;
      overflow: visible !important;
      padding-bottom: 8px !important;
    }

    .chat-composer-wrap .composer-block {
      gap: 5px !important;
    }

    .chat-composer-wrap .composer-reply-source {
      display: grid !important;
      grid-template-columns: 82px minmax(0, 1fr) !important;
      gap: 7px !important;
      align-items: center !important;
      margin: 0 !important;
      padding: 5px 7px !important;
      border-radius: 12px !important;
      min-height: 30px !important;
    }

    .chat-composer-wrap .composer-reply-source label {
      font-size: 8.5px !important;
      line-height: 1 !important;
      margin: 0 !important;
      white-space: nowrap !important;
    }

    .chat-composer-wrap .composer-reply-source select {
      min-height: 28px !important;
      height: 28px !important;
      padding: 4px 8px !important;
      border-radius: 10px !important;
      font-size: 10px !important;
    }

    .chat-composer-wrap .composer-tools,
    .chat-composer-wrap .composer-actions {
      display: grid !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 9 !important;
    }

    .chat-composer-wrap .media-box {
      display: grid !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    .chat-composer-wrap .send-image-btn,
    .chat-composer-wrap .send-btn {
      display: inline-flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      position: relative !important;
      z-index: 10 !important;
    }

    @media (max-width: 1500px) {
      .chat-composer-wrap { max-height: 286px !important; overflow: visible !important; }
      .chat-composer-wrap .composer-reply-source { min-height: 28px !important; padding: 4px 7px !important; }
      .chat-composer-wrap .composer-reply-source select { height: 26px !important; min-height: 26px !important; }
    }

  

    /* V30.4 - Conversation List Theme Match
       Applies the clean reference-style conversation column only.
       No Google Sheets, send message, send image, webhook, auto-reply, opt-in, reminders, or Conversation State logic changed. */
    .page .app {
      grid-template-columns: minmax(300px, 355px) minmax(0, 1fr) minmax(330px, 390px) !important;
      gap: 14px !important;
    }

    .panel:first-child,
    .messages-panel {
      background: rgba(255,255,255,.98) !important;
      border: 1px solid rgba(220,230,220,.92) !important;
      border-radius: 18px !important;
      box-shadow: 0 10px 24px rgba(15,23,42,.055) !important;
      overflow: hidden !important;
    }

    .reference-conversation-filters {
      padding: 8px 10px 8px !important;
      gap: 6px !important;
      background: #ffffff !important;
      border-bottom: 1px solid rgba(226,232,226,.92) !important;
      display: grid !important;
    }

    .reference-search-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 38px !important;
      gap: 7px !important;
      align-items: center !important;
    }

    .reference-search-row input {
      height: 38px !important;
      min-height: 38px !important;
      border-radius: 12px !important;
      border: 1px solid rgba(218,226,218,.95) !important;
      background: #fff !important;
      box-shadow: none !important;
      padding: 0 13px !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      color: #334155 !important;
    }

    .reference-filter-icon {
      height: 38px !important;
      width: 38px !important;
      border-radius: 12px !important;
      border: 1px solid rgba(218,226,218,.95) !important;
      background: #fff !important;
      color: #475569 !important;
      font-size: 15px !important;
      font-weight: 850 !important;
      cursor: pointer !important;
    }

    .reference-pill-row {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 6px !important;
      align-items: center !important;
    }

    .reference-pill {
      width: 100% !important;
      height: 30px !important;
      min-height: 30px !important;
      padding: 0 8px !important;
      border-radius: 10px !important;
      border: 1px solid rgba(218,226,218,.95) !important;
      background: #fff !important;
      color: #334155 !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      letter-spacing: -.01em !important;
      box-shadow: none !important;
      cursor: pointer !important;
      white-space: nowrap !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .reference-pill.active {
      color: #ffffff !important;
      border-color: #2fa946 !important;
      background: linear-gradient(135deg, #25a941, #2fba4e) !important;
      box-shadow: 0 8px 16px rgba(37,169,65,.16) !important;
    }

    .reference-secondary-pills .reference-pill {
      height: 30px !important;
      min-height: 30px !important;
      padding: 0 8px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
    }

    .reference-branch-tabs {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      padding-top: 8px !important;
      margin-top: 4px !important;
      border-top: 1px solid rgba(226,232,226,.92) !important;
    }

    .reference-branch-tab {
      height: 38px !important;
      min-height: 38px !important;
      border-radius: 11px !important;
      border: 1px solid rgba(218,226,218,.98) !important;
      background: #fff !important;
      color: #2f3b35 !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      cursor: pointer !important;
    }

    .reference-branch-tab span {
      min-width: 24px !important;
      height: 22px !important;
      border-radius: 999px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: rgba(120,184,62,.18) !important;
      color: #2f8d2f !important;
      font-size: 11px !important;
      font-weight: 950 !important;
      padding: 0 8px !important;
    }

    .reference-branch-tab.active {
      border-color: rgba(47,169,70,.85) !important;
      background: #f3fbf0 !important;
      color: #168437 !important;
      box-shadow: inset 0 0 0 1px rgba(47,169,70,.18) !important;
    }

    .reference-hidden-filters {
      display: none !important;
    }

    #conversationList.reference-conversation-list,
    #conversationList.conversation-list {
      background: #fff !important;
      border-top: 0 !important;
      padding: 0 !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      scrollbar-gutter: stable !important;
    }

    #conversationList.reference-conversation-list::-webkit-scrollbar { width: 7px !important; }
    #conversationList.reference-conversation-list::-webkit-scrollbar-thumb {
      background: rgba(120,184,62,.34) !important;
      border-radius: 999px !important;
      border: 2px solid #fff !important;
    }

    #conversationList .conversation-card.reference-conversation-card {
      display: grid !important;
      grid-template-columns: 46px minmax(0, 1fr) !important;
      gap: 12px !important;
      min-height: 86px !important;
      margin: 0 !important;
      padding: 13px 12px !important;
      border-width: 0 0 1px 0 !important;
      border-style: solid !important;
      border-color: rgba(226,232,226,.95) !important;
      border-radius: 0 !important;
      background: #fff !important;
      box-shadow: none !important;
      transform: none !important;
      overflow: visible !important;
    }

    #conversationList .conversation-card.reference-conversation-card::before,
    #conversationList .conversation-card.reference-conversation-card::after {
      display: none !important;
      content: none !important;
    }

    #conversationList .conversation-card.reference-conversation-card:hover {
      background: #fbfef9 !important;
      transform: none !important;
      box-shadow: none !important;
    }

    #conversationList .conversation-card.reference-conversation-card.active {
      background: linear-gradient(135deg, #ecf9e8 0%, #f8fff5 100%) !important;
      border: 1px solid rgba(120,184,62,.45) !important;
      border-radius: 12px !important;
      margin: 8px 10px !important;
      box-shadow: 0 10px 20px rgba(120,184,62,.12) !important;
      min-height: 92px !important;
    }

    #conversationList .conversation-card.reference-conversation-card.unread .message-count-badge {
      background: #249a38 !important;
      color: #fff !important;
    }

    #conversationList .reference-avatar {
      width: 42px !important;
      height: 42px !important;
      align-self: start !important;
      border-radius: 999px !important;
      font-size: 13px !important;
      box-shadow: none !important;
      border: 0 !important;
      background: linear-gradient(135deg, #25c36a, #11a15a) !important;
    }

    #conversationList .reference-conversation-main {
      display: grid !important;
      gap: 5px !important;
      min-width: 0 !important;
    }

    #conversationList .reference-card-top {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 8px !important;
      align-items: start !important;
      padding: 0 !important;
    }

    #conversationList .reference-card-name {
      font-size: 13.5px !important;
      line-height: 1.15 !important;
      font-weight: 950 !important;
      color: #111827 !important;
      letter-spacing: -.018em !important;
    }

    #conversationList .reference-card-time {
      font-size: 11px !important;
      line-height: 1.15 !important;
      color: #64748b !important;
      font-weight: 800 !important;
      white-space: nowrap !important;
      padding: 0 !important;
    }

    #conversationList .reference-card-preview {
      font-size: 12px !important;
      line-height: 1.35 !important;
      color: #667085 !important;
      min-height: 30px !important;
      max-height: 32px !important;
      overflow: hidden !important;
      padding: 0 !important;
    }

    #conversationList .reference-card-footer {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 8px !important;
      margin-top: 0 !important;
    }

    #conversationList .reference-card-badges {
      display: flex !important;
      gap: 5px !important;
      align-items: center !important;
      flex-wrap: wrap !important;
      min-width: 0 !important;
    }

    #conversationList .branch,
    #conversationList .status,
    #conversationList .conversation-tag-chip,
    #conversationList .message-count-badge,
    #conversationList .unread-badge {
      height: 20px !important;
      min-height: 20px !important;
      padding: 0 8px !important;
      border-radius: 999px !important;
      font-size: 10px !important;
      line-height: 20px !important;
      font-weight: 950 !important;
      box-shadow: none !important;
    }

    #conversationList .conversation-tag-chip::before { font-size: 10px !important; }

    #conversationList .message-count-badge {
      min-width: 22px !important;
      background: #eef2ef !important;
      color: #54615a !important;
    }

    .reference-list-footer {
      height: 44px !important;
      padding: 0 14px !important;
      border-top: 1px solid rgba(226,232,226,.95) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      background: #fff !important;
      color: #64748b !important;
      font-size: 11.5px !important;
      font-weight: 750 !important;
    }

    .reference-list-footer button {
      width: 28px !important;
      height: 28px !important;
      border: 0 !important;
      border-radius: 999px !important;
      background: transparent !important;
      color: #64748b !important;
      cursor: pointer !important;
      font-size: 16px !important;
      line-height: 1 !important;
    }

    @media (max-width: 1180px) {
      .page .app { grid-template-columns: 1fr !important; }
      #conversationList .conversation-card.reference-conversation-card.active { margin: 6px 8px !important; }
    }


    /* V30.5.1: exact reference sidebar logo fix
       Use one horizontal Iconic logo only, no separate square logo + typed text.
       Created by card is intentionally preserved. */
    .sidebar-brand {
      display: block !important;
      padding: 18px 10px 24px !important;
      min-height: 118px !important;
      border-bottom: 1px solid rgba(215,226,212,.86) !important;
      background: transparent !important;
    }

    .sidebar-brand .sidebar-logo {
      width: 166px !important;
      height: 78px !important;
      border-radius: 0 !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 auto !important;
      flex: none !important;
      display: block !important;
    }

    .sidebar-brand .sidebar-logo img {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      border-radius: 0 !important;
      display: block !important;
      filter: none !important;
    }

    .sidebar-brand > div:not(.sidebar-logo) {
      display: none !important;
    }



    /* V30.6 - Right Panel Reference Match. Visual-only right column rebuild; keeps IDs used by assignment, tags, status, quick actions and persistence. */
    .right-reference-panel {
      padding: 0 !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      overflow: hidden !important;
    }

    .right-reference-scroll {
      height: 100%;
      max-height: calc(100vh - 132px);
      overflow-y: auto;
      padding: 0 2px 2px;
      scrollbar-width: thin;
      scrollbar-color: rgba(120,184,62,.42) transparent;
    }

    .right-reference-scroll::-webkit-scrollbar { width: 6px; }
    .right-reference-scroll::-webkit-scrollbar-thumb { background: rgba(120,184,62,.42); border-radius: 999px; }

    .reference-card,
    .right-reference-panel .about-iconic-card {
      margin: 0 0 10px !important;
      padding: 16px 16px !important;
      border-radius: 16px !important;
      background: rgba(255,255,255,.96) !important;
      border: 1px solid rgba(218,226,218,.98) !important;
      box-shadow: 0 7px 18px rgba(15,23,42,.045) !important;
    }

    .reference-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }

    .reference-card-head h3 {
      margin: 0;
      color: #13251e;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: -.02em;
    }

    .wa-mini-icon {
      width: 22px;
      height: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #16a34a;
      font-size: 14px;
    }

    .customer-details-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 2px 0 14px;
    }

    .reference-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 48px;
      color: #ffffff;
      font-size: 15px;
      font-weight: 900;
      background: linear-gradient(135deg, #123326, #25d366);
      box-shadow: 0 8px 18px rgba(15,23,42,.12);
    }

    .customer-details-nameblock { min-width: 0; }
    .customer-name {
      color: #17231d;
      font-size: 14px;
      font-weight: 900;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .customer-phone-small {
      margin-top: 3px;
      color: #64748b;
      font-size: 12px;
      font-weight: 750;
    }

    .reference-detail-list {
      display: grid;
      gap: 10px;
    }

    .reference-detail-row {
      display: grid;
      grid-template-columns: 112px minmax(0,1fr);
      gap: 10px;
      align-items: center;
    }

    .reference-detail-row span {
      color: #667085;
      font-size: 12px;
      font-weight: 750;
    }

    .reference-detail-row strong {
      color: #344054;
      font-size: 12px;
      font-weight: 800;
      text-align: left;
      overflow-wrap: anywhere;
    }

    .reference-status-pill {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 4px 9px;
      border-radius: 8px;
      color: #15803d;
      background: rgba(220,248,198,.75);
      font-size: 11px;
      font-weight: 900;
      width: max-content;
    }


    /* V31.5.8.18 - Booking notes draft lock, preserves V31.5.8.17 safe update flow. */
    .booking-request-card {
      border-color: rgba(120,184,62,.34) !important;
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,253,241,.96)) !important;
    }

    .booking-request-card.is-hidden {
      display: none !important;
    }

    .booking-status-pill {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 4px 9px;
      border-radius: 8px;
      color: #15803d;
      background: rgba(220,248,198,.78);
      font-size: 11px;
      font-weight: 900;
      width: max-content;
      white-space: nowrap;
    }

    .booking-status-pill.booking-status-approved {
      color: #166534;
      background: rgba(187,247,208,.88);
    }

    .booking-status-pill.booking-status-follow-up,
    .booking-status-pill.booking-status-suggest {
      color: #92400e;
      background: rgba(254,243,199,.92);
    }

    .booking-status-pill.booking-status-cancelled {
      color: #991b1b;
      background: rgba(254,226,226,.92);
    }

    .booking-note-input {
      width: 100%;
      min-height: 36px;
      margin-top: 10px;
      border: 1px solid rgba(203,213,225,.95);
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 750;
      color: #334155;
      background: #ffffff;
      outline: none;
    }

    .booking-note-input:focus {
      border-color: rgba(120,184,62,.85);
      box-shadow: 0 0 0 3px rgba(120,184,62,.12);
    }

    .booking-actions-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0,1fr));
      gap: 8px;
      margin-top: 10px;
    }

    .booking-action-btn {
      min-height: 34px;
      border: 1px solid rgba(203,213,225,.95);
      border-radius: 10px;
      background: #ffffff;
      color: #20352b;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
    }

    .booking-action-btn:hover {
      transform: translateY(-1px);
      border-color: rgba(120,184,62,.65);
      box-shadow: 0 8px 16px rgba(15,23,42,.07);
    }

    .booking-action-btn.approve {
      color: #166534;
      background: rgba(240,253,244,.98);
      border-color: rgba(34,197,94,.35);
    }

    .booking-action-btn.follow,
    .booking-action-btn.suggest {
      color: #92400e;
      background: rgba(255,251,235,.98);
      border-color: rgba(245,158,11,.34);
    }

    .booking-action-btn.cancel {
      color: #991b1b;
      background: rgba(254,242,242,.98);
      border-color: rgba(239,68,68,.28);
    }


    .booking-send-update-btn {
      width: 100%;
      margin-top: 8px;
      color: #ffffff;
      background: linear-gradient(135deg, #128c7e, #25d366);
      border-color: rgba(18,140,126,.35);
      box-shadow: 0 10px 18px rgba(18,140,126,.12);
    }

    .booking-send-update-btn:hover {
      border-color: rgba(18,140,126,.55);
      box-shadow: 0 12px 22px rgba(18,140,126,.17);
    }

    .booking-action-btn:disabled {      cursor: not-allowed;
      opacity: .62;
      transform: none;
      box-shadow: none;
    }

    .booking-result-text {
      min-height: 18px;
      margin-top: 8px;
      color: #64748b;
      font-size: 11px;
      font-weight: 750;
    }

    .reference-assignee-control { margin-top: -4px; }
    .right-reference-panel .profile-assignee-select {
      width: 100% !important;
      min-height: 34px !important;
      margin-top: 0 !important;
      border-radius: 10px !important;
      padding: 7px 10px !important;
      font-size: 12px !important;
      box-shadow: none !important;
      background: #ffffff !important;
    }

    .reference-current-tags {
      display: block;
      color: #14532d;
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 8px;
    }

    .reference-tags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-height: 2px;
      margin-bottom: 8px;
    }

    .reference-tag-picker {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0,1fr)) !important;
      gap: 8px !important;
    }

    .right-reference-panel .tag-option {
      min-height: 34px !important;
      height: 34px !important;
      padding: 7px 10px !important;
      border-radius: 11px !important;
      background: #ffffff !important;
      border: 1px solid rgba(218,226,218,.98) !important;
      color: #344054 !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      letter-spacing: .05em !important;
      text-transform: uppercase !important;
      justify-content: flex-start !important;
      box-shadow: none !important;
    }

    .right-reference-panel .tag-option input {
      width: 12px !important;
      height: 12px !important;
      min-height: 12px !important;
      margin-right: 7px !important;
      accent-color: #22c55e;
    }

    .is-hidden-compat { display: none !important; }

    .customer-summary-card .profile-note-text {
      font-size: 12px !important;
      line-height: 1.45 !important;
      color: #64748b !important;
    }

    .reference-about-card {
      background: linear-gradient(180deg, rgba(247,253,242,.98), rgba(231,248,222,.94)) !important;
      border-color: rgba(120,184,62,.28) !important;
      padding: 16px !important;
    }

    .reference-about-card .about-iconic-title {
      color: #13251e !important;
      font-size: 15px !important;
      font-weight: 900 !important;
      margin-bottom: 8px !important;
    }

    .reference-about-card .about-iconic-text {
      color: #64748b !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      margin: 0 0 8px !important;
    }

    .reference-contact-line {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #344054;
      font-size: 12px;
      margin-top: 10px;
    }

    .reference-contact-line span {
      width: 18px;
      color: #0f2d23;
      text-align: center;
    }

    .reference-contact-line strong {
      font-weight: 750;
    }

  

    /* V30.7 - Top Header Reference Match. Visual-only header polish. */
    .topbar.v18-topbar {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 18px !important;
      margin: 0 0 16px !important;
      padding: 10px 2px 12px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      min-height: 54px !important;
    }

    .topbar.v18-topbar .topbar-brand {
      display: flex !important;
      align-items: center !important;
      gap: 0 !important;
      min-width: 280px !important;
    }

    .topbar.v18-topbar .topbar-logo {
      display: none !important;
    }

    .topbar.v18-topbar .topbar-copy {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
      min-width: 0 !important;
    }

    .topbar.v18-topbar .topbar-title {
      font-size: 20px !important;
      line-height: 1.08 !important;
      font-weight: 900 !important;
      letter-spacing: -0.02em !important;
      color: #111827 !important;
      margin: 0 !important;
    }

    .topbar.v18-topbar .topbar-sub {
      font-size: 11px !important;
      line-height: 1.25 !important;
      font-weight: 500 !important;
      color: #667085 !important;
      margin: 0 !important;
    }

    .topbar.v18-topbar .topbar-sub::after {
      content: none !important;
      display: none !important;
    }

    .topbar-actions {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 14px !important;
      margin-left: auto !important;
      white-space: nowrap !important;
    }

    .topbar-system {
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-size: 11px !important;
      color: #667085 !important;
      font-weight: 600 !important;
      background: transparent !important;
      border: 0 !important;
      padding: 0 12px 0 0 !important;
      border-right: 1px solid rgba(15,23,42,.12) !important;
      box-shadow: none !important;
    }

    .system-dot {
      width: 8px !important;
      height: 8px !important;
      border-radius: 999px !important;
      background: #22c55e !important;
      box-shadow: 0 0 0 3px rgba(34,197,94,.12) !important;
      flex: 0 0 auto !important;
    }

    .topbar-quick,
    .topbar-notification {
      height: 40px !important;
      border-radius: 9px !important;
      border: 1px solid rgba(15,23,42,.14) !important;
      background: rgba(255,255,255,.96) !important;
      color: #111827 !important;
      box-shadow: none !important;
      font-size: 12px !important;
      font-weight: 800 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
    }

    .topbar-quick {
      padding: 0 16px !important;
      min-width: 124px !important;
    }

    .topbar-quick-wrap {
      position: relative !important;
      display: inline-flex !important;
      align-items: center !important;
    }

    .quick-replies-menu {
      position: absolute !important;
      top: calc(100% + 10px) !important;
      right: 0 !important;
      width: 255px !important;
      padding: 10px !important;
      border-radius: 16px !important;
      border: 1px solid rgba(15, 23, 42, .10) !important;
      background: rgba(255, 255, 255, .98) !important;
      box-shadow: 0 18px 44px rgba(15, 23, 42, .16) !important;
      z-index: 80 !important;
      display: none !important;
    }

    .topbar-quick-wrap.open .quick-replies-menu {
      display: block !important;
    }

    .quick-replies-menu::before {
      content: "" !important;
      position: absolute !important;
      top: -7px !important;
      right: 30px !important;
      width: 13px !important;
      height: 13px !important;
      transform: rotate(45deg) !important;
      background: rgba(255,255,255,.98) !important;
      border-left: 1px solid rgba(15, 23, 42, .10) !important;
      border-top: 1px solid rgba(15, 23, 42, .10) !important;
    }

    .quick-replies-menu-head {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      padding: 2px 4px 9px !important;
      border-bottom: 1px solid rgba(15, 23, 42, .08) !important;
      margin-bottom: 8px !important;
    }

    .quick-replies-menu-title {
      font-size: 12px !important;
      line-height: 1.2 !important;
      color: #111827 !important;
      font-weight: 900 !important;
    }

    .quick-replies-menu-note {
      font-size: 10px !important;
      line-height: 1.2 !important;
      color: #64748b !important;
      font-weight: 700 !important;
    }

    .quick-replies-list {
      display: grid !important;
      gap: 7px !important;
    }

    .quick-reply-item {
      width: 100% !important;
      min-height: 38px !important;
      padding: 8px 10px !important;
      border-radius: 12px !important;
      border: 1px solid rgba(120, 184, 62, .18) !important;
      background: linear-gradient(180deg, #ffffff 0%, #f8fcf5 100%) !important;
      color: #16352b !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
      cursor: pointer !important;
      text-align: left !important;
      font-size: 11px !important;
      font-weight: 900 !important;
      box-shadow: none !important;
    }

    .quick-reply-item:hover {
      border-color: rgba(120, 184, 62, .44) !important;
      background: #f2faee !important;
    }

    .quick-reply-item span:last-child {
      color: #6b7280 !important;
      font-size: 12px !important;
      font-weight: 900 !important;
    }

    .topbar-notification {
      position: relative !important;
      width: 42px !important;
      padding: 0 !important;
      font-size: 15px !important;
    }

    .notification-count {
      position: absolute !important;
      top: -7px !important;
      right: -6px !important;
      width: 17px !important;
      height: 17px !important;
      border-radius: 999px !important;
      background: #28a745 !important;
      color: #fff !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      display: grid !important;
      place-items: center !important;
      border: 2px solid #fff !important;
      line-height: 1 !important;
    }

    .topbar-profile-avatar {
      width: 42px !important;
      height: 42px !important;
      border-radius: 999px !important;
      background: #050505 !important;
      color: #d9f99d !important;
      border: 2px solid #ffffff !important;
      box-shadow: 0 6px 16px rgba(15,23,42,.16) !important;
      display: grid !important;
      place-items: center !important;
      font-size: 8px !important;
      font-weight: 900 !important;
      letter-spacing: .08em !important;
      overflow: hidden !important;
    }

    .topbar-pills,
    .topbar-pill {
      display: none !important;
    }

    @media (max-width: 980px) {
      .topbar.v18-topbar {
        align-items: flex-start !important;
        flex-direction: column !important;
        gap: 10px !important;
      }
      .topbar-actions {
        width: 100% !important;
        justify-content: flex-start !important;
        flex-wrap: wrap !important;
      }
      .topbar-system {
        border-right: 0 !important;
      }
    }


    /* V30.7.1 - Remove Stats Row / Reclaim Space.
       Visual-only layout change: removes the metric row and lets the inbox grid use that vertical space. */
    .stats {
      display: none !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

    .page {
      grid-template-rows: 54px minmax(0, 1fr) !important;
      gap: 10px !important;
      padding-top: 12px !important;
    }

    .topbar.v18-topbar,
    .topbar {
      margin-bottom: 0 !important;
      flex: 0 0 54px !important;
      height: 54px !important;
      min-height: 54px !important;
      max-height: 54px !important;
    }

    .page .app,
    .app {
      min-height: 0 !important;
      height: 100% !important;
      max-height: 100% !important;
    }

    @media (max-width: 1180px) {
      .page {
        grid-template-rows: auto minmax(0, 1fr) !important;
      }
    }



    /* V30.7.2 - Yellow Areas Reference Match.
       Visual-only: refines selected chat header, list footer, and reply-from footer. Core send/image/sheet/webhook logic untouched. */
    .chat-head {
      min-height: 64px !important;
      padding: 8px 12px !important;
      border-bottom: 1px solid rgba(226,232,226,.92) !important;
      background: rgba(255,255,255,.94) !important;
      gap: 10px !important;
    }

    .chat-customer {
      gap: 10px !important;
      align-items: center !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
    }

    .chat-head .avatar {
      width: 42px !important;
      height: 42px !important;
      min-width: 42px !important;
      font-size: 12px !important;
      box-shadow: 0 8px 18px rgba(15,23,42,.08) !important;
    }

    .chat-title {
      font-size: 14px !important;
      line-height: 1.15 !important;
      font-weight: 900 !important;
      letter-spacing: -.01em !important;
      color: #111827 !important;
      max-width: 250px !important;
    }

    .chat-meta {
      margin-top: 3px !important;
      gap: 5px !important;
      align-items: center !important;
      overflow: hidden !important;
      max-height: 24px !important;
    }

    .chat-meta .tag-chip,
    .chat-meta .conversation-tag-chip {
      font-size: 9.5px !important;
      padding: 3px 8px !important;
      line-height: 1.1 !important;
      border-radius: 999px !important;
    }

    .chat-actions {
      flex: 0 0 auto !important;
      gap: 7px !important;
      align-items: center !important;
      flex-wrap: nowrap !important;
    }

    .chat-actions .conversation-status-select {
      min-height: 34px !important;
      height: 34px !important;
      width: 92px !important;
      padding: 0 28px 0 12px !important;
      border-radius: 12px !important;
      font-size: 11px !important;
      font-weight: 900 !important;
      background-color: #ffffff !important;
    }

    .chat-actions .mini-btn {
      height: 34px !important;
      min-height: 34px !important;
      padding: 0 11px !important;
      border-radius: 12px !important;
      font-size: 11px !important;
      font-weight: 900 !important;
      box-shadow: none !important;
    }

    .chat-actions .more-btn {
      width: 34px !important;
      padding: 0 !important;
      font-size: 18px !important;
      line-height: 1 !important;
    }


    /* V31.5.8.19 - Move Conversation Tags into the header three-dot menu and clean the right panel. */
    .chat-tags-menu-wrap {
      position: relative !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .chat-tags-popover {
      position: absolute !important;
      top: calc(100% + 8px) !important;
      right: 0 !important;
      width: 340px !important;
      max-width: min(340px, 82vw) !important;
      padding: 14px !important;
      border: 1px solid rgba(190, 220, 180, .95) !important;
      border-radius: 18px !important;
      background: rgba(255, 255, 255, .98) !important;
      box-shadow: 0 18px 42px rgba(15, 23, 42, .16) !important;
      z-index: 80 !important;
    }

    .chat-tags-popover.is-hidden {
      display: none !important;
    }

    .chat-tags-popover-head {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 10px !important;
      margin-bottom: 10px !important;
    }

    .chat-tags-popover-head h3 {
      margin: 0 !important;
      color: #111827 !important;
      font-size: 14px !important;
      font-weight: 950 !important;
      line-height: 1.2 !important;
    }

    .chat-tags-popover .reference-current-tags {
      max-width: 145px !important;
      margin: 0 !important;
      color: #14532d !important;
      font-size: 10.5px !important;
      font-weight: 950 !important;
      text-align: right !important;
      line-height: 1.25 !important;
    }

    .chat-tags-popover .header-tags-row {
      margin-bottom: 10px !important;
    }

    .chat-tags-popover .header-tag-picker {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }

    .chat-tags-popover .tag-option {
      display: flex !important;
      align-items: center !important;
      gap: 7px !important;
      min-height: 34px !important;
      padding: 7px 10px !important;
      border-radius: 11px !important;
      border: 1px solid rgba(218,226,218,.98) !important;
      background: #ffffff !important;
      color: #344054 !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      letter-spacing: .045em !important;
      text-transform: uppercase !important;
      box-shadow: none !important;
      cursor: pointer !important;
      user-select: none !important;
    }

    .chat-tags-popover .tag-option input {
      width: 12px !important;
      height: 12px !important;
      margin: 0 !important;
      accent-color: #25d366 !important;
    }

    .reference-list-footer {
      height: 30px !important;
      min-height: 30px !important;
      padding: 0 12px !important;
      font-size: 11px !important;
      line-height: 1 !important;
      background: #ffffff !important;
      border-top: 1px solid rgba(226,232,226,.90) !important;
    }

    .reference-list-footer button {
      width: 24px !important;
      height: 24px !important;
      font-size: 14px !important;
    }

    .chat-composer-wrap {
      padding: 8px 10px 9px !important;
      background: rgba(255,255,255,.82) !important;
      border-top: 1px solid rgba(226,232,226,.92) !important;
    }

    .chat-composer-wrap .composer-block {
      display: flex !important;
      flex-direction: column !important;
      gap: 7px !important;
      padding: 10px 11px !important;
      border-radius: 18px !important;
      background: #ffffff !important;
      box-shadow: 0 8px 20px rgba(15,23,42,.06) !important;
    }

    .chat-composer-wrap .composer-title {
      min-height: 20px !important;
      margin-bottom: 0 !important;
      padding: 0 !important;
    }

    .chat-composer-wrap .composer-title strong {
      font-size: 12px !important;
      line-height: 1 !important;
    }

    .chat-composer-wrap .composer-title span {
      font-size: 10px !important;
      padding: 3px 7px !important;
      border-radius: 999px !important;
    }

    .chat-composer-wrap label {
      font-size: 9px !important;
      line-height: 1 !important;
      margin: 0 !important;
      color: #64748b !important;
      letter-spacing: .08em !important;
      text-transform: uppercase !important;
    }

    .chat-composer-wrap textarea#body {
      min-height: 48px !important;
      height: 48px !important;
      padding: 10px 12px !important;
      border-radius: 13px !important;
      font-size: 13px !important;
      resize: vertical !important;
    }

    .chat-composer-wrap .composer-mini-actions {
      gap: 6px !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }

    .chat-composer-wrap .composer-mini-actions .quick-btn {
      min-height: 28px !important;
      height: 28px !important;
      padding: 0 9px !important;
      border-radius: 12px !important;
      font-size: 11px !important;
      font-weight: 900 !important;
    }

    .chat-composer-wrap .media-box {
      display: grid !important;
      grid-template-columns: minmax(145px, .75fr) minmax(160px, 1fr) 132px !important;
      gap: 7px !important;
      align-items: center !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .chat-composer-wrap #imageFile,
    .chat-composer-wrap #imageCaption {
      min-height: 32px !important;
      height: 32px !important;
      padding: 6px 9px !important;
      border-radius: 12px !important;
      font-size: 11px !important;
    }

    .chat-composer-wrap .send-image-btn {
      min-height: 32px !important;
      height: 32px !important;
      padding: 0 10px !important;
      border-radius: 12px !important;
      font-size: 11px !important;
      box-shadow: none !important;
    }

    .chat-composer-wrap .media-hint {
      display: none !important;
    }

    .chat-composer-wrap .composer-actions {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 190px !important;
      gap: 8px !important;
      align-items: center !important;
      order: 20 !important;
    }

    .chat-composer-wrap .composer-actions .result {
      min-height: 30px !important;
      height: 30px !important;
      display: flex !important;
      align-items: center !important;
      padding: 0 10px !important;
      font-size: 11px !important;
      border-radius: 12px !important;
      margin: 0 !important;
    }

    .chat-composer-wrap .send-btn {
      min-height: 34px !important;
      height: 34px !important;
      margin: 0 !important;
      padding: 0 14px !important;
      border-radius: 13px !important;
      font-size: 12px !important;
      box-shadow: 0 8px 18px rgba(37,211,102,.20) !important;
    }

    .chat-composer-wrap .composer-reply-source {
      order: 30 !important;
      display: grid !important;
      grid-template-columns: auto minmax(0, 1fr) !important;
      gap: 8px !important;
      align-items: center !important;
      min-height: 24px !important;
      padding: 0 2px !important;
      margin: 0 !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .chat-composer-wrap .composer-reply-source label {
      font-size: 10px !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
      color: #64748b !important;
      font-weight: 800 !important;
    }

    .chat-composer-wrap .composer-reply-source label::before {
      content: "Responding as: ";
    }

    .chat-composer-wrap .composer-reply-source label {
      font-size: 0 !important;
    }

    .chat-composer-wrap .composer-reply-source label::before {
      font-size: 10.5px !important;
    }

    .chat-composer-wrap .composer-reply-source select {
      height: 24px !important;
      min-height: 24px !important;
      border: 0 !important;
      background: transparent !important;
      color: #1f2937 !important;
      font-size: 10.5px !important;
      font-weight: 850 !important;
      padding: 0 22px 0 0 !important;
      box-shadow: none !important;
    }

    @media (max-width: 1180px) {
      .chat-composer-wrap .media-box {
        grid-template-columns: 1fr !important;
      }
      .chat-composer-wrap .composer-actions {
        grid-template-columns: 1fr !important;
      }
    }


    /* V30.7.3 - Composer Reference Match
       Rebuilds the reply composer to match the reference layout exactly.
       UI-only: no send message, send image, Reply from logic, Google Sheets, Conversation State, webhook, auto-reply, opt-in, or reminders changes. */
    .reply-panel::after {
      content: "V30.7.3" !important;
    }

    .chat-composer-wrap {
      padding: 0 10px 10px !important;
      background: transparent !important;
      border-top: 0 !important;
      box-shadow: none !important;
      max-height: none !important;
      overflow: visible !important;
    }

    .chat-composer-wrap .composer-block {
      position: relative !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 0 !important;
      padding: 0 !important;
      border: 1px solid rgba(226,232,226,.95) !important;
      border-radius: 16px !important;
      background: #ffffff !important;
      box-shadow: 0 8px 18px rgba(15,23,42,.055) !important;
      overflow: hidden !important;
    }

    .chat-composer-wrap .composer-title {
      display: none !important;
    }

    .composer-tabs {
      display: flex !important;
      align-items: center !important;
      gap: 18px !important;
      height: 39px !important;
      padding: 0 14px !important;
      border-bottom: 1px solid rgba(226,232,226,.78) !important;
      background: #ffffff !important;
    }

    .composer-tab {
      height: 39px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: #64748b !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      cursor: default !important;
      position: relative !important;
      box-shadow: none !important;
    }

    .composer-tab.active {
      color: #15803d !important;
    }

    .composer-tab.active::after {
      content: "" !important;
      position: absolute !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      height: 2px !important;
      border-radius: 999px !important;
      background: #22c55e !important;
    }

    .composer-pane {
      display: block !important;
    }

    .composer-pane.is-hidden {
      display: none !important;
    }

    .composer-note-wrap {
      padding: 12px 14px 14px !important;
      background: #ffffff !important;
    }

    .composer-note-wrap textarea {
      width: 100% !important;
      min-height: 118px !important;
      resize: vertical !important;
      border: 1px solid rgba(226,232,226,.95) !important;
      border-radius: 12px !important;
      padding: 12px 13px !important;
      color: #10231d !important;
      background: #ffffff !important;
      font-family: Arial, sans-serif !important;
      font-size: 12px !important;
      font-weight: 650 !important;
      line-height: 1.5 !important;
      outline: none !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.8) !important;
    }

    .composer-note-wrap textarea:focus {
      border-color: rgba(120,184,62,.46) !important;
      box-shadow: 0 0 0 3px rgba(120,184,62,.12) !important;
    }

    .composer-note-wrap textarea:disabled {
      color: #94a3b8 !important;
      background: #f8fafc !important;
      cursor: not-allowed !important;
    }

    .chat-composer-wrap .composer-message-label,
    .chat-composer-wrap label.composer-message-label {
      display: none !important;
    }

    .chat-composer-wrap textarea#body {
      width: calc(100% - 28px) !important;
      height: 74px !important;
      min-height: 74px !important;
      max-height: 74px !important;
      margin: 12px 14px 8px !important;
      padding: 12px 13px !important;
      resize: none !important;
      border: 1px solid rgba(226,232,226,.92) !important;
      border-radius: 10px !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      box-shadow: none !important;
      outline: none !important;
    }

    .chat-composer-wrap textarea#body:focus {
      border-color: rgba(34,197,94,.55) !important;
      box-shadow: 0 0 0 3px rgba(34,197,94,.08) !important;
    }

    .composer-bottom-row {
      display: grid !important;
      grid-template-columns: auto minmax(0, 1fr) auto !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 0 14px 9px !important;
      background: #ffffff !important;
    }

    .composer-icon-tools {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      min-width: 92px !important;
    }

    .composer-icon-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 21px !important;
      height: 21px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 6px !important;
      background: transparent !important;
      color: #64748b !important;
      font-size: 15px !important;
      line-height: 1 !important;
      cursor: pointer !important;
      box-shadow: none !important;
    }

    .composer-image-picker {
      font-size: 14px !important;
    }

    .chat-composer-wrap .composer-tools {
      margin: 0 !important;
      justify-self: end !important;
    }

    .chat-composer-wrap .media-box {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .chat-composer-wrap .media-box::before,
    .chat-composer-wrap .media-hint {
      display: none !important;
    }

    .chat-composer-wrap #imageFile {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      min-height: 1px !important;
      opacity: 0 !important;
      pointer-events: none !important;
      overflow: hidden !important;
    }

    .chat-composer-wrap #imageCaption {
      width: 190px !important;
      height: 32px !important;
      min-height: 32px !important;
      padding: 7px 10px !important;
      border: 1px solid rgba(226,232,226,.95) !important;
      border-radius: 9px !important;
      background: #ffffff !important;
      color: #475569 !important;
      font-size: 11px !important;
      box-shadow: none !important;
    }

    .chat-composer-wrap .send-image-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 118px !important;
      height: 34px !important;
      min-height: 34px !important;
      padding: 0 12px !important;
      border: 1px solid rgba(226,232,226,.95) !important;
      border-radius: 9px !important;
      background: #ffffff !important;
      color: #15803d !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      box-shadow: none !important;
      white-space: nowrap !important;
    }

    .chat-composer-wrap .composer-actions {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 0 !important;
      margin: 0 !important;
      position: relative !important;
      z-index: 10 !important;
    }

    .chat-composer-wrap .send-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 38px !important;
      min-width: 38px !important;
      max-width: 38px !important;
      height: 38px !important;
      min-height: 38px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 10px !important;
      background: #16a34a !important;
      color: #ffffff !important;
      font-size: 17px !important;
      font-weight: 900 !important;
      box-shadow: 0 8px 15px rgba(22,163,74,.18) !important;
      line-height: 1 !important;
      overflow: hidden !important;
      text-indent: 0 !important;
    }

    .chat-composer-wrap .result {
      display: none !important;
    }

    .chat-composer-wrap .composer-reply-source {
      order: 10 !important;
      display: flex !important;
      align-items: center !important;
      gap: 5px !important;
      width: 100% !important;
      min-height: 24px !important;
      margin: 0 !important;
      padding: 0 14px 10px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      box-shadow: none !important;
    }

    .chat-composer-wrap .composer-reply-source label {
      margin: 0 !important;
      color: #64748b !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      letter-spacing: 0 !important;
      text-transform: none !important;
      white-space: nowrap !important;
    }

    .chat-composer-wrap .composer-reply-source select {
      width: auto !important;
      max-width: 260px !important;
      height: 24px !important;
      min-height: 24px !important;
      padding: 0 18px 0 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: #334155 !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      box-shadow: none !important;
      outline: none !important;
    }

    .chat-composer-wrap .composer-mini-actions,
    .chat-composer-wrap .composer-quick-replies {
      display: none !important;
    }

    @media (max-width: 1500px) {
      .chat-composer-wrap textarea#body {
        height: 66px !important;
        min-height: 66px !important;
        max-height: 66px !important;
      }

      .chat-composer-wrap #imageCaption {
        width: 160px !important;
      }

      .chat-composer-wrap .send-image-btn {
        width: 112px !important;
      }
    }


    /* V30.8.2 - Clean Layout Fix from V30.7.4
       Scope only:
       - messages-panel
       - conversationList
       - reference-list-footer
       - chat-head

       Do not touch:
       Google Sheets, Conversation State, Send message, Send image,
       Reply From, Webhook, Auto-reply, opt-in/out, reminders, bot pause.
    */

    @media (min-width: 1181px) {
      html,
      body {
        height: 100% !important;
        overflow: hidden !important;
      }

      .workspace-shell {
        height: 100vh !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      .page {
        height: 100vh !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      .page .app,
      .app {
        height: min(820px, calc(100vh - 132px)) !important;
        min-height: 0 !important;
        max-height: calc(100vh - 132px) !important;
        overflow: hidden !important;
        align-self: start !important;
      }

      .messages-panel,
      .chat-panel,
      .reply-panel {
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        overflow: hidden !important;
      }

      /* Closed conversations panel */
      .messages-panel {
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) 46px !important;
        border-radius: 24px !important;
        background: #ffffff !important;
        border: 1px solid rgba(226, 232, 226, .95) !important;
        box-shadow: 0 18px 42px rgba(15, 23, 42, .06) !important;
      }

      .messages-panel .filters {
        grid-row: 1 !important;
        min-height: 0 !important;
        flex: 0 0 auto !important;
        border-radius: 24px 24px 0 0 !important;
        border-bottom: 1px solid rgba(226, 232, 226, .82) !important;
        background: rgba(255, 255, 255, .96) !important;
        z-index: 3 !important;
      }

      #conversationList.conversation-list,
      .messages-panel > .conversation-list {
        grid-row: 2 !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        display: block !important;
        padding: 10px 10px 14px !important;
        background:
          linear-gradient(180deg, rgba(250, 253, 248, .96), rgba(246, 250, 244, .96)) !important;
        border-top: 0 !important;
        border-bottom: 0 !important;
        overscroll-behavior: contain !important;
        scrollbar-gutter: stable both-edges !important;
      }

      #conversationList .conversation-card,
      #conversationList .conversation-item,
      #conversationList .reference-conversation-card {
        margin-bottom: 9px !important;
      }

      #conversationList .conversation-card:last-child,
      #conversationList .conversation-item:last-child,
      #conversationList .reference-conversation-card:last-child {
        margin-bottom: 4px !important;
      }

      .reference-list-footer {
        grid-row: 3 !important;
        height: 46px !important;
        min-height: 46px !important;
        max-height: 46px !important;
        flex: 0 0 46px !important;
        padding: 0 14px !important;
        border-top: 1px solid rgba(226, 232, 226, .95) !important;
        border-radius: 0 0 24px 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        background: #ffffff !important;
        color: #64748b !important;
        font-size: 11.5px !important;
        font-weight: 750 !important;
        line-height: 1 !important;
        z-index: 4 !important;
      }

      .reference-list-footer button,
      #refreshListBtn {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        min-height: 30px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: #f6faf3 !important;
        color: #64748b !important;
        cursor: pointer !important;
        font-size: 16px !important;
        line-height: 1 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .reference-list-footer button:hover,
      #refreshListBtn:hover {
        background: #eef7e8 !important;
        color: #14532d !important;
      }

      /* Balanced chat panel */
      .chat-panel {
        display: grid !important;
        grid-template-rows: 106px minmax(0, 1fr) auto !important;
        border-radius: 24px !important;
      }

      .chat-head {
        height: 106px !important;
        min-height: 106px !important;
        max-height: 106px !important;
        padding: 14px 16px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
        overflow: hidden !important;
        border-radius: 24px 24px 0 0 !important;
        background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(250,253,248,.94)) !important;
        border-bottom: 1px solid rgba(226, 232, 226, .88) !important;
        box-shadow: 0 10px 24px rgba(15, 23, 42, .035) !important;
      }

      .chat-customer {
        display: flex !important;
        align-items: flex-start !important;
        gap: 12px !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
        padding-top: 4px !important;
      }

      .chat-head .avatar,
      .chat-head .chat-avatar,
      .chat-head .conversation-avatar {
        width: 46px !important;
        height: 46px !important;
        min-width: 46px !important;
        min-height: 46px !important;
        font-size: 12px !important;
        border-radius: 999px !important;
      }

      .chat-title {
        font-size: 17px !important;
        line-height: 1.12 !important;
        font-weight: 900 !important;
        letter-spacing: -.018em !important;
        color: #0f172a !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        max-width: 100% !important;
      }

      .chat-meta {
        margin-top: 8px !important;
        display: flex !important;
        align-items: center !important;
        align-content: flex-start !important;
        gap: 6px !important;
        flex-wrap: wrap !important;
        min-width: 0 !important;
        max-height: 48px !important;
        overflow: hidden !important;
      }

      .chat-meta .branch,
      .chat-meta .status,
      .chat-meta .sender-badge,
      .chat-meta span {
        height: 21px !important;
        min-height: 21px !important;
        padding: 0 9px !important;
        border-radius: 999px !important;
        font-size: 10.5px !important;
        line-height: 21px !important;
        font-weight: 850 !important;
        white-space: nowrap !important;
      }

      .chat-actions {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 8px !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
        align-self: center !important;
      }

      .conversation-status-select {
        height: 32px !important;
        min-height: 32px !important;
        max-height: 32px !important;
        max-width: 150px !important;
        padding: 0 10px !important;
        border-radius: 999px !important;
        font-size: 11px !important;
        line-height: 1 !important;
      }

      .chat-actions .mini-btn,
      .chat-head .mini-btn {
        height: 32px !important;
        min-height: 32px !important;
        max-height: 32px !important;
        padding: 0 11px !important;
        border-radius: 999px !important;
        font-size: 10.5px !important;
        line-height: 1 !important;
        white-space: nowrap !important;
      }

      .chat-body {
        min-height: 0 !important;
        height: 100% !important;
        max-height: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }
    }

    @media (max-width: 1180px) {
      html,
      body {
        height: auto !important;
        overflow: auto !important;
      }

      .workspace-shell,
      .page,
      .app {
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }

      .messages-panel {
        height: 620px !important;
        min-height: 620px !important;
        overflow: hidden !important;
      }

      .chat-panel {
        height: 720px !important;
        min-height: 720px !important;
        overflow: hidden !important;
      }

      .chat-head {
        height: auto !important;
        min-height: 106px !important;
        max-height: none !important;
        flex-wrap: wrap !important;
      }

      .chat-actions {
        width: 100% !important;
        justify-content: flex-start !important;
        flex-wrap: wrap !important;
      }
    }

  

    /* V30.8.4 - Show selected conversation tags in chat header only.
       UI-only: moves VIP/tags before workflow/assigned so they cannot be hidden by long assignee text. */
    .topbar-sub::after {
      content: "V31.2" !important;
    }

    @media (min-width: 1181px) {
      .chat-meta {
        max-height: 58px !important;
        gap: 6px !important;
        overflow: hidden !important;
      }

      .chat-meta > .tag-chip,
      .chat-meta > .conversation-tag-chip {
        order: 3 !important;
        height: 21px !important;
        min-height: 21px !important;
        line-height: 21px !important;
        padding: 0 9px !important;
        font-size: 10.5px !important;
        max-width: 118px !important;
        flex: 0 0 auto !important;
      }

      .chat-meta > .branch {
        order: 1 !important;
      }

      .chat-meta > .status {
        order: 2 !important;
      }

      .chat-meta > .workflow-status-bar {
        order: 4 !important;
        flex: 1 1 100% !important;
        width: 100% !important;
        margin-top: 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        flex-wrap: nowrap !important;
        overflow: hidden !important;
      }

      .chat-meta .workflow-status-chip,
      .chat-meta .assignee-chip {
        height: 21px !important;
        min-height: 21px !important;
        line-height: 21px !important;
        padding: 0 9px !important;
        font-size: 10.5px !important;
      }

      .chat-meta .assignee-chip {
        max-width: 220px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
    }


    /* V31.2 - Privacy CRM Profile without duplicate Quick Actions. UI/local notes only; no WhatsApp, webhook, send, image, reminders, or Google Sheets structure changes. */
    .customer-details-card .reference-card-head h3::after {
      content: "CRM";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 7px;
      padding: 3px 7px;
      border-radius: 999px;
      background: #f5f3ff;
      color: #6d28d9;
      border: 1px solid rgba(124,58,237,.18);
      font-size: 9px;
      font-weight: 950;
      letter-spacing: .08em;
      vertical-align: middle;
    }

    .crm-privacy-strip {
      margin: 10px 0 12px;
      padding: 9px 10px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: linear-gradient(135deg, #f5f3ff, #ffffff);
      border: 1px solid rgba(124,58,237,.17);
      color: #4c1d95;
      font-size: 10.5px;
      font-weight: 850;
      line-height: 1.35;
    }

    .crm-privacy-strip strong {
      color: #32106d;
      font-size: 10.8px;
      font-weight: 950;
      white-space: nowrap;
    }

    .crm-code-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 22px;
      padding: 4px 8px;
      border-radius: 999px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid rgba(16,185,129,.18);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: .04em;
    }

        .internal-note-hint {
      margin-top: 7px;
      color: #64748b;
      font-size: 10.2px;
      font-weight: 750;
      line-height: 1.4;
    }

    /* V30.10 - Inline Image Messages. Visual rendering for staff-sent and customer-sent images. */
    .inline-image-message {
      display: block !important;
      max-width: 310px !important;
    }

    .inline-image-link {
      display: block !important;
      text-decoration: none !important;
      border-radius: 16px !important;
      overflow: hidden !important;
      background: rgba(255,255,255,.55) !important;
      border: 1px solid rgba(148, 163, 184, .28) !important;
      box-shadow: 0 10px 22px rgba(15, 23, 42, .08) !important;
    }

    .inline-image-message img {
      display: block !important;
      width: 100% !important;
      max-width: 310px !important;
      max-height: 360px !important;
      object-fit: cover !important;
      border-radius: 15px !important;
    }

    .inline-image-caption {
      margin-top: 8px !important;
      color: #0f172a !important;
      font-size: 12.5px !important;
      font-weight: 650 !important;
      line-height: 1.45 !important;
      white-space: pre-wrap !important;
    }

    .reference-version-badge::after {
      content: "V31.2" !important;
    }


    /* V31.5.7 - Hard disable left sidebar scroll only.
       Scope: main navigation/sidebar only.
       Do not touch messages-panel, conversationList, chat, WhatsApp, Google Sheets, or auto replies. */
    .main-sidebar,
    .main-sidebar:hover,
    .workspace-shell > .main-sidebar,
    .workspace-shell > .main-sidebar:hover {
      overflow: hidden !important;
      overflow-y: hidden !important;
      overflow-x: hidden !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }

    .main-sidebar::-webkit-scrollbar,
    .main-sidebar:hover::-webkit-scrollbar,
    .workspace-shell > .main-sidebar::-webkit-scrollbar,
    .workspace-shell > .main-sidebar:hover::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    /* V31.5.8.4 - Left panel footer reserved row only.
       Fixes the bottom footer finish under the conversation cards.
       Scope only: actual left conversation panel (.page .app > .panel:first-child),
       conversation list area, and reference-list-footer.
       Do not touch WhatsApp, Google Sheets, Webhook, send image/text, reminders, bot pause, or chat layout. */
    @media (min-width: 1181px) {
      .page .app > .panel:first-child {
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) 42px !important;
        min-height: 0 !important;
        height: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
      }

      .page .app > .panel:first-child > .reference-conversation-filters {
        grid-row: 1 !important;
        min-height: 0 !important;
      }

      .page .app > .panel:first-child > #conversationList.reference-conversation-list {
        grid-row: 2 !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        margin: 0 !important;
        padding-bottom: 10px !important;
        border-bottom: 0 !important;
      }

      .page .app > .panel:first-child > .reference-list-footer {
        grid-row: 3 !important;
        height: 42px !important;
        min-height: 42px !important;
        max-height: 42px !important;
        flex: 0 0 42px !important;
        margin: 0 !important;
        padding: 0 14px !important;
        border-top: 1px solid rgba(226, 232, 226, .95) !important;
        border-radius: 0 0 18px 18px !important;
        background: linear-gradient(180deg, #ffffff 0%, #fbfdf9 100%) !important;
        color: #64748b !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        overflow: hidden !important;
        font-size: 11.5px !important;
        font-weight: 750 !important;
        line-height: 1 !important;
        z-index: 5 !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.96) !important;
      }

      .page .app > .panel:first-child > .reference-list-footer #conversationFooterText {
        display: inline-flex !important;
        align-items: center !important;
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .page .app > .panel:first-child > .reference-list-footer #refreshListBtn {
        width: 28px !important;
        height: 28px !important;
        min-width: 28px !important;
        min-height: 28px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
    }


    /* V31.5.8.6 - Sidebar responsive lock only.
       Goal: keep the Iconic logo and Created by card visible when browser zoom/height changes.
       Scope only: main sidebar, sidebar brand/logo, sidebar nav, branches card, and sidebar user card.
       Do not touch messages panel, conversation list, footer reserved row, chat, WhatsApp, Google Sheets, webhook, reminders, or media logic. */
    @media (min-width: 1181px) {
      .workspace-shell > .main-sidebar {
        height: 100vh !important;
        max-height: 100vh !important;
        min-height: 0 !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) auto auto !important;
        align-content: stretch !important;
        gap: clamp(7px, 1.15vh, 12px) !important;
        overflow: hidden !important;
        overflow-y: hidden !important;
        overflow-x: hidden !important;
        padding: clamp(8px, 1.2vh, 14px) 12px !important;
      }

      .workspace-shell > .main-sidebar:hover {
        overflow: hidden !important;
        overflow-y: hidden !important;
        overflow-x: hidden !important;
      }

      .workspace-shell > .main-sidebar .sidebar-brand {
        grid-row: 1 !important;
        flex: 0 0 auto !important;
        min-height: clamp(88px, 13.2vh, 118px) !important;
        padding: clamp(10px, 1.7vh, 18px) 10px clamp(12px, 2vh, 24px) !important;
        margin: 0 !important;
      }

      .workspace-shell > .main-sidebar .sidebar-brand .sidebar-logo {
        width: clamp(138px, 10.8vw, 166px) !important;
        height: clamp(58px, 8.4vh, 78px) !important;
        max-width: 100% !important;
        margin: 0 auto !important;
      }

      .workspace-shell > .main-sidebar .sidebar-nav {
        grid-row: 2 !important;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        overscroll-behavior: contain !important;
        align-content: start !important;
        gap: clamp(3px, .75vh, 6px) !important;
        padding-right: 2px !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      .workspace-shell > .main-sidebar .sidebar-nav::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }

      .workspace-shell > .main-sidebar .sidebar-item {
        min-height: clamp(32px, 4.35vh, 40px) !important;
        padding: clamp(7px, .95vh, 10px) 11px !important;
        flex: 0 0 auto !important;
      }

      .workspace-shell > .main-sidebar .sidebar-branches {
        grid-row: 3 !important;
        margin-top: 0 !important;
        flex: 0 0 auto !important;
        min-height: 0 !important;
        padding: clamp(8px, 1.15vh, 12px) !important;
        overflow: hidden !important;
      }

      .workspace-shell > .main-sidebar .branch-row {
        padding: clamp(5px, .85vh, 9px) 2px !important;
      }

      .workspace-shell > .main-sidebar .sidebar-user {
        grid-row: 4 !important;
        flex: 0 0 auto !important;
        min-height: 0 !important;
        padding: clamp(8px, 1.05vh, 11px) !important;
        overflow: hidden !important;
      }

      .workspace-shell > .main-sidebar .sidebar-user-avatar {
        width: clamp(32px, 4.6vh, 38px) !important;
        height: clamp(32px, 4.6vh, 38px) !important;
        min-width: clamp(32px, 4.6vh, 38px) !important;
      }
    }

    @media (min-width: 1181px) and (max-height: 720px) {
      .workspace-shell > .main-sidebar {
        gap: 7px !important;
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }

      .workspace-shell > .main-sidebar .sidebar-brand {
        min-height: 82px !important;
        padding-top: 8px !important;
        padding-bottom: 9px !important;
      }

      .workspace-shell > .main-sidebar .sidebar-brand .sidebar-logo {
        width: 132px !important;
        height: 56px !important;
      }

      .workspace-shell > .main-sidebar .sidebar-section-title {
        margin-bottom: 5px !important;
      }

      .workspace-shell > .main-sidebar .sidebar-user-name {
        font-size: 12px !important;
      }

      .workspace-shell > .main-sidebar .sidebar-user-role {
        font-size: 10px !important;
        margin-top: 1px !important;
      }
    }



    /* V31.5.8.20 - Hide Conversation Tags UI, keep internal tags/filter logic active. */
    .chat-tags-menu-wrap,
    .chat-tags-popover,
    .right-reference-panel .reference-tag-picker,
    .right-reference-panel .reference-tags-row,
    .tags-team-card,
    .tags-card,
    .profile-tags-editor {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }


    /* V31.5.8.21 - Clean right panel, remove Customer Summary/About cards, and keep the right panel without internal scroll. */
    .right-reference-panel {
      overflow: visible !important;
    }

    .right-reference-scroll {
      height: 100% !important;
      max-height: none !important;
      overflow-y: visible !important;
      padding: 0 2px 0 !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      grid-template-rows: auto auto !important;
      align-content: start !important;
      gap: 10px !important;
      scrollbar-width: none !important;
    }

    .right-reference-scroll::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    .customer-summary-card,
    .reference-about-card {
      display: none !important;
    }

    .right-reference-panel .customer-details-card,
    .right-reference-panel .booking-request-card {
      margin: 0 !important;
    }

    .right-reference-panel .reference-card {
      padding: 13px 14px !important;
      border-radius: 16px !important;
      box-shadow: 0 7px 18px rgba(15,23,42,.045) !important;
    }

    .right-reference-panel .reference-card-head {
      margin-bottom: 8px !important;
    }

    .right-reference-panel .reference-card-head h3 {
      font-size: 15px !important;
      line-height: 1.15 !important;
    }

    .right-reference-panel .customer-details-top {
      gap: 10px !important;
      margin: 0 0 10px !important;
    }

    .right-reference-panel .reference-avatar {
      width: 42px !important;
      height: 42px !important;
      flex: 0 0 42px !important;
      font-size: 13px !important;
    }

    .right-reference-panel .customer-name {
      font-size: 13px !important;
      line-height: 1.15 !important;
    }

    .right-reference-panel .customer-phone-small {
      font-size: 11px !important;
      margin-top: 2px !important;
    }

    .right-reference-panel .crm-privacy-strip {
      margin: 8px 0 9px !important;
      padding: 7px 9px !important;
      border-radius: 12px !important;
      font-size: 10px !important;
    }

    .right-reference-panel .crm-privacy-strip strong {
      font-size: 10px !important;
    }

    .right-reference-panel .reference-detail-list {
      gap: 7px !important;
    }

    .right-reference-panel .reference-detail-row {
      grid-template-columns: 104px minmax(0,1fr) !important;
      gap: 8px !important;
      min-height: 18px !important;
    }

    .right-reference-panel .reference-detail-row span,
    .right-reference-panel .reference-detail-row strong {
      font-size: 11px !important;
      line-height: 1.25 !important;
    }

    .right-reference-panel .reference-status-pill,
    .right-reference-panel .booking-status-pill,
    .right-reference-panel .crm-code-pill {
      min-height: 20px !important;
      padding: 3px 8px !important;
      font-size: 10px !important;
      border-radius: 8px !important;
    }

    .right-reference-panel .booking-note-input {
      min-height: 34px !important;
      margin-top: 8px !important;
      padding: 7px 10px !important;
      font-size: 11px !important;
      border-radius: 10px !important;
    }

    .right-reference-panel .booking-actions-grid {
      gap: 7px !important;
      margin-top: 8px !important;
    }

    .right-reference-panel .booking-action-btn {
      min-height: 32px !important;
      border-radius: 10px !important;
      font-size: 10.5px !important;
    }

    .right-reference-panel .booking-send-update-btn {
      margin-top: 7px !important;
    }

    .right-reference-panel .booking-result-text {
      min-height: 16px !important;
      margin-top: 6px !important;
      font-size: 10.5px !important;
    }


    /* V31.5.8.23 - Replace Chat Background Logo.
       UI-only polish for the chat window. The existing Iconic background image remains untouched. */
    .chat-panel {
      border-radius: 30px !important;
      border: 1px solid rgba(120, 184, 62, .28) !important;
      background: linear-gradient(180deg, rgba(255,255,255,.88), rgba(247,253,244,.74)) !important;
      box-shadow: 0 22px 52px rgba(21, 69, 39, .13), inset 0 1px 0 rgba(255,255,255,.78) !important;
      overflow: hidden !important;
    }

    .chat-head {
      background:
        linear-gradient(135deg, rgba(255,255,255,.95), rgba(242,250,238,.88)) !important;
      border-bottom: 1px solid rgba(120,184,62,.20) !important;
      box-shadow: 0 10px 26px rgba(21,69,39,.045) !important;
    }

    .chat-title {
      letter-spacing: -.02em !important;
      color: #13251f !important;
    }

    .chat-meta .branch,
    .chat-meta .status,
    .chat-meta .sender-badge,
    .workflow-status-chip,
    .assignee-chip {
      border-radius: 999px !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.72) !important;
    }

    #chatBody,
    .chat-body {
      scroll-behavior: auto !important;
      overscroll-behavior: contain !important;
      scrollbar-gutter: stable !important;
      padding: 22px 26px !important;
    }

    #chatBody::-webkit-scrollbar {
      width: 10px !important;
    }

    #chatBody::-webkit-scrollbar-track {
      background: rgba(255,255,255,.42) !important;
      border-radius: 999px !important;
    }

    #chatBody::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(120,184,62,.66), rgba(79,143,37,.50)) !important;
      border: 2px solid rgba(255,255,255,.75) !important;
      border-radius: 999px !important;
    }

    #chatBody .bubble-row {
      margin-bottom: 13px !important;
    }

    #chatBody .bubble {
      max-width: min(690px, 79%) !important;
      padding: 13px 15px 11px !important;
      border-radius: 20px !important;
      font-size: 12.5px !important;
      line-height: 1.56 !important;
      letter-spacing: .005em !important;
      box-shadow: 0 10px 26px rgba(15,23,42,.075) !important;
      backdrop-filter: blur(8px) !important;
      -webkit-backdrop-filter: blur(8px) !important;
    }

    #chatBody .bubble.customer {
      background: linear-gradient(135deg, rgba(211,250,194,.96), rgba(186,241,167,.92)) !important;
      border: 1px solid rgba(70,150,42,.28) !important;
      color: #14321f !important;
    }

    #chatBody .bubble.bot {
      background: linear-gradient(135deg, rgba(245,255,239,.95), rgba(224,249,211,.91)) !important;
      border: 1px solid rgba(120,184,62,.23) !important;
      color: #15291f !important;
    }

    #chatBody .bubble.staff {
      background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(248,252,246,.94)) !important;
      border: 1px solid rgba(197,219,190,.82) !important;
      color: #17251f !important;
    }

    #chatBody .bubble-info {
      border-top: 1px solid rgba(22,53,43,.08) !important;
      color: rgba(34,64,53,.72) !important;
      font-size: 10.5px !important;
    }

    .chat-composer-wrap {
      background: linear-gradient(180deg, rgba(255,255,255,.82), rgba(245,252,242,.94)) !important;
      border-top: 1px solid rgba(120,184,62,.20) !important;
      box-shadow: 0 -16px 36px rgba(21,69,39,.06) !important;
    }

    .chat-composer-wrap .composer-block {
      border-radius: 24px !important;
      border: 1px solid rgba(120,184,62,.22) !important;
      background: rgba(255,255,255,.86) !important;
      box-shadow: 0 12px 28px rgba(15,23,42,.055) !important;
    }

    .chat-composer-wrap textarea#body {
      border-radius: 18px !important;
      border-color: rgba(120,184,62,.24) !important;
      background: rgba(255,255,255,.95) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.9) !important;
    }

    .chat-composer-wrap textarea#body:focus {
      border-color: rgba(120,184,62,.55) !important;
      box-shadow: 0 0 0 4px rgba(120,184,62,.12), inset 0 1px 0 rgba(255,255,255,.9) !important;
    }

    .chat-composer-wrap .send-btn,
    .chat-composer-wrap .send-image-btn {
      box-shadow: 0 12px 26px rgba(37,211,102,.18) !important;
    }
</style>
</head>
<body>
  <div class="workspace-shell">
    <aside class="main-sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-logo"><img src="/assets/iconic-chat-background-logo.png" alt="Iconic Hair Care logo" /></div>
        <div>
          <div class="sidebar-brand-title">ICONIC</div>
          <div class="sidebar-brand-sub">HAIR CARE</div>
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="Team Inbox navigation">
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
      </nav>

      <div class="sidebar-branches">
        <div class="sidebar-branches-head">
          <div class="sidebar-section-title">Our Branches</div>
          <button class="sidebar-branch-add" type="button" aria-label="Add branch">＋</button>
        </div>
        <div class="branch-row"><span><i></i> Dubai</span><b id="sideDubaiCount">0</b></div>
        <div class="branch-row"><span><i></i> Abu Dhabi</span><b id="sideAbuCount">0</b></div>
      </div>

      <div class="sidebar-user">
        <div class="sidebar-user-avatar"><img src="/assets/iconic-chat-background-logo.png" alt="Created by avatar" /></div>
        <div class="sidebar-user-copy">
          <div class="sidebar-user-name">Created by Ossama Mokresh</div>
          <div class="sidebar-user-role">Iconic Team</div>
        </div>
        <div class="sidebar-user-caret">▾</div>
      </div>
    </aside>

    <div class="page">
      <section class="topbar v18-topbar">
        <div class="topbar-brand">
          <div class="topbar-logo"><img src="/assets/iconic-chat-background-logo.png" alt="Iconic Hair Care logo" /></div>
          <div class="topbar-copy">
            <div class="topbar-title">Team Inbox</div>
            <div class="topbar-sub">Manage all customer conversations in one place</div>
          </div>
        </div>
        <div class="topbar-actions">
          <div class="topbar-system"><span class="system-dot"></span>All systems operational</div>
          <div class="topbar-quick-wrap" id="quickRepliesWrap">
            <button type="button" class="topbar-quick" id="topbarQuickRepliesBtn" aria-expanded="false" aria-controls="quickRepliesMenu">⚡ Quick Replies</button>
            <div class="quick-replies-menu" id="quickRepliesMenu" role="menu" aria-label="Quick replies">
              <div class="quick-replies-menu-head">
                <div>
                  <div class="quick-replies-menu-title">Quick Replies</div>
                  <div class="quick-replies-menu-note">Insert into message</div>
                </div>
              </div>
              <div class="quick-replies-list">
                <button type="button" class="quick-reply-item" data-text="مرحباً، معك فريق Iconic Hair Care. كيف فينا نساعدك؟&#10;&#10;Hello, this is the Iconic Hair Care team. How may we help you?"><span>Greeting</span><span>↵</span></button>
                <button type="button" class="quick-reply-item" data-text="شكراً لتواصلك معنا. تم استلام طلبك وسيقوم أحد أعضاء فريقنا بالرد عليك قريباً.&#10;&#10;Thank you for contacting us. Your request has been received and one of our team members will reply shortly."><span>Follow-up</span><span>↵</span></button>
                <button type="button" class="quick-reply-item" data-text="يمكنك مشاركة اسمك والخدمة المطلوبة والفرع المناسب لك حتى نساعدك بشكل أدق.&#10;&#10;Please share your name, required service, and preferred branch so we can assist you better."><span>Need details</span><span>↵</span></button>
                <button type="button" class="quick-reply-item" data-text="تم تحويل طلبك إلى الفريق المختص وسنتواصل معك بأقرب وقت ممكن.&#10;&#10;Your request has been transferred to the relevant team and we will contact you as soon as possible."><span>Team handoff</span><span>↵</span></button>
              </div>
            </div>
          </div>
          <button type="button" class="topbar-notification" aria-label="Notifications">🔔<span class="notification-count">3</span></button>
          <div class="topbar-profile-avatar" aria-label="Iconic profile">ICONIC</div>
        </div>
      </section>


    <main class="app">
      <aside class="panel">
        <div class="filters reference-conversation-filters">
          <div class="reference-search-row">
            <input id="searchBox" placeholder="Search conversations..." />
            <button type="button" class="reference-filter-icon" title="Filters">⌕</button>
          </div>

          <div class="reference-pill-row reference-reply-pills" aria-label="Reply filters">
            <button type="button" class="reference-pill active" data-status="">All</button>
            <button type="button" class="reference-pill" data-status="Customer Reply">Customer</button>
            <button type="button" class="reference-pill" data-status="Bot Reply">Bot Reply</button>
          </div>

          <div class="reference-pill-row reference-secondary-pills" aria-label="Workflow filters">
            <button type="button" class="reference-pill" data-status="Human Reply">Human Reply</button>
            <button type="button" class="reference-pill reference-soft-pill" data-status="Follow-up">Follow-up</button>
            <button type="button" class="reference-pill reference-soft-pill" data-status="Needs Team">Needs Team</button>
            <button type="button" class="reference-pill reference-soft-pill" data-status="Talk to Team">Talk to Team</button>
          </div>

          <div class="reference-branch-tabs" aria-label="Branch filters">
            <button type="button" class="reference-branch-tab" data-branch="Dubai">Dubai <span id="tabDubaiCount">0</span></button>
            <button type="button" class="reference-branch-tab" data-branch="Abu Dhabi">Abu Dhabi <span id="tabAbuCount">0</span></button>
          </div>

          <div class="reference-hidden-filters" aria-hidden="true">
            <select id="branchFilter">
              <option value="">All branches</option>
              <option value="Dubai">Dubai</option>
              <option value="Abu Dhabi">Abu Dhabi</option>
            </select>
            <select id="statusFilter">
              <option value="">All status / replies</option>
            </select>
            <select id="assigneeFilter">
              <option value="">All assigned</option>
              <option value="Unassigned">Unassigned</option>
              <option value="Dubai Team">Dubai Team</option>
              <option value="Abu Dhabi Team">Abu Dhabi Team</option>
              <option value="Consultation Team">Consultation Team</option>
              <option value="Follow-up Team">Follow-up Team</option>
            </select>
            <select id="tagFilter">
              <option value="">All tags</option>
              <option value="__NO_TAGS__">No tags</option>
              <option value="Consultation">Consultation</option>
              <option value="New Customer">New Customer</option>
              <option value="Booking">Booking</option>
              <option value="Price">Price</option>
              <option value="Location">Location</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Human Support">Human Support</option>
              <option value="Call Requested">Call Requested</option>
              <option value="Service Interest">Service Interest</option>
              <option value="Media Requested">Media Requested</option>
              <option value="Natural Look">Natural Look</option>
              <option value="VIP">VIP</option>
              <option value="Private">Private</option>
              <option value="Need Details">Need Details</option>
            </select>
            <button type="button" id="clearFiltersBtn" class="filter-clear-btn">Clear filters</button>
          </div>
        </div>

        <div id="conversationList" class="conversation-list reference-conversation-list">
          <div class="empty">Loading conversations...</div>
        </div>
        <div class="reference-list-footer">
          <span id="conversationFooterText">Showing 0 - 0 of 0</span>
          <button type="button" id="refreshListBtn" title="Refresh conversations">⟳</button>
        </div>
      </aside>

      <section class="panel chat-panel">
        <div class="chat-head">
          <div class="chat-customer">
            <div class="avatar" id="chatAvatar">IC</div>
            <div style="min-width:0;">
              <div class="chat-title" id="chatTitle">Select a conversation</div>
              <div class="chat-meta" id="chatMeta"></div>
            </div>
          </div>
          <div class="chat-actions">
            <select id="conversationStatusSelect" class="conversation-status-select" aria-label="Conversation status">
              <option value="Open">Open</option>
              <option value="Waiting">Waiting</option>
              <option value="Need Follow-up">Need Follow-up</option>
              <option value="Needs Team">Needs Team</option>
              <option value="Booking Request">Booking Request</option>
              <option value="Consultation Request">Consultation Request</option>
              <option value="Price Question">Price Question</option>
              <option value="Call Requested">Call Requested</option>
              <option value="Location Requested">Location Requested</option>
              <option value="Service Interest">Service Interest</option>
              <option value="Media Requested">Media Requested</option>
              <option value="Talk to Team">Talk to Team</option>
              <option value="Closed">Closed</option>
            </select>
            <button type="button" class="mini-btn" id="copyPhoneBtn">Copy phone</button>
            <button type="button" class="mini-btn" id="markReadBtn">Mark read</button>
            <div class="chat-tags-menu-wrap">
              <button type="button" class="mini-btn more-btn" id="chatTagsMenuBtn" aria-label="Conversation tags">⋮</button>
              <div class="chat-tags-popover is-hidden" id="chatTagsPopover">
                <div class="chat-tags-popover-head">
                  <h3>Conversation Tags</h3>
                  <strong id="customerProfileTags" class="reference-current-tags">No tags</strong>
                </div>
                <div class="reference-tags-row header-tags-row" id="tagDisplay"></div>
                <div class="reference-tag-picker header-tag-picker" id="tagPicker">
                  <label class="tag-option"><input type="checkbox" value="Consultation" /> Consultation</label>
                  <label class="tag-option"><input type="checkbox" value="New Customer" /> New Customer</label>
                  <label class="tag-option"><input type="checkbox" value="Booking" /> Booking</label>
                  <label class="tag-option"><input type="checkbox" value="Price" /> Price</label>
                  <label class="tag-option"><input type="checkbox" value="Location" /> Location</label>
                  <label class="tag-option"><input type="checkbox" value="Follow-up" /> Follow-up</label>
                  <label class="tag-option"><input type="checkbox" value="Human Support" /> Human Support</label>
                  <label class="tag-option"><input type="checkbox" value="Call Requested" /> Call Requested</label>
                  <label class="tag-option"><input type="checkbox" value="Service Interest" /> Service Interest</label>
                  <label class="tag-option"><input type="checkbox" value="Media Requested" /> Media Requested</label>
                  <label class="tag-option"><input type="checkbox" value="Natural Look" /> Natural Look</label>
                  <label class="tag-option"><input type="checkbox" value="VIP" /> VIP</label>
                  <label class="tag-option"><input type="checkbox" value="Private" /> Private</label>
                  <label class="tag-option"><input type="checkbox" value="Need Details" /> Need Details</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="chatBody" class="chat-body">
          <div class="chat-watermark"><img src="/assets/iconic-chat-background-logo.png" alt="Iconic Hair Care watermark" /></div>
          <div class="empty">No conversation selected yet.</div>
        </div>

        <div class="chat-composer-wrap">
            <div class="composer-block">
              <div class="composer-tabs" role="tablist" aria-label="Composer mode">
                <button type="button" class="composer-tab active" id="replyTabBtn" data-mode="reply" aria-selected="true">Reply</button>
                <button type="button" class="composer-tab" id="noteTabBtn" data-mode="note" aria-selected="false">Note</button>
              </div>

              <input id="to" type="hidden" />

              <div id="replyComposerPane" class="composer-pane composer-pane-reply">
                <label class="composer-message-label">Message</label>
                <textarea id="body" rows="3" placeholder="Type your reply here..."></textarea>

                <div class="composer-bottom-row">
                  <div class="composer-icon-tools" aria-label="Composer tools">
                    <button type="button" class="composer-icon-btn" title="Emoji">☺</button>
                    <button type="button" class="composer-icon-btn" title="Attach">⌕</button>
                    <label class="composer-icon-btn composer-image-picker" for="imageFile" title="Choose image">▧</label>
                  </div>

                  <div class="composer-tools">
                    <div class="media-box">
                      <input id="imageFile" type="file" accept="image/jpeg,image/png,image/webp" />
                      <input id="imageCaption" placeholder="Optional image caption..." />
                      <button type="button" class="send-image-btn" id="sendImageBtn">▧ Send image</button>
                      <div class="media-hint">JPG, PNG, or WEBP. Keep image under 5MB.</div>
                    </div>
                  </div>

                  <div class="composer-actions">
                    <button type="button" class="send-btn" id="sendBtn" aria-label="Send WhatsApp Reply">➤</button>
                    <div class="result" id="result">Ready.</div>
                  </div>
                </div>

                <div class="composer-reply-source">
                  <label for="phoneNumberId">Responding as:</label>
                  <select id="phoneNumberId">
                    <option value="">Auto — same received line</option>
                    <option value="${DUBAI_PHONE_NUMBER_ID}">Iconic Hair Care Team (Dubai)</option>
                    <option value="${ABU_DHABI_PHONE_NUMBER_ID}">Iconic Hair Care Team (Abu Dhabi)</option>
                  </select>
                </div>

                <div class="quick-grid composer-mini-actions composer-quick-replies">
                  <button type="button" class="quick-btn" data-text="مرحباً، معك فريق Iconic Hair Care. كيف فينا نساعدك؟&#10;&#10;Hello, this is the Iconic Hair Care team. How may we help you?">Greeting</button>
                  <button type="button" class="quick-btn" data-text="شكراً لتواصلك معنا. تم استلام طلبك وسيقوم أحد أعضاء فريقنا بالرد عليك قريباً.&#10;&#10;Thank you for contacting us. Your request has been received and one of our team members will reply shortly.">Follow-up</button>
                  <button type="button" class="quick-btn" data-text="يمكنك مشاركة اسمك والخدمة المطلوبة والفرع المناسب لك حتى نساعدك بشكل أدق.&#10;&#10;Please share your name, required service, and preferred branch so we can assist you better.">Need details</button>
                  <button type="button" class="quick-btn" data-text="تم تحويل طلبك إلى الفريق المختص وسنتواصل معك بأقرب وقت ممكن.&#10;&#10;Your request has been transferred to the relevant team and we will contact you as soon as possible.">Team handoff</button>
                </div>
              </div>

              <div id="noteComposerPane" class="composer-pane composer-pane-note is-hidden">
                <div class="composer-note-wrap">
                  <textarea id="customerInternalNote" placeholder="Private internal note for the team. Do not write anything that should be sent to the customer." disabled></textarea>
                  <div class="internal-note-hint" id="customerInternalNoteStatus">Select a customer to add a note. V31.3 saves notes in this browser only.</div>
                </div>
              </div>
            </div>
        </div>
      </section>

      <aside class="panel reply-panel right-reference-panel">
        <div class="right-reference-scroll">
          <section class="reference-card customer-details-card">
            <div class="reference-card-head">
              <h3>Customer CRM Profile</h3>
              <span class="wa-mini-icon">☘</span>
            </div>

            <div class="customer-details-top">
              <div class="reference-avatar" id="customerProfileAvatar">IC</div>
              <div class="customer-details-nameblock">
                <div class="customer-name" id="customerProfileHeaderName">Customer</div>
                <div class="customer-phone-small" id="customerProfileHeaderPhone">—</div>
              </div>
            </div>

            <div class="crm-privacy-strip">
              <span>Privacy-first profile</span>
              <strong id="customerProfilePrivacyBadge">Discreet</strong>
            </div>

            <div class="reference-detail-list">
              <div class="reference-detail-row"><span>Customer Code</span><strong><span class="crm-code-pill" id="customerProfileCode">IC-000000</span></strong></div>
              <div class="reference-detail-row"><span>Name</span><strong id="customerProfileName">Customer</strong></div>
              <div class="reference-detail-row"><span>Phone</span><strong id="customerProfilePhone">—</strong></div>
              <div class="reference-detail-row"><span>Privacy</span><strong id="customerProfilePrivacy">Discreet</strong></div>
              <div class="reference-detail-row"><span>Location</span><strong id="customerProfileLocation">—</strong></div>
              <div class="reference-detail-row"><span>First Contact</span><strong id="customerProfileFirstContact">—</strong></div>
              <div class="reference-detail-row"><span>Lead Source</span><strong id="customerProfileLeadSource">WhatsApp</strong></div>
              <div class="reference-detail-row"><span>Language</span><strong id="customerProfileLanguage">English</strong></div>
              <div class="reference-detail-row"><span>Status</span><strong><span class="reference-status-pill" id="customerProfileStatus">Open</span></strong></div>
            </div>
          </section>

          <section class="reference-card booking-request-card is-hidden" id="bookingRequestCard">
            <div class="reference-card-head">
              <h3>Booking Request</h3>
              <span class="booking-status-pill" id="bookingRequestStatusPill">—</span>
            </div>
            <div class="reference-detail-list">
              <div class="reference-detail-row"><span>Customer</span><strong id="bookingRequestCustomer">—</strong></div>
              <div class="reference-detail-row"><span>Phone</span><strong id="bookingRequestPhone">—</strong></div>
              <div class="reference-detail-row"><span>Branch</span><strong id="bookingRequestBranch">—</strong></div>
              <div class="reference-detail-row"><span>Request</span><strong id="bookingRequestMessage">—</strong></div>
              <div class="reference-detail-row"><span>Last Updated</span><strong id="bookingRequestLastUpdated">—</strong></div>
            </div>
            <input id="bookingStatusNote" class="booking-note-input" type="text" placeholder="Optional internal note..." />
            <div class="booking-actions-grid">
              <button type="button" class="booking-action-btn approve" data-booking-status-action="Approved">Approve</button>
              <button type="button" class="booking-action-btn suggest" data-booking-status-action="Suggest another time">Suggest time</button>
              <button type="button" class="booking-action-btn follow" data-booking-status-action="Need follow-up">Need follow-up</button>
              <button type="button" class="booking-action-btn cancel" data-booking-status-action="Cancelled">Cancel</button>
            </div>
            <button type="button" class="booking-action-btn booking-send-update-btn" id="bookingSendCustomerUpdateBtn">Send update to customer</button>
            <div class="booking-result-text" id="bookingRequestResult">Ready.</div>
          </section>

          <div class="customer-profile-note is-hidden-compat">
            <div id="customerProfileSummary">Select a conversation to view customer details.</div>
            <div id="timelineFirstSeen">—</div>
            <div id="timelineLastMessage">—</div>
            <div id="timelineTotalMessages">0</div>
            <div id="timelineCustomerMessages">0</div>
            <div id="timelineTeamMessages">0</div>
            <div id="timelineBotMessages">0</div>
            <div id="timelineLastSender">—</div>
            <select id="conversationStatusSelect" style="display:none;" aria-hidden="true">
              <option value="Open">Open</option>
              <option value="Waiting">Waiting</option>
              <option value="Need Follow-up">Need Follow-up</option>
              <option value="Talk to Team">Talk to Team</option>
              <option value="Closed">Closed</option>
            </select>
            <span id="assigneeDisplay" class="assignee-chip assignee-unassigned" style="display:none;">Assigned: Unassigned</span>
          </div>
        </div>
      </aside>
    </main>
  </div>

  </div>
<script>
let allMessages = [];
let allBookingRequests = [];
let selectedPhone = "";
let selectedPhoneNumberId = "";
let selectedConversationKey = "";
let readMap = {};

try {
  readMap = JSON.parse(localStorage.getItem("iconic_read_map") || "{}");
} catch (e) {
  readMap = {};
}

let statusOverrideMap = {};
try {
  statusOverrideMap = JSON.parse(localStorage.getItem("iconic_status_override_map") || "{}");
} catch (e) {
  statusOverrideMap = {};
}

let assigneeMap = {};
try {
  assigneeMap = JSON.parse(localStorage.getItem("iconic_assignee_map") || "{}");
} catch (e) {
  assigneeMap = {};
}

let tagMap = {};
try {
  tagMap = JSON.parse(localStorage.getItem("iconic_tag_map") || "{}");
} catch (e) {
  tagMap = {};
}

let internalNotesMap = {};
try {
  internalNotesMap = JSON.parse(localStorage.getItem("iconic_internal_notes_map") || "{}");
} catch (e) {
  internalNotesMap = {};
}

let conversationStateMap = {};

const searchBox = document.getElementById("searchBox");
const branchFilter = document.getElementById("branchFilter");
const statusFilter = document.getElementById("statusFilter");
const assigneeFilter = document.getElementById("assigneeFilter");
const tagFilter = document.getElementById("tagFilter");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const conversationList = document.getElementById("conversationList");
const chatBody = document.getElementById("chatBody");
const chatTitle = document.getElementById("chatTitle");
const chatMeta = document.getElementById("chatMeta");
const chatAvatar = document.getElementById("chatAvatar");
const conversationStatusSelect = document.getElementById("conversationStatusSelect");
const assigneeSelect = document.getElementById("assigneeSelect");
const assigneeDisplay = document.getElementById("assigneeDisplay");
const tagPicker = document.getElementById("tagPicker");
const tagDisplay = document.getElementById("tagDisplay");
const chatTagsMenuBtn = document.getElementById("chatTagsMenuBtn");
const chatTagsPopover = document.getElementById("chatTagsPopover");
const inputTo = document.getElementById("to");
const inputLine = document.getElementById("phoneNumberId");
const inputBody = document.getElementById("body");
const imageFileInput = document.getElementById("imageFile");
const imageCaptionInput = document.getElementById("imageCaption");
const resultBox = document.getElementById("result");
const customerProfilePhone = document.getElementById("customerProfilePhone");
const customerProfileBranch = document.getElementById("customerProfileBranch");
const customerProfileLastActivity = document.getElementById("customerProfileLastActivity");
const customerProfileStatus = document.getElementById("customerProfileStatus");
const customerProfileAssigned = document.getElementById("customerProfileAssigned");
const customerProfileTags = document.getElementById("customerProfileTags");
const customerProfileSummary = document.getElementById("customerProfileSummary");
const customerProfileLongSummary = document.getElementById("customerProfileLongSummary");
const customerProfileAvatar = document.getElementById("customerProfileAvatar");
const customerProfileHeaderName = document.getElementById("customerProfileHeaderName");
const customerProfileHeaderPhone = document.getElementById("customerProfileHeaderPhone");
const customerProfileName = document.getElementById("customerProfileName");
const customerProfileLocation = document.getElementById("customerProfileLocation");
const customerProfileFirstContact = document.getElementById("customerProfileFirstContact");
const customerProfileLeadSource = document.getElementById("customerProfileLeadSource");
const customerProfileLanguage = document.getElementById("customerProfileLanguage");
const customerProfileCode = document.getElementById("customerProfileCode");
const customerProfilePrivacy = document.getElementById("customerProfilePrivacy");
const customerProfilePrivacyBadge = document.getElementById("customerProfilePrivacyBadge");
const customerProfileLastAction = document.getElementById("customerProfileLastAction");
const customerInternalNote = document.getElementById("customerInternalNote");
const customerInternalNoteStatus = document.getElementById("customerInternalNoteStatus");
const conversationInfoStatus = document.getElementById("conversationInfoStatus");
const timelineFirstSeen = document.getElementById("timelineFirstSeen");
const timelineLastMessage = document.getElementById("timelineLastMessage");
const timelineTotalMessages = document.getElementById("timelineTotalMessages");
const timelineCustomerMessages = document.getElementById("timelineCustomerMessages");
const timelineTeamMessages = document.getElementById("timelineTeamMessages");
const timelineBotMessages = document.getElementById("timelineBotMessages");
const timelineLastSender = document.getElementById("timelineLastSender");
const bookingRequestCard = document.getElementById("bookingRequestCard");
const bookingRequestStatusPill = document.getElementById("bookingRequestStatusPill");
const bookingRequestCustomer = document.getElementById("bookingRequestCustomer");
const bookingRequestPhone = document.getElementById("bookingRequestPhone");
const bookingRequestBranch = document.getElementById("bookingRequestBranch");
const bookingRequestMessage = document.getElementById("bookingRequestMessage");
const bookingRequestLastUpdated = document.getElementById("bookingRequestLastUpdated");
const bookingStatusNote = document.getElementById("bookingStatusNote");
const bookingSendCustomerUpdateBtn = document.getElementById("bookingSendCustomerUpdateBtn");
const bookingRequestResult = document.getElementById("bookingRequestResult");

// V31.5.8.18:
// Keep the Booking Notes text local while staff are typing.
// Auto-refresh must not overwrite partial suggested times before staff saves/sends.
const bookingNoteDraftMap = {};
let bookingNoteIsEditing = false;

// V31.5.8.23:
// Premium chat scroll stability.
// Auto-refresh must not force the opened chat to the bottom while staff is reading older messages.
let lastRenderedConversationKeyForScroll = null;

function isChatNearBottom(thresholdPx = 140) {
  if (!chatBody) return true;
  return (chatBody.scrollHeight - chatBody.scrollTop - chatBody.clientHeight) <= thresholdPx;
}

function getChatScrollSnapshot() {
  if (!chatBody) {
    return {
      key: selectedConversationKey,
      top: 0,
      height: 0,
      nearBottom: true
    };
  }

  return {
    key: selectedConversationKey,
    top: chatBody.scrollTop,
    height: chatBody.scrollHeight,
    nearBottom: isChatNearBottom(180)
  };
}

function restoreChatScrollSnapshot(snapshot, openedDifferentConversation) {
  if (!chatBody) return;

  requestAnimationFrame(function() {
    if (openedDifferentConversation || snapshot.nearBottom) {
      chatBody.scrollTop = chatBody.scrollHeight;
      return;
    }

    const heightDelta = chatBody.scrollHeight - snapshot.height;
    chatBody.scrollTop = Math.max(0, snapshot.top + heightDelta);
  });
}

if (chatBody) {
  chatBody.addEventListener("scroll", function() {
    // Passive listener only: the actual lock is calculated from current scroll position on every render.
  }, { passive: true });
}

const referenceFilterPills = Array.from(document.querySelectorAll(".reference-pill[data-status]"));
const referenceBranchTabs = Array.from(document.querySelectorAll(".reference-branch-tab[data-branch]"));
const conversationFooterText = document.getElementById("conversationFooterText");
const refreshListBtn = document.getElementById("refreshListBtn");
const composerTabs = Array.from(document.querySelectorAll(".composer-tab[data-mode]"));
const replyComposerPane = document.getElementById("replyComposerPane");
const noteComposerPane = document.getElementById("noteComposerPane");

function setComposerMode(mode) {
  const isNoteMode = mode === "note";

  composerTabs.forEach(function(btn) {
    const active = (btn.dataset.mode || "reply") === mode;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  if (replyComposerPane) {
    replyComposerPane.classList.toggle("is-hidden", isNoteMode);
  }

  if (noteComposerPane) {
    noteComposerPane.classList.toggle("is-hidden", !isNoteMode);
  }

  if (isNoteMode) {
    if (customerInternalNote && !customerInternalNote.disabled) {
      customerInternalNote.focus();
    }
  } else if (body) {
    body.focus();
  }
}

composerTabs.forEach(function(btn) {
  btn.addEventListener("click", function() {
    setComposerMode(btn.dataset.mode || "reply");
  });
});

setComposerMode("reply");

function updateReferenceFilterUi(currentCount) {
  referenceFilterPills.forEach(function(btn) {
    btn.classList.toggle("active", (statusFilter.value || "") === (btn.dataset.status || ""));
  });

  referenceBranchTabs.forEach(function(btn) {
    btn.classList.toggle("active", (branchFilter.value || "") === (btn.dataset.branch || ""));
  });

  if (conversationFooterText) {
    const total = buildConversations().length;
    const shown = Number(currentCount || 0);
    conversationFooterText.textContent = shown ? "Showing 1 - " + shown + " of " + total : "Showing 0 - 0 of " + total;
  }
}

referenceFilterPills.forEach(function(btn) {
  btn.addEventListener("click", function() {
    if (statusFilter) statusFilter.value = btn.dataset.status || "";
    selectedConversationKey = "";
    renderConversationList();
    renderChat();
  });
});

referenceBranchTabs.forEach(function(btn) {
  btn.addEventListener("click", function() {
    const value = btn.dataset.branch || "";
    branchFilter.value = branchFilter.value === value ? "" : value;
    selectedConversationKey = "";
    renderConversationList();
    renderChat();
  });
});

if (refreshListBtn) {
  refreshListBtn.addEventListener("click", function() {
    loadMessages();
  });
}


function saveReadMap() {
  localStorage.setItem("iconic_read_map", JSON.stringify(readMap));
}

function saveStatusOverrideMap() {
  localStorage.setItem("iconic_status_override_map", JSON.stringify(statusOverrideMap));
}

function setStatusOverride(key, status) {
  if (!key || !status) return;
  statusOverrideMap[key] = status;
  saveStatusOverrideMap();
}

function getStatusOverride(key) {
  return key && statusOverrideMap[key] ? statusOverrideMap[key] : "";
}

function saveAssigneeMap() {
  localStorage.setItem("iconic_assignee_map", JSON.stringify(assigneeMap));
}

function normalizeAssigneeValue(assignee) {
  const value = (assignee || "Unassigned").toString().trim() || "Unassigned";
  const allowed = ["Unassigned", "Dubai Team", "Abu Dhabi Team", "Consultation Team", "Follow-up Team"];

  // V23 keeps assignment team-based only. Any old local browser value is hidden safely.
  return allowed.includes(value) ? value : "Unassigned";
}

function setAssignee(key, assignee) {
  if (!key) return;
  const value = normalizeAssigneeValue(assignee);
  assigneeMap[key] = value;
  saveAssigneeMap();
}

function getAssignee(key) {
  return key && assigneeMap[key] ? normalizeAssigneeValue(assigneeMap[key]) : "Unassigned";
}

function assigneeClass(assignee) {
  const value = (assignee || "").toString().toLowerCase();
  if (value.includes("abu")) return "assignee-abu";
  if (value.includes("dubai")) return "assignee-dubai";
  if (value.includes("consult")) return "assignee-consultation";
  if (value.includes("follow")) return "assignee-followup";
  return "assignee-unassigned";
}

function assigneeBadge(assignee) {
  const label = assignee || "Unassigned";
  return '<span class="assignee-chip ' + assigneeClass(label) + '">Assigned: ' + escapeHtml(label) + '</span>';
}

function saveTagMap() {
  localStorage.setItem("iconic_tag_map", JSON.stringify(tagMap));
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  return tags.map(function(tag) {
    return (tag || "").toString().trim();
  }).filter(function(tag) {
    if (!tag || seen.has(tag)) return false;
    seen.add(tag);
    return true;
  });
}

function setTags(key, tags) {
  if (!key) return;
  tagMap[key] = normalizeTags(tags);
  saveTagMap();
}

function getTags(key) {
  return key && Array.isArray(tagMap[key]) ? tagMap[key] : [];
}

function parseStateTags(value) {
  if (Array.isArray(value)) return normalizeTags(value);
  return (value || "").toString().split(",").map(function(tag) {
    return tag.trim();
  }).filter(Boolean);
}

function applyConversationStates(states) {
  // V30: Google Sheets Conversation State is loaded first and then mirrored into local maps.
  // This keeps Status / Assigned / Tags stable after refresh and across devices.
  conversationStateMap = {};
  (states || []).forEach(function(state) {
    const phone = (state.phone || "").toString().trim();
    const phoneNumberId = (state.phoneNumberId || "").toString().trim();
    if (!phone || !phoneNumberId) return;

    const key = conversationKey(phone, phoneNumberId, state.branch || "");
    const status = (state.conversation_status || "").toString().trim();
    const assignee = normalizeAssigneeValue(state.assigned_to || "Unassigned");
    const tags = parseStateTags(state.tags || "");

    conversationStateMap[key] = {
      phone,
      phoneNumberId,
      branch: state.branch || "",
      status,
      assignee,
      tags,
      last_updated_by: state.last_updated_by || "",
      last_updated_at: state.last_updated_at || ""
    };

    if (status) statusOverrideMap[key] = status;
    assigneeMap[key] = assignee;
    tagMap[key] = tags;
  });

  saveStatusOverrideMap();
  saveAssigneeMap();
  saveTagMap();
}

function getCurrentConversationForState() {
  if (!selectedConversationKey) return null;
  return buildConversations().find(function(item) {
    return item.key === selectedConversationKey;
  }) || null;
}

async function saveConversationStateToGoogleSheet(c) {
  if (!c || !c.phone || !c.phoneNumberId) return;

  try {
    await fetch("/api/conversation-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: c.phone,
        phoneNumberId: c.phoneNumberId,
        branch: c.branch || "",
        conversation_status: c.status || "Open",
        assigned_to: c.assignee || "Unassigned",
        tags: normalizeTags(c.tags || []),
        last_updated_by: "Team Inbox"
      })
    });
  } catch (error) {
    console.log("Conversation state save failed", error);
  }
}

function tagClass(tag) {
  const value = (tag || "").toString().toLowerCase().replace(/\s+/g, "-");
  if (value.includes("vip")) return "tag-vip";
  if (value.includes("private")) return "tag-private";
  if (value.includes("follow")) return "tag-follow-up";
  if (value.includes("price")) return "tag-price";
  if (value.includes("booking")) return "tag-booking";
  if (value.includes("human")) return "tag-need-details";
  if (value.includes("call")) return "tag-follow-up";
  if (value.includes("service")) return "tag-general";
  if (value.includes("media")) return "tag-general";
  if (value.includes("natural")) return "tag-general";
  if (value.includes("need")) return "tag-need-details";
  return "tag-general";
}

function tagBadge(tag, className) {
  const base = className || "tag-chip";
  return '<span class="' + base + ' ' + tagClass(tag) + '">' + escapeHtml(tag) + '</span>';
}

function tagBadges(tags, className, limit) {
  const safeTags = normalizeTags(tags);
  const shown = typeof limit === "number" ? safeTags.slice(0, limit) : safeTags;
  if (!shown.length) return '<span class="tag-chip">No tags</span>';
  const extra = safeTags.length - shown.length;
  return shown.map(function(tag) { return tagBadge(tag, className); }).join("") + (extra > 0 ? '<span class="' + (className || "tag-chip") + '">+' + extra + '</span>' : "");
}

function setProfileText(el, value) {
  if (el) el.textContent = value || "—";
}

function profileSenderLabel(sender) {
  if (sender === "customer") return "Customer";
  if (sender === "staff") return "Team";
  if (sender === "bot") return "Bot";
  return "Message";
}

function saveInternalNotesMap() {
  localStorage.setItem("iconic_internal_notes_map", JSON.stringify(internalNotesMap));
}

function getInternalNoteKey(c) {
  return c && c.key ? c.key : selectedConversationKey || "";
}

function hashStringForCode(value) {
  const text = (value || "").toString();
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

function buildCustomerCode(c) {
  if (!c) return "IC-000000";
  return "IC-" + hashStringForCode((c.phone || "") + "|" + (c.phoneNumberId || "") + "|" + (c.branch || ""));
}

function buildLeadSource(c) {
  if (!c) return "WhatsApp";
  return "WhatsApp - " + (c.branch || "Branch");
}

function buildPrivacyLabel(tags) {
  const safeTags = normalizeTags(tags || []);
  if (safeTags.includes("Private")) return "Private";
  if (safeTags.includes("VIP")) return "VIP / Discreet";
  return "Discreet";
}

function buildLastAction(c) {
  if (!c || !c.latest) return "—";
  const latest = c.latest || {};
  const image = parseInlineImageMessage(latest.body || "");
  const actor = profileSenderLabel(latest.sender);

  if (image) {
    return actor + " sent image" + (image.caption ? ": " + shortText(image.caption, 34) : "");
  }

  const body = (latest.body || latest.messageType || "").toString().replace(/\s+/g, " ").trim();
  return actor + (body ? ": " + shortText(body, 42) : " activity");
}

function syncInternalNoteBox(c) {
  if (!customerInternalNote || !customerInternalNoteStatus) return;

  if (!c) {
    customerInternalNote.value = "";
    customerInternalNote.disabled = true;
    customerInternalNoteStatus.textContent = "Select a customer to add a note. V31.3 saves notes in this browser only.";
    return;
  }

  const key = getInternalNoteKey(c);
  customerInternalNote.disabled = false;
  customerInternalNote.value = internalNotesMap[key] || "";
  customerInternalNoteStatus.textContent = "Internal note is private to Team Inbox. V31.3 stores it in this browser only.";
}

function buildCustomerProfileSummary(c) {
  if (!c) return "No customer selected yet.";

  const messages = c.messages || [];
  const latest = c.latest || {};
  const customerCount = messages.filter(function(m) { return m.sender === "customer"; }).length;
  const teamCount = messages.filter(function(m) { return m.sender === "staff"; }).length;
  const botCount = messages.filter(function(m) { return m.sender === "bot"; }).length;

  return messages.length + " total messages • " +
    customerCount + " customer • " +
    teamCount + " team • " +
    botCount + " bot • Last sender: " + profileSenderLabel(latest.sender) + ".";
}


function updateCustomerTimeline(c) {
  if (!c) {
    setProfileText(timelineFirstSeen, "—");
    setProfileText(timelineLastMessage, "—");
    setProfileText(timelineTotalMessages, "0");
    setProfileText(timelineCustomerMessages, "0");
    setProfileText(timelineTeamMessages, "0");
    setProfileText(timelineBotMessages, "0");
    setProfileText(timelineLastSender, "—");
    return;
  }

  const messages = Array.isArray(c.messages) ? c.messages : [];
  const chronological = messages.slice().reverse();
  const first = chronological[0] || {};
  const latest = c.latest || messages[0] || {};
  const customerCount = messages.filter(function(m) { return m.sender === "customer"; }).length;
  const teamCount = messages.filter(function(m) { return m.sender === "staff"; }).length;
  const botCount = messages.filter(function(m) { return m.sender === "bot"; }).length;

  setProfileText(timelineFirstSeen, first.time || "—");
  setProfileText(timelineLastMessage, latest.time || "—");
  setProfileText(timelineTotalMessages, String(messages.length || 0));
  setProfileText(timelineCustomerMessages, String(customerCount));
  setProfileText(timelineTeamMessages, String(teamCount));
  setProfileText(timelineBotMessages, String(botCount));
  setProfileText(timelineLastSender, profileSenderLabel(latest.sender));
}

function normalizeBookingLookupValue(value) {
  return (value || "").toString().replace(/\D/g, "");
}

function bookingStatusClass(status) {
  const value = (status || "").toString().toLowerCase();
  if (value.includes("approved")) return "booking-status-approved";
  if (value.includes("suggest")) return "booking-status-suggest";
  if (value.includes("follow")) return "booking-status-follow-up";
  if (value.includes("cancel")) return "booking-status-cancelled";
  return "booking-status-pending";
}

function getLatestBookingRequestForConversation(c) {
  if (!c || !Array.isArray(allBookingRequests)) return null;

  const phone = normalizeBookingLookupValue(c.phone || "");
  const phoneNumberId = (c.phoneNumberId || "").toString().trim();

  if (!phone) return null;

  const exact = allBookingRequests.find(function(booking) {
    return normalizeBookingLookupValue(booking.phone || "") === phone &&
      (booking.phoneNumberId || "").toString().trim() === phoneNumberId;
  });

  if (exact) return exact;

  return allBookingRequests.find(function(booking) {
    return normalizeBookingLookupValue(booking.phone || "") === phone;
  }) || null;
}

function cleanBookingNoteForTeamInbox(note) {
  const value = (note || "").toString().trim();

  // V31.5.8.16:
  // Hide/clear old API test notes so staff do not see production booking cards
  // polluted by testing text. If staff writes a real note, it remains saved.
  if (value.toLowerCase() === "api status update test") {
    return "";
  }

  return value;
}

function getBookingDraftKey(booking) {
  if (!booking) return "";
  return (booking.rowNumber || "") + "|" + (booking.phone || "") + "|" + (booking.phoneNumberId || "");
}

function hasBookingNoteDraft(key) {
  return Object.prototype.hasOwnProperty.call(bookingNoteDraftMap, key);
}

function setBookingNoteDraft(key, value) {
  if (!key) return;
  bookingNoteDraftMap[key] = (value || "").toString();
}

function getCurrentBookingNoteDraft() {
  if (!bookingStatusNote) return "";
  const key = bookingStatusNote.dataset.draftKey || "";
  if (key && hasBookingNoteDraft(key)) {
    return bookingNoteDraftMap[key];
  }
  return bookingStatusNote.value || "";
}

function updateBookingRequestCard(c) {
  if (!bookingRequestCard) return;

  const booking = getLatestBookingRequestForConversation(c);

  if (!booking) {
    bookingRequestCard.classList.add("is-hidden");
    bookingRequestCard.dataset.rowNumber = "";
    if (bookingRequestResult) bookingRequestResult.textContent = "No booking request for this customer.";
    return;
  }

  bookingRequestCard.classList.remove("is-hidden");
  bookingRequestCard.dataset.rowNumber = booking.rowNumber || "";
  bookingRequestCard.dataset.phone = booking.phone || "";
  bookingRequestCard.dataset.phoneNumberId = booking.phoneNumberId || "";

  const status = booking.status || "Pending";

  if (bookingRequestStatusPill) {
    bookingRequestStatusPill.className = "booking-status-pill " + bookingStatusClass(status);
    bookingRequestStatusPill.textContent = status;
  }

  setProfileText(bookingRequestCustomer, booking.customerName || (c && (c.customerName || c.phone)) || "—");
  setProfileText(bookingRequestPhone, booking.phone || "—");
  setProfileText(bookingRequestBranch, booking.branch || (c && c.branch) || "—");
  setProfileText(bookingRequestMessage, booking.message || booking.requestType || "Booking Request");
  setProfileText(bookingRequestLastUpdated, booking.lastUpdated || booking.date || "—");

  if (bookingStatusNote) {
    const draftKey = getBookingDraftKey(booking);
    const serverNote = cleanBookingNoteForTeamInbox(booking.notes || "");
    const currentDraftKey = bookingStatusNote.dataset.draftKey || "";
    const isSameFocusedDraft = bookingNoteIsEditing && currentDraftKey === draftKey;

    bookingStatusNote.dataset.draftKey = draftKey;

    if (isSameFocusedDraft) {
      setBookingNoteDraft(draftKey, bookingStatusNote.value || "");
    } else if (hasBookingNoteDraft(draftKey)) {
      bookingStatusNote.value = bookingNoteDraftMap[draftKey];
    } else {
      bookingStatusNote.value = serverNote;
      setBookingNoteDraft(draftKey, serverNote);
    }
  }

  if (bookingRequestResult) {
    bookingRequestResult.textContent = "Ready.";
  }
}

function setBookingButtonsDisabled(disabled) {
  Array.from(document.querySelectorAll("[data-booking-status-action]")).forEach(function(btn) {
    btn.disabled = Boolean(disabled);
  });

  if (bookingSendCustomerUpdateBtn) {
    bookingSendCustomerUpdateBtn.disabled = Boolean(disabled);
  }
}

async function updateSelectedBookingStatus(status) {
  const c = getCurrentConversationForState();
  const booking = getLatestBookingRequestForConversation(c);

  if (!booking || !booking.rowNumber) {
    if (bookingRequestResult) bookingRequestResult.textContent = "No booking request selected.";
    return;
  }

  const notes = cleanBookingNoteForTeamInbox(getCurrentBookingNoteDraft().trim());

  if (bookingRequestResult) bookingRequestResult.textContent = "Updating booking status...";
  setBookingButtonsDisabled(true);

  try {
    const response = await fetch("/api/bookings/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rowNumber: booking.rowNumber,
        status,
        notes
      })
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      if (bookingRequestResult) bookingRequestResult.textContent = "Failed: " + (result.error || "Booking update failed");
      return;
    }

    const draftKey = getBookingDraftKey(booking);
    setBookingNoteDraft(draftKey, notes);

    allBookingRequests = allBookingRequests.map(function(item) {
      if (String(item.rowNumber) !== String(booking.rowNumber)) return item;
      return Object.assign({}, item, {
        status: result.status || status,
        notes: result.notes !== undefined ? result.notes : notes,
        lastUpdated: result.lastUpdated || item.lastUpdated || ""
      });
    });

    if (bookingRequestResult) bookingRequestResult.textContent = "Updated: " + (result.status || status);
    updateBookingRequestCard(c);
    loadMessages();
  } catch (error) {
    if (bookingRequestResult) bookingRequestResult.textContent = "Failed: booking status update error.";
  } finally {
    setBookingButtonsDisabled(false);
  }
}

function bookingStatusNeedsSuggestedTime(status) {
  return (status || "").toString().toLowerCase().includes("suggest");
}

function bookingStatusCanSendCustomerUpdate(status) {
  const value = (status || "").toString().toLowerCase();
  return value.includes("approved") || value.includes("suggest") || value.includes("follow") || value.includes("cancel");
}

async function sendSelectedBookingUpdateToCustomer() {
  const c = getCurrentConversationForState();
  const booking = getLatestBookingRequestForConversation(c);

  if (!booking || !booking.rowNumber) {
    if (bookingRequestResult) bookingRequestResult.textContent = "No booking request selected.";
    return;
  }

  const status = (booking.status || "Pending").toString().trim();
  const notes = cleanBookingNoteForTeamInbox(getCurrentBookingNoteDraft().trim());

  if (!bookingStatusCanSendCustomerUpdate(status)) {
    if (bookingRequestResult) bookingRequestResult.textContent = "Choose booking status before sending to customer.";
    return;
  }

  if (bookingStatusNeedsSuggestedTime(status) && !notes) {
    if (bookingRequestResult) bookingRequestResult.textContent = "Write the suggested time in Notes first.";
    if (bookingStatusNote) bookingStatusNote.focus();
    return;
  }

  if (bookingRequestResult) bookingRequestResult.textContent = "Sending update to customer...";
  setBookingButtonsDisabled(true);

  try {
    const response = await fetch("/api/bookings/send-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rowNumber: booking.rowNumber,
        to: booking.phone || (c && c.phone) || "",
        phoneNumberId: booking.phoneNumberId || (c && c.phoneNumberId) || "",
        status: status,
        notes: notes
      })
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      if (bookingRequestResult) bookingRequestResult.textContent = "Failed: " + (result.error || "Customer update failed");
      return;
    }

    if (bookingRequestResult) bookingRequestResult.textContent = "Customer update sent.";
    loadMessages();
  } catch (error) {
    if (bookingRequestResult) bookingRequestResult.textContent = "Failed: customer update send error.";
  } finally {
    setBookingButtonsDisabled(false);
  }
}

function updateCustomerProfile(c) {
  if (!c) {
    setProfileText(customerProfilePhone, "—");
    setProfileText(customerProfileBranch, "—");
    setProfileText(customerProfileLastActivity, "—");
    setProfileText(customerProfileLastAction, "—");
    setProfileText(customerProfileStatus, "—");
    setProfileText(conversationInfoStatus, "—");
    setProfileText(customerProfileAssigned, "Unassigned");
    setProfileText(customerProfileTags, "No tags");
    setProfileText(customerProfileSummary, "Select a conversation to view customer details.");
    setProfileText(customerProfileLongSummary, "No customer selected yet.");
    setProfileText(customerProfileHeaderName, "Customer");
    setProfileText(customerProfileHeaderPhone, "—");
    setProfileText(customerProfileCode, "IC-000000");
    setProfileText(customerProfileName, "Customer");
    setProfileText(customerProfilePrivacy, "Discreet");
    setProfileText(customerProfilePrivacyBadge, "Discreet");
    setProfileText(customerProfileLeadSource, "WhatsApp");
    setProfileText(customerProfileLocation, "—");
    setProfileText(customerProfileFirstContact, "—");
    setProfileText(customerProfileLanguage, "English");
    if (customerProfileAvatar) customerProfileAvatar.textContent = "IC";
    syncInternalNoteBox(null);
    updateCustomerTimeline(null);
    updateBookingRequestCard(null);
    return;
  }

  const tags = normalizeTags(c.tags || []);
  const latest = c.latest || {};
  const orderedMessages = (c.messages || []).slice().sort(function(a, b) {
    return (new Date(a.time || 0).getTime() || 0) - (new Date(b.time || 0).getTime() || 0);
  });
  const first = orderedMessages[0] || latest || {};
  const displayName = c.customerName || c.name || c.phone || "Customer";
  const location = c.branch ? (c.branch + ", UAE") : "—";
  const privacyLabel = buildPrivacyLabel(tags);

  setProfileText(customerProfilePhone, c.phone || "—");
  setProfileText(customerProfileBranch, c.branch || "—");
  setProfileText(customerProfileLastActivity, latest.time || "—");
  setProfileText(customerProfileLastAction, buildLastAction(c));
  setProfileText(customerProfileStatus, c.status || "Open");
  setProfileText(conversationInfoStatus, c.status || "Open");
  setProfileText(customerProfileAssigned, c.assignee || "Unassigned");
  setProfileText(customerProfileTags, tags.length ? tags.join(", ") : "No tags");
  setProfileText(customerProfileSummary, "Customer workflow profile for " + (c.phone || "selected customer") + ".");
  setProfileText(customerProfileLongSummary, buildCustomerProfileSummary(c));
  setProfileText(customerProfileHeaderName, displayName);
  setProfileText(customerProfileHeaderPhone, c.phone || "—");
  setProfileText(customerProfileCode, buildCustomerCode(c));
  setProfileText(customerProfileName, displayName);
  setProfileText(customerProfilePrivacy, privacyLabel);
  setProfileText(customerProfilePrivacyBadge, privacyLabel);
  setProfileText(customerProfileLeadSource, buildLeadSource(c));
  setProfileText(customerProfileLocation, location);
  setProfileText(customerProfileFirstContact, first.time || "—");
  setProfileText(customerProfileLanguage, "English");
  if (customerProfileAvatar) customerProfileAvatar.textContent = avatarText(displayName || c.phone || "IC");
  syncInternalNoteBox(c);
  updateCustomerTimeline(c);
  updateBookingRequestCard(c);
}

function syncTagPicker(tags) {
  const safeTags = normalizeTags(tags);
  const selected = new Set(safeTags);
  if (tagPicker) {
    Array.from(tagPicker.querySelectorAll('input[type="checkbox"]')).forEach(function(input) {
      input.checked = selected.has(input.value);
      input.disabled = !selectedConversationKey;
    });
  }
  if (tagDisplay) {
    tagDisplay.innerHTML = tagBadges(safeTags, "tag-chip");
  }
}

function closeChatTagsPopover() {
  if (chatTagsPopover) {
    chatTagsPopover.classList.add("is-hidden");
  }
}

function statusClass(status) {
  const value = (status || "").toString().toLowerCase();
  if (value.includes("wait")) return "status-waiting";
  if (value.includes("closed")) return "status-closed";
  if (value.includes("team")) return "status-team";
  if (value.includes("follow")) return "status-follow";
  return "status-open";
}

function escapeHtml(value) {
  return (value || "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortText(value, max) {
  const t = (value || "").toString().replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}

const INLINE_IMAGE_PREFIX = "[[ICONIC_INLINE_IMAGE]] ";

function parseInlineImageMessage(body) {
  const value = (body || "").toString().trim();

  if (!value.startsWith(INLINE_IMAGE_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(value.slice(INLINE_IMAGE_PREFIX.length));
    const mediaId = (payload.mediaId || "").toString().trim();

    if (!mediaId) {
      return null;
    }

    return {
      mediaId,
      filename: (payload.filename || "WhatsApp image").toString().trim(),
      caption: (payload.caption || "").toString().trim()
    };
  } catch (error) {
    return null;
  }
}

function renderMessageBody(message) {
  const image = parseInlineImageMessage(message?.body || "");

  if (!image) {
    return escapeHtml(message?.body || "");
  }

  const mediaSrc = "/api/media/" + encodeURIComponent(image.mediaId);
  return '<div class="inline-image-message">' +
    '<a class="inline-image-link" href="' + mediaSrc + '" target="_blank" rel="noopener">' +
      '<img src="' + mediaSrc + '" alt="' + escapeHtml(image.filename || "WhatsApp image") + '" loading="lazy" />' +
    '</a>' +
    (image.caption ? '<div class="inline-image-caption">' + escapeHtml(image.caption) + '</div>' : '') +
  '</div>';
}

function avatarText(phone) {
  const clean = (phone || "IC").replace(/\D/g, "");
  return clean ? clean.slice(-2) : "IC";
}

function conversationKey(phone, phoneNumberId, branch) {
  return (phone || "unknown") + "::" + (phoneNumberId || branch || "line");
}

function branchBadge(branch) {
  if (branch === "Abu Dhabi") return '<span class="branch branch-abu">Abu Dhabi</span>';
  return '<span class="branch branch-dubai">Dubai</span>';
}

function senderBadge(sender) {
  if (sender === "customer") return '<span class="sender-badge sender-customer">Customer</span>';
  if (sender === "staff") return '<span class="sender-badge sender-staff">Staff</span>';
  return '<span class="sender-badge sender-bot">Bot</span>';
}

function statusToSenderFilter(status) {
  if (status === "Customer Reply") return "customer";
  if (status === "Human Reply") return "staff";
  if (status === "Bot Reply") return "bot";
  return "";
}

function senderToReplyStatus(sender) {
  if (sender === "customer") return "Customer Reply";
  if (sender === "staff") return "Human Reply";
  if (sender === "bot") return "Bot Reply";
  return "";
}


function messageKey(m) {
  return [m.phone || "", m.time || "", m.sender || "", (m.body || "").slice(0, 30)].join("|");
}

function getConversationReplyFilterStatus(messages) {
  const msgs = messages || [];
  const latestMessage = msgs[0] || {};

  // Filters are based on the latest message in the conversation.
  // customer = Customer Reply, staff = Human Reply, bot = Bot Reply.
  if (latestMessage.sender === "customer") return "Customer Reply";
  if (latestMessage.sender === "staff") return "Human Reply";
  if (latestMessage.sender === "bot") return "Bot Reply";

  return "Customer Reply";
}

function getConversationBusinessStatus(messages, fallbackStatus) {
  const msgs = messages || [];

  // Keep manual workflow statuses separate from reply-type filters.
  const manualStatusMessage = msgs.find(function(m) {
    const s = (m.status || "").toString().trim();
    return (
      s &&
      s !== "Bot" &&
      s !== "Bot Reply" &&
      s !== "Human Reply" &&
      s !== "Customer Reply"
    );
  });

  if (manualStatusMessage && manualStatusMessage.status) {
    return manualStatusMessage.status;
  }

  return fallbackStatus || getConversationReplyFilterStatus(msgs);
}

function buildConversations() {
  const map = {};

  (allMessages || []).forEach(function(m) {
    const key = conversationKey(m.phone || "unknown", m.phoneNumberId || "", m.branch || "");
    const phone = m.phone || "unknown";

    if (!map[key]) {
      map[key] = {
        key,
        phone,
        messages: [],
        latest: m,
        branch: m.branch || "Dubai",
        phoneNumberId: m.phoneNumberId || "",
        status: "Customer Reply",
        replyFilterStatus: "Customer Reply"
      };
    }

    map[key].messages.push(m);

    // allMessages is newest-first, so the first message that creates the conversation is the latest.
    if (!map[key].latest) map[key].latest = m;

    if (m.phoneNumberId) {
      map[key].phoneNumberId = m.phoneNumberId;
    }

    if (m.branch) {
      map[key].branch = m.branch;
    }
  });

  return Object.values(map).map(function(c) {
    const savedState = conversationStateMap[c.key] || {};
    const customerNameMessage = (c.messages || []).find(function(m) {
      return (m.customerName || "").toString().trim();
    });

    c.customerName = customerNameMessage ? (customerNameMessage.customerName || "").toString().trim() : "";
    c.replyFilterStatus = getConversationReplyFilterStatus(c.messages);
    c.status = savedState.status || getStatusOverride(c.key) || getConversationBusinessStatus(c.messages, c.replyFilterStatus);
    c.assignee = savedState.assignee || getAssignee(c.key);
    c.tags = normalizeTags(savedState.tags || getTags(c.key));
    c.stateUpdatedAt = savedState.last_updated_at || "";
    c.stateUpdatedBy = savedState.last_updated_by || "";
    return c;
  });
}

function isUnreadConversation(c) {
  const latest = c.latest || {};
  if (latest.sender !== "customer") return false;
  return readMap[c.key] !== messageKey(latest);
}

function markConversationRead(key) {
  const c = buildConversations().find(function(item) { return item.key === key; });
  if (!c || !c.latest) return;
  readMap[key] = messageKey(c.latest);
  saveReadMap();
}

function buildStatusOptions() {
  const current = statusFilter.value;

  // Clean operational filters only.
  // Keep Bot Reply because it works and is useful, but hide raw/test statuses like "Bot" and "Follow-up Test".
  const fixedStatuses = [
    "Open",
    "Waiting",
    "Closed",
    "Need Follow-up",
    "Needs Team",
    "Booking Request",
    "Consultation Request",
    "Price Question",
    "Call Requested",
    "Location Requested",
    "Service Interest",
    "Media Requested",
    "Talk to Team",
    "Customer Reply",
    "Human Reply",
    "Bot Reply",
    "Talk to Team",
    "Consultation Request",
    "Location Requested",
    "Call Requested",
    "Follow-up",
    "Need Follow-up",
    "Closed"
  ];

  const hiddenStatuses = new Set([
    "Bot",
    "Follow-up Test",
    "Follow-up Sent",
    "Service Follow-up Reminder",
    "Service Follow-up Template Test",
    "Call Now Test",
    "Call Now Template Test",
    "Location Test",
    "Location CTA Test"
  ]);

  const dynamicStatuses = Array.from(new Set((allMessages || []).map(function(m) {
    return (m.status || "").toString().trim();
  }).filter(function(status) {
    return status && !hiddenStatuses.has(status);
  })));

  const statuses = Array.from(new Set(fixedStatuses.concat(dynamicStatuses)));

  statusFilter.innerHTML = '<option value="">All status / replies</option>' + statuses.map(function(s) {
    return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
  }).join("");

  if (statuses.includes(current)) statusFilter.value = current;
}


function buildAdvancedFilterOptions() {
  const currentAssignee = assigneeFilter ? assigneeFilter.value : "";
  const currentTag = tagFilter ? tagFilter.value : "";

  if (assigneeFilter) {
    const assigneeOptions = ["Unassigned", "Dubai Team", "Abu Dhabi Team", "Consultation Team", "Follow-up Team"];
    assigneeFilter.innerHTML = '<option value="">All assigned</option>' + assigneeOptions.map(function(value) {
      return '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>';
    }).join("");
    if (assigneeOptions.includes(currentAssignee)) assigneeFilter.value = currentAssignee;
  }

  if (tagFilter) {
    const defaultTags = ["Consultation", "New Customer", "Booking", "Price", "Location", "Follow-up", "Human Support", "Call Requested", "Service Interest", "Media Requested", "Natural Look", "VIP", "Private", "Need Details"];
    const dynamicTags = [];
    buildConversations().forEach(function(c) {
      normalizeTags(c.tags || []).forEach(function(tag) {
        if (!defaultTags.includes(tag) && !dynamicTags.includes(tag)) dynamicTags.push(tag);
      });
    });
    const tagOptions = defaultTags.concat(dynamicTags);
    tagFilter.innerHTML =
      '<option value="">All tags</option>' +
      '<option value="__NO_TAGS__">No tags</option>' +
      tagOptions.map(function(value) {
        return '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>';
      }).join("");
    if (currentTag === "__NO_TAGS__" || tagOptions.includes(currentTag)) tagFilter.value = currentTag;
  }
}

function normalizedMessageBranch(message) {
  const branch = (message?.branch || "").toString().trim();
  if (branch === "Abu Dhabi") return "Abu Dhabi";
  return "Dubai";
}

function updateStats() {
  const conversations = buildConversations();
  const statTotal = document.getElementById("statTotal");
  const statCustomers = document.getElementById("statCustomers");
  const statUnread = document.getElementById("statUnread");
  if (statTotal) statTotal.textContent = allMessages.length;
  if (statCustomers) statCustomers.textContent = conversations.length;
  if (statUnread) statUnread.textContent = conversations.filter(isUnreadConversation).length;
  const dubaiSidebarCount = allMessages.filter(function(m) { return normalizedMessageBranch(m) === "Dubai"; }).length;
  const abuSidebarCount = allMessages.filter(function(m) { return normalizedMessageBranch(m) === "Abu Dhabi"; }).length;
  const statDubai = document.getElementById("statDubai");
  const statAbu = document.getElementById("statAbu");
  if (statDubai) statDubai.textContent = dubaiSidebarCount;
  if (statAbu) statAbu.textContent = abuSidebarCount;
  const sideDubaiCount = document.getElementById("sideDubaiCount");
  const sideAbuCount = document.getElementById("sideAbuCount");
  if (sideDubaiCount) sideDubaiCount.textContent = dubaiSidebarCount;
  if (sideAbuCount) sideAbuCount.textContent = abuSidebarCount;
  const tabDubaiCount = document.getElementById("tabDubaiCount");
  const tabAbuCount = document.getElementById("tabAbuCount");
  const conversationBranchCounts = buildConversations().reduce(function(acc, c) {
    if (c.branch === "Abu Dhabi") acc.abu += 1;
    else acc.dubai += 1;
    return acc;
  }, { dubai: 0, abu: 0 });
  if (tabDubaiCount) tabDubaiCount.textContent = conversationBranchCounts.dubai;
  if (tabAbuCount) tabAbuCount.textContent = conversationBranchCounts.abu;
}

function conversationHasStatus(conversation, wantedStatus) {
  const wanted = (wantedStatus || "").toLowerCase().trim();
  if (!wanted) return true;

  if (wanted === "needs team") {
    const workflowHay = [
      conversation.status,
      conversation.replyFilterStatus,
      conversation.assignee,
      (conversation.tags || []).join(" ")
    ].join(" ").toLowerCase();

    if (
      workflowHay.includes("need details") ||
      workflowHay.includes("consultation") ||
      workflowHay.includes("booking") ||
      workflowHay.includes("human support") ||
      workflowHay.includes("talk to team") ||
      workflowHay.includes("call requested") ||
      workflowHay.includes("price") ||
      workflowHay.includes("consultation team")
    ) {
      return true;
    }
  }

  return (conversation.messages || []).some(function(message) {
    const combined = [
      message.status,
      message.messageType,
      message.body,
      message.sender,
      message.phone,
      message.customerName,
      message.branch,
      message.phoneNumberId,
      message.buttonText,
      message.buttonTitle,
      message.buttonPayload,
      message.buttonId,
      message.payload,
      message.interactiveTitle,
      message.interactiveId,
      message.interactivePayload
    ].join(" ").toLowerCase();

    const status = (message.status || "").toLowerCase().trim();
    const messageType = (message.messageType || "").toLowerCase().trim();

    if (status === wanted || messageType === wanted) return true;

    // Searches the full conversation, including button/body/status/message type fields.
    if (wanted === "talk to team") {
      return combined.includes("talk to team") ||
        combined.includes("team handoff") ||
        combined.includes("chat with team") ||
        combined.includes("talk_to_team") ||
        combined.includes("الفريق") ||
        combined.includes("فريق");
    }

    if (wanted === "needs team") {
      return combined.includes("need details") ||
        combined.includes("booking request") ||
        combined.includes("consultation request") ||
        combined.includes("price question") ||
        combined.includes("call requested") ||
        combined.includes("human support") ||
        combined.includes("talk to team") ||
        combined.includes("team handoff") ||
        combined.includes("استشارة") ||
        combined.includes("موعد") ||
        combined.includes("فريق");
    }

    // One clean filter for all follow-up activity; test/status noise stays hidden from the dropdown.
    if (wanted === "follow-up") {
      return combined.includes("follow-up") ||
        combined.includes("follow up") ||
        combined.includes("followup") ||
        combined.includes("service follow-up") ||
        combined.includes("service_review_follow_up") ||
        combined.includes("review_follow_up") ||
        combined.includes("reminder") ||
        combined.includes("تذكير") ||
        combined.includes("متابعة");
    }

    return false;
  });
}

function filteredConversations() {
  const q = (searchBox.value || "").toLowerCase().trim();
  const branch = branchFilter.value;
  const status = statusFilter.value;
  const assigned = assigneeFilter ? assigneeFilter.value : "";
  const tag = tagFilter ? tagFilter.value : "";
  const senderFilter = statusToSenderFilter(status);

  return buildConversations().filter(function(c) {
    const hay = [
      c.phone,
      c.branch,
      c.status,
      c.replyFilterStatus,
      c.assignee,
      (c.tags || []).join(" "),
      c.phoneNumberId
    ].concat((c.messages || []).map(function(m) {
      return [
        m.body,
        m.status,
        m.messageType,
        m.sender,
        m.phone,
        m.customerName,
        m.branch,
        m.phoneNumberId,
        m.buttonText,
        m.buttonTitle,
        m.buttonPayload,
        m.buttonId,
        m.payload,
        m.interactiveTitle,
        m.interactiveId,
        m.interactivePayload
      ].join(" ");
    })).join(" ").toLowerCase();

    if (q && !hay.includes(q)) return false;
    if (branch && c.branch !== branch) return false;
    if (assigned && c.assignee !== assigned) return false;

    const conversationTags = normalizeTags(c.tags || []);
    if (tag === "__NO_TAGS__" && conversationTags.length > 0) return false;
    if (tag && tag !== "__NO_TAGS__" && !conversationTags.includes(tag)) return false;

    // Reply filters are message-type filters.
    // Customer Reply / Human Reply / Bot Reply search the full conversation.
    if (senderFilter) {
      return (c.messages || []).some(function(m) { return m.sender === senderFilter; });
    }

    if (status && c.status !== status && !conversationHasStatus(c, status)) return false;

    return true;
  });
}
function formatConversationDisplayName(c) {
  const messages = c.messages || [];
  const withName = messages.find(function(m) {
    return (m.customerName || "").toString().trim();
  });

  const name = withName ? (withName.customerName || "").toString().trim() : "";
  if (name) return name;
  return c.phone || "Unknown customer";
}

function formatConversationPreview(message) {
  if (!message) return "";
  const senderLabel = message.sender === "customer" ? "Customer" : message.sender === "staff" ? "Team" : message.sender === "bot" ? "Bot" : "Message";
  const image = parseInlineImageMessage(message.body || "");

  if (image) {
    return senderLabel + ": 📷 Image" + (image.caption ? " — " + image.caption : "");
  }

  const body = (message.body || "").toString().replace(/\s+/g, " ").trim();
  return senderLabel + ": " + body;
}

function renderConversationList() {
  const conversations = filteredConversations();

  if (!conversations.length) {
    conversationList.innerHTML = '<div class="empty">No conversations yet.</div>';
    selectedPhone = "";
    selectedConversationKey = "";
    renderChat();
    updateReferenceFilterUi(0);
    return;
  }

  if (!selectedConversationKey || !conversations.some(function(c) { return c.key === selectedConversationKey; })) {
    selectedConversationKey = conversations[0].key;
    selectedPhone = conversations[0].phone;
    selectedPhoneNumberId = conversations[0].phoneNumberId || "";
  }

  conversationList.innerHTML = conversations.map(function(c) {
    const active = c.key === selectedConversationKey ? " active" : "";
    const unread = isUnreadConversation(c) ? " unread" : "";
    const listSenderFilter = statusToSenderFilter(statusFilter.value);
    const filteredLatest = listSenderFilter ? (c.messages || []).find(function(m) { return m.sender === listSenderFilter; }) : null;
    const latest = filteredLatest || c.latest || {};
    const displayStatus = listSenderFilter ? senderToReplyStatus(latest.sender) : (c.status || "");
    const preview = formatConversationPreview(latest);
    const displayName = formatConversationDisplayName(c);
    const messageCount = (c.messages || []).length;
    const tagRow = (c.tags || []).length ? '<div class="conversation-tags-row">' + tagBadges(c.tags, "conversation-tag-chip", 3) + '</div>' : '';

    return '<button type="button" class="conversation-card reference-conversation-card' + active + unread + '" data-key="' + escapeHtml(c.key) + '" data-status="' + escapeHtml(displayStatus || '') + '">' +
      '<div class="avatar reference-avatar">' + escapeHtml(avatarText(displayName || c.phone)) + '</div>' +
      '<div class="conversation-main reference-conversation-main">' +
        '<div class="conv-top reference-card-top">' +
          '<div class="conv-identity reference-card-identity">' +
            '<div class="conv-name reference-card-name">' + escapeHtml(displayName) + '</div>' +
            '<div class="conv-preview reference-card-preview">' + escapeHtml(shortText(preview, 76)) + '</div>' +
          '</div>' +
          '<div class="conv-time reference-card-time">' + escapeHtml(latest.time || "") + '</div>' +
        '</div>' +
        '<div class="conv-footer reference-card-footer">' +
          '<div class="badges reference-card-badges">' + branchBadge(c.branch) + '<span class="status ' + statusClass(displayStatus) + '">' + escapeHtml(displayStatus || "") + '</span>' + tagBadges(c.tags || [], "conversation-tag-chip", 1) + '</div>' +
          '<span class="message-count-badge">' + escapeHtml(String(messageCount)) + '</span>' +
        '</div>' +
      '</div>' +
    '</button>';
  }).join("");

  Array.from(document.querySelectorAll(".conversation-card")).forEach(function(btn) {
    btn.addEventListener("click", function() {
      selectConversation(btn.dataset.key || "");
    });
  });

  updateReferenceFilterUi(conversations.length);
}

function selectConversation(key) {
  const c = buildConversations().find(function(item) { return item.key === key; });
  if (!c) return;

  selectedConversationKey = c.key;
  selectedPhone = c.phone;
  selectedPhoneNumberId = c.phoneNumberId || "";
  inputTo.value = c.phone;
  inputLine.value = c.phoneNumberId || "";
  markConversationRead(c.key);
  renderAll();
  inputBody.focus();
}

function renderChat() {
  const c = buildConversations().find(function(item) { return item.key === selectedConversationKey; });

  if (!c) {
    chatTitle.textContent = "Select a conversation";
    chatMeta.innerHTML = "";
    chatAvatar.textContent = "IC";
    if (conversationStatusSelect) {
      conversationStatusSelect.value = "Open";
      conversationStatusSelect.disabled = true;
    }
    if (chatTagsMenuBtn) chatTagsMenuBtn.disabled = true;
    closeChatTagsPopover();
    if (assigneeSelect) {
      assigneeSelect.value = "Unassigned";
      assigneeSelect.disabled = true;
    }
    if (assigneeDisplay) {
      assigneeDisplay.className = "assignee-chip assignee-unassigned";
      assigneeDisplay.textContent = "Assigned: Unassigned";
    }
    syncTagPicker([]);
    updateCustomerProfile(null);
    lastRenderedConversationKeyForScroll = null;
    chatBody.innerHTML = '<div class="chat-watermark"><img src="/assets/iconic-chat-background-logo.png" alt="Iconic Hair Care watermark" /></div><div class="empty">Choose a customer from the left to view the conversation.</div>';
    return;
  }

  const displayName = formatConversationDisplayName(c);
  chatTitle.textContent = displayName;
  chatAvatar.textContent = avatarText(displayName || c.phone);
  const headerTags = normalizeTags(c.tags || []);
  const headerTagsHtml = headerTags.length ? tagBadges(headerTags, "tag-chip", 3) : "";
  chatMeta.innerHTML = branchBadge(c.branch) + '<span class="status ' + statusClass(c.status) + '">' + escapeHtml(c.status || "") + '</span>' + headerTagsHtml + '<div class="workflow-status-bar"><span class="workflow-status-chip ' + statusClass(c.status) + '">Workflow: ' + escapeHtml(c.status || "Open") + '</span>' + assigneeBadge(c.assignee) + '</div>';
  if (conversationStatusSelect) {
    const allowedStatuses = ["Open", "Waiting", "Need Follow-up", "Needs Team", "Booking Request", "Consultation Request", "Price Question", "Call Requested", "Location Requested", "Service Interest", "Media Requested", "Talk to Team", "Closed"];
    conversationStatusSelect.value = allowedStatuses.includes(c.status) ? c.status : "Open";
    conversationStatusSelect.disabled = false;
  }
  if (chatTagsMenuBtn) chatTagsMenuBtn.disabled = false;
  if (assigneeSelect) {
    assigneeSelect.value = c.assignee || "Unassigned";
    assigneeSelect.disabled = false;
  }
  if (assigneeDisplay) {
    assigneeDisplay.className = "assignee-chip " + assigneeClass(c.assignee);
    assigneeDisplay.textContent = "Assigned: " + (c.assignee || "Unassigned");
  }
  syncTagPicker(c.tags || []);
  updateCustomerProfile(c);

  const chatScrollSnapshot = getChatScrollSnapshot();
  const openedDifferentConversation = lastRenderedConversationKeyForScroll !== c.key;

  inputTo.value = c.phone;
  if (c.phoneNumberId) inputLine.value = c.phoneNumberId;

  const ordered = (c.messages || []).slice().reverse();

  // Reply-type filters affect both the conversation list and the opened chat.
  // All conversations = full history. Customer/Human/Bot Reply = only that sender.
  const chatSenderFilter = statusToSenderFilter(statusFilter.value);
  const visibleMessages = chatSenderFilter
    ? ordered.filter(function(m) { return m.sender === chatSenderFilter; })
    : ordered;

  chatBody.innerHTML = '<div class="chat-watermark"><img src="/assets/iconic-chat-background-logo.png" alt="Iconic Hair Care watermark" /></div>' + (visibleMessages.length ? visibleMessages.map(function(m) {
    const cls = m.sender === "customer" ? "customer" : (m.sender === "staff" ? "staff" : "bot");
    return '<div class="bubble-row ' + cls + '">' +
      '<div class="bubble ' + cls + '">' +
        renderMessageBody(m) +
        '<div class="bubble-info">' +
          '<span>' + senderBadge(m.sender || "") + '</span>' +
          '<span>' + escapeHtml(m.time || "") + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join("") : '<div class="empty">No messages for this filter.</div>');

  restoreChatScrollSnapshot(chatScrollSnapshot, openedDifferentConversation);
  lastRenderedConversationKeyForScroll = c.key;
}

function renderAll() {
  buildStatusOptions();
  buildAdvancedFilterOptions();
  updateStats();
  renderConversationList();
  renderChat();
}

async function loadMessages() {
  try {
    const res = await fetch("/api/messages");
    const data = await res.json();
    allMessages = data.messages || [];
    allBookingRequests = data.bookingRequests || [];
    applyConversationStates(data.conversationStates || []);
    renderAll();
  } catch (error) {
    conversationList.innerHTML = '<div class="empty">Failed to load messages.</div>';
  }
}

async function sendReply() {
  const to = inputTo.value.trim();
  const body = inputBody.value.trim();
  const phoneNumberId = inputLine.value.trim();

  if (!to || !body) {
    resultBox.textContent = "Please enter customer phone and message.";
    return;
  }

  resultBox.textContent = "Sending...";

  try {
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, body, phoneNumberId })
    });

    const data = await res.json();

    if (data.ok) {
      resultBox.textContent = "Sent successfully.";
      inputBody.value = "";
      selectedPhone = to;
      selectedConversationKey = selectedConversationKey || conversationKey(to, phoneNumberId, "");
      markConversationRead(selectedConversationKey);
      loadMessages();
    } else {
      resultBox.textContent = "Failed: " + (data.error || "Unknown error");
    }
  } catch (error) {
    resultBox.textContent = "Failed: network or server error.";
  }
}


function fileToDataUrl(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { reject(new Error("Could not read image file.")); };
    reader.readAsDataURL(file);
  });
}

async function sendImage() {
  const to = inputTo.value.trim();
  const phoneNumberId = inputLine.value.trim();
  const file = imageFileInput && imageFileInput.files ? imageFileInput.files[0] : null;
  const caption = imageCaptionInput ? imageCaptionInput.value.trim() : "";

  if (!to) {
    resultBox.textContent = "Select a customer first.";
    return;
  }

  if (!file) {
    resultBox.textContent = "Please choose an image first.";
    return;
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    resultBox.textContent = "Please use JPG, PNG, or WEBP only.";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    resultBox.textContent = "Image is too large. Please choose an image under 5MB.";
    return;
  }

  resultBox.textContent = "Uploading image...";

  try {
    const imageDataUrl = await fileToDataUrl(file);
    const res = await fetch("/api/send-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        phoneNumberId,
        imageDataUrl,
        filename: file.name,
        mimeType: file.type,
        caption
      })
    });

    const data = await res.json();

    if (data.ok) {
      resultBox.textContent = "Image sent successfully.";
      imageFileInput.value = "";
      if (imageCaptionInput) imageCaptionInput.value = "";
      selectedPhone = to;
      selectedConversationKey = selectedConversationKey || conversationKey(to, phoneNumberId, "");
      markConversationRead(selectedConversationKey);
      loadMessages();
    } else {
      resultBox.textContent = "Failed: " + (data.error || "Image send failed");
    }
  } catch (error) {
    resultBox.textContent = "Failed: image upload error.";
  }
}

async function updateStatus(status) {
  const phone = inputTo.value.trim() || selectedPhone;
  if (!phone) {
    resultBox.textContent = "Select a customer first.";
    return;
  }

  resultBox.textContent = "Updating status...";

  try {
    const res = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, status })
    });

    const data = await res.json();

    if (data.ok) {
      const key = selectedConversationKey || conversationKey(phone, inputLine.value.trim(), "");
      setStatusOverride(key, status);
      const currentConversation = getCurrentConversationForState();
      if (currentConversation) {
        currentConversation.status = status;
        await saveConversationStateToGoogleSheet(currentConversation);
      }
      if (conversationStatusSelect) conversationStatusSelect.value = status;
      resultBox.textContent = "Status updated: " + status;
      loadMessages();
    } else {
      resultBox.textContent = "Failed: " + (data.error || "Unknown error");
    }
  } catch (error) {
    resultBox.textContent = "Failed: status update error.";
  }
}

document.getElementById("sendBtn").addEventListener("click", sendReply);
document.getElementById("sendImageBtn").addEventListener("click", sendImage);

if (bookingStatusNote) {
  bookingStatusNote.addEventListener("focus", function() {
    bookingNoteIsEditing = true;
    setBookingNoteDraft(bookingStatusNote.dataset.draftKey || "", bookingStatusNote.value || "");
  });

  bookingStatusNote.addEventListener("input", function() {
    bookingNoteIsEditing = true;
    setBookingNoteDraft(bookingStatusNote.dataset.draftKey || "", bookingStatusNote.value || "");
  });

  bookingStatusNote.addEventListener("blur", function() {
    bookingNoteIsEditing = false;
    setBookingNoteDraft(bookingStatusNote.dataset.draftKey || "", bookingStatusNote.value || "");
  });
}

Array.from(document.querySelectorAll("[data-booking-status-action]")).forEach(function(btn) {
  btn.addEventListener("click", function() {
    updateSelectedBookingStatus(btn.dataset.bookingStatusAction || "");
  });
});

if (bookingSendCustomerUpdateBtn) {
  bookingSendCustomerUpdateBtn.addEventListener("click", sendSelectedBookingUpdateToCustomer);
}

document.getElementById("copyPhoneBtn").addEventListener("click", function() {
  const phone = inputTo.value.trim() || selectedPhone;
  if (!phone) return;
  if (navigator.clipboard) navigator.clipboard.writeText(phone);
  resultBox.textContent = "Phone copied: " + phone;
});

document.getElementById("markReadBtn").addEventListener("click", function() {
  const phone = inputTo.value.trim() || selectedPhone;
  if (!phone) return;
  markConversationRead(selectedConversationKey);
  resultBox.textContent = "Marked as read.";
  renderAll();
});

function insertQuickReply(text) {
  inputBody.value = text || "";
  inputBody.focus();
}

Array.from(document.querySelectorAll(".quick-btn")).forEach(function(btn) {
  btn.addEventListener("click", function() {
    insertQuickReply(btn.getAttribute("data-text") || "");
  });
});

const quickRepliesWrap = document.getElementById("quickRepliesWrap");
const topbarQuickRepliesBtn = document.getElementById("topbarQuickRepliesBtn");

function closeQuickRepliesMenu() {
  if (!quickRepliesWrap || !topbarQuickRepliesBtn) return;
  quickRepliesWrap.classList.remove("open");
  topbarQuickRepliesBtn.setAttribute("aria-expanded", "false");
}

if (quickRepliesWrap && topbarQuickRepliesBtn) {
  topbarQuickRepliesBtn.addEventListener("click", function(event) {
    event.stopPropagation();
    const isOpen = quickRepliesWrap.classList.toggle("open");
    topbarQuickRepliesBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  Array.from(quickRepliesWrap.querySelectorAll(".quick-reply-item")).forEach(function(btn) {
    btn.addEventListener("click", function(event) {
      event.stopPropagation();
      insertQuickReply(btn.getAttribute("data-text") || "");
      closeQuickRepliesMenu();
    });
  });

  document.addEventListener("click", function(event) {
    if (!quickRepliesWrap.contains(event.target)) {
      closeQuickRepliesMenu();
    }
  });

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      closeQuickRepliesMenu();
    }
  });
}

Array.from(document.querySelectorAll(".status-btn")).forEach(function(btn) {
  btn.addEventListener("click", function() {
    updateStatus(btn.getAttribute("data-status") || "Need Follow-up");
  });
});

if (customerInternalNote) {
  customerInternalNote.addEventListener("input", function() {
    if (!selectedConversationKey) return;
    internalNotesMap[selectedConversationKey] = customerInternalNote.value || "";
    saveInternalNotesMap();
    if (customerInternalNoteStatus) {
      customerInternalNoteStatus.textContent = customerInternalNote.value.trim() ? "Internal note saved in this browser." : "Internal note cleared in this browser.";
    }
  });
}


if (conversationStatusSelect) {
  conversationStatusSelect.addEventListener("change", function() {
    updateStatus(conversationStatusSelect.value || "Open");
  });
}

if (assigneeSelect) {
  assigneeSelect.addEventListener("change", async function() {
    if (!selectedConversationKey) return;
    const value = assigneeSelect.value || "Unassigned";
    setAssignee(selectedConversationKey, value);
    if (assigneeDisplay) {
      assigneeDisplay.className = "assignee-chip " + assigneeClass(value);
      assigneeDisplay.textContent = "Assigned: " + value;
    }
    const currentConversation = getCurrentConversationForState();
    if (currentConversation) {
      currentConversation.assignee = value;
      await saveConversationStateToGoogleSheet(currentConversation);
    }
    resultBox.textContent = "Assigned to: " + value;
    renderAll();
  });
}

if (chatTagsMenuBtn && chatTagsPopover) {
  chatTagsMenuBtn.addEventListener("click", function(event) {
    event.stopPropagation();
    if (chatTagsMenuBtn.disabled) return;
    chatTagsPopover.classList.toggle("is-hidden");
  });

  chatTagsPopover.addEventListener("click", function(event) {
    event.stopPropagation();
  });

  document.addEventListener("click", closeChatTagsPopover);
}

if (tagPicker) {
  Array.from(tagPicker.querySelectorAll('input[type="checkbox"]')).forEach(function(input) {
    input.addEventListener("change", async function() {
      if (!selectedConversationKey) return;
      const tags = Array.from(tagPicker.querySelectorAll('input[type="checkbox"]:checked')).map(function(item) {
        return item.value;
      });
      setTags(selectedConversationKey, tags);
      const currentConversation = getCurrentConversationForState();
      if (currentConversation) {
        currentConversation.tags = normalizeTags(tags);
        await saveConversationStateToGoogleSheet(currentConversation);
      }
      resultBox.textContent = tags.length ? "Tags updated: " + tags.join(", ") : "Tags cleared.";
      closeChatTagsPopover();
      renderAll();
    });
  });
}

searchBox.addEventListener("input", renderAll);
branchFilter.addEventListener("change", renderAll);
statusFilter.addEventListener("change", renderAll);
if (assigneeFilter) assigneeFilter.addEventListener("change", renderAll);
if (tagFilter) tagFilter.addEventListener("change", renderAll);
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", function() {
    searchBox.value = "";
    branchFilter.value = "";
    statusFilter.value = "";
    if (assigneeFilter) assigneeFilter.value = "";
    if (tagFilter) tagFilter.value = "";
    renderAll();
  });
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
    const incomingPhoneNumberId = getIncomingPhoneNumberId(value);
    const lineConfig = getLineConfig(incomingPhoneNumberId, value?.metadata?.display_phone_number || "");
    const profileName = value?.contacts?.[0]?.profile?.name || "";

    conversationPhoneNumberId[from] = incomingPhoneNumberId;

    console.log("Incoming message received on:", lineConfig.branch, incomingPhoneNumberId, value?.metadata?.display_phone_number || "");

    const originalText = getIncomingMessageText(message);
    const text = normalizeText(originalText);
    const optEventDate = getDubaiTimestamp();
    const autoIntentWorkflow = (
      isOptInText(text) ||
      isOptOutText(text) ||
      isReminderOptInDeclineText(text)
    ) ? null : getAutoIntentWorkflow(originalText || text);

    if (autoIntentWorkflow && autoIntentWorkflow.status) {
      setConversationStatus(from, autoIntentWorkflow.status);
      await saveConversationStateToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        branch: lineConfig.branch,
        status: autoIntentWorkflow.status,
        assignee: autoIntentWorkflow.assignee || "Unassigned",
        tags: autoIntentWorkflow.tags || [],
        updatedBy: "Auto Intent Tags"
      });
    }

    if (isOptInText(text)) {
      setConversationStatus(from, "Opted In");

      addInboxMessage(
        from,
        "customer",
        originalText,
        "Opted In",
        incomingPhoneNumberId,
        {
          customerName: profileName,
          messageType: "Opt-in",
          extraFields: {
            opt_in: "yes",
            opt_in_date: optEventDate,
            opt_in_source: "Auto-reply WhatsApp - Reminder and Offers",
            opt_out: "",
            opt_out_date: ""
          }
        }
      );

      const optInReply =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تم حفظ موافقتك بنجاح ✅\n\n" +
        "سنستخدم هذا الرقم فقط لإرسال تذكيرات المتابعة والعروض الخاصة من Iconic Hair Care.\n\n" +
        "لإيقاف التذكيرات والعروض في أي وقت، أرسل: STOP أو إيقاف\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Your opt-in has been saved successfully ✅\n\n" +
        "We will use this number only for service follow-up reminders and occasional special offers from Iconic Hair Care.\n\n" +
        "To stop reminders and offers at any time, send: STOP";

      await sendWhatsAppMessage(from, optInReply, incomingPhoneNumberId);
      addInboxMessage(from, "bot", optInReply, "Opted In", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });

      return res.sendStatus(200);
    }

    if (isOptOutText(text)) {
      setConversationStatus(from, "Opted Out");

      addInboxMessage(
        from,
        "customer",
        originalText,
        "Opted Out",
        incomingPhoneNumberId,
        {
          customerName: profileName,
          messageType: "Opt-out",
          extraFields: {
            opt_in: "no",
            opt_in_date: "",
            opt_in_source: "",
            opt_out: "yes",
            opt_out_date: optEventDate
          }
        }
      );

      const optOutReply =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تم إيقاف تذكيرات المتابعة والعروض لهذا الرقم ✅\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Service follow-up reminders and offers have been stopped for this number ✅";

      await sendWhatsAppMessage(from, optOutReply, incomingPhoneNumberId);
      addInboxMessage(from, "bot", optOutReply, "Opted Out", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });

      return res.sendStatus(200);
    }


    if (isReminderOptInDeclineText(text)) {
      setConversationStatus(from, "Reminder Declined");

      addInboxMessage(
        from,
        "customer",
        originalText,
        "Reminder Declined",
        incomingPhoneNumberId,
        {
          customerName: profileName,
          messageType: "Reminder Opt-in Declined",
          extraFields: {
            opt_in: "no",
            opt_in_date: "",
            opt_in_source: "Auto-reply WhatsApp - Reminder and Offers declined",
            opt_out: "",
            opt_out_date: ""
          }
        }
      );

      const declineReply =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تمام، لن ندخلك في تذكيرات المتابعة أو العروض الآن ✅\n\n" +
        "إذا احتجت أي مساعدة، فريقنا جاهز للرد عليك.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "No problem, we will not add you to service follow-up reminders or offers now ✅\n\n" +
        "If you need any help, our team is ready to assist you.";

      await sendWhatsAppMessage(from, declineReply, incomingPhoneNumberId);
      addInboxMessage(from, "bot", declineReply, "Reminder Declined", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });

      return res.sendStatus(200);
    }

    const incomingCustomerImageBody = message.type === "image" ? buildIncomingCustomerImageBody(message) : "";
    const customerMessageBody = incomingCustomerImageBody || (profileName ? `${profileName}: ${originalText}` : originalText);
    const customerMessageStatus = autoIntentWorkflow?.status || "Bot";
    const customerMessageType = incomingCustomerImageBody
      ? "Customer Image Message"
      : (autoIntentWorkflow?.status ? `Customer Intent - ${autoIntentWorkflow.status}` : "Customer Message");

    addInboxMessage(
      from,
      "customer",
      customerMessageBody,
      customerMessageStatus,
      incomingPhoneNumberId,
      {
        customerName: profileName,
        messageType: customerMessageType
      }
    );

    if (autoIntentWorkflow?.status === "Booking Request") {
      await saveBookingRequestToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        customerName: profileName,
        branch: lineConfig.branch,
        message: originalText || customerMessageBody || "Customer selected Book / Booking Request",
        requestType: "Booking Request",
        bookingStatus: "Pending"
      });
    }

    const hour = getDubaiHour();
    console.log("Dubai hour:", hour);

    let replyText = "";
    let replyButtons = null;
    let replyOptions = {};
    let sendReminderOptInPrompt = false;
    const branchNameAr = getArabicBranchName(lineConfig.branch);

    /* خارج أوقات العمل — معطل مؤقتاً للاختبار حتى تظهر الأزرار دائماً */
    if (false && (hour < 10 || hour >= 19)) {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "شكراً لتواصلك معنا.\n\n" +
        "تم استلام رسالتك بنجاح، وسيقوم فريقنا بالرد عليك في أقرب وقت خلال ساعات العمل.\n\n" +
        "ساعات العمل:\n" +
        "10:00 صباحاً إلى 7:00 مساءً\n\n" +
        `📍 موقع فرع ${branchNameAr}:\n${lineConfig.locationUrl}\n\n` +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Thank you for contacting us.\n\n" +
        "Your message has been received successfully. A member of our team will get back to you as soon as possible during working hours.\n\n" +
        "Working hours:\n" +
        "10:00 AM to 7:00 PM\n\n" +
        `📍 ${lineConfig.branch} branch location:\n${lineConfig.locationUrl}`;
    }

    /* زر الموقع الحقيقي — يرسل CTA URL يفتح Google Maps حسب الفرع تلقائياً */
    else if (
      text.includes("location_branch") ||
      text.includes("open_location") ||
      text.includes("location") ||
      text.includes("locations") ||
      text.includes("map") ||
      text.includes("maps") ||
      text.includes("موقع") ||
      text.includes("الموقع") ||
      text.includes("فرع") ||
      text.includes("فروع")
    ) {
      setConversationStatus(from, "Location Requested");

      const locationBody = buildLocationMessageBody(incomingPhoneNumberId);
      const locationResult = await sendWhatsAppCtaUrlMessage(
        from,
        locationBody,
        "Open Location",
        lineConfig.locationUrl,
        incomingPhoneNumberId
      );

      if (locationResult.ok) {
        addInboxMessage(
          from,
          "bot",
          getLocationBodyForLog(incomingPhoneNumberId),
          "Location Requested",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "Location CTA"
          }
        );
      } else {
        const fallbackLocationText =
          `${BUSINESS_NAME_SPACED} ✨\n\n` +
          "تعذر إرسال زر الموقع حالياً.\n\n" +
          `موقع فرع ${branchNameAr}:\n${lineConfig.locationUrl}\n\n` +
          "------------------------------\n\n" +
          `${BUSINESS_NAME_SPACED} ✨\n\n` +
          "The location button could not be sent right now.\n\n" +
          `${lineConfig.branch} branch location:\n${lineConfig.locationUrl}`;

        await sendWhatsAppMessage(from, fallbackLocationText, incomingPhoneNumberId);
        addInboxMessage(
          from,
          "bot",
          fallbackLocationText,
          "Location Fallback",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "Location Fallback"
          }
        );
      }

      return res.sendStatus(200);
    }

    /* زر الاتصال الحقيقي — يرسل تمبلت فيه Call Now حسب الفرع تلقائياً */
    else if (
      text.includes("call") ||
      text.includes("call_branch") ||
      text.includes("اتصل") ||
      text.includes("اتصال")
    ) {
      setConversationStatus(from, "Call Requested");

      const callTemplateName = getCallNowTemplateName(incomingPhoneNumberId);
      const sendResult = await sendWhatsAppTemplate(
        from,
        callTemplateName,
        incomingPhoneNumberId,
        CALL_NOW_TEMPLATE_LANGUAGE,
        { includeHeaderImage: false }
      );

      const callLogText = getCallNowBodyForLog(incomingPhoneNumberId);

      if (sendResult.ok) {
        addInboxMessage(
          from,
          "bot",
          callLogText,
          "Call Requested",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "Call Now Template"
          }
        );
      } else {
        const fallbackCallText =
          `${BUSINESS_NAME_SPACED} ✨\n\n` +
          "تعذر إرسال زر الاتصال حالياً.\n\n" +
          `يمكنك التواصل مع فرع ${branchNameAr} على الرقم:\n${lineConfig.displayNumber}\n\n` +
          "------------------------------\n\n" +
          `${BUSINESS_NAME_SPACED} ✨\n\n` +
          "The Call Now button could not be sent right now.\n\n" +
          `You can contact our ${lineConfig.branch} branch on:\n${lineConfig.displayNumber}`;

        await sendWhatsAppMessage(from, fallbackCallText, incomingPhoneNumberId);
        addInboxMessage(
          from,
          "bot",
          fallbackCallText,
          "Call Fallback",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "Call Now Fallback"
          }
        );
      }

      return res.sendStatus(200);
    }

    /* طلب تذكير المتابعة */
    else if (
      text.includes("reminder") ||
      text.includes("reminders") ||
      text.includes("follow-up") ||
      text.includes("follow up") ||
      text.includes("تذكير") ||
      text.includes("ذكرني") ||
      text.includes("متابعة الخدمة")
    ) {
      replyText = buildReminderOptInBody();
      replyButtons = getReminderOptInButtons();
    }

    /* V31.5 — إرسال فيديو تلقائي عند طلب الصور أو الميديا */
    else if (isAutoVideoRequestText(text)) {
      setConversationStatus(from, "Media Requested");

      const videoUrl = getAutoReplyVideoUrl(req);
      const videoCaption = buildAutoVideoCaption();
      const videoResult = await sendWhatsAppVideoMessage(from, videoUrl, videoCaption, incomingPhoneNumberId);

      if (videoResult.ok) {
        addInboxMessage(
          from,
          "bot",
          `[Video sent] ${AUTO_REPLY_VIDEO_FILENAME}\n${videoCaption}`,
          "Media Requested",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "Auto Video Reply"
          }
        );

        const afterVideoBody = buildAfterVideoBody();
        const afterVideoButtons = getConsultActionButtons();

        await sendWhatsAppButtonMessage(from, afterVideoBody, afterVideoButtons, incomingPhoneNumberId);
        addInboxMessage(
          from,
          "bot",
          formatButtonLog(afterVideoBody, afterVideoButtons),
          "Media Requested",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "Bot Reply"
          }
        );
      } else {
        const videoFallbackText =
          `${BUSINESS_NAME_SPACED} ✨\n\n` +
          "تعذر إرسال الفيديو حالياً، لكن فريقنا جاهز يرسل لك التفاصيل داخل المحادثة.\n\n" +
          "------------------------------\n\n" +
          `${BUSINESS_NAME_SPACED} ✨\n\n` +
          "The video could not be sent right now, but our team can share the details with you inside this chat.";

        await sendWhatsAppMessage(from, videoFallbackText, incomingPhoneNumberId);
        addInboxMessage(
          from,
          "bot",
          videoFallbackText,
          "Media Fallback",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "Auto Video Fallback"
          }
        );
      }

      return res.sendStatus(200);
    }

    /* 1 — حجز استشارة */
    else if (
      text === "1" ||
      text === "١" ||
      text.includes("احجز") ||
      text.includes("حجز موعد") ||
      text.includes("موعد") ||
      text.includes("appointment") ||
      text.includes("book consultation") ||
      text.includes("book appointment") ||
      text.includes("book")
    ) {
      setConversationStatus(from, "Booking Request");

      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        `تم استلام طلب الحجز مع فرع ${branchNameAr} بنجاح ✅\n\n` +
        "فريق Iconic Hair Care سيراجع المحادثة ويرد عليك بالخطوة المناسبة في أقرب وقت.\n\n" +
        "إذا عندك وقت مفضل أو ملاحظة إضافية، يمكنك إرسالها هنا.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        `Your booking request with our ${lineConfig.branch} branch has been received successfully ✅\n\n` +
        "The Iconic Hair Care team will review the conversation and reply with the next suitable step as soon as possible.\n\n" +
        "If you have a preferred time or any additional note, you may send it here.";

      replyButtons = getConsultActionButtons();
      sendReminderOptInPrompt = true;
    }

    /* 2 — الخدمات: بوابة ذكية أعمق */
    else if (
      text === "2" ||
      text === "٢" ||
      text.includes("service") ||
      text.includes("services") ||
      text.includes("خدمات") ||
      text.includes("الخدمات")
    ) {
      setConversationStatus(from, "Service Interest");

      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "خلينا نختصر عليك الطريق.\n\n" +
        "اختر أكثر نقطة تهمك الآن، وسنعطيك توجيه واضح بدون كلام عام:\n\n" +
        "1️⃣ مظهر طبيعي وغير واضح\n" +
        "2️⃣ معرفة السعر حسب حالتك\n" +
        "3️⃣ استشارة خاصة مع الفريق\n\n" +
        "إذا تحب تشوف صور أو فيديو قصير عن الخدمة، فقط اكتب: صورة أو فيديو، وسيصلك المحتوى مباشرة.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Let us guide you clearly.\n\n" +
        "Choose what matters most right now, and we will direct you to the right next step:\n\n" +
        "1️⃣ Natural, undetectable look\n" +
        "2️⃣ Price based on your case\n" +
        "3️⃣ Private team consultation\n\n" +
        "If you would like to see photos or a short video about the service, just type: photo or video, and we will send it to you directly.";

      replyButtons = getServicesDeepMenuButtons();
    }

    /* مظهر طبيعي */
    else if (
      text.includes("natural") ||
      text.includes("طبيعي") ||
      text.includes("طبيعية") ||
      text.includes("مظهر طبيعي")
    ) {
      setConversationStatus(from, "Service Interest");

      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تمام، هذا أهم سؤال.\n\n" +
        "المظهر الطبيعي لا يعتمد على الشعر فقط، بل على 3 أشياء: لون مناسب، كثافة مدروسة، وتوزيع ينسجم مع شكل الوجه.\n\n" +
        "هدفنا أن تكون النتيجة مرتبة وطبيعية بدون مبالغة أو شكل واضح.\n\n" +
        "أفضل خطوة: احجز استشارة قصيرة حتى يحدد الفريق الأنسب لك بخصوصية كاملة.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Great question.\n\n" +
        "A natural result depends on the right color, balanced density, and a design that matches your face shape.\n\n" +
        "Our goal is a refined look that feels natural, not overdone.\n\n" +
        "Best next step: book a short private consultation so the team can guide you properly.";

      replyButtons = getActionButtons();
    }

    /* السعر */
    else if (
      text === "3" ||
      text === "٣" ||
      text.includes("price") ||
      text.includes("prices") ||
      text.includes("cost") ||
      text.includes("offer") ||
      text.includes("offers") ||
      text.includes("سعر") ||
      text.includes("السعر") ||
      text.includes("الاسعار") ||
      text.includes("الأسعار") ||
      text.includes("عرض") ||
      text.includes("عروض")
    ) {
      setConversationStatus(from, "Price Question");

      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "أكيد، السعر لازم يكون واضح — لكن ما نعطي رقم عشوائي قبل فهم الحالة.\n\n" +
        "الفرق بالسعر يكون عادة حسب المساحة المطلوبة، الكثافة، نوع الحل، والتفاصيل المناسبة لشكل العميل.\n\n" +
        "حتى نعطيك توجيه صحيح، اكتب لنا:\n" +
        "• هل تريد تغطية خفيفة أو حل كامل؟\n" +
        "• الوقت المناسب للتواصل؟\n\n" +
        "أو اضغط اتصال للتحدث مباشرة مع الفريق.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Sure, price should be clear — but we do not give a random number before understanding the case.\n\n" +
        "It depends on the area, density, solution type, and the details that fit you best.\n\n" +
        "Please send:\n" +
        "• Light coverage or full solution?\n" +
        "• Best time to contact you?\n\n" +
        "Or tap Call to speak directly with the team.";

      replyButtons = getConsultActionButtons();
    }

    /* استشارة خاصة */
    else if (
      text.includes("consult") ||
      text.includes("استشارة") ||
      text.includes("خاص") ||
      text.includes("خاصة")
    ) {
      setConversationStatus(from, "Consultation Request");

      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تم استلام طلب الاستشارة بنجاح ✅\n\n" +
        "تم تحويل محادثتك إلى فريق الاستشارات في Iconic Hair Care، وسيتم الرد عليك في أقرب وقت ممكن بسرية واهتمام.\n\n" +
        "يمكنك إرسال أي ملاحظة إضافية هنا، وسيقوم الفريق بمراجعتها قبل التواصل معك.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Your consultation request has been received successfully ✅\n\n" +
        "Your conversation has been forwarded to the Iconic Hair Care consultation team, and they will reply as soon as possible with privacy and care.\n\n" +
        "You may send any additional note here, and our team will review it before contacting you.";

      replyButtons = getConsultActionButtons();
      sendReminderOptInPrompt = true;
    }

    /* 5 — الموقع وساعات العمل */
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
      replyText = buildLocationMessageBody(incomingPhoneNumberId);

      replyButtons = null;
    }

    /* 6 — التحدث مع موظف */
    else if (
      text === "6" ||
      text === "٦" ||
      text.includes("موظف") ||
      text.includes("فريق") ||
      text.includes("support") ||
      text.includes("team") ||
      text.includes("human")
    ) {
      setConversationStatus(from, "Talk to Team");

      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        `تم تحويل محادثتك إلى فريق فرع ${branchNameAr} ✅\n\n` +
        "سيتم الرد عليك في أقرب وقت ممكن.\n\n" +
        "يمكنك إرسال أي ملاحظة إضافية هنا.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        `Your conversation has been forwarded to our ${lineConfig.branch} team ✅\n\n` +
        "They will reply as soon as possible.\n\n" +
        "You may send any additional note here.";

      replyButtons = getAfterCallButtons();
    }

    /* القائمة الرئيسية */
    else {
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "أهلًا بك في Iconic Hair Care.\n\n" +
        "النتيجة الطبيعية تبدأ من اختيار صحيح.\n" +
        "يمكنك الآن حجز استشارة، معرفة خدماتنا، أو فتح موقع الفرع مباشرة.\n\n" +
        "اختر ما يناسبك:\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Welcome to Iconic Hair Care.\n\n" +
        "A natural result starts with the right choice.\n" +
        "You can book a consultation, explore our services, or open the branch location directly.\n\n" +
        "Please choose:";

      replyButtons = getMainMenuButtons();
      replyOptions = { headerImageUrl: MAIN_MENU_HEADER_IMAGE_URL };
    }

    /* إرسال الرد للعميل */
    if (replyButtons && replyButtons.length > 0) {
      await sendWhatsAppButtonMessage(from, replyText, replyButtons, incomingPhoneNumberId, replyOptions);
      addInboxMessage(from, "bot", formatButtonLog(replyText, replyButtons), conversationStatus[from] || "Bot", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });
    } else {
      await sendWhatsAppMessage(from, replyText, incomingPhoneNumberId);
      addInboxMessage(from, "bot", replyText, conversationStatus[from] || "Bot", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });
    }

    if (sendReminderOptInPrompt) {
      const reminderOptInBody = buildReminderOptInBody();
      const reminderOptInButtons = getReminderOptInButtons();

      await sendWhatsAppButtonMessage(from, reminderOptInBody, reminderOptInButtons, incomingPhoneNumberId);
      addInboxMessage(
        from,
        "bot",
        formatButtonLog(reminderOptInBody, reminderOptInButtons),
        conversationStatus[from] || "Bot",
        incomingPhoneNumberId,
        {
          customerName: profileName,
          messageType: "Reminder Opt-in Prompt"
        }
      );
    }

    /* إشعار الموظف فقط عند طلب استشارة */
    const shouldNotifyStaff = autoIntentWorkflow?.status === "Consultation Request";
    const staffNotificationRouting = getStaffNotificationRouting(incomingPhoneNumberId, value?.metadata?.display_phone_number || "");
    const staffNotificationNumber = staffNotificationRouting.number;

    if (shouldNotifyStaff) {
      console.log(`[Staff Notify Routing] branch=${staffNotificationRouting.branch} phoneNumberId=${staffNotificationRouting.phoneNumberId} env=${staffNotificationRouting.envName} fallback=${staffNotificationRouting.fallbackUsed} hasNumber=${staffNotificationRouting.hasNumber}`);
    }

    if (shouldNotifyStaff && !staffNotificationNumber) {
      console.log(`[Staff Notify Send] skipped branch=${staffNotificationRouting.branch} reason=missing_staff_number env=${staffNotificationRouting.envName}`);
    }

    if (shouldNotifyStaff && staffNotificationNumber) {
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
          (originalText || "") +
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
          (originalText || "") +
          "\n\n" +
          "Open Mini Inbox to review and reply from the landline number.";

        await sendStaffNotificationTextMessage(staffNotificationNumber, staffBody, incomingPhoneNumberId, staffNotificationRouting);
      } catch (staffError) {
        console.log(`[Staff Notify Send] failed branch=${staffNotificationRouting.branch} reason=exception env=${staffNotificationRouting.envName}`);
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
