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

const BOT_VERSION = "iconic-team-inbox-v18-ui-redesign-from-v16-1";

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
      --green:#2f9f45;
      --green-2:#78b83e;
      --green-3:#eaf7e7;
      --green-soft:#f4fbf2;
      --ink:#182033;
      --muted:#6f7a8e;
      --line:#e4eadf;
      --card:#ffffff;
      --bg:#f7fbf5;
      --gold:#caa64b;
      --purple:#7c4dff;
      --shadow:0 18px 40px rgba(35,58,29,.08);
      --soft-shadow:0 8px 24px rgba(35,58,29,.06);
      --radius:22px;
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;
      font-family:Inter, Arial, Helvetica, sans-serif;
      color:var(--ink);
      background:linear-gradient(180deg,#fbfdf9 0%,#f4faf1 48%,#eef7eb 100%);
      overflow:hidden;
    }
    button,input,textarea,select{font-family:inherit}
    .app{height:100vh;display:grid;grid-template-columns:236px minmax(300px,360px) minmax(520px,1fr) 304px;gap:14px;padding:0 14px 14px;}
    .top-line{position:fixed;left:236px;right:0;top:0;height:92px;background:rgba(255,255,255,.82);backdrop-filter:blur(18px);border-bottom:1px solid rgba(226,234,223,.78);z-index:4;display:flex;align-items:center;justify-content:space-between;padding:0 28px 0 26px;}
    .page-title h1{margin:0;font-size:25px;letter-spacing:-.4px}.page-title p{margin:6px 0 0;color:var(--muted);font-size:13px}.top-actions{display:flex;align-items:center;gap:16px}.system-ok{display:flex;align-items:center;gap:8px;color:#5b6678;font-size:13px}.dot{width:9px;height:9px;border-radius:999px;background:var(--green);box-shadow:0 0 0 4px rgba(47,159,69,.12)}.top-btn{height:44px;border:1px solid var(--line);background:#fff;border-radius:12px;padding:0 17px;font-weight:800;color:#243047;box-shadow:var(--soft-shadow);display:flex;gap:9px;align-items:center}.bell{width:44px;height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;position:relative;display:grid;place-items:center}.bell:after{content:"3";position:absolute;top:-8px;right:-5px;background:var(--green);color:#fff;border-radius:999px;font-size:11px;font-weight:900;padding:3px 7px}.brand-badge{width:44px;height:44px;border-radius:50%;background:#050505;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:900;letter-spacing:.5px}
    .side{grid-column:1;grid-row:1;min-height:100vh;background:rgba(255,255,255,.72);border-right:1px solid rgba(226,234,223,.9);padding:30px 15px 18px;display:flex;flex-direction:column;gap:18px;z-index:5}.logo{height:74px;display:flex;align-items:center;justify-content:center;flex-direction:column;letter-spacing:8px;font-size:32px;font-weight:400}.logo .leaf{display:inline-grid;place-items:center;width:34px;height:34px;margin:0 -4px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d7ffb9,#79bd33 56%,#316e21);color:#fff;letter-spacing:0}.logo small{font-size:11px;letter-spacing:12px;margin-top:3px;color:#66717f}.nav{display:flex;flex-direction:column;gap:5px;margin-top:18px}.nav a{display:flex;align-items:center;gap:13px;height:42px;border-radius:10px;color:#596275;text-decoration:none;font-size:14px;padding:0 13px}.nav a.active{background:#eaf7e7;color:#248338;font-weight:900}.nav svg{width:18px;height:18px;stroke:currentColor}.branch-box,.agent-card{border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:var(--soft-shadow);padding:12px}.branch-box{margin-top:auto}.box-head{display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:13px;margin-bottom:10px}.plus{width:28px;height:28px;border-radius:9px;border:1px solid var(--line);background:#fff;font-size:19px;color:#293242}.branch-row{display:flex;align-items:center;justify-content:space-between;padding:10px;border-radius:12px;border:1px solid #edf2e9;margin-top:8px;font-weight:800;font-size:13px}.branch-row span{display:flex;align-items:center;gap:8px}.badge{min-width:23px;height:23px;border-radius:999px;background:var(--green);color:#fff;font-size:12px;font-weight:900;display:inline-grid;place-items:center;padding:0 7px}.green-dot{width:8px;height:8px;border-radius:50%;background:var(--green)}.agent-card{display:flex;align-items:center;gap:10px}.avatar-img,.avatar{width:42px;height:42px;border-radius:50%;background:#e4f4df;display:grid;place-items:center;font-weight:900;color:#2e7f2b;overflow:hidden;flex:none}.agent-card .avatar-img{background:linear-gradient(135deg,#f1e1cf,#e7c7b7)}.agent-info b{font-size:13px}.agent-info span{display:block;color:var(--muted);font-size:12px;margin-top:3px}
    .panel{margin-top:100px;background:rgba(255,255,255,.86);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;min-height:0}.list-panel{grid-column:2;height:calc(100vh - 114px);display:flex;flex-direction:column}.search-area{padding:18px;border-bottom:1px solid #edf2e9}.search-row{display:flex;gap:10px}.search{height:44px;border:1px solid var(--line);border-radius:13px;padding:0 14px;width:100%;font-size:13px;background:#fff}.icon-btn{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:#fff;display:grid;place-items:center}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.chip{border:1px solid var(--line);background:#fff;color:#2a3344;border-radius:10px;padding:9px 13px;font-size:12px;font-weight:850;cursor:pointer}.chip.active{background:var(--green);border-color:var(--green);color:#fff}.branch-tabs{display:flex;gap:12px;padding:14px 18px 12px;border-bottom:1px solid #edf2e9}.branch-chip{flex:1;height:38px;border:1px solid var(--line);border-radius:12px;background:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;gap:9px;color:#263143}.branch-chip.active{border-color:var(--green);background:#f2fbef;color:#1e8c34}.conversation-list{overflow:auto;padding:8px 8px 0;min-height:0}.conversation-item{display:grid;grid-template-columns:50px 1fr auto;gap:10px;align-items:center;padding:14px 10px;border-bottom:1px solid #edf2e9;cursor:pointer;position:relative;border-radius:14px;margin-bottom:4px}.conversation-item:hover,.conversation-item.selected{background:#eef9eb}.conversation-item.selected{box-shadow:inset 0 0 0 1px #ccebc4}.c-name{font-weight:900;font-size:14px;display:flex;gap:6px;align-items:center}.wa{color:#169f3f;font-weight:900}.preview{font-size:12px;color:var(--muted);line-height:1.35;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.time{font-size:11px;color:var(--muted);white-space:nowrap}.unread-bubble{position:absolute;right:12px;bottom:14px;background:var(--green);color:#fff;border-radius:999px;font-size:11px;font-weight:900;min-width:22px;height:22px;display:grid;place-items:center}.list-footer{padding:12px 16px;color:var(--muted);font-size:12px;display:flex;justify-content:space-between;border-top:1px solid #edf2e9}
    .chat-panel{grid-column:3;height:calc(100vh - 114px);display:grid;grid-template-rows:76px 1fr auto}.chat-head{height:76px;border-bottom:1px solid #edf2e9;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:rgba(255,255,255,.88)}.chat-person{display:flex;gap:12px;align-items:center}.chat-person b{font-size:16px}.chat-person span{display:block;color:var(--muted);font-size:13px;margin-top:4px}.status-select{height:38px;border:1px solid var(--line);background:#fff;border-radius:11px;color:var(--green);font-weight:900;padding:0 12px}.messages{overflow:auto;padding:18px;background:linear-gradient(rgba(248,252,246,.82),rgba(248,252,246,.82)),radial-gradient(circle at 15% 15%,rgba(120,184,62,.12),transparent 34%);position:relative}.messages:before{content:"";position:absolute;inset:0;opacity:.05;background-image:radial-gradient(circle at 1px 1px,#2b7f2e 1px,transparent 0);background-size:22px 22px;pointer-events:none}.date-pill{position:relative;z-index:1;margin:0 auto 16px;width:max-content;background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 13px;font-size:11px;color:#68758a;box-shadow:var(--soft-shadow)}.msg{position:relative;z-index:1;display:flex;margin:10px 0}.msg.customer{justify-content:flex-start}.msg.bot,.msg.staff{justify-content:flex-end}.bubble{max-width:68%;border:1px solid #dfe8d9;background:#fff;border-radius:15px;padding:12px 14px;box-shadow:0 6px 16px rgba(30,60,30,.05);font-size:13px;line-height:1.45;white-space:pre-wrap}.msg.staff .bubble,.msg.bot .bubble{background:#daf6cf;border-color:#c2e9b8}.meta{display:flex;align-items:center;gap:8px;color:#6c7789;font-size:11px;margin-bottom:5px;font-weight:800}.msg.staff .meta,.msg.bot .meta{color:#207c35}.stamp{text-align:right;color:#778397;font-size:10px;margin-top:7px}.image-placeholder{border:1px dashed #b7d8ad;background:#f7fff5;border-radius:14px;padding:12px;margin-top:6px;color:#2c7835;font-weight:900}.compose{padding:12px 14px 14px;border-top:1px solid #edf2e9;background:#fff}.reply-tabs{display:flex;gap:22px;margin-bottom:9px}.reply-tabs span{font-size:13px;font-weight:900;color:var(--muted);padding-bottom:8px}.reply-tabs .active{color:var(--green);border-bottom:3px solid var(--green)}.compose-box{border:1px solid #dce8d5;border-radius:16px;background:#fff;padding:10px}.compose textarea{width:100%;height:64px;border:0;outline:0;resize:none;font-size:13px}.compose-actions{display:flex;align-items:center;gap:10px}.mini-icon{width:34px;height:34px;border:0;background:#fff;color:#6d778b;font-size:19px}.image-btn,.send-btn{height:40px;border-radius:11px;border:1px solid #cde5c7;background:#fff;color:var(--green);font-weight:900;padding:0 15px}.send-btn{background:var(--green);color:#fff;border-color:var(--green);width:46px;font-size:18px}.image-tools{display:flex;gap:8px;align-items:center;margin-top:9px}.file-input{max-width:185px;font-size:11px}.caption-input{height:34px;border:1px solid var(--line);border-radius:10px;padding:0 10px;min-width:190px}.responding{font-size:12px;color:var(--muted);margin-top:8px}.result{font-size:12px;color:#557059;margin-top:6px;min-height:16px}
    .details-panel{grid-column:4;height:calc(100vh - 114px);display:flex;flex-direction:column;gap:12px;overflow:auto;background:transparent;border:0;box-shadow:none}.detail-card{background:rgba(255,255,255,.9);border:1px solid var(--line);border-radius:18px;box-shadow:var(--soft-shadow);padding:16px}.detail-card h3{margin:0 0 13px;font-size:15px}.profile-row{display:flex;gap:12px;align-items:center;margin-bottom:14px}.profile-row b{font-size:16px}.profile-row span{display:block;color:var(--muted);font-size:13px;margin-top:4px}.field{display:flex;justify-content:space-between;gap:10px;font-size:13px;border-top:1px solid #eef3ea;padding:10px 0}.field label{color:var(--muted)}.tag-row{display:flex;gap:8px;flex-wrap:wrap}.tag{background:#eef8ea;border:1px solid #d9efd3;color:#2d7932;border-radius:10px;padding:8px 10px;font-weight:800;font-size:12px}.quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.quick-btn,.status-btn{height:38px;border:1px solid var(--line);border-radius:10px;background:#fff;font-weight:900;color:#293244}.about{background:linear-gradient(145deg,#f1ffe9,#e3f6d9)}.about p{color:#5d697a;font-size:13px;line-height:1.5}.contact-line{font-size:13px;color:#344056;margin-top:10px}.hidden-fields{display:none}
    @media(max-width:1180px){body{overflow:auto}.app{height:auto;min-height:100vh;grid-template-columns:210px 330px minmax(500px,1fr);}.details-panel{display:none}.top-line{left:210px}.side{min-height:100vh}.panel{height:calc(100vh - 114px)}}
  </style>
</head>
<body>
  <div class="top-line">
    <div class="page-title"><h1>Team Inbox</h1><p>Manage all customer conversations in one place</p></div>
    <div class="top-actions"><div class="system-ok"><i class="dot"></i>All systems operational</div><button class="top-btn" type="button">⚡ Quick Replies</button><div class="bell">🔔</div><div class="brand-badge">ICONIC</div></div>
  </div>
  <div class="app">
    <aside class="side">
      <div class="logo">IC<span class="leaf">◔</span>NIC<small>HAIR CARE</small></div>
      <nav class="nav">
        <a class="active"><span>▣</span> Team Inbox</a><a><span>⌂</span> Dashboard</a><a><span>○</span> Conversations</a><a><span>♧</span> Team</a><a><span>▧</span> Contacts</a><a><span>✎</span> Quick Replies</a><a><span>⌁</span> Broadcast</a><a><span>□</span> Files & Media</a><a><span>Ⅲ</span> Analytics</a><a><span>⚙</span> Settings</a>
      </nav>
      <div class="branch-box"><div class="box-head"><span>⌂ Our Branches</span><button class="plus" type="button">+</button></div><div class="branch-row"><span>Dubai <i class="green-dot"></i></span><b id="sideDubaiCount" class="badge">0</b></div><div class="branch-row"><span>Abu Dhabi <i class="green-dot"></i></span><b id="sideAbuCount" class="badge">0</b></div></div>
      <div class="agent-card"><div class="avatar-img">SA</div><div class="agent-info"><b>Sara Al Mansoory</b><span>Admin</span></div></div>
    </aside>
    <section class="panel list-panel">
      <div class="search-area"><div class="search-row"><input id="searchBox" class="search" placeholder="Search conversations..." /><button class="icon-btn" type="button">⌕</button></div><div class="chips" id="typeChips"><button class="chip active" data-filter="all">All</button><button class="chip" data-filter="customer">Customer</button><button class="chip" data-filter="bot">Bot Reply</button><button class="chip" data-filter="human">Human Reply</button><button class="chip" data-filter="followup">Follow-up</button><button class="chip" data-filter="team">Talk to Team</button></div></div>
      <div class="branch-tabs"><button class="branch-chip active" data-branch="all">All <span id="allCount" class="badge">0</span></button><button class="branch-chip" data-branch="Dubai">Dubai <span id="dubaiCount" class="badge">0</span></button><button class="branch-chip" data-branch="Abu Dhabi">Abu Dhabi <span id="abuCount" class="badge">0</span></button></div>
      <div id="conversationList" class="conversation-list"></div><div class="list-footer"><span id="listSummary">Showing 0 conversations</span><button class="mini-icon" id="refreshBtn" type="button">⟳</button></div>
    </section>
    <section class="panel chat-panel">
      <div class="chat-head"><div class="chat-person"><div id="chatAvatar" class="avatar">IC</div><div><b id="chatName">Select a customer</b><span id="chatSub">No conversation selected</span></div></div><div style="display:flex;gap:8px;align-items:center"><select id="statusSelect" class="status-select"><option>Open</option><option>Need Follow-up</option><option>Human Reply</option><option>Closed</option></select><button class="icon-btn" type="button">⋮</button></div></div>
      <div id="messages" class="messages"><div class="date-pill">Select a conversation</div></div>
      <div class="compose"><div class="reply-tabs"><span class="active">Reply</span><span>Note</span></div><div class="compose-box"><textarea id="inputBody" placeholder="Type your reply here..."></textarea><div class="compose-actions"><button class="mini-icon" type="button">☺</button><button class="mini-icon" type="button">📎</button><button class="mini-icon" type="button">🖼</button><div style="flex:1"></div><button id="sendImageBtn" class="image-btn" type="button">▧ Send image</button><button id="sendBtn" class="send-btn" type="button">➤</button></div><div class="image-tools"><input id="imageFile" class="file-input" type="file" accept="image/jpeg,image/png,image/webp" /><input id="imageCaption" class="caption-input" placeholder="Optional image caption..." /></div></div><div class="responding">Responding as: <b id="respondingAs">Iconic Hair Care Team</b></div><div id="resultBox" class="result"></div><div class="hidden-fields"><input id="inputTo"><input id="inputLine"></div></div>
    </section>
    <aside class="details-panel">
      <div class="detail-card"><h3>Customer Details <span style="float:right;color:var(--green)">☘</span></h3><div class="profile-row"><div id="profileAvatar" class="avatar">IC</div><div><b id="profileName">No customer</b><span id="profilePhone">Select a chat</span></div></div><div class="field"><label>Name</label><b id="fieldName">-</b></div><div class="field"><label>Phone</label><b id="fieldPhone">-</b></div><div class="field"><label>Location</label><b id="fieldLocation">-</b></div><div class="field"><label>First Contact</label><b id="fieldFirst">-</b></div><div class="field"><label>Language</label><b>English</b></div><div class="field"><label>Status</label><span class="tag" id="fieldStatus">Customer</span></div></div>
      <div class="detail-card"><h3>Conversation Info</h3><div class="field"><label>Channel</label><b>WhatsApp</b></div><div class="field"><label>Branch</label><b id="infoBranch">-</b></div><div class="field"><label>Assigned To</label><b>Sara Al Mansoory</b></div><div class="field"><label>Status</label><span class="tag" id="infoStatus">Open</span></div><div class="field"><label>Last Activity</label><b id="infoLast">-</b></div></div>
      <div class="detail-card"><h3>Conversation Tags</h3><div class="tag-row"><span class="tag">Consultation</span><span class="tag">New Customer</span><button class="quick-btn" type="button">+ Add Tag</button></div></div>
      <div class="detail-card"><h3>Quick Actions</h3><div class="quick-grid"><button class="quick-btn" data-text="Hello, please send us your preferred branch, service, date and time so our team can assist you." type="button">Need details</button><button class="quick-btn" data-text="Our team will review your request and reply shortly." type="button">Team handoff</button><button class="status-btn" data-status="Need Follow-up" type="button">Follow-up</button><button class="quick-btn" data-text="Would you like to book an appointment? Please send your preferred day and time." type="button">Book Appointment</button></div></div>
      <div class="detail-card about"><h3>About Iconic Hair Care</h3><p>Premium hair care and beauty services. Visit our branches in Dubai and Abu Dhabi.</p><div class="contact-line">☎ Dubai: 04 396 3333</div><div class="contact-line">☎ Abu Dhabi: 02 562 2778</div><div class="contact-line">🌐 www.iconichaircare.com</div></div>
    </aside>
  </div>
<script>
var allMessages=[];var conversations=[];var selectedKey="";var currentType="all";var currentBranch="all";var readMap={};try{readMap=JSON.parse(localStorage.getItem("iconicReadMapV18")||"{}")}catch(e){readMap={}}
var el=function(id){return document.getElementById(id)};var searchBox=el("searchBox"),conversationList=el("conversationList"),messagesBox=el("messages"),inputBody=el("inputBody"),inputTo=el("inputTo"),inputLine=el("inputLine"),resultBox=el("resultBox"),imageFile=el("imageFile"),imageCaption=el("imageCaption"),statusSelect=el("statusSelect");
function esc(v){return (v||"").toString().replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})}
function norm(v){return (v||"").toString().toLowerCase().trim()}function digits(v){return (v||"").toString().replace(/\D/g,"")}function initials(name,phone){var base=(name||phone||"IC").toString().trim();if(!base)return"IC";var parts=base.split(/\s+/).filter(Boolean);if(parts.length>=2)return (parts[0][0]+parts[1][0]).toUpperCase();return base.slice(0,2).toUpperCase()}function parseTime(v){var d=new Date(v);return isNaN(d.getTime())?0:d.getTime()}function formatTime(v){var d=new Date(v);if(isNaN(d.getTime()))return v||"";return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}function formatDate(v){var d=new Date(v);if(isNaN(d.getTime()))return "";return d.toLocaleDateString([], {month:"short",day:"numeric",year:"numeric"})}function keyOf(m){return digits(m.phone)+"|"+(m.phoneNumberId||"")}
function msgKind(m){var mt=norm(m.messageType),st=norm(m.status),body=norm(m.body),sender=norm(m.sender);if(sender==="customer")return"customer";if(mt.includes("human")||sender==="staff")return"human";if(mt.includes("bot")||sender==="bot")return"bot";if(mt.includes("follow")||st.includes("follow")||body.includes("follow-up"))return"followup";return sender||"message"}
function typeMatch(c){if(currentType==="all")return true;return c.messages.some(function(m){var k=msgKind(m);var body=norm(m.body);var st=norm(m.status);var mt=norm(m.messageType);if(currentType==="team")return body.includes("talk to team")||st.includes("team")||mt.includes("team");if(currentType==="followup")return k==="followup"||st.includes("follow");if(currentType==="human")return k==="human";if(currentType==="bot")return k==="bot";if(currentType==="customer")return k==="customer";return true})}
function buildConversations(){var map={};allMessages.forEach(function(m){var k=keyOf(m);if(!digits(m.phone))return;if(!map[k])map[k]={key:k,phone:digits(m.phone),phoneNumberId:m.phoneNumberId||"",name:m.customerName||"",branch:m.branch||"Dubai",messages:[],lastTime:0};map[k].messages.push(m);if(m.customerName)map[k].name=m.customerName;if(m.branch)map[k].branch=m.branch;var t=parseTime(m.time);if(t>map[k].lastTime)map[k].lastTime=t});conversations=Object.keys(map).map(function(k){var c=map[k];c.messages.sort(function(a,b){return parseTime(a.time)-parseTime(b.time)});c.latest=c.messages[c.messages.length-1]||{};c.unread=Math.max(0,c.messages.length-(readMap[c.key]||0));return c}).sort(function(a,b){return b.lastTime-a.lastTime})}
function filtered(){var q=norm(searchBox.value);return conversations.filter(function(c){if(currentBranch!=="all"&&c.branch!==currentBranch)return false;if(!typeMatch(c))return false;if(!q)return true;var hay=[c.phone,c.name,c.branch].concat(c.messages.map(function(m){return m.body||""})).join(" ").toLowerCase();return hay.indexOf(q)>-1})}
function updateCounts(){var d=conversations.filter(function(c){return c.branch==="Dubai"}).length;var a=conversations.filter(function(c){return c.branch==="Abu Dhabi"}).length;el("allCount").textContent=conversations.length;el("dubaiCount").textContent=d;el("abuCount").textContent=a;el("sideDubaiCount").textContent=d;el("sideAbuCount").textContent=a}
function renderList(){var list=filtered();conversationList.innerHTML=list.map(function(c){var name=c.name||c.phone;var latest=c.latest||{};var badge=c.unread?'<span class="unread-bubble">'+c.unread+'</span>':'';return '<div class="conversation-item '+(c.key===selectedKey?'selected':'')+'" data-key="'+esc(c.key)+'"><div class="avatar">'+esc(initials(name,c.phone))+'</div><div><div class="c-name">'+esc(name)+' <span class="wa">☘</span></div><div class="preview">'+esc(latest.body||'No message')+'</div></div><div class="time">'+esc(formatTime(latest.time))+'</div>'+badge+'</div>'}).join("")||'<div style="padding:24px;color:#6f7a8e">No conversations found.</div>';el("listSummary").textContent="Showing "+list.length+" of "+conversations.length;Array.prototype.forEach.call(conversationList.querySelectorAll(".conversation-item"),function(item){item.onclick=function(){selectConversation(item.getAttribute("data-key"))}})}
function renderMessageBody(m){var body=m.body||"";var clean=esc(body);if(body.indexOf("[Image sent]")===0){return '<div class="image-placeholder">🖼 Image sent</div><div style="margin-top:7px;color:#4c596b;font-weight:600">'+clean.replace(/\n/g,"<br>")+'</div>'}return clean.replace(/\n/g,"<br>")}
function renderChat(){var c=conversations.find(function(x){return x.key===selectedKey});if(!c){messagesBox.innerHTML='<div class="date-pill">Select a conversation</div>';return}var name=c.name||c.phone;el("chatAvatar").textContent=initials(name,c.phone);el("chatName").textContent=name;el("chatSub").textContent="+"+c.phone;inputTo.value=c.phone;inputLine.value=c.phoneNumberId;el("respondingAs").textContent="Iconic Hair Care Team ("+c.branch+")";el("profileAvatar").textContent=initials(name,c.phone);el("profileName").textContent=name;el("profilePhone").textContent="+"+c.phone;el("fieldName").textContent=name;el("fieldPhone").textContent="+"+c.phone;el("fieldLocation").textContent=c.branch+", UAE";el("fieldFirst").textContent=formatDate(c.messages[0]&&c.messages[0].time)||"-";el("infoBranch").textContent=c.branch;el("infoLast").textContent=formatTime(c.latest.time)||"-";var html='<div class="date-pill">'+(formatDate(c.latest.time)||'Conversation')+'</div>';c.messages.forEach(function(m){var cls=norm(m.sender)==="customer"?"customer":(norm(m.sender)==="bot"?"bot":"staff");var label=cls==="customer"?(c.name||"Customer"):(cls==="bot"?"Bot":"Team");html+='<div class="msg '+cls+'"><div class="bubble"><div class="meta">'+esc(label)+' • '+esc(formatTime(m.time))+'</div>'+renderMessageBody(m)+'<div class="stamp">'+esc(m.messageType||m.status||"")+'</div></div></div>'});messagesBox.innerHTML=html;messagesBox.scrollTop=messagesBox.scrollHeight;readMap[c.key]=c.messages.length;localStorage.setItem("iconicReadMapV18",JSON.stringify(readMap));}
function renderAll(){buildConversations();if(!selectedKey&&conversations[0])selectedKey=conversations[0].key;updateCounts();renderList();renderChat()}
async function loadMessages(){try{var r=await fetch("/api/messages");var data=await r.json();if(data.ok&&Array.isArray(data.messages)){allMessages=data.messages;renderAll()}}catch(e){resultBox.textContent="Could not load messages."}}
function selectConversation(k){selectedKey=k;renderAll()}
async function sendReply(){var to=inputTo.value.trim();var body=inputBody.value.trim();var phoneNumberId=inputLine.value.trim();if(!to||!body){resultBox.textContent="Select a customer and type a reply.";return}resultBox.textContent="Sending...";try{var r=await fetch("/api/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:to,body:body,phoneNumberId:phoneNumberId})});var data=await r.json();if(data.ok){inputBody.value="";resultBox.textContent="Sent successfully.";await loadMessages()}else resultBox.textContent="Failed: "+(data.error||"Unknown error")}catch(e){resultBox.textContent="Failed: network error."}}
function fileToDataUrl(file){return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result)};reader.onerror=function(){reject(new Error("Could not read image."))};reader.readAsDataURL(file)})}
async function sendImage(){var to=inputTo.value.trim();var phoneNumberId=inputLine.value.trim();var file=imageFile.files&&imageFile.files[0];var caption=imageCaption.value.trim();if(!to){resultBox.textContent="Select a customer first.";return}if(!file){resultBox.textContent="Please choose an image first.";return}if(["image/jpeg","image/png","image/webp"].indexOf(file.type)===-1){resultBox.textContent="Use JPG, PNG, or WEBP only.";return}if(file.size>5*1024*1024){resultBox.textContent="Image must be under 5MB.";return}resultBox.textContent="Uploading image...";try{var imageDataUrl=await fileToDataUrl(file);var r=await fetch("/api/send-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:to,phoneNumberId:phoneNumberId,imageDataUrl:imageDataUrl,filename:file.name,mimeType:file.type,caption:caption})});var data=await r.json();if(data.ok){imageFile.value="";imageCaption.value="";resultBox.textContent="Image sent successfully.";await loadMessages()}else resultBox.textContent="Failed: "+(data.error||"Image send failed")}catch(e){resultBox.textContent="Failed: image upload error."}}
async function updateStatus(status){var phone=inputTo.value.trim();if(!phone){resultBox.textContent="Select a customer first.";return}resultBox.textContent="Updating status...";try{var r=await fetch("/api/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:phone,status:status})});var data=await r.json();resultBox.textContent=data.ok?"Status updated.":"Failed to update status.";loadMessages()}catch(e){resultBox.textContent="Failed: status error."}}
document.getElementById("sendBtn").onclick=sendReply;document.getElementById("sendImageBtn").onclick=sendImage;document.getElementById("refreshBtn").onclick=loadMessages;searchBox.oninput=renderAll;statusSelect.onchange=function(){updateStatus(statusSelect.value)};Array.prototype.forEach.call(document.querySelectorAll(".chip"),function(b){b.onclick=function(){Array.prototype.forEach.call(document.querySelectorAll(".chip"),function(x){x.classList.remove("active")});b.classList.add("active");currentType=b.getAttribute("data-filter");renderAll()}});Array.prototype.forEach.call(document.querySelectorAll(".branch-chip"),function(b){b.onclick=function(){Array.prototype.forEach.call(document.querySelectorAll(".branch-chip"),function(x){x.classList.remove("active")});b.classList.add("active");currentBranch=b.getAttribute("data-branch");renderAll()}});Array.prototype.forEach.call(document.querySelectorAll(".quick-btn"),function(b){b.onclick=function(){var t=b.getAttribute("data-text");if(t){inputBody.value=t;inputBody.focus()}}});Array.prototype.forEach.call(document.querySelectorAll(".status-btn"),function(b){b.onclick=function(){updateStatus(b.getAttribute("data-status")||"Need Follow-up")}});loadMessages();setInterval(loadMessages,3000);
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
