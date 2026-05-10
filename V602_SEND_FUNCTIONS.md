# V60.2 Send Function Inspection

## function sendWhatsAppMessage
Found at line 1068
```js

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

```

## async function sendWhatsAppMessage
Found at line 1068
```js

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

```

## function sendWhatsAppButtonMessage
Found at line 1296
```js
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

```

## async function sendWhatsAppButtonMessage
Found at line 1296
```js
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

```

## function sendWhatsAppImageMessage
Found at line 1168
```js
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

```

## async function sendWhatsAppImageMessage
Found at line 1168
```js
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

```

## sendWhatsAppMessage(
Found at line 1068
```js

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

```

## sendWhatsAppButtonMessage(
Found at line 1296
```js
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

```

## sendWhatsAppFlow
Found at line 1405
```js
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
```
