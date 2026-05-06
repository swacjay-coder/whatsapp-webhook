const express = require("express");

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
app.use(express.json({ limit: "12mb" }));

const BOT_VERSION = "iconic-team-inbox-v22-7-send-button-visible-fix";

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
// Keep PHONE_NUMBER_ID as your default/Dubai number so old setup keeps working.
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const DUBAI_PHONE_NUMBER_ID = process.env.DUBAI_PHONE_NUMBER_ID || PHONE_NUMBER_ID || "1100042333191350";
const ABU_DHABI_PHONE_NUMBER_ID = process.env.ABU_DHABI_PHONE_NUMBER_ID || "1000146433192239";
const STAFF_NUMBER = process.env.STAFF_NUMBER;
const INBOX_USER = process.env.INBOX_USER || "admin";
const INBOX_PASS = process.env.INBOX_PASS || "123456";

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
    return [];
  }

  try {
    const response = await fetch(sheetUrl, { method: "GET" });
    const text = await response.text();

    if (!response.ok) {
      console.log("Google Sheet load HTTP failed:");
      console.log(response.status, text);
      return [];
    }

    const data = JSON.parse(text);

    if (!data.ok || !Array.isArray(data.messages)) {
      console.log("Google Sheet load returned unexpected data:");
      console.log(text);
      return [];
    }

    return data.messages.map((message) => ({
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
  } catch (error) {
    console.log("Google Sheet load failed:");
    console.log(error);
    return [];
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
    value.includes("yes, i agree to receive appointment reminders and service follow-ups from iconic hair care");
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
    { id: "private_consult", title: "استشارة / Consult" }
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
    const messages = await loadMessagesFromGoogleSheet();
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

    const messages = await loadMessagesFromGoogleSheet();
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
  const sheetMessages = await loadMessagesFromGoogleSheet();

  if (sheetMessages.length > 0) {
    return res.json({
      ok: true,
      source: "google_sheet",
      messages: sheetMessages
    });
  }

  return res.json({
    ok: true,
    source: "memory",
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
    addInboxMessage(
      to,
      "staff",
      `[Image sent] ${sanitizeMediaFilename(filename, "image/jpeg")}${caption ? "\n" + caption : ""}`,
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
      background-image: url("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//EADEQAAAFAgQFAwQCAwEBAAAAAAABAgMEBREQEjM0EyAhMDIxQWAGFCJAIyQVQnDQUP/aAAgBAQABBQL/ANIkuQuXwy5C/wAUfd4KP8ygMVRLyy7NxcLfQ2F1RhIermVR110wdZcH+ZdBVx0g1XTMN1ZpYblsuAjzD0B9R6C/LcXCnEkFSiIfeGPuTMccwT5gpIJ9IJaVdlZ5UqrJEr/NJMRKkiSeYF3TPKlysE241ViecSd04zJ6YpnWkmIUspSO25LZaDlXaSF19YOtOqM6u7f/ADTpBNdcDVbzBupR1hLqF4+vw2o2+0Sn+OmJ/tF2PQPPNtFJrSQuZIeLoYMiFlDhqBpULKwsGn3WhFq62zjVFqSRc63CQHZZjiGoeoSypQKKsFHUDYMLaUDuQ4qkhqaELJZD35Hj/hXqCO8bD0KSmQ33XdOSX9qn9JTWlhYfUCf5LWL6e2/YMSJ7ccSKwtRuuOPBKQQ63MlAyMJT1UkIIiDUyQycetJul0nEi/wyobUi/CndJRc98om1NLRPyXH1dLIZW4TNJccDVCaIk01pAKI0PtWgqC0Yco7Sw9Q8oegvtj0Dbi2xTXXVtFyvO5CccU4YSdgT1h9yY+5UCkmCeIwSkmFtJWTsSwczJNuQts48xLnM7ou6uFOmHGdacJ1Hce05W6p+4a0sa/5+qfp7Q5vQOOpaKdVFKBmpZmQaiPOkxRLhukMoCYTRD7Vq5xmgqnNKDtGbMO0hTYcZdQLflGccTIbvwy9fhc/bI8afu+Y1WKpVEdVAkmZxKSaw1DZZLsKbSspNJacDdJWUlpsmm8XpJNqU5kbcWazI7cpAsLmCkGkNuksnY6XCfjqbCVGgQZnEIEeL2i7qspzrmxTjLtYUqeaDSrMV+vad05O6gbtrSxr3n7fT+hjcXsOtn3yZROnOPrR6NsreXEpJJJDTbZdhyM26UilXODA4a/hs7bJFPL+1y+oqU6xGVg02p5cGmoZSRWFu16C3JMlFGbp15TsxzrzECwUFAlGg2ZVwpBLTLim0fEyqhSifLF3Rd1Y24mREyY7zSmXeqTpc/ipLtu6cjdQd21pY13z9vp/Q5LhxwmkT5apThiDCVIUxFQwm1u5b4dO26RA3BctQl8BlX8gS0p04EJLCP0HFk23PkqkSIDXBjvnmeGQzHpyECwMKPD0OLKJYWglplxjZUw9wFsOk43g7ou6sfo+nwqkEnUWMlJdNlcCWmQwXae0391C3bWljW/MUDQ5FelUmGp0vWHCOQ6y0lhHxuboJLrB3PItWVM183n09TpsW3dty1eTZLOoWzPBlwLjEYNoyxLFQMGDBHZUV/iIlM8VpxvhLpsnKCwe0XdWPrp8TTmKrQcixCkHGfZdS4jsvab27hbtrTxrnmKDock6RwGlmZrYQbq4UYo7RFhYW7lvhs7QT6wdz741ORw2zEJjjOISSU948FqJCZTxuyGejpbT/AGHqGJFhZKyOOkLig21JMsDBgweEV42nUmRpqcbo2s23YrnFZD2i7qxtwnxDqErTUISozpdRTZptuJMj7Lum/u4W7a0sa55+1B0OSpSDeeWrrSIuUe3xydt0iBuOSpO5nf8ASks5Ufo1Z7hxT6intcaUSP4pLeVwegIMycoS+hYIKSRhccGRpBgwYMKFxAe4qH287byMq6S9cg9ou6sbcJ8QfQS4xSGn2lR3upHSp+YiO/Ye0393C3bWljXPP2oOhjLc4bDiv522uI9HRkY9vjk7bp8afuMXlZWpCs0hpGdURGWP+jWnR7UVnqHWc6XGjQL4GEqMgl1YTJCXCUFoJQWmxmQMHjT3eGsVZnK7THMjxej2i5qRtwnxBj2qUAnkGk0KSs23IEtMhrC/Xkd0393C3bWljXPP2oOhgYqq7RbiltZptvj07bl407cYz1ZYijucEs0tBZU/o1hV5woqP6gMKQlYXDbMHEWQ+3dHBUMhkCCTsG3bh9FyPok/QwYMMLtIbO6ao3dtheVxvq29ou6kXcJ8cTSSiq8EJESQqM7HfTIa9T5XdORu4W7a0sa55+1A0Mau5hRkXT8en7cvGm7jGqbMvSl7z9E/Sq773pPSDy2GUhw0hbBGDaNAuZGhecpCcqzBgwYR0XEO7FQL+qjyYP8Aid0XtWLuE+PI42TialD+3cuKZO4DiFEtPK7pyN3C3bWljXPP2+n9DGs65+lC2vx6ftv9abuMaptCFK3v6KvSr9JqfKlbPsqIjDjXQlZVySzNgwdgY9BA6xZ20LzjaTuk9qxdynx5ZMdL7UqKuO76Ko8+/M7pyd3B6y2tLGueft9PaGNa3B+lB2fx6fti8aduMamV4foKadpxH+iYrZf3/QUVV4Q9+x6h5qwR+bK+izBgwoU7aVBX9RHlH0ntF3ViblPjyHhUYhPtOINtSFmhdNmk+0XI74St1T921pY13z9vp7QxrZfy+1CV/X+PVDakf407c4y0547v4vRVZXmDzs/oGK41/L7UR38O2ZZiT+Dr2oYMGDFP2tTP+Jovza6NvaLurE3KfHmMhVadmLxOPIXHdiSEvtYu+ErdU/dtaWNd8x9O6GNaR/EXUqM7Z/49UNqXjTtzgYMrlPbNEzNYU17Ox+jWWs0T0FJd4colXLtmn85HmYMGEldcQssequfnFRnfT4PaDupE3KfHnUklJqsE2XL2FPnG04yviIwd8JW6p+6a0sa75j6d2+NSa4kS2RcJzhS2l52/jtR2ifGnbrkrUeySIUmUbT17/ovNk6iS3kkIUaDgyCdYv2zEnqsGDEfq+ksrdRXxHqSjNI9ntB3ViblPh2JDBPtTYxx3rCk1CwzYPacvdU7dNaWNf8/9fp3b4qTmTOa4Uo7kVKlE8yXX47Udonxp265JLROtOo4K0mZKp0rjsl+jWogSKXLNh1KiV2zDp/meChAbzPPLyNPGZrpTOVkPaDurE3KfDnPCoQ0yWnW1NLSZoVSZxPNh7Tl7qnbprSx+oPP/AF+ndvyViJnQZ3EKQcZ5twnE/HKltE+NN3XLWIQI7FFlnGejSEvtEf6D7RONS2DjvkrrSaiSiI7l2XTslfkYMgYpiPxqjuVppPEfYTw2g9oO6sTcp8O1VYGdKiO8d5TDsKUUhp7TlbqnbprSx+oPP2+ndvyOI4jc+McaRcUmflNB3+OVLaI8KZueVxsnEVGCphZ9DhTXGFR5Lb6R17hYGQqMIn23GzQ5myKptVzklVyFxfmkHZtQP0MEnOtpJNNT3M71MY4hlg7oO6sTcp8O0oiUVVgcNQgS1RnjdS4xKO0mAf8AZa0sfqDUH07t+WdE+4afZNlZGYptSNII85dzN8OqW0R4Uzc8vqH2SebnQVx3fUmJC44h1RDpEtJ4Ed+c1B6Y20SKwhUlKiUnCwqNOJxK2lNGi94VW4IZlNupvzy1gwYMxAazOTHeEwV3nIjPBawe0HdWJuU+HbdaS6ioRFRnfQU6oZCk/lJgF/aa0sfqDU9vp3b8p+lRp5PtuMqaV6CJVFsHHmtPpJRH2VLSkpFRbaTAnpkfDqjtEeFM3PJ7+4daS6iZTFtHY0i/WNUnmAzWmzCKjHWCebUCUQzEDeQkLqDCA5WWSJ+tPLDi1rMjMUpw1tYn1E6nJfJ+K4wq4ZfcZNiuOBurRlkiU0sE4kxchnIGfSQq6zBjJnOM3wmai/xF02PdwuhYPaLurE3KfDt2E2KUhh9k2XPQeop+7b08fqDV9vp3b43B4zYKJKJEF2OoIWbZsVh5Ibq7BhE1lYJZGLkLpByG0hdRYQHawQeqTzgvc47ikSWVZmS+GVHaN+NM3HYOyhJpSHg/TnGDyqvYhdSCKQ+Q+6kg5kkfcyDBrWY6AkGRswXZBw6OTam2UNczsRt4pdEPMuO62ZgugTIdQCmyB9/JEF6S/KWrI0YPoDLpDZzHKeJlrLxXozXBaxd0XdWL0kJ8O0eNWp/GRlMjIhA6S2tLGv6p+n09t+w6yhwpVHzB2M4yZFYGQJxxITKkgpUm5ypI4zpkZmaSSOGtQjUxboj05toERF8NlN8VlNIVli05TLvaNNyepzT4doiAulPpCoEhJ/avg4bpgqfJMIpD6g1QyuzSmGghtKeyZByO24TtGYUHqM4QOlySH2D5D7F4UiEbTb6rmr1MwhBurQkmmpj3FXT41h6liv8AJC6M4pTdHUhwisnumVymUriOf4RYi0pbTyCsjGpwFS1/4RYpsQ4jfZsFsoWTlJYWHaQYOmSCH2byR9q7f7J8wmmyDJFLds3R2yDcVpsW+HniXdsOGkxwkDhIHDSLd4sDQRjhIvwUBVkJX6mFp6xGciZ7+VMVjiuNpJKcbi3fvgYtgXKQ9e/lIcNBjhIHCQMpF8WP/wCK8q6lAxHazG6vhtnmeejME0n157fvHzW+NGdhe+BnbtKVlO9+yZ2Ijv2D6DiJGZI9eR1eVJHcKDTWdViQmU8bi4cW3ZzpGZILvXIF3s6RnTgXbuDMiHEQOKgX+GvejXVAkH+KfE+w5+Ztq/HsSDsyzp87oQwg0m1YmTxUdg6vMYQ2agSMhSX/AMYrGdRdCBcy13MmUmXBSCTburOxJzE4R3LtHgovxaaJQNgg2qznaPCSVyRGbylGbIyIk/DX/FpxWTirC3DMF6c615EtkPF3sP6TWkXO6EufgbnRpOFxIWCCSNQQjKTzpIImzecQgkpsLdeU/RBEZ9938lOJullXbPBfgwuyTeCCNSy7R4SL5UOLJKFqUr4a74s+AkehePO6ec7LIltrMmlXLnkaLOlzulcJbTlUnI4R3IOrJBLuoNJNQQjKS15SPNIcZbJtPYMeDt7lfuqVYm0ma8qxZTau0eC/COm6HWiCHCUXceMwnwwt8MUm5JTYg4nMXtz5PzwS3l7DicyUFZHOorgkhabkgrEo7B13iKbSazbbJJKOxOGbimmibIF2VIzDgWHCBFbuLTmJJZSC05gkrF2z9G05U26EjKruOtZxwbETZgvS/X4bbs2x9v0z9biS91aaNZttkgGdiWs3FNtkRW/csLd6wsLC3dsLAvmDz2QNsm4aUEhKjsSlm4pCCT/y0yDjliSznMisDMiClG6ptski3/LVXBNXUDMkgyNw0NkksC/5fluLWBf+mEf/xAAcEQEAAwEBAQEBAAAAAAAAAAABABBgERIgsAL/2gAIAQMBAT8B/TMWdy/Ys7O13KuYK/quE8zmWSeYT18mV8/JRleRooyzRRlmijLNGYcy0ZhzK0ZdoIZdgfrIf//EACcRAAICAQMDAwUBAAAAAAAAAAABAhEDITFgEiAwEBNQBCJRYbAy/9oACAECAQE/Af6Ol8VYhuiWc6uofUe5JEc/5FOy+JSlRPLY7ISo90jlRHokNKOwmLgyH4GIzS7E2Khfoh+/SPAl5WLY+oQhQTHhHjaEyxSZAe/AkPzZY2OLTIzaI5S4yJ4aIr0g/SL9H8+h+RFm48aY8CPZPblF2OV6Di1qRdiYtiG/FHse2TIl6i/yY+K0ZER3K1G9DGuLZSJFakiO3FsgjGh6sW3FWZGQ1NiK4tklRdshGjcWi4rZmkYoMvSiC4HZfa2J+FsUvTLPpRH7mVSIqxLsvvsvvcjq77+IfcxeGQjqon90iMOlC1ZXkYhd0kJC718YyvFRoZLexCP5HqRjXmrz18wxiKEuL0V/Td//xAAyEAACAQEGBQMDBQACAwAAAAAAAQIRECAhMDFxAxIiMkFRYGETM0AjQnCBkVLQUGJy/9oACAEBAAY/Av8AsiTX+InIrgcuZ1M70dCTPtmh2nYdUTqkkdM8zWzS7izB5LfoeDwctVzZ9RxwwOXATuJPyeBteMzrmkdMkzp4dTsodp2nYdaSMeIjpdfaHE2sjvlVbHHhVTMZ4GJgaM7WdrO1mlnQ6H6jrZ8ZGFmhga3MTpZ1ZE//AJJb2LiRF65zOIIjchZPfJ1MXU/SdDrdbMEdrO1nYztduEsBR4lasrF+zp7WR3yaQo2VbaMToVTrTRjJ2dq/w7I/4dq/w1KxbZ2YFHqdJ1rK7UdqNLtY4mlmN6exLe3XBnNHNZxBEbkLJ75FZM5eHodUmYGETqbNTtX+Hav8OyP+HodzKwqzqjQQlFt/BGvs2e1kd8h8Lh6+pWWLKJClxMUdMcnqRWEaMXNoKKuKOrZV5eNmmNlUUlrdnsS3FF+T4Ki4UmVzGcQRG5Cye9+rKRfSM5Yp7leJidMcnFFeHgc08X7OntZHe/8ATg8fNnLFFZd2bWlxuuJLiT8PA5czA5WYlV2icfBy1xuT2HuQ3KUxoODRhqck3isxnEERuRsnve5pOhT9qs0wKJe25bWLe81HuOd6soirWL/BcmYdvoc3qhvNqjlZR4mGgpITtnsPc4e4jnisUdWopRE/3ZbOIIjcjZPe7U+lF4WfAoxXtyW1kd7rZWz6klj+FyxKC2tpIrHLqheoyjOR+bZ7D3IbiKD40VhYp/tFJZTOIIjcjZPe7vYox/sp7dltZHe7RFRfBRfg1ZP0qIW1yjs0MMn4Ec6E/QjKyew9yG4rKSVUcy0lYoSeDMHhks4giNyNk97rgv2uxzktfb0trI73XH0s5vX8J0Ob1EhRHco7mGRsNEkz6fpZPYe5DcVr9fA+GyouFN5LOIIjcjZPe45Epf8AIUCK9vS2sW9xsmzlIr8J8OxcSylmNzuyuX1sTQxE9h7kNxXHJd3qcsjmifKyGcQRG5Gye9ySsjL2/Laxb3JsqRRT8JoYnbjZ05sbHITI7E9h7kNxXKM54KxP9vkUo32cQRG5Gye9xxs5/b8trFvcnZH8JjsWRoYW0d5MTJERbE9h7kNxXXFjnFdNnK9BNO8ziCI3I2T3vf37fntZHe5OyH4bsWViYWVV6JMiInsPchuK9yyKS0eln0pvHxeZxBEbkbJ73v79vz2sjvcnZD8N2RzK2O7EmR3I7E9iW5DcW19tanIxSj4FFvqus4giNyNk97lbKfPt+e1kbkkSiKRF/hPiWKGbyjuoaIojsT2JbkNxbZH1ILEoViJ3GcQRG5Gye9yUrFwvb89rIXKHE9DAivP4TpqUYscBZlR3EISsRPYluQ3FkUZzQWFiUn0iktLWcQRG5Gye9yQ0KYn7entZDe6px8uxxl5/Coya+RSWovhZruRVmxKyexLchuLJcWNeLPpTeHgwsZxBEbkLJ73KE/l2cv8Ax9vT2shvdkn6DTFJeDHu/CU4rezlejKrTMlcqMluKfrZPYluQ3FlfKHGSExRm+qxnEERuQsnvdU4qyPpJnNH27PayG958aK0sUv2ikn+DJMaoVFwpvHMdyToaiXqKNk9iW5DcWW+JFaFGKa8CxxGcQRG5Cye91p+SlMLFwpsr7cntZHe9ys5orB2f+pWEq/guUV1FGc0WcnGdH4K5tBD9Dn9LZ7EtyG4sujHxILWzXBnNF1JiZG5Cye95xpiNSMBcPi4ehXxm09nT2sjvf5WVpVWdLwEng/kwaeVjJMUaYCkrjlBYlJIqnRoUeJWRXmWRy3ObwNFPJT1tnsS3IbizGminiz6cyTERuQsnvfrFYo5WjXE/UbaK1SysWPyyj7vZ09rI75HLIcuEqox1NTDQ/UdDCRgzWzFmMjolicsUqFZNmAk/F1yj3HWqWViyk6UMZ4mEjW+lZsfU8XJ7EtyG4s1x8jhLwfNiI3IWT3yPkeHSYFU2UkkYyxOmRrZqYs7j9MoytROGpFvWns2e1i3yaNHRSI/3GMWrMGYcQ+6z7rPuHVKzSpo4leJ1HQqXupVHKElsU5GUswmfcZ91kY/UdCj1MbauynqJXJ7D3IbizueGDRRqxEbkLJ75PVGpzcNqJRxbMbOmR9xj/UZ90xmY2drMcCrjVmHs2UTQUqZeKMToqYRO00NDCJ1RP1K2YLK6kVR0I7TtNDnmuq5yo2KeDml/V2S+BvlISa0Ys6hWCNDmoJXItLQ0HF+cvqRXydKMImMTQ0O0pKJjU0MPcGh2naafg6Hadphbgcz1OVeTEp/4/Q7TT39gVZU/s+f4m1O41yuWJzPJ1Nc+mf3Gphm4s7ka+0ULJ2ymLKwKXa2YFInM8miKv8AAq85lbOXOXtDtO0xiLIqN+p8ZLFl1t5bNLa+Ciya/gJVKHL6Zrt52qZ3aae0ULI5RWUyGLKVytyiy/jPqOVm+azEUl4z17brl0EsypS5TN7juzaFM921zdTuNfeXKrlF/F1DlMSiKlF/F/yc0zCyi0/i/Aqylnx/2d7/AP/EACkQAAICAQMEAwEBAQADAQAAAAABESExEEGhIFFhcTBgkYFAcFDB0OH/2gAIAQEAAT8h/wDpEcrueAeRErv/AIJJJRKJ/wDLSu6PIiHdErv9TSw2R3AUUatjSutsVEJyQFEpRLpTE4kp2gSdcw2UK05MCsRgyf4ECUO5bPUpkbPeYGGNmB2UCFLY8A5sG+BLJnJLihdEngVI2LY4FI7BFgNsK0GHyPBNaCQsKh5s1cTkc4vYRCJa23U3CNhMZFjcEsmgpbAkwgWgE2igjZeJSFhoLFOMJQSZG/0xWmQQ1lCEKO3XTcMct4IXv0jqIVI8XMQyVsSdCWl+BuP8jYfmRZ/Aa80VvRFbtCPKvZdU0x6Il9DsXjFOO0xJtkdmG5QS3WhTtGApPwEMKbJZIs+C3Tpo/Ip7g4SocRDQzpqrF8wm9hdFvRq0kQ/SNJCNPUalCadDhDRcETn5GPyepbyhEOSrhgk9vwNlF6P/AMadoE1wMJ3EmvtLoKJIsZ9iwKbj6Y4JxR9Y8DS7ddxocBm8MTKNo7ogFCcs2pP2hJZxMDY0KnEPQhJcM8/IiTpDeGa/op4IyUVG9dC3WUFuBUSMEf8A9Qu2C7QcykZiDsxaFBHlYSA4CE5cChJkmJzjo3Ft8zkCFFiT/giKzYci6yV8wk/YJUzia7nEGqOvmpRAquG7jeEolrPtklJYqSwxEWrI1mT96KkbNUDa16ITuAbsVtEY2uZGwTyHlZNWO6xXf6YskQKJasnRTW3BEm77BytvkJkH6KYMuBTSU0KsaQRpBAyISITtDui0ZMoEiEJRonR/H52LRsfZdECBW5NxMRhoShDVhlc8opzgfI9g4e6LBhkp4ikTqZJBzOnLnMCbZKEJiaxkky/BUyIFHT0F8c5Wi4HRwBrp9YbCNyx/apgcmV2CewipegjrW8WakLBGkIjVj5ezGAjfckJJISj6bC1oBdGHQ6ShXjMMRy22+5fh3EZHoxSQko1LqZbLwP7CDcbP5xRJlyCymkIWiEYaNhC1MmrMU6ZY/pKYwLfkJ2ryFF6RJRB4WnOi/qEf85INqEYJJwjLdlFMoQyxuJ/HOcKXA6OCR0mijsY+RiJZcNqNyCRLW3mLy78tC2xeetisdGdhKikJ/TWWxTYavAxTJGyB20shvzEleIedIfcXwtsvOjpG2IpGmTbsQnkHZXRWkdghCMNG2hXYc9yXMQxRLeLG9cB9aWsc9ZcUIBdCzJsc6L+o/Ci+yERFK5k9b2HWxcuBxX6b/InKFLga7nFF0UxEV4CVCaJppuRERXhTi40km462IyRGlG/07jVAWY6Ju2RGewuTLwVqQijKsS0j4HIga0bc0Q7sqGWTKygbO8nrIraSNzjazApEcWYE2JWuz2HrdaFLNlCMXBKZEOaXIb805E5IevxE/NCpAwiKE/O42D7B7MypYnPobE560DmaTha7lPSLE9NMU1TawPreRJEywg7iJuSByI9bUiUawKBH09CF0I3I6Fyw7tmkS6DYWPlwNh7JZN0oWRY7UWHCtCeyiQanKGdgxWxvQdYaGqH1mhjqfJIWw1syjFcvQaT3Q3OROSODOGtGrxAeUS6VGxRDdFicgSyp+Bciz8E5Gg4Gu5xelDG4UsYwWQe5hEzQzH18iLOrwX3kTLMsKwIgXzMY6YsybrDNlIuwUDYWBJpwNRlDVO4y7Qop2NKKM3BWdGSS38HaiZTfYIcdmN7oL68Tc5E5I4M4a0aUvAjGsApuGhwlyjOIkIShfAuRoOBrucXpQzwcM88QZuQ2trEo+vG3BpMs6SeC9HIDuFRFwJaRfyvS7QqO7Qjvu43e4gWaLbGBoQeQ5U1IoyJJ0q4TI8GzGoZ3vMdoxFUWe1DSzwN+kefeHn1zhrT00RVInHYcWIjYvYjEwmPYnRIsUdNw5hYOB0cEjpU75mCmxjC1AoqCKI+u8xYyyI3PTBJ9+ncL/hPB6RJwIPP1JIQSSk5HlCLKQ15Q8hGED7owWXaP6NRGNH9uQ7EdsQ5Vu0NK8DkTljhzhrpgNUVFbGbUPAtjzkPamRKBlNm/SOQOHA6OGT0KeByfdHgUrsf2BmLa5DfiPJsa/wAWdzeBWFh+RGWRA340sTbDZsNvIcdxSKFkSvbXlJieiaPTek5aJvSObOSH/OcNabkkCKU5G/wgWpjkv7SdNKHRF9I5g4cTo4Y30KY8R8GQuz+wIT6GIyvA9DUG/wDhylE+xiLe8RuKSyJEo0hkFKI5KRS8iNyGYDwFbJDSDiG07o46OfOWOLE/NawWMclSMKbAng2O6VwKZN6zoKezSOJ0ccb6DMV/gYQmJJ+vIwfojYfYSdNPTX/hwGJngwktD3J7fAmxkQgUkBaHkWD5M9bDRKSPBb0hI9A5c5w4U47pSymKsUVREOGiVJPsKoxWLCG7FjVc7QcDXc4I+lz/AOZNpICI3+vkX/UWNGeVBPAHi884/wCJhA2EOWJQJz1tWQJQiYQj7AWPb0LIwSLuUf2iE/iHLnMHFnHdLPRsbEwRbXyhYfDbsSV3FlPR6LnaDgdHFG66GZJ2q0i5rJH1/nqcoWNS5wwIyEy9xcsorJJJn5m5JIkmGzoZCnATZXIl8WCUa+7oUEIYRzcoxmzKp8HMnOHFnDXSyCB4RKagvwe2+wmeYI1krYlil8MnVc7RcDoePSPHQTIKlLGzfYkNwkeZ19frHpC6HpV2Ch5lURQkssSoiFC+V0JW2NKBzpVgMRyItzYWU/HkfoDrVT3xS9kJSw6ZiCIgcicwcGcFfA1IkeZHvVXQqD3UpaQUmtjKei5Gg4HRxOkTFOca21VAwkB3aDQn69WPSF0K6mGgbRnLKTJSLTJbYJbjcKRY+dyfkhkJLrdy65+NVE3uMx5FhDkRwxDj7Ma/kIi7QZyJzBwZwV8Ju/BH4iyUN4K6FxbUORKRYpCy9FyNBwOjgdImPBnQVslYwRA9wILZQvrpY9AXQ1mdyRUAzivcQV1yhBC0SUL5HgWi05bVDw0HKDKwUFO7EIa+KRH/AHMTcLuCFjcQaVpKvFf4GcicwcWcFfAyLrA4S8CsThBqoHoBk7N6LmaDgdHA6pTCFbGQb5FyiSc/mjmhYNNP66WPRFq8Gw4Ipj3cBKWKSKegMYE9EC6XZhE9yZxgaW0KhDJwAclxDEy2J8CEoY/MTEwXlktxJsZ6ZhjS29KiGrTuMLFWRqQyWs9GxzJzBxZwV8bSih+dFiTQsbmGbDwUzvJ5ocTXc4pt0E3Gmwi0tuI6iMEGaPwJmOyW4uMFWDOk6SyWWXJGqSZZJF9NLH1IzCh+TLih4k8KEnTXgaKRdiKcypCGfWMmFJA1vVoQsuDm4Ccsg/HIhpiWIYlIksmAG8cA1+zJFJLNpIvYhaSTpJmD6IJktSCJO2qFS7glSLASHg5E5g4M4K+N4Ji0qhvhL3KLi/wuaUx0rw2RFwOjjkdAmp0kvQg0VzHZ5eYE3B2TAiLsIiZjs2YgdGRdCJJEghj+BRkeQoYvptY+tFrwGpHNSvwNWszJIoGylJPwQag07ilRsL9fUn39QNXaBiZkByqBR5SbfAeBG4iCuPRD4oWw2wJLjjuxeEqEwFlMYAbkl8SKkybYhjJRNxaFukQqTqjLcrIwCdOVOcOHOCvjeChFqwqCE0IpJTHc8m+ON0cHqEggsFzSGCVHgSs/kOH5CvPLaSIgBGveNxNGecas6re3EyZNISXglLZz5P5xh2cLCfTSgzDCFnojWIViocpMmHMK+aeEOp7E26FEE+sRWCbB57m4g5EwTepQ0PKEaBBVT0IIQ4RtsQCkGB/bAjVlYjaU4MsDThIGlwDiyNxi3TDJPyelJIb2IcozgklLmLhRDwPBP+0v7x+HFeXZfHgbCW55MD8jbPJ+RPdHljga7iROdpix0CNYIIegLn4AM/k0DbJAlOUKMIg9BVLzGtkZvobiyJmE7+DZNo+SCS7ohhIQvpj0m6KpOPRgxdedGmlQigf8JZrHoTxZiaKNGErPRegRgCEI4c+RHCvwqYI6r2E5ZU38GbnljRztD+z7wm8yghWPUuxaRI3OwsJoknZZPI8iM12rEINtEkK0u7IT1rY7jkIh2RsLHx5pkw6pijLyzFx3g8ELVuybUHFmLMiXxWyOST+E8khPMdrBPFeaM6ijB7FDhOwQwuAkSotV9NLwZQkPPWtIEoNiC1Meco+3F2YkYRCRDIF8EDUjwIowQjJB7AbsBsYvA8u5yPcDGi3EcgWz/A5ASsOjKIG8zJFUzaxKMsmhOfhbhCsRc6KWXBj0PJJTPymQNSdweYp4ZBhTYITuBZIUmcCT0X0xmEJWS2F1JQRp6POiXTBGlyJdbmSRqcFpdDbWcCKMEExf6KbwJeg8DMhMcGhEIggYp3FCochqRUL4WRpRN+BOTfoggSjobgmxntpMEyq0jRGkEdDQkVMl6WL6YgJEnRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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");
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
      background-image: url("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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");
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
        url("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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");
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
      background-image: url("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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");
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
      background-image: url("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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");
      background-repeat: no-repeat;
      background-position: center center;
      background-size: min(760px, 76%);
      opacity: .16;
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
      background-image: url("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk1zL8ls6ZsfJusRWFCAKUUlU+PUK3PFc58Fbzj9VpNia8NnyGjo6lleLek7ZPNNwM1NFYqpqgCIeXM9Xnwvg4Zz1jEerE9Vdq/lVcteWXK+jV6OutvYDM9l2ql0tclQItars3Ea6PkuS+k7Xcw+ZAAAAAALerbLxw6BtHHewF0FGHzPPjJZvjnRDdQBCJgRCpinEmX8Wia7XRsPpNZs9nX6zO3tZk33M8qg7Td5Ls8bpHmvlyaKwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADEcs6rzCz29V5d1KJCimKoimqddx2nFzyXNnrWc3v2QjUcpnYMfOQGJx2zjnmv9isnEK+l68bJsFj0xFylUsbcxmnXYs+LFVy1V5cZC5jq+lyN7GV7uZu4enesxipyfe6dVtWr27Hlec7Lbsk0OtrpirTz8S7dxItUez21f6tw7c46KtyVokAAAA8/Guy8cL3X+QdfLwI0LfdENG6BoW/m5gIpK4pDz0c2Mpqdddeb27ns8aTm9mgxV3IweDyZqTUsF0mk4/5ewauYHpGu7UU3YkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxfMunczsyHTub9IiQqiu1E6hk9B081V7f6sbHM5JpqJAAApqgoSRKM2cT7uWabLk7mO8fPzzFfh5xMTZVct3M25XRXbetXbe75bdzzdNZ7I6bnu9w2I6LovS7Pm+ZdE6X01U1dLZ4n2zixV1HmfYzjNno/ODoO3cW6gZuaagAAADz8d7Dx8vdd5J1wugjRN70Q0vftE3w3EEQkos3dBMfh6svpR0O57MqK0FYAAIiYIiuCJkJiQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGc26RznUyfReddFioSrF7W01HxUZWth2u3cliqmsRIAAARIRMJFFdmNX0X02NXqmsbTrPz+dGQ8M+fGW8XpzPXer1bF5DHXIr5yabtrDy2L9jrPPbuWOl3OdU3j1b5lnb2ry9Vr8Pu7LPF+0cYt9HYuOdkHPuieY4tlbmJrsfq5r0eLiiqKhQAHn492Ljp6utcm6yXQRou9aKadveib5W4DJTMVh+ZZvA16ula9ucK6a4iKlAAAQkARFQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxfOej833Mp0XnPRsqiJXOd/5ZZ5t60nqB7pTETEyhQAAAAhI17YdFl0/243ctt21ra/F5sanV6fL83nXkMdVrW0erUPT6d7H4bGS6TEWM5h+E8Vj0+fE81m7Z6LO46blu+ts5p1PRt6yO1866J0W+Mdm4xu+jsnGuyxXRVBjeVdn1c5xvWkwdrqwOdKkQVAA8/Huw8dPX1nkvWi8CNF3rRTTt80Teq3EZR4fbr1c8qs52t89yYmYmAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADF826RzLczHSOadMyCXGcu6TzKzKdQ5p00rEoQFAAAABFPM+lcqMN0jmvVKz0VRlY8OVjLXLez08sazb2qnDWfTlMfze634sjtgfPkcb555bd7zbzarot9ddMwWT8/p1zzq3Jeqy1cX7TxTtfR2jivaStMZLdxWgaZ2zmhjup8Y2WunVWrsKqagDz8d7Fx09PW+RddLwI0TfNBNR3rQt8rcxlGkbxz6tS3jR9+rcBAQFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYrmHUOWWZjpvMumkpS4HmPUOW2ZzqHKeqlYlCAoAAAACjlPV+VGB6vybqEbKBMimZWRFSWm3dhMdj8/jvOs4HYtfxnzWbvn45sWr/m1egzTT7dc16ryrq+FzifbeIdtX+18T7aVxIiKhT4PdJxnwdW5cbtvXDunGx1UQXICzxvsfGj0df5B2AugjQt90I0vfuf7+bqCOedE5+af0PnO/VuiETMSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYrlHVuS2Z7qPK+qEwS+Hk/ZOSVb6vxrqBsAgICgAAAAI530PWDmO+6BnjrFVq6SAAClVCRbuxi4vBbRrPDHg89+xwzZ8/ot2734cnrvr1qvVuadOKOIdu4h116O28R7cVokAiJFvSt4oOGevN6qdqyPJuoHpgLHG+ycaPR2Dj3YS8CNB3/n5pHQeedDN2BGn7hhjke26r7q7FV5vTCaagAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADD8l61yWzO9U5X1SJCxou9+A49sWDt12ivA52KqqK4CgAAAAKLHog4v5d00c6/l+WdPL4AAAkRJbWq7XqXnzjrV2x5+dqqPZ11u+gb5zDrrNdA1zZOt8/EO38Q1b/buI9uKpiQABEweHlHYsKcj3fTbZ3O5qm1FrjHZ+MF/sXHexF4DnvQueGk9D530Q3YC1cg49jehc9rp2ycj6rHpmmoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAw/JOt8nszXVeWdTJEq3WNE0zs/NK8PUuL52Oq3cb7ytRJUpRUU1UgSpFUUiZpqPFyPs+uHLd+0ak7pOl7eXVuStSKoImERY1HZ9X8+PLavW+GfPsuub331iNOyPqt3D1xV6L5+Idw4fbf7dxHtxVMSAAAW5rGmc57tzY1rrXHM0dY4x17khd7Dx/sBeBHPeg88NK6Jzno5uoFMjz8m7DhDkm56t5TuN7n+9F5bqKkCUUxWokqUSVKBWtzVaJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMPyfrHKKzfU+W9TgBTVbJ8nrk5NjexaEYPeud2a7dXybao3CcR7D1KBcefwmUp1vWTe8Fz+wdwv6zspCqDUeedv105ftuueA7V7eKbSdEYDInvi3UVxRGWJwGSx3jxYsXqcTIZu5rHp1hug63um7VNNXS2OIdw4fV7t3Ee3FUxIAAABHl9dByDD9i5SZ/XrAyXX+Q9fLoI530XnRpXROe9CN2BCaRCo1nnPaMQcsznixp1vJcX2KukNcycZFZrLi1ZT1MThTbcJpuJOh7FyTqi+iqisAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxHKuvaXXi6bqW3RIESISKKLsGuaV1eg4tT1XBVpdWdxpbt3x5bWQ9xrs7nno0DbdsvHn9KQBEjH6X0Gg4t5e2a8c09OyYo864jIdC1/K884vz+nzeHNjKeHa+98+lZHIdLmvfFXbQVY4l2/ntax2rQegk1QJAAABEVQU6ntlJw2roWIML17Rt8KwU886Hq5zHoeL2szwAAAPNqO70HHPP2PB1zi7tWMMdcvweSq57UxtrackaPm9395h8xXEszEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFNNcCArRIEIkUyVEVUxIqmm7J549KLNdcVEVCmq3WVAAAolJBBVRWjzTepLOE9+N8XOx5b/v5z0WMrpvr3O7+PIW1xLrYiqCmZiomRKKgAAACKK4AKZiqIriaApouCitIAREVKZqVIqgilVNU03ILMehFiq6st1AiUsVIJmJoICgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKXnZemivwntmiqqkSAALN3G5e+rx+yqhoEARTV5I9NXl9RI0AAt0WrOHtrx949aGjy38L5827VV3y4t5qjH+rWN9vn2e7iumeysaImIQ8Eex5bh6K7V2goAAIiKoIpm3lNeHzETVTO0gCgAIplFNLH5ZCfJSZCq3c0CgAgCKKhbp8c5eu94/VVcxNABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAR5PN66cKPNlfAe2qmrSZiaCoIi157VzCj3471npmJ2ACKfL6/JFd+xfKhsAEeKmpzlFzzZHOkT5t482Npu+LF3KTT3tvCVZ5u7dVem0VSoBTVEUeL247LJTSKqqK9AoAABTMRT4fZj8PTE2IyVVFewaAAARAW8fkfByXqIvxfuU1dQUAEAUKojHU3fRla9dNWiqJoAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLdN2YtW78lNUSJiaCooriLF5VlTavTomJoIAix6KSiuRIoACzFycy1TdS0YC/wCPhivOL0Ribvs3qn01T0sVxOwAUiYIs34y8NXtFFyJoKAACIprirNVUxTbvTFq9E6BAUABCYimx6aSmz6QqpqAoAIAppuRXko90ZeL11CK4mgAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAChMRRjvT4uTyZ2qpKcXV7Kq9MVaqYmgoKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApouDw+m7RmW/J6rkUXor0ompQQChQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEARJIpqEzEwAFAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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");
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
      padding: 4px 6px 14px;
      border-bottom: 1px solid rgba(215,226,212,.8);
    }

    .sidebar-logo {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid rgba(215,226,212,.95);
      box-shadow: 0 12px 26px rgba(15,23,42,.08);
      padding: 8px;
      flex: 0 0 auto;
    }

    .sidebar-logo img,
    .topbar-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 12px;
    }

    .sidebar-brand-copy {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
    }

    .sidebar-brand-title {
      font-size: 22px;
      line-height: .95;
      font-weight: 950;
      letter-spacing: .6px;
      color: #16352b;
    }

    .sidebar-brand-sub {
      margin-top: 5px;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 2.2px;
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
      padding: 11px 12px;
      border-radius: 18px;
      background: rgba(255,255,255,.94);
      border: 1px solid rgba(215,226,212,.95);
      color: #0f172a;
      box-shadow: 0 10px 24px rgba(15,23,42,.07);
      margin-top: 12px;
    }

    .sidebar-user-avatar {
      width: 42px;
      height: 42px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, rgba(120,184,62,.24), rgba(18,140,126,.14));
      border: 1px solid rgba(120,184,62,.22);
      color: #16352b;
      font-weight: 950;
      flex: 0 0 auto;
    }

    .sidebar-user-copy {
      min-width: 0;
      flex: 1;
    }

    .sidebar-user-name {
      font-size: 12px;
      font-weight: 950;
      color: #16352b;
      line-height: 1.2;
    }

    .sidebar-user-role {
      margin-top: 2px;
      font-size: 11px;
      color: #64748b;
      font-weight: 800;
    }

    .sidebar-user-caret {
      color: #64748b;
      font-size: 13px;
      font-weight: 900;
      flex: 0 0 auto;
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
      opacity: .16 !important;
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
    .assignee-chip.assignee-manager { color: #6d4c00; background: #fff8df; border-color: rgba(245,158,11,.25); }
    .assignee-chip.assignee-sara { color: #5b21b6; background: #f3edff; border-color: rgba(139,92,246,.25); }

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
      content: "LIVE: V22.7" !important;
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
      content: "V22.7" !important;
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


    /* V22.7 - Send button visible with no internal scroll.
       UI-only: keeps V22.5 conversation list scroll and composer under chat.
       Goal: Reply Panel + Team assignment + Tags fit in the visible right column. */
    .reply-panel::after {
      content: "V22.7" !important;
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


    /* V22.7 - Send button visible fix.
       UI-only: keeps V22.7 send button visible, V22.5 scroll fixes, and V22.3 quick replies inside composer.
       Goal: keep Send WhatsApp Reply visible without page zooming or scrolling. */
    .reply-panel::after {
      content: "V22.7" !important;
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

  
    /* V22.9: Logo visibility fix - force sidebar brand and chat watermark */
    .main-sidebar .sidebar-brand {
      padding: 8px 6px 16px !important;
      gap: 10px !important;
      align-items: center !important;
    }

    .main-sidebar .sidebar-logo {
      width: 74px !important;
      height: 74px !important;
      min-width: 74px !important;
      min-height: 74px !important;
      border-radius: 20px !important;
      padding: 7px !important;
      background: #ffffff !important;
      box-shadow: 0 14px 30px rgba(15, 23, 42, .10) !important;
    }

    .main-sidebar .sidebar-logo img {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      opacity: 1 !important;
      filter: none !important;
    }

    .main-sidebar .sidebar-brand-title {
      font-size: 24px !important;
      line-height: .92 !important;
      letter-spacing: 1.4px !important;
      font-weight: 950 !important;
      color: #14372d !important;
    }

    .main-sidebar .sidebar-brand-sub {
      font-size: 13px !important;
      letter-spacing: 2.8px !important;
      font-weight: 950 !important;
      color: #2e8b19 !important;
      margin-top: 7px !important;
    }

    .chat-body .chat-watermark {
      opacity: .22 !important;
      transform: translate(-50%, -50%) scale(1.95) !important;
      width: 520px !important;
      height: 260px !important;
      max-width: 78% !important;
      pointer-events: none !important;
    }

    .chat-body .chat-watermark img {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      opacity: 1 !important;
      filter: saturate(1.05) contrast(1.04) !important;
    }

    .topbar-sub {
      font-size: 13px !important;
    }

  </style>
</head>
<body>
  <div class="workspace-shell">
    <aside class="main-sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-logo"><img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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" alt="Iconic Hair Care logo" /></div>
        <div class="sidebar-brand-copy">
          <div class="sidebar-brand-title">ICONIC</div>
          <div class="sidebar-brand-sub">HAIR CARE</div>
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="Team Inbox navigation">
        <div class="sidebar-item active">💬 <span>Team Inbox</span></div>
        <div class="sidebar-item">📊 <span>Dashboard</span></div>
        <div class="sidebar-item">🗂️ <span>Conversations</span></div>
        <div class="sidebar-item">👥 <span>Team</span></div>
        <div class="sidebar-item">👤 <span>Contacts</span></div>
        <div class="sidebar-item">⚡ <span>Quick Replies</span></div>
        <div class="sidebar-item">📣 <span>Broadcast</span></div>
        <div class="sidebar-item">🖼️ <span>Files & Media</span></div>
        <div class="sidebar-item">📈 <span>Analytics</span></div>
        <div class="sidebar-item">⚙️ <span>Settings</span></div>
      </nav>

      <div class="sidebar-branches">
        <div class="sidebar-section-title">Our Branches</div>
        <div class="branch-row"><span><i></i> Dubai</span><b id="sideDubaiCount">0</b></div>
        <div class="branch-row"><span><i></i> Abu Dhabi</span><b id="sideAbuCount">0</b></div>
      </div>

      <div class="sidebar-user">
        <div class="sidebar-user-avatar">OM</div>
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
          <div class="topbar-logo"><img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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" alt="Iconic Hair Care logo" /></div>
          <div class="topbar-copy">
            <div class="topbar-title">Team Inbox</div>
            <div class="topbar-sub">Manage all customer conversations in one place — V22.9 logo visibility fix.</div>
          </div>
        </div>
        <div class="topbar-pills">
          <div class="topbar-pill">● All systems operational</div>
          <div class="topbar-pill">⚡ Quick Replies</div>
          <div class="topbar-pill">🔔 3</div>
        </div>
      </section>

    <section class="stats">
      <div class="stat"><div class="stat-label">Messages</div><div class="stat-value" id="statTotal">0</div></div>
      <div class="stat"><div class="stat-label">Customers</div><div class="stat-value" id="statCustomers">0</div></div>
      <div class="stat"><div class="stat-label">Unread</div><div class="stat-value" id="statUnread">0</div></div>
      <div class="stat"><div class="stat-label">Dubai</div><div class="stat-value" id="statDubai">0</div></div>
      <div class="stat"><div class="stat-label">Abu Dhabi</div><div class="stat-value" id="statAbu">0</div></div>
    </section>

    <main class="app">
      <aside class="panel">
        <div class="filters">
          <input id="searchBox" placeholder="Search phone or message..." />
          <div class="filter-row">
            <select id="branchFilter">
              <option value="">All branches</option>
              <option value="Dubai">Dubai</option>
              <option value="Abu Dhabi">Abu Dhabi</option>
            </select>
            <select id="statusFilter">
              <option value="">All status</option>
            </select>
          </div>
        </div>

        <div id="conversationList" class="conversation-list">
          <div class="empty">Loading conversations...</div>
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
              <option value="Talk to Team">Talk to Team</option>
              <option value="Closed">Closed</option>
            </select>
            <button type="button" class="mini-btn" id="copyPhoneBtn">Copy phone</button>
            <button type="button" class="mini-btn" id="markReadBtn">Mark read</button>
          </div>
        </div>

        <div id="chatBody" class="chat-body">
          <div class="chat-watermark"><img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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" alt="Iconic Hair Care watermark" /></div>
          <div class="empty">No conversation selected yet.</div>
        </div>

        <div class="chat-composer-wrap">
            <div class="composer-block">
              <div class="composer-title">
                <strong>Reply composer</strong>
                <span>V22.9</span>
              </div>

              <label>Message</label>
              <textarea id="body" rows="3" placeholder="Type your reply here..."></textarea>

              <div class="quick-grid composer-mini-actions composer-quick-replies">
                <button type="button" class="quick-btn" data-text="مرحباً، معك فريق Iconic Hair Care. كيف فينا نساعدك؟&#10;&#10;Hello, this is the Iconic Hair Care team. How may we help you?">Greeting</button>
                <button type="button" class="quick-btn" data-text="شكراً لتواصلك معنا. تم استلام طلبك وسيقوم أحد أعضاء فريقنا بالرد عليك قريباً.&#10;&#10;Thank you for contacting us. Your request has been received and one of our team members will reply shortly.">Follow-up</button>
                <button type="button" class="quick-btn" data-text="يمكنك مشاركة اسمك والخدمة المطلوبة والفرع المناسب لك حتى نساعدك بشكل أدق.&#10;&#10;Please share your name, required service, and preferred branch so we can assist you better.">Need details</button>
                <button type="button" class="quick-btn" data-text="تم تحويل طلبك إلى الفريق المختص وسنتواصل معك بأقرب وقت ممكن.&#10;&#10;Your request has been transferred to the relevant team and we will contact you as soon as possible.">Team handoff</button>
              </div>

              <div class="composer-tools">
                <div class="media-box">
                  <input id="imageFile" type="file" accept="image/jpeg,image/png,image/webp" />
                  <input id="imageCaption" placeholder="Optional image caption..." />
                  <button type="button" class="send-image-btn" id="sendImageBtn">Send image</button>
                  <div class="media-hint">JPG, PNG, or WEBP. Keep image under 5MB.</div>
                </div>
              </div>

              <div class="composer-actions">
                <button type="button" class="send-btn" id="sendBtn">Send WhatsApp Reply</button>
                <div class="result" id="result">Ready.</div>
              </div>
            </div>
        </div>
      </section>

      <aside class="panel reply-panel">
        <div class="panel-head">
          <div class="panel-title">Reply Panel</div>
          <div class="panel-sub">Manual replies from the correct branch line.</div>
        </div>

        <div class="reply-body">
          <div class="reply-inner">
            <div class="right-panel-summary">
              <div class="summary-dot">IC</div>
              <div>
                <div class="summary-title">Manual reply center</div>
                <div class="summary-sub">Send from the correct branch line and keep every reply saved in the customer history.</div>
              </div>
            </div>
            <label>Customer phone</label>
            <input id="to" placeholder="97150xxxxxxx" />

            <label>Reply from</label>
            <select id="phoneNumberId">
              <option value="">Auto — same received line</option>
              <option value="${DUBAI_PHONE_NUMBER_ID}">Dubai +971 4 396 3333</option>
              <option value="${ABU_DHABI_PHONE_NUMBER_ID}">Abu Dhabi +971 2 562 2778</option>
            </select>

            <label>Conversation status</label>
            <div class="status-grid v19-status-actions">
              <button type="button" class="status-btn" data-status="Open">Open</button>
              <button type="button" class="status-btn" data-status="Waiting">Waiting</button>
              <button type="button" class="status-btn" data-status="Need Follow-up">Need Follow-up</button>
              <button type="button" class="status-btn" data-status="Talk to Team">Talk to Team</button>
              <button type="button" class="status-btn" data-status="Closed">Closed</button>
            </div>

            <label>Assigned to</label>
            <div class="assign-team-card">
              <div class="assign-top">
                <div class="assign-icon">👥</div>
                <div>
                  <div class="assign-title">Team assignment</div>
                  <div class="assign-sub">UI-only for now. Saved locally in this browser while we continue development.</div>
                </div>
              </div>
              <select id="assigneeSelect" aria-label="Assigned to">
                <option value="Unassigned">Unassigned</option>
                <option value="Dubai Team">Dubai Team</option>
                <option value="Abu Dhabi Team">Abu Dhabi Team</option>
                <option value="Sara">Sara</option>
                <option value="Manager">Manager</option>
              </select>
              <div style="margin-top:10px;"><span id="assigneeDisplay" class="assignee-chip assignee-unassigned">Assigned: Unassigned</span></div>
            </div>


            <div class="tags-team-card">
              <div class="tags-top">
                <div class="tags-icon">#</div>
                <div>
                  <div class="tags-title">Conversation tags</div>
                  <div class="tags-sub">UI-only for now. Use tags to organize customer intent while we continue development.</div>
                </div>
              </div>
              <div class="tag-picker-grid" id="tagPicker">
                <label class="tag-option"><input type="checkbox" value="Consultation" /> Consultation</label>
                <label class="tag-option"><input type="checkbox" value="New Customer" /> New Customer</label>
                <label class="tag-option"><input type="checkbox" value="Booking" /> Booking</label>
                <label class="tag-option"><input type="checkbox" value="Price" /> Price</label>
                <label class="tag-option"><input type="checkbox" value="Location" /> Location</label>
                <label class="tag-option"><input type="checkbox" value="Follow-up" /> Follow-up</label>
                <label class="tag-option"><input type="checkbox" value="VIP" /> VIP</label>
                <label class="tag-option"><input type="checkbox" value="Need Details" /> Need Details</label>
              </div>
              <div id="tagDisplay" class="tag-display-row"></div>
            </div>

            <div class="composer-moved-note quick-replies-moved-note">
              <div class="moved-note-icon">↙</div>
              <div>
                <div class="moved-note-title">Quick replies moved to composer</div>
                <div class="moved-note-sub">Greeting, Follow-up, Need details, and Team handoff are now directly under the message box.</div>
              </div>
            </div>

            <div class="composer-moved-note">
              <div class="moved-note-icon">↙</div>
              <div>
                <div class="moved-note-title">Reply composer moved under the chat</div>
                <div class="moved-note-sub">Use the main composer below the conversation for messages and images. This panel now focuses on customer workflow, status, team assignment, and tags.</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  </div>

  </div>


<script>
let allMessages = [];
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

const searchBox = document.getElementById("searchBox");
const branchFilter = document.getElementById("branchFilter");
const statusFilter = document.getElementById("statusFilter");
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
const inputTo = document.getElementById("to");
const inputLine = document.getElementById("phoneNumberId");
const inputBody = document.getElementById("body");
const imageFileInput = document.getElementById("imageFile");
const imageCaptionInput = document.getElementById("imageCaption");
const resultBox = document.getElementById("result");

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

function setAssignee(key, assignee) {
  if (!key) return;
  const value = (assignee || "Unassigned").toString().trim() || "Unassigned";
  assigneeMap[key] = value;
  saveAssigneeMap();
}

function getAssignee(key) {
  return key && assigneeMap[key] ? assigneeMap[key] : "Unassigned";
}

function assigneeClass(assignee) {
  const value = (assignee || "").toString().toLowerCase();
  if (value.includes("abu")) return "assignee-abu";
  if (value.includes("dubai")) return "assignee-dubai";
  if (value.includes("manager")) return "assignee-manager";
  if (value.includes("sara")) return "assignee-sara";
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

function tagClass(tag) {
  const value = (tag || "").toString().toLowerCase().replace(/\s+/g, "-");
  if (value.includes("vip")) return "tag-vip";
  if (value.includes("follow")) return "tag-follow-up";
  if (value.includes("price")) return "tag-price";
  if (value.includes("booking")) return "tag-booking";
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
    c.replyFilterStatus = getConversationReplyFilterStatus(c.messages);
    c.status = getStatusOverride(c.key) || getConversationBusinessStatus(c.messages, c.replyFilterStatus);
    c.assignee = getAssignee(c.key);
    c.tags = getTags(c.key);
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

  statusFilter.innerHTML = '<option value="">All conversations</option>' + statuses.map(function(s) {
    return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
  }).join("");

  if (statuses.includes(current)) statusFilter.value = current;
}

function normalizedMessageBranch(message) {
  const branch = (message?.branch || "").toString().trim();
  if (branch === "Abu Dhabi") return "Abu Dhabi";
  return "Dubai";
}

function updateStats() {
  const conversations = buildConversations();
  document.getElementById("statTotal").textContent = allMessages.length;
  document.getElementById("statCustomers").textContent = conversations.length;
  document.getElementById("statUnread").textContent = conversations.filter(isUnreadConversation).length;
  const dubaiSidebarCount = allMessages.filter(function(m) { return normalizedMessageBranch(m) === "Dubai"; }).length;
  const abuSidebarCount = allMessages.filter(function(m) { return normalizedMessageBranch(m) === "Abu Dhabi"; }).length;
  document.getElementById("statDubai").textContent = dubaiSidebarCount;
  document.getElementById("statAbu").textContent = abuSidebarCount;
  const sideDubaiCount = document.getElementById("sideDubaiCount");
  const sideAbuCount = document.getElementById("sideAbuCount");
  if (sideDubaiCount) sideDubaiCount.textContent = dubaiSidebarCount;
  if (sideAbuCount) sideAbuCount.textContent = abuSidebarCount;
}

function conversationHasStatus(conversation, wantedStatus) {
  const wanted = (wantedStatus || "").toLowerCase().trim();
  if (!wanted) return true;

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

    return '<button type="button" class="conversation-card' + active + unread + '" data-key="' + escapeHtml(c.key) + '" data-status="' + escapeHtml(displayStatus || '') + '">' +
      '<div class="avatar">' + escapeHtml(avatarText(displayName || c.phone)) + '</div>' +
      '<div class="conversation-main">' +
        '<div class="conv-top">' +
          '<div class="conv-identity">' +
            '<div class="conv-name">' + escapeHtml(displayName) + '</div>' +
            '<div class="conv-phone">' + escapeHtml(c.phone) + '</div>' +
          '</div>' +
          '<div class="conv-time">' + escapeHtml(latest.time || "") + '</div>' +
        '</div>' +
        '<div class="conv-preview">' + escapeHtml(shortText(preview, 94)) + '</div>' +
        tagRow +
        '<div class="conv-footer">' +
          '<div class="badges">' + branchBadge(c.branch) + '<span class="status ' + statusClass(displayStatus) + '">' + escapeHtml(displayStatus || "") + '</span>' + assigneeBadge(c.assignee) + (unread ? '<span class="unread-badge">Unread</span>' : '') + '</div>' +
          '<span class="message-count-badge">' + escapeHtml(String(messageCount)) + ' msg</span>' +
        '</div>' +
      '</div>' +
    '</button>';
  }).join("");

  Array.from(document.querySelectorAll(".conversation-card")).forEach(function(btn) {
    btn.addEventListener("click", function() {
      selectConversation(btn.dataset.key || "");
    });
  });
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
    if (assigneeSelect) {
      assigneeSelect.value = "Unassigned";
      assigneeSelect.disabled = true;
    }
    if (assigneeDisplay) {
      assigneeDisplay.className = "assignee-chip assignee-unassigned";
      assigneeDisplay.textContent = "Assigned: Unassigned";
    }
    syncTagPicker([]);
    chatBody.innerHTML = '<div class="chat-watermark"><img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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" alt="Iconic Hair Care watermark" /></div><div class="empty">Choose a customer from the left to view the conversation.</div>';
    return;
  }

  chatTitle.textContent = c.phone;
  chatAvatar.textContent = avatarText(c.phone);
  chatMeta.innerHTML = branchBadge(c.branch) + '<span class="status ' + statusClass(c.status) + '">' + escapeHtml(c.status || "") + '</span>' + '<div class="workflow-status-bar"><span class="workflow-status-chip ' + statusClass(c.status) + '">Workflow: ' + escapeHtml(c.status || "Open") + '</span>' + assigneeBadge(c.assignee) + tagBadges(c.tags, "tag-chip", 4) + '</div>';
  if (conversationStatusSelect) {
    const allowedStatuses = ["Open", "Waiting", "Need Follow-up", "Talk to Team", "Closed"];
    conversationStatusSelect.value = allowedStatuses.includes(c.status) ? c.status : "Open";
    conversationStatusSelect.disabled = false;
  }
  if (assigneeSelect) {
    assigneeSelect.value = c.assignee || "Unassigned";
    assigneeSelect.disabled = false;
  }
  if (assigneeDisplay) {
    assigneeDisplay.className = "assignee-chip " + assigneeClass(c.assignee);
    assigneeDisplay.textContent = "Assigned: " + (c.assignee || "Unassigned");
  }
  syncTagPicker(c.tags || []);

  inputTo.value = c.phone;
  if (c.phoneNumberId) inputLine.value = c.phoneNumberId;

  const ordered = (c.messages || []).slice().reverse();

  // Reply-type filters affect both the conversation list and the opened chat.
  // All conversations = full history. Customer/Human/Bot Reply = only that sender.
  const chatSenderFilter = statusToSenderFilter(statusFilter.value);
  const visibleMessages = chatSenderFilter
    ? ordered.filter(function(m) { return m.sender === chatSenderFilter; })
    : ordered;

  chatBody.innerHTML = '<div class="chat-watermark"><img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAWgBaADASIAAhEBAxEB/8QAGwABAAEFAQAAAAAAAAAAAAAAAAECAwUGBwT/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/2gAMAwEAAhADEAAAAd/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQJRIAAAAAAIiUCUCUSBQAAAAAAAAAAAAAAAAAAAAAAAABAlEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHk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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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nRN2Z+FavIvhLpiElC62SyxKsBdqJrDVi/YYDFRZYQqCoHCaPBgN5seKFEdVLJtxJsKMnv8AEzYWB5J3BqRIN/iYyUssT3gT1ETW6Rp+NtOBbKEKIkxxESNV9NZoM0mwxQdyf8PhO6BRTyLAupjGETbH8CyoZICbLIlkeRiVlnoy4DEUZlj2OUqhKewoSkVqZ6cIeBuQEnArD5G7E+djp4i4G4Fj4ZE0Kfq0aja0Hc/E16SCZIu5KEhRCN/pjNUUiCwGgxdVnGHfS2TpjOhsycpeRY6npuJ8B4UikpYStsar03sblhcNHoeRgKBr7mb7CkiNG905KN6Jmd9hetJQvjixojBiY9Mc5Df4mg8CfgSS8iF72LzHYdtuV8SXIxGZpCQjCHE2E5f0ychK6J+hxjY36WOhCVkyY7nkSFjqY+gV17kewJpsKmQ2k4PaxmTGAsJNvQhIUXuLryWTQ01thLImQ7kJ2L4XR5JN8Gz54GxZUiRvuE5+NucUW3yEGh3EzQnK+J6LUReApWZQkX02q8WSE9iUIjYXQyZIoYkdoU7c5FjrmdBCV/AI1kT5x8TFLLYmOwxqtBImE5VR5r3Imy1/AxS+SVpieZkRIkXwvAuxNlaQ3ZERUt/E9FlRIryNMtxcDAr+J5G5Z4QTQSEHmJCCan0xzqgjqjQk4sgabCVWRHXA0LrTnSQdB9nJTf6JKQqZmxElUWIQR1tUJUQ5Ikgj44IceRJipeiPjjTLwWOzYpj44IHoI1ki/tjVmaG5EWDsmiOHuKCMbiJjNmkizyL/AJXubiFPSDs1ItUsBDLLyoJcWUF/yuBkVJGkJJUKFsi4oRBbpiR/y5qLWRz2JFhEv+YtaRYv+ZQR/wDRof/aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884www888888888888888888888888888888888888888888888888888888888888888888888888888884w4888848uMAC888888888888888888888888884488888888888888888888888888888888888888888we8qAGWEG8IYQu08NAEB3ejshquiI88888oQw8UEU++Ie8EQ4QyMc8888888888888888888888888888888888888068mQKMa2WgoIcAvc96RETNOkQq0Ow888884U8IAQ8wCk6G26qiwc8888888888888888888888888888888888888ii8GIIyIU88AhsJG7brU44HBTAK+Gg88888IY80gA4WIOM8880EUU8888888888888888888888888888888888888aA8fQ2wc888sNdReBP0pA1JVdDSWWQ8e8880g8GQGcue+M8888s8c8888888888888888888888888888888888888k80UMBW88888tQN3eqYraUo1kRAWIaWI408kc8aGW4y4W888888888888888888888888888888888888888888888k4oEU8+88888qSYCcES1jC9ZBkAgiwKIQUsIU8m6WwuAW888888888888888888888888888888888888888888888Cwgd58+88888sIS4steJf+2Vg9kuQc+6YEUMw8gmUkIM0888888888888888888888888888888888888888888888AIIEYw2888888AQQ8881S3KX/focI8oIksooc8g8U60oc888888888888888888888888888888888888888888888w282Y0K88888oIAoc88DQqpRpg88o88480Mo88EcUMcSc888888888888888888888888888888888888888888888R18YICkw600w4AcwU40SUlUUXT88o88so8wAU8sYUcYio482++2408888888888888888888888888888888888888Yy8Ew+06uEGySkEIIgcAGwQAU+k8o8888wYww8gUUU442w2GJtbM88888888888888888888888888888888888888gS84wkeyqI4OawMcMwYTMoYX6M8wk8888II8w8wUUMMMGUyeLjpUc8888888888888888888888888888888888888ac4iSEassa24s8U8gAitz5RpSaUoQ888wsEKQw8oc200O4UCxLOEU6888888888888888888888888888888888888gg0ACCM4UqA2I888kAAjwiiyASOqq884C2qyGC888+ksc88u804A2o88888888888888888888888888888888888+YyqGAIYe+qCyu88q9KxBW4iQAA64g88oAYg4KA888M878886808U2o88888888888888888888888888888888888+C6MuE0qicqC2U88o9TaRnmICAAC2O888CUqigC888iOKW88q+wK0+o8888888888888888888888888888888888888888888888888888yCitAqW888888888888888888888888888888888888888888888888888888888888888888888888888888888888dmLBBW88888888888888888888888888888888888888888888888888888888888888888888888888888888888+/cLDBU888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAHREBAQADAAMBAQAAAAAAAAAAAQAQEWAhMDFAsP/aAAgBAwEBPxD+mWuHeFbbDb4Rj2GHTCwUMTeB4Nj1sT8nNqDAwwzDwTGG36HB+YCQ04NYGMHAuX1E2y23eETwyWsKWOBYw+zUhJbNrVqSfvCDGEte3VucBP3hBj8t+8IMflP3B4Jr837C1BrlVlEEcspYRyzOPMEHK7wrtjHKGFqfLgHKmN20EHLvOHNH9IL/xAAhEQEBAQACAgIDAQEAAAAAAAABABEQISAxMFBAQWBRsP/aAAgBAgEBPxD/AKOTaH7sf7CfwxPLFlnD4bDh78B1D9GA9R75LD7xwIs+Z+DJPqCecg4223wXI9RC9QtGxyhl+yEMR5bwcPzhxtttttv1B6nkXT4frZ9Wfu0nX1A6bX3DPaCkDJRH4Bwv1w6ngL1L8B2EfZj0w0v6idYN7gBxsp3JOkeomLD4STqYgl+v9ORPwvcert8E9hf62XL2oNyzOiwk1206jlvwk+pi/Ux9d6cifgeDi64Ez1dTgzmLTV3YMd1PtEzESeZPqYv1wfXD1PBPwkmwZZxkdxYHb1yPcrrdJ2WG3nbfg3g+xJ4J/AeQGrhm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" alt="Iconic Hair Care watermark" /></div>' + (visibleMessages.length ? visibleMessages.map(function(m) {
    const cls = m.sender === "customer" ? "customer" : (m.sender === "staff" ? "staff" : "bot");
    return '<div class="bubble-row ' + cls + '">' +
      '<div class="bubble ' + cls + '">' +
        escapeHtml(m.body || "") +
        '<div class="bubble-info">' +
          '<span>' + senderBadge(m.sender || "") + '</span>' +
          '<span>' + escapeHtml(m.time || "") + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join("") : '<div class="empty">No messages for this filter.</div>');

  chatBody.scrollTop = chatBody.scrollHeight;
}

function renderAll() {
  buildStatusOptions();
  updateStats();
  renderConversationList();
  renderChat();
}

async function loadMessages() {
  try {
    const res = await fetch("/api/messages");
    const data = await res.json();
    allMessages = data.messages || [];
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

Array.from(document.querySelectorAll(".quick-btn")).forEach(function(btn) {
  btn.addEventListener("click", function() {
    inputBody.value = btn.getAttribute("data-text") || "";
    inputBody.focus();
  });
});

Array.from(document.querySelectorAll(".status-btn")).forEach(function(btn) {
  btn.addEventListener("click", function() {
    updateStatus(btn.getAttribute("data-status") || "Need Follow-up");
  });
});


if (conversationStatusSelect) {
  conversationStatusSelect.addEventListener("change", function() {
    updateStatus(conversationStatusSelect.value || "Open");
  });
}

if (assigneeSelect) {
  assigneeSelect.addEventListener("change", function() {
    if (!selectedConversationKey) return;
    const value = assigneeSelect.value || "Unassigned";
    setAssignee(selectedConversationKey, value);
    if (assigneeDisplay) {
      assigneeDisplay.className = "assignee-chip " + assigneeClass(value);
      assigneeDisplay.textContent = "Assigned: " + value;
    }
    resultBox.textContent = "Assigned to: " + value;
    renderAll();
  });
}

if (tagPicker) {
  Array.from(tagPicker.querySelectorAll('input[type="checkbox"]')).forEach(function(input) {
    input.addEventListener("change", function() {
      if (!selectedConversationKey) return;
      const tags = Array.from(tagPicker.querySelectorAll('input[type="checkbox"]:checked')).map(function(item) {
        return item.value;
      });
      setTags(selectedConversationKey, tags);
      resultBox.textContent = tags.length ? "Tags updated: " + tags.join(", ") : "Tags cleared.";
      renderAll();
    });
  });
}

searchBox.addEventListener("input", renderAll);
branchFilter.addEventListener("change", renderAll);
statusFilter.addEventListener("change", renderAll);

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
            opt_in_source: "Branch QR / WhatsApp direct message",
            opt_out: "",
            opt_out_date: ""
          }
        }
      );

      const optInReply =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "تم حفظ موافقتك بنجاح ✅\n\n" +
        "سنستخدم هذا الرقم فقط لإرسال تذكيرات المواعيد ومتابعة الخدمة الخاصة بـ Iconic Hair Care.\n\n" +
        "لإيقاف التذكيرات في أي وقت، أرسل: STOP أو إيقاف\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Your opt-in has been saved successfully ✅\n\n" +
        "We will use this number only for appointment reminders and service follow-ups from Iconic Hair Care.\n\n" +
        "To stop reminders at any time, send: STOP";

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
        "تم إيقاف تذكيرات المتابعة لهذا الرقم ✅\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Service follow-up reminders have been stopped for this number ✅";

      await sendWhatsAppMessage(from, optOutReply, incomingPhoneNumberId);
      addInboxMessage(from, "bot", optOutReply, "Opted Out", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });

      return res.sendStatus(200);
    }

    addInboxMessage(
      from,
      "customer",
      profileName ? `${profileName}: ${originalText}` : originalText,
      "Bot",
      incomingPhoneNumberId,
      {
        customerName: profileName,
        messageType: "Customer Message"
      }
    );

    const hour = getDubaiHour();
    console.log("Dubai hour:", hour);

    let replyText = "";
    let replyButtons = null;
    let replyOptions = {};
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
      setConversationStatus(from, "Consultation Request");

      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        `أكيد، نرتب لك طلب الحجز مع فرع ${branchNameAr} ✅\n\n` +
        "حتى يكون رد الفريق دقيق وسريع، اكتب لنا الآن:\n" +
        "• الخدمة المطلوبة\n" +
        "• اليوم أو التاريخ المناسب\n" +
        "• الوقت المفضل\n" +
        "• هل هذه أول زيارة لك؟\n\n" +
        "إذا تفضل مكالمة مباشرة أو تريد معرفة الموقع، استخدم الأزرار بالأسفل.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        `Sure, we will arrange your booking request with our ${lineConfig.branch} team ✅\n\n` +
        "To help the team reply faster, please send:\n" +
        "• Service needed\n" +
        "• Preferred day/date\n" +
        "• Preferred time\n" +
        "• Is this your first visit?\n\n" +
        "You can also use the buttons below for a direct call or branch location.";

      replyButtons = getConsultActionButtons();
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
      replyText =
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "خلينا نختصر عليك الطريق.\n\n" +
        "اختر أكثر نقطة تهمك الآن، وسنعطيك توجيه واضح بدون كلام عام:\n\n" +
        "1️⃣ مظهر طبيعي وغير واضح\n" +
        "2️⃣ معرفة السعر حسب حالتك\n" +
        "3️⃣ استشارة خاصة مع الفريق\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        "Let us guide you clearly.\n\n" +
        "Choose what matters most right now, and we will direct you to the right next step:\n\n" +
        "1️⃣ Natural, undetectable look\n" +
        "2️⃣ Price based on your case\n" +
        "3️⃣ Private team consultation";

      replyButtons = getServicesDeepMenuButtons();
    }

    /* مظهر طبيعي */
    else if (
      text.includes("natural") ||
      text.includes("طبيعي") ||
      text.includes("طبيعية") ||
      text.includes("مظهر طبيعي")
    ) {
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
        `ممتاز، طلب الاستشارة وصل لفريق فرع ${branchNameAr} ✅\n\n` +
        "حتى نبدأ صح، أرسل لنا 3 أشياء فقط:\n" +
        "• الخدمة أو المشكلة التي تريد حلها\n" +
        "• هل تفضل نتيجة طبيعية جدًا أو كثافة أعلى؟\n" +
        "• الوقت المناسب للتواصل معك\n\n" +
        "إذا تريد زيارة الفرع أو مكالمة مباشرة، استخدم الأزرار بالأسفل.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        `Perfect, your consultation request has reached our ${lineConfig.branch} team ✅\n\n` +
        "To start properly, please send only 3 details:\n" +
        "• The service or concern you want to solve\n" +
        "• Very natural look or higher density?\n" +
        "• Best time to contact you\n\n" +
        "Use the buttons below for the branch location or a direct call.";

      replyButtons = getConsultActionButtons();
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
        `تم تحويل طلبك إلى فريق فرع ${branchNameAr} ✅\n\n` +
        "سيقوم أحد أعضاء الفريق بالرد عليك قريباً.\n\n" +
        "للمكالمة المباشرة أو فتح موقع الفرع، استخدم الأزرار بالأسفل.\n\n" +
        "------------------------------\n\n" +
        `${BUSINESS_NAME_SPACED} ✨\n\n` +
        `Your request has been transferred to our ${lineConfig.branch} team ✅\n\n` +
        "A team member will reply to you shortly.\n\n" +
        "Use the buttons below for a direct call or the branch location.";

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

    /* إشعار الموظف عند طلب استشارة أو موظف */
    const shouldNotifyStaff =
      text === "1" || text === "١" ||
      text === "6" || text === "٦" ||
      text.includes("احجز") ||
      text.includes("موعد") ||
      text.includes("appointment") ||
      text.includes("book consultation") ||
      text.includes("book appointment") ||
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
