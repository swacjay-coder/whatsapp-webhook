# V60.2 Send and Confirmation Inspection

## function sendWhatsAppMessage
Found at line 1068
```js

  if (!cleanAction) {
    return "";
  }

  return cleanName ? `${cleanName}: ${cleanAction}` : cleanAction;
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
```

## async function sendWhatsAppMessage
Found at line 1068
```js

  if (!cleanAction) {
    return "";
  }

  return cleanName ? `${cleanName}: ${cleanAction}` : cleanAction;
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
```

## function sendWhatsAppButtonMessage
Found at line 1296
```js
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
```

## async function sendWhatsAppButtonMessage
Found at line 1296
```js
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
```

## function sendWhatsAppImageMessage
Found at line 1168
```js

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
```

## async function sendWhatsAppImageMessage
Found at line 1168
```js

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
```

## function buildWhatsAppFlowConfirmationBody
Found at line 2101
```js
    `Preferred day: ${flowData.preferredDay || ""}`,
    `Preferred time: ${flowData.preferredTime || ""}`,
    `Service interest: ${flowData.serviceInterest || ""}`,
    flowData.serviceType ? `Service type: ${flowData.serviceType}` : "Service type: ",
    flowData.consultationType ? `Consultation type: ${flowData.consultationType}` : "Consultation type: ",
    flowData.teamMember ? `Team member: ${flowData.teamMember}` : "Team member: ",
    flowData.notes ? `Notes: ${flowData.notes}` : "Notes: ",
    "Flyksoft Status: Not added",
    "Customer selection: WhatsApp Flow submit"
  ].join("\n");
}

function buildWhatsAppFlowConfirmationBody(flowData = {}) {
  const branchAr = getFastBookingBranchArabic(flowData.branch || "Dubai");

  return [
    `${BUSINESS_NAME_SPACED} ✨`,
    "",
    "شكراً لك.",
    "تم استلام طلب الحجز.",
    "سيقوم فريقنا بمراجعة التوفر وتأكيد الموعد النهائي قريباً.",
    "",
    `الفرع: ${branchAr}`,
    `الوقت المفضل: ${flowData.preferredTime || "Flexible / Any available time"}`,
    "",
    "------------------------------",
    "",
    `${BUSINESS_NAME_SPACED} ✨`,
    "",
    "Your booking request has been received.",
    "Our team will check availability and confirm the exact appointment shortly.",
    "",
    `Branch: ${flowData.branch || "Dubai"}`,
    `Preferred time: ${flowData.preferredTime || "Flexible / Any available time"}`
  ].join(String.fromCharCode(10));
}


async function handleWhatsAppFlowBookingSubmit({
  from,
  message,
  incomingPhoneNumberId,
  lineConfig,
  profileName,
  displayPhoneNumber = ""
}) {
  if (!isWhatsAppFlowReply(message)) {
    return false;
  }

  const flowData = getWhatsAppFlowBookingData(message, { ...lineConfig, customerName: profileName, phone: from });

  if (!flowData) {
    return false;
  }

  const selectedBranch = flowData.branch || lineConfig.branch || "Dubai";
  const requestMessage = buildWhatsAppFlowBookingRequestMessage(flowData);

  addInboxMessage(
    from,
    "customer",
    requestMessage,
    "Booking Request",
    incomingPhoneNumberId,
    {
      customerName: profileName,
      messageType: "WhatsApp Flow Submit"
    }
  );

  setConversationStatus(from, "Booking Request");
  await saveConversationStateToGoogleSheetFromServer({
    phone: from,
    phoneNumberId: incomingPhoneNumberId,
    branch: selectedBranch,
    status: "Booking Request",
    assignee: getBranchTeamAssignee(selectedBranch),
    tags: ["Booking", "WhatsApp Flow", "Need Confirmation"],
    updatedBy: "WhatsApp Flow"
  });

  await saveBookingRequestToGoogleSheetFromServer({
    phone: from,
    phoneNumberId: incomingPhoneNumberId,
    customerName: flowData.customerName || profileName,
    branch: selectedBranch,
    message: requestMessage,
    requestType: flowData.serviceInterest || "WhatsApp Flow",
    bookingStatus: "Pending"
  });

  console.log("[Staff Booking Notify] preparing", {
    branch: selectedBranch,
    phoneNumberId: incomingPhoneNumberId,
    displayPhoneNumber,
    customerPhone: from,
```

## const confirmationBody = buildWhatsAppFlowConfirmationBody
Found at line 2194
```js
    branch: selectedBranch,
    phoneNumberId: incomingPhoneNumberId,
    displayPhoneNumber,
    customerPhone: from,
    customerName: flowData.customerName || profileName || ""
  });

  notifyStaffAboutFlowBooking(flowData, from, incomingPhoneNumberId, displayPhoneNumber || "").catch((error) => {
    console.log("Staff booking notification failed:");
    console.log(error);
  });

  const confirmationBody = buildWhatsAppFlowConfirmationBody(flowData);
  const confirmationButtons = getConsultActionButtons();

  await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);
  addInboxMessage(
    from,
    "bot",
    formatButtonLog(confirmationBody, confirmationButtons),
    "Booking Request",
    incomingPhoneNumberId,
    {
      customerName: profileName,
      messageType: "WhatsApp Flow Confirmation"
    }
  );

  return true;
}

/* V31.5.8.31 - Legendary WhatsApp Fast Booking Buttons
   Safe independent flow: creates a Booking Request only.
   Does not connect to Flyksoft and does not touch reminder/cron logic. */
const fastBookingDrafts = {};

function getFastBookingBranchButtons() {
  return [
    { id: "fast_book_dubai", title: "Dubai" },
    { id: "fast_book_abudhabi", title: "Abu Dhabi" },
    { id: "talk_to_team", title: "Team" }
  ];
}

function getFastBookingTimeButtons() {
  return [
    { id: "fast_time_today", title: "Today" },
    { id: "fast_time_tomorrow", title: "Tomorrow" },
    { id: "fast_time_week", title: "This Week" }
  ];
}

function isFastBookingStartText(text) {
  const value = compactText(text);

  return value === "1" ||
    value === "١" ||
    value === "book_appointment" ||
    value.includes("حجز موعد") ||
    value.includes("احجز") ||
    value.includes("موعد") ||
    value.includes("appointment") ||
    value.includes("book consultation") ||
    value.includes("book appointment") ||
    value === "book" ||
    value.includes(" book");
}

function isServiceMenuText(text) {
  const value = compactText(text);

  return value === "service | سيرفس" ||
    value === "service_menu" ||
    value === "service" ||
    value === "سيرفس" ||
    value.includes("service |") ||
    value.includes("سيرفس");
}

function isBookServiceFlowText(text) {
  const value = compactText(text);

  if (!value) return false;

  return value === "book_service_flow" ||
    value === "book service | سيرفس" ||
    value === "book service" ||
    value === "service booking" ||
    value === "service" ||
    value === "سيرفس" ||
    value === "خدمة" ||
    value === "خدمه" ||
    value.includes("book service") ||
    value.includes("service appointment") ||
    value.includes("حجز سيرفس") ||
    value.includes("موعد سيرفس") ||
    value.includes("موعد خدمة") ||
```

## sendWhatsAppButtonMessage(from, confirmationBody
Found at line 2197
```js
    customerPhone: from,
    customerName: flowData.customerName || profileName || ""
  });

  notifyStaffAboutFlowBooking(flowData, from, incomingPhoneNumberId, displayPhoneNumber || "").catch((error) => {
    console.log("Staff booking notification failed:");
    console.log(error);
  });

  const confirmationBody = buildWhatsAppFlowConfirmationBody(flowData);
  const confirmationButtons = getConsultActionButtons();

  await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);
  addInboxMessage(
    from,
    "bot",
    formatButtonLog(confirmationBody, confirmationButtons),
    "Booking Request",
    incomingPhoneNumberId,
    {
      customerName: profileName,
      messageType: "WhatsApp Flow Confirmation"
    }
  );

  return true;
}

/* V31.5.8.31 - Legendary WhatsApp Fast Booking Buttons
   Safe independent flow: creates a Booking Request only.
   Does not connect to Flyksoft and does not touch reminder/cron logic. */
const fastBookingDrafts = {};

function getFastBookingBranchButtons() {
  return [
    { id: "fast_book_dubai", title: "Dubai" },
    { id: "fast_book_abudhabi", title: "Abu Dhabi" },
    { id: "talk_to_team", title: "Team" }
  ];
}

function getFastBookingTimeButtons() {
  return [
    { id: "fast_time_today", title: "Today" },
    { id: "fast_time_tomorrow", title: "Tomorrow" },
    { id: "fast_time_week", title: "This Week" }
  ];
}

function isFastBookingStartText(text) {
  const value = compactText(text);

  return value === "1" ||
    value === "١" ||
    value === "book_appointment" ||
    value.includes("حجز موعد") ||
    value.includes("احجز") ||
    value.includes("موعد") ||
    value.includes("appointment") ||
    value.includes("book consultation") ||
    value.includes("book appointment") ||
    value === "book" ||
    value.includes(" book");
}

function isServiceMenuText(text) {
  const value = compactText(text);

  return value === "service | سيرفس" ||
    value === "service_menu" ||
    value === "service" ||
    value === "سيرفس" ||
    value.includes("service |") ||
    value.includes("سيرفس");
}

function isBookServiceFlowText(text) {
  const value = compactText(text);

  if (!value) return false;

  return value === "book_service_flow" ||
    value === "book service | سيرفس" ||
    value === "book service" ||
    value === "service booking" ||
    value === "service" ||
    value === "سيرفس" ||
    value === "خدمة" ||
    value === "خدمه" ||
    value.includes("book service") ||
    value.includes("service appointment") ||
    value.includes("حجز سيرفس") ||
    value.includes("موعد سيرفس") ||
    value.includes("موعد خدمة") ||
    value.includes("موعد خدمه") ||
    value.includes("متابعة") ||
    value.includes("تركيب") ||
```

Found at line 2644
```js
      customerName: profileName,
      branch: selectedBranch,
      message: buildFastBookingRequestMessage(selectedBranch, preferredTime, originalText),
      requestType: "WhatsApp Fast Booking",
      bookingStatus: "Pending"
    });

    delete fastBookingDrafts[from];

    const confirmationBody = buildFastBookingConfirmationBody(selectedBranch, preferredTime);
    const confirmationButtons = getConsultActionButtons();

    await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);
    addInboxMessage(from, "bot", formatButtonLog(confirmationBody, confirmationButtons), "Booking Request", incomingPhoneNumberId, { customerName: profileName, messageType: "Fast Booking Confirmation" });

    return true;
  }

  return false;
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
```

## confirmationButtons
Found at line 2195
```js
    phoneNumberId: incomingPhoneNumberId,
    displayPhoneNumber,
    customerPhone: from,
    customerName: flowData.customerName || profileName || ""
  });

  notifyStaffAboutFlowBooking(flowData, from, incomingPhoneNumberId, displayPhoneNumber || "").catch((error) => {
    console.log("Staff booking notification failed:");
    console.log(error);
  });

  const confirmationBody = buildWhatsAppFlowConfirmationBody(flowData);
  const confirmationButtons = getConsultActionButtons();

  await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);
  addInboxMessage(
    from,
    "bot",
    formatButtonLog(confirmationBody, confirmationButtons),
    "Booking Request",
    incomingPhoneNumberId,
    {
      customerName: profileName,
      messageType: "WhatsApp Flow Confirmation"
    }
  );

  return true;
}

/* V31.5.8.31 - Legendary WhatsApp Fast Booking Buttons
   Safe independent flow: creates a Booking Request only.
   Does not connect to Flyksoft and does not touch reminder/cron logic. */
const fastBookingDrafts = {};

function getFastBookingBranchButtons() {
  return [
    { id: "fast_book_dubai", title: "Dubai" },
    { id: "fast_book_abudhabi", title: "Abu Dhabi" },
    { id: "talk_to_team", title: "Team" }
  ];
}

function getFastBookingTimeButtons() {
  return [
    { id: "fast_time_today", title: "Today" },
    { id: "fast_time_tomorrow", title: "Tomorrow" },
    { id: "fast_time_week", title: "This Week" }
  ];
}

function isFastBookingStartText(text) {
  const value = compactText(text);

  return value === "1" ||
    value === "١" ||
    value === "book_appointment" ||
    value.includes("حجز موعد") ||
    value.includes("احجز") ||
    value.includes("موعد") ||
    value.includes("appointment") ||
    value.includes("book consultation") ||
    value.includes("book appointment") ||
    value === "book" ||
    value.includes(" book");
}

function isServiceMenuText(text) {
  const value = compactText(text);

  return value === "service | سيرفس" ||
    value === "service_menu" ||
    value === "service" ||
    value === "سيرفس" ||
    value.includes("service |") ||
    value.includes("سيرفس");
}

function isBookServiceFlowText(text) {
  const value = compactText(text);

  if (!value) return false;

  return value === "book_service_flow" ||
    value === "book service | سيرفس" ||
    value === "book service" ||
    value === "service booking" ||
    value === "service" ||
    value === "سيرفس" ||
    value === "خدمة" ||
    value === "خدمه" ||
    value.includes("book service") ||
    value.includes("service appointment") ||
    value.includes("حجز سيرفس") ||
    value.includes("موعد سيرفس") ||
    value.includes("موعد خدمة") ||
    value.includes("موعد خدمه") ||
```

Found at line 2197
```js
    customerPhone: from,
    customerName: flowData.customerName || profileName || ""
  });

  notifyStaffAboutFlowBooking(flowData, from, incomingPhoneNumberId, displayPhoneNumber || "").catch((error) => {
    console.log("Staff booking notification failed:");
    console.log(error);
  });

  const confirmationBody = buildWhatsAppFlowConfirmationBody(flowData);
  const confirmationButtons = getConsultActionButtons();

  await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);
  addInboxMessage(
    from,
    "bot",
    formatButtonLog(confirmationBody, confirmationButtons),
    "Booking Request",
    incomingPhoneNumberId,
    {
      customerName: profileName,
      messageType: "WhatsApp Flow Confirmation"
    }
  );

  return true;
}

/* V31.5.8.31 - Legendary WhatsApp Fast Booking Buttons
   Safe independent flow: creates a Booking Request only.
   Does not connect to Flyksoft and does not touch reminder/cron logic. */
const fastBookingDrafts = {};

function getFastBookingBranchButtons() {
  return [
    { id: "fast_book_dubai", title: "Dubai" },
    { id: "fast_book_abudhabi", title: "Abu Dhabi" },
    { id: "talk_to_team", title: "Team" }
  ];
}

function getFastBookingTimeButtons() {
  return [
    { id: "fast_time_today", title: "Today" },
    { id: "fast_time_tomorrow", title: "Tomorrow" },
    { id: "fast_time_week", title: "This Week" }
  ];
}

function isFastBookingStartText(text) {
  const value = compactText(text);

  return value === "1" ||
    value === "١" ||
    value === "book_appointment" ||
    value.includes("حجز موعد") ||
    value.includes("احجز") ||
    value.includes("موعد") ||
    value.includes("appointment") ||
    value.includes("book consultation") ||
    value.includes("book appointment") ||
    value === "book" ||
    value.includes(" book");
}

function isServiceMenuText(text) {
  const value = compactText(text);

  return value === "service | سيرفس" ||
    value === "service_menu" ||
    value === "service" ||
    value === "سيرفس" ||
    value.includes("service |") ||
    value.includes("سيرفس");
}

function isBookServiceFlowText(text) {
  const value = compactText(text);

  if (!value) return false;

  return value === "book_service_flow" ||
    value === "book service | سيرفس" ||
    value === "book service" ||
    value === "service booking" ||
    value === "service" ||
    value === "سيرفس" ||
    value === "خدمة" ||
    value === "خدمه" ||
    value.includes("book service") ||
    value.includes("service appointment") ||
    value.includes("حجز سيرفس") ||
    value.includes("موعد سيرفس") ||
    value.includes("موعد خدمة") ||
    value.includes("موعد خدمه") ||
    value.includes("متابعة") ||
    value.includes("تركيب") ||
```

Found at line 2201
```js
  notifyStaffAboutFlowBooking(flowData, from, incomingPhoneNumberId, displayPhoneNumber || "").catch((error) => {
    console.log("Staff booking notification failed:");
    console.log(error);
  });

  const confirmationBody = buildWhatsAppFlowConfirmationBody(flowData);
  const confirmationButtons = getConsultActionButtons();

  await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);
  addInboxMessage(
    from,
    "bot",
    formatButtonLog(confirmationBody, confirmationButtons),
    "Booking Request",
    incomingPhoneNumberId,
    {
      customerName: profileName,
      messageType: "WhatsApp Flow Confirmation"
    }
  );

  return true;
}

/* V31.5.8.31 - Legendary WhatsApp Fast Booking Buttons
   Safe independent flow: creates a Booking Request only.
   Does not connect to Flyksoft and does not touch reminder/cron logic. */
const fastBookingDrafts = {};

function getFastBookingBranchButtons() {
  return [
    { id: "fast_book_dubai", title: "Dubai" },
    { id: "fast_book_abudhabi", title: "Abu Dhabi" },
    { id: "talk_to_team", title: "Team" }
  ];
}

function getFastBookingTimeButtons() {
  return [
    { id: "fast_time_today", title: "Today" },
    { id: "fast_time_tomorrow", title: "Tomorrow" },
    { id: "fast_time_week", title: "This Week" }
  ];
}

function isFastBookingStartText(text) {
  const value = compactText(text);

  return value === "1" ||
    value === "١" ||
    value === "book_appointment" ||
    value.includes("حجز موعد") ||
    value.includes("احجز") ||
    value.includes("موعد") ||
    value.includes("appointment") ||
    value.includes("book consultation") ||
    value.includes("book appointment") ||
    value === "book" ||
    value.includes(" book");
}

function isServiceMenuText(text) {
  const value = compactText(text);

  return value === "service | سيرفس" ||
    value === "service_menu" ||
    value === "service" ||
    value === "سيرفس" ||
    value.includes("service |") ||
    value.includes("سيرفس");
}

function isBookServiceFlowText(text) {
  const value = compactText(text);

  if (!value) return false;

  return value === "book_service_flow" ||
    value === "book service | سيرفس" ||
    value === "book service" ||
    value === "service booking" ||
    value === "service" ||
    value === "سيرفس" ||
    value === "خدمة" ||
    value === "خدمه" ||
    value.includes("book service") ||
    value.includes("service appointment") ||
    value.includes("حجز سيرفس") ||
    value.includes("موعد سيرفس") ||
    value.includes("موعد خدمة") ||
    value.includes("موعد خدمه") ||
    value.includes("متابعة") ||
    value.includes("تركيب") ||
    value.includes("تعديل") ||
    value.includes("follow up") ||
    value.includes("follow-up") ||
    value.includes("fitting") ||
```

## getConsultActionButtons
Found at line 2195
```js
    phoneNumberId: incomingPhoneNumberId,
    displayPhoneNumber,
    customerPhone: from,
    customerName: flowData.customerName || profileName || ""
  });

  notifyStaffAboutFlowBooking(flowData, from, incomingPhoneNumberId, displayPhoneNumber || "").catch((error) => {
    console.log("Staff booking notification failed:");
    console.log(error);
  });

  const confirmationBody = buildWhatsAppFlowConfirmationBody(flowData);
  const confirmationButtons = getConsultActionButtons();

  await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);
  addInboxMessage(
    from,
    "bot",
    formatButtonLog(confirmationBody, confirmationButtons),
    "Booking Request",
    incomingPhoneNumberId,
    {
      customerName: profileName,
      messageType: "WhatsApp Flow Confirmation"
    }
  );

  return true;
}

/* V31.5.8.31 - Legendary WhatsApp Fast Booking Buttons
   Safe independent flow: creates a Booking Request only.
   Does not connect to Flyksoft and does not touch reminder/cron logic. */
const fastBookingDrafts = {};

function getFastBookingBranchButtons() {
  return [
    { id: "fast_book_dubai", title: "Dubai" },
    { id: "fast_book_abudhabi", title: "Abu Dhabi" },
    { id: "talk_to_team", title: "Team" }
  ];
}

function getFastBookingTimeButtons() {
  return [
    { id: "fast_time_today", title: "Today" },
    { id: "fast_time_tomorrow", title: "Tomorrow" },
    { id: "fast_time_week", title: "This Week" }
  ];
}

function isFastBookingStartText(text) {
  const value = compactText(text);

  return value === "1" ||
    value === "١" ||
    value === "book_appointment" ||
    value.includes("حجز موعد") ||
    value.includes("احجز") ||
    value.includes("موعد") ||
    value.includes("appointment") ||
    value.includes("book consultation") ||
    value.includes("book appointment") ||
    value === "book" ||
    value.includes(" book");
}

function isServiceMenuText(text) {
  const value = compactText(text);

  return value === "service | سيرفس" ||
    value === "service_menu" ||
    value === "service" ||
    value === "سيرفس" ||
    value.includes("service |") ||
    value.includes("سيرفس");
}

function isBookServiceFlowText(text) {
  const value = compactText(text);

  if (!value) return false;

  return value === "book_service_flow" ||
    value === "book service | سيرفس" ||
    value === "book service" ||
    value === "service booking" ||
    value === "service" ||
    value === "سيرفس" ||
    value === "خدمة" ||
    value === "خدمه" ||
    value.includes("book service") ||
    value.includes("service appointment") ||
    value.includes("حجز سيرفس") ||
    value.includes("موعد سيرفس") ||
    value.includes("موعد خدمة") ||
    value.includes("موعد خدمه") ||
```

Found at line 2642
```js
      phone: from,
      phoneNumberId: incomingPhoneNumberId,
      customerName: profileName,
      branch: selectedBranch,
      message: buildFastBookingRequestMessage(selectedBranch, preferredTime, originalText),
      requestType: "WhatsApp Fast Booking",
      bookingStatus: "Pending"
    });

    delete fastBookingDrafts[from];

    const confirmationBody = buildFastBookingConfirmationBody(selectedBranch, preferredTime);
    const confirmationButtons = getConsultActionButtons();

    await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);
    addInboxMessage(from, "bot", formatButtonLog(confirmationBody, confirmationButtons), "Booking Request", incomingPhoneNumberId, { customerName: profileName, messageType: "Fast Booking Confirmation" });

    return true;
  }

  return false;
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
```

Found at line 2669
```js
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
```

## sendWhatsAppFlow
Found at line 1405
```js
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

async function sendWhatsAppFlowMessage(to, phoneNumberId = DUBAI_PHONE_NUMBER_ID, options = {}) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const lineConfig = getLineConfig(finalPhoneNumberId);
  const requestedFlowType = (options.flowType || options.requestType || "").toString().toLowerCase();
  const isServiceBookingFlow = requestedFlowType.includes("service");
  const bookingFlowConfig = isServiceBookingFlow
    ? getServiceBookingFlowConfigForLine(finalPhoneNumberId)
    : getBookingFlowConfigForLine(finalPhoneNumberId);
  const selectedFlowCta = isServiceBookingFlow ? ICONIC_SERVICE_BOOKING_FLOW_CTA : ICONIC_CONSULTATION_FLOW_CTA;
  const selectedFlowHeader = isServiceBookingFlow ? "Service Booking" : "Consultation Booking";

  if (!ICONIC_BOOKING_FLOW_ENABLED) {
    return {
      ok: false,
      status: 400,
      result: { error: "ICONIC_BOOKING_FLOW_ENABLED is false" }
    };
  }

  if (!bookingFlowConfig.flowId) {
    return {
      ok: false,
      status: 400,
      result: { error: `${bookingFlowConfig.envName} is missing` }
    };
  }

  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;
  const flowToken = [
    bookingFlowConfig.tokenPrefix,
    normalizePhoneDigits(to),
    Date.now().toString()
  ].filter(Boolean).join("_");

  const flowBody = (isServiceBookingFlow
    ? [
        `${BUSINESS_NAME_SPACED} ✨`,
        "",
        "احجز موعد السيرفس خلال ثواني من داخل واتساب.",
        "",
        "اختر الفرع، اليوم، الوقت، واسم الموظف المفضل إن وجد. الفريق سيؤكد الموعد النهائي بعد مراجعة التوفر.",
        "",
        "------------------------------",
        "",
        `${BUSINESS_NAME_SPACED} ✨`,
        "",
        "Book your service appointment in seconds inside WhatsApp.",
        "",
        "Choose the branch, preferred day, preferred time, and preferred team member if any. Our team will confirm the final appointment after checking availability."
      ]
    : [
        `${BUSINESS_NAME_SPACED} ✨`,
        "",
        "احجز استشارتك خلال ثواني من داخل واتساب.",
        "",
        "اختر اليوم والوقت المناسب، وفريقنا سيؤكد الموعد النهائي بعد مراجعة التوفر.",
        "",
        "------------------------------",
        "",
        `${BUSINESS_NAME_SPACED} ✨`,
        "",
        "Book your consultation in seconds inside WhatsApp.",
        "",
        "Choose your preferred day and time. Our team will confirm the final appointment after checking availability."
      ]
  ).join(String.fromCharCode(10));

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "flow",
      header: {
        type: "text",
        text: selectedFlowHeader
      },
      body: {
        text: flowBody
      },
      footer: {
        text: "Iconic Hair Care"
      },
      action: {
```

Found at line 2542
```js
    if (ICONIC_BOOKING_FLOW_ENABLED && selectedBookingFlowConfig.flowId) {
      setConversationStatus(from, "WhatsApp Flow - Opened");
      await saveConversationStateToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        branch: lineConfig.branch,
        status: "WhatsApp Flow - Opened",
        assignee: getBranchTeamAssignee(lineConfig.branch),
        tags: ["Booking", "WhatsApp Flow"],
        updatedBy: "WhatsApp Flow"
      });

      const flowSendResult = await sendWhatsAppFlowMessage(from, incomingPhoneNumberId, {
        branch: lineConfig.branch,
        customerName: profileName
      });

      if (flowSendResult.ok) {
        addInboxMessage(
          from,
          "bot",
          `WhatsApp Flow sent from ${selectedBookingFlowConfig.branch}: ${selectedBookingFlowConfig.flowId}`,
          "WhatsApp Flow - Opened",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "WhatsApp Flow Sent"
          }
        );

        return true;
      }

      console.log("WhatsApp Flow send failed, falling back to Fast Booking Buttons.");
    }

    setConversationStatus(from, "Fast Booking - Choose Branch");
    await saveConversationStateToGoogleSheetFromServer({
      phone: from,
      phoneNumberId: incomingPhoneNumberId,
      branch: lineConfig.branch,
      status: "Fast Booking - Choose Branch",
      assignee: getBranchTeamAssignee(lineConfig.branch),
      tags: ["Booking", "Fast Booking"],
      updatedBy: "WhatsApp Fast Booking"
    });

    const branchBody = buildFastBookingBranchBody();
    const branchButtons = getFastBookingBranchButtons();

    await sendWhatsAppButtonMessage(from, branchBody, branchButtons, incomingPhoneNumberId, { headerImageUrl: MAIN_MENU_HEADER_IMAGE_URL });
    addInboxMessage(from, "bot", formatButtonLog(branchBody, branchButtons), "Fast Booking - Choose Branch", incomingPhoneNumberId, { customerName: profileName, messageType: "Fast Booking Bot Reply" });

    return true;
  }

  if (chosenBranch) {
    fastBookingDrafts[from] = {
      ...(fastBookingDrafts[from] || {}),
      branch: chosenBranch,
      startedAt: fastBookingDrafts[from]?.startedAt || getDubaiTimestamp(),
      phoneNumberId: incomingPhoneNumberId
    };

    setConversationStatus(from, "Fast Booking - Choose Time");
    await saveConversationStateToGoogleSheetFromServer({
      phone: from,
      phoneNumberId: incomingPhoneNumberId,
      branch: chosenBranch,
      status: "Fast Booking - Choose Time",
      assignee: getBranchTeamAssignee(chosenBranch),
      tags: ["Booking", "Fast Booking"],
      updatedBy: "WhatsApp Fast Booking"
    });

    const timeBody = buildFastBookingTimeBody(chosenBranch);
    const timeButtons = getFastBookingTimeButtons();

    await sendWhatsAppButtonMessage(from, timeBody, timeButtons, incomingPhoneNumberId);
    addInboxMessage(from, "bot", formatButtonLog(timeBody, timeButtons), "Fast Booking - Choose Time", incomingPhoneNumberId, { customerName: profileName, messageType: "Fast Booking Bot Reply" });

    return true;
  }

  if (preferredTime) {
    const draft = fastBookingDrafts[from] || {};
    const selectedBranch = draft.branch || lineConfig.branch || "Dubai";

    setConversationStatus(from, "Booking Request");
    await saveConversationStateToGoogleSheetFromServer({
      phone: from,
      phoneNumberId: incomingPhoneNumberId,
      branch: selectedBranch,
      status: "Booking Request",
      assignee: getBranchTeamAssignee(selectedBranch),
      tags: ["Booking", "Fast Booking", "Need Confirmation"],
      updatedBy: "WhatsApp Fast Booking"
```

Found at line 15996
```js

      setConversationStatus(from, "Service Flow - Opened");
      await saveConversationStateToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        branch: lineConfig.branch,
        status: "Service Flow - Opened",
        assignee: getBranchTeamAssignee(lineConfig.branch),
        tags: ["Booking", "Service Appointment", "WhatsApp Flow"],
        updatedBy: "Service Booking Flow"
      });

      const flowSendResult = await sendWhatsAppFlowMessage(from, incomingPhoneNumberId, {
        branch: lineConfig.branch,
        customerName: profileName,
        flowType: "service",
        requestType: "Service Appointment"
      });

      if (flowSendResult.ok) {
        addInboxMessage(
          from,
          "bot",
          `Service Booking Flow sent: ${ICONIC_SERVICE_BOOKING_FLOW_ID}`,
          "Service Flow - Opened",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "Service Booking Flow Sent"
          }
        );
      } else {
        const fallbackServiceText =
          `${BUSINESS_NAME_SPACED} ✨\n\n` +
          "تعذر فتح نموذج حجز السيرفس حالياً. فريقنا سيتابع معك داخل المحادثة.\n\n" +
          "------------------------------\n\n" +
          `${BUSINESS_NAME_SPACED} ✨\n\n` +
          "The service booking form could not be opened right now. Our team will assist you inside this chat.";

        await sendWhatsAppMessage(from, fallbackServiceText, incomingPhoneNumberId);
        addInboxMessage(from, "bot", fallbackServiceText, "Service Flow Fallback", incomingPhoneNumberId, { customerName: profileName, messageType: "Service Booking Flow Fallback" });
      }

      return res.sendStatus(200);
    }

    if (isConsultationFlowText(originalText || text)) {
      const consultationActionText = getSmartCustomerActionText(message, originalText || text) || "Consult | استشارة";
      const consultationCustomerBody = buildCustomerActionBody(profileName, consultationActionText);

      addInboxMessage(
        from,
        "customer",
        consultationCustomerBody,
        "Consultation Booking",
        incomingPhoneNumberId,
        {
          customerName: profileName,
          messageType: "Customer Consultation Flow Request"
        }
      );

      setConversationStatus(from, "Consultation Flow - Opened");
      await saveConversationStateToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        branch: lineConfig.branch,
        status: "Consultation Flow - Opened",
        assignee: getBranchTeamAssignee(lineConfig.branch),
        tags: ["Booking", "Consultation", "WhatsApp Flow"],
        updatedBy: "Consultation Booking Flow"
      });

      const flowSendResult = await sendWhatsAppFlowMessage(from, incomingPhoneNumberId, {
        branch: lineConfig.branch,
        customerName: profileName,
        flowType: "consultation",
        requestType: "Consultation Booking"
      });

      if (flowSendResult.ok) {
        const selectedConsultationConfig = getBookingFlowConfigForLine(incomingPhoneNumberId, value?.metadata?.display_phone_number || "");

        addInboxMessage(
          from,
          "bot",
          `Consultation Booking Flow sent: ${selectedConsultationConfig.flowId}`,
          "Consultation Flow - Opened",
          incomingPhoneNumberId,
          {
            customerName: profileName,
            messageType: "Consultation Booking Flow Sent"
          }
        );
      } else {
        const fallbackConsultationText =
          `${BUSINESS_NAME_SPACED} ✨\n\n` +
```
