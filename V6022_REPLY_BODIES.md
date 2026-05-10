# V60.2.2 Reply Body Inspection

## Hello ${customerName}
Found at line 2112
```js
    flowData.consultationType ? `Consultation type: ${flowData.consultationType}` : "Consultation type: ",
    flowData.teamMember ? `Team member: ${flowData.teamMember}` : "Team member: ",
    flowData.notes ? `Notes: ${flowData.notes}` : "Notes: ",
    "Flyksoft Status: Not added",
    "Customer selection: WhatsApp Flow submit"
  ].join("\n");
}

function buildWhatsAppFlowConfirmationBody(flowData = {}) {
  const customerName = cleanCustomerName(flowData.customerName || "") || "there";
  const branch = flowData.branch || "Dubai";
  const branchAr = getFastBookingBranchArabic(branch);
  const preferredTime = flowData.preferredTime || "Flexible / Any available time";
  const requestType = flowData.serviceInterest || flowData.requestType || "Booking Request";

  return [
    `${BUSINESS_NAME_SPACED} ✨`,
    "",
    `Hello ${customerName} 👋`,
    "",
    "تم استلام طلب الحجز ✅",
    "سيقوم فريقنا بمراجعة التوفر وتأكيد الموعد النهائي قريباً.",
    "",
    "Your booking request has been received ✅",
    "Our team will check availability and confirm the exact appointment shortly.",
    "",
    `نوع الطلب / Request type: ${requestType}`,
    `الفرع / Branch: ${branchAr} - ${branch}`,
    `الوقت المفضل / Preferred time: ${preferredTime}`,
    flowData.consultationType ? `نوع الاستشارة / Consultation type: ${flowData.consultationType}` : "",
    flowData.serviceType ? `نوع الخدمة / Service type: ${flowData.serviceType}` : "",
    flowData.teamMember ? `الموظف / Team member: ${flowData.teamMember}` : "",
    "",
    "هل تحب نذكّرك قبل موعدك بساعة؟",
    "Would you like us to remind you 1 hour before your appointment?"
  ].filter((line) => line !== "").join(String.fromCharCode(10));
}

function getAppointmentReminderOptInButtons() {
  return [
    { id: "appointment_reminder_yes", title: "Yes | نعم" },
    { id: "appointment_reminder_no", title: "No | لا" }
  ];
}

function isAppointmentReminderYesText(text) {
  const value = compactText(text);
  if (!value) return false;
  return value === "appointment_reminder_yes" ||
    value === "yes | نعم" ||
    value === "yes" ||
    value === "نعم";
}

function isAppointmentReminderNoText(text) {
  const value = compactText(text);
  if (!value) return false;
  return value === "appointment_reminder_no" ||
    value === "no | لا" ||
    value === "no" ||
    value === "لا";
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
```

## Hello ${cleanCustomerName
Found at line 15798
```js
      });
      const resumeBody = "تم تشغيل البوت مرة أخرى ✅\n\n------------------------------\n\nBot has been resumed ✅";
      await sendWhatsAppMessage(from, resumeBody, incomingPhoneNumberId);
      addInboxMessage(from, "bot", resumeBody, "Bot Active", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Resumed" });
      return res.sendStatus(200);
    }

    if (isAppointmentReminderYesText(originalText || text)) {
      await saveConversationStateToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        branch: lineConfig.branch,
        status: "Appointment Reminder Opt-in",
        assignee: getBranchTeamAssignee(lineConfig.branch),
        tags: ["Appointment Reminder", "Opt-in", "1 Hour Before"],
        updatedBy: "Appointment Reminder Button"
      });

      const reminderYesBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋

تم تسجيل طلب التذكير ✅
سنرسل لك تذكير قبل موعدك بساعة.

Done ✅
We will remind you 1 hour before your appointment.`;
      await sendWhatsAppMessage(from, reminderYesBody, incomingPhoneNumberId);
      addInboxMessage(from, "bot", reminderYesBody, "Appointment Reminder Opt-in", incomingPhoneNumberId, { customerName: profileName, messageType: "Appointment Reminder Opt-in" });
      return res.sendStatus(200);
    }

    if (isAppointmentReminderNoText(originalText || text)) {
      await saveConversationStateToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        branch: lineConfig.branch,
        status: "Appointment Reminder Declined",
        assignee: getBranchTeamAssignee(lineConfig.branch),
        tags: ["Appointment Reminder", "Declined"],
        updatedBy: "Appointment Reminder Button"
      });

      const reminderNoBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋

تمام، لن نرسل تذكير لهذا الموعد.

No problem. We will not send a reminder for this appointment.`;
      await sendWhatsAppMessage(from, reminderNoBody, incomingPhoneNumberId);
      addInboxMessage(from, "bot", reminderNoBody, "Appointment Reminder Declined", incomingPhoneNumberId, { customerName: profileName, messageType: "Appointment Reminder Declined" });
      return res.sendStatus(200);
    }

    if (!isOptInMessage && !isOptOutMessage && !isReminderDeclineMessage) {
      const pausedStatus = await getBotPausedStatusForConversation(from, incomingPhoneNumberId);

      if (pausedStatus) {
        const pausedCustomerBody = buildPausedCustomerMessageBody(message, profileName, originalText || text);

        if (pausedCustomerBody && pausedCustomerBody.toString().trim()) {
          addInboxMessage(
            from,
            "customer",
            pausedCustomerBody,
            pausedStatus,
            incomingPhoneNumberId,
            {
              customerName: profileName,
              messageType: "Customer Message - Bot Paused"
            }
          );
        }

        console.log("Bot paused for customer:", from, pausedStatus);
        return res.sendStatus(200);
      }
    }

    const autoIntentWorkflow = (
      isOptInMessage ||
      isOptOutMessage ||
      isReminderDeclineMessage
    ) ? null : getAutoIntentWorkflow(originalText || text);

    if (autoIntentWorkflow && autoIntentWorkflow.status) {
```

Found at line 15821
```js
Done ✅
We will remind you 1 hour before your appointment.`;
      await sendWhatsAppMessage(from, reminderYesBody, incomingPhoneNumberId);
      addInboxMessage(from, "bot", reminderYesBody, "Appointment Reminder Opt-in", incomingPhoneNumberId, { customerName: profileName, messageType: "Appointment Reminder Opt-in" });
      return res.sendStatus(200);
    }

    if (isAppointmentReminderNoText(originalText || text)) {
      await saveConversationStateToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        branch: lineConfig.branch,
        status: "Appointment Reminder Declined",
        assignee: getBranchTeamAssignee(lineConfig.branch),
        tags: ["Appointment Reminder", "Declined"],
        updatedBy: "Appointment Reminder Button"
      });

      const reminderNoBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋

تمام، لن نرسل تذكير لهذا الموعد.

No problem. We will not send a reminder for this appointment.`;
      await sendWhatsAppMessage(from, reminderNoBody, incomingPhoneNumberId);
      addInboxMessage(from, "bot", reminderNoBody, "Appointment Reminder Declined", incomingPhoneNumberId, { customerName: profileName, messageType: "Appointment Reminder Declined" });
      return res.sendStatus(200);
    }

    if (!isOptInMessage && !isOptOutMessage && !isReminderDeclineMessage) {
      const pausedStatus = await getBotPausedStatusForConversation(from, incomingPhoneNumberId);

      if (pausedStatus) {
        const pausedCustomerBody = buildPausedCustomerMessageBody(message, profileName, originalText || text);

        if (pausedCustomerBody && pausedCustomerBody.toString().trim()) {
          addInboxMessage(
            from,
            "customer",
            pausedCustomerBody,
            pausedStatus,
            incomingPhoneNumberId,
            {
              customerName: profileName,
              messageType: "Customer Message - Bot Paused"
            }
          );
        }

        console.log("Bot paused for customer:", from, pausedStatus);
        return res.sendStatus(200);
      }
    }

    const autoIntentWorkflow = (
      isOptInMessage ||
      isOptOutMessage ||
      isReminderDeclineMessage
    ) ? null : getAutoIntentWorkflow(originalText || text);

    if (autoIntentWorkflow && autoIntentWorkflow.status) {
      setConversationStatus(from, autoIntentWorkflow.status);
      await saveConversationStateToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        branch: lineConfig.branch,
        status: autoIntentWorkflow.status,
        assignee: getBranchTeamAssignee(lineConfig.branch),
        tags: autoIntentWorkflow.tags || [],
        updatedBy: "Auto Intent Tags"
      });
    }

    if (isOptInMessage) {
      setConversationStatus(from, "Opted In");

      addInboxMessage(
        from,
        "customer",
        originalText,
        "Opted In",
        incomingPhoneNumberId,
        {
          customerName: profileName,
```

## مرحبا ${customerName}
Not found

## ok ${customerName}
Not found

## أكيد، اختر نوع الحجز المناسب لك
Found at line 722
```js
function buildTeamHandoffBody(customerName = "") {
  const cleanName = cleanCustomerName(customerName);
  const arabicName = cleanName ? ` ${cleanName}` : "";
  const englishName = cleanName ? ` ${cleanName}` : "";

  return `تمام${arabicName} 👌\n\n` +
    "تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.\n\n" +
    "------------------------------\n\n" +
    `Sure${englishName} 👌\n\n` +
    "Your conversation has been forwarded to our team, and one of our specialists will assist you shortly.";
}

function buildDirectBookingChoiceBody(customerName = "") {
  const cleanName = cleanCustomerName(customerName);
  const arabicName = cleanName ? ` ${cleanName}` : "";
  const englishName = cleanName ? ` ${cleanName}` : "";

  return `مرحبا${arabicName} 👋\n\n` +
    "أكيد، اختر نوع الحجز المناسب لك:\n\n" +
    "إذا كنت عميل حالي وتريد خدمة / متابعة / تركيب / تعديل، اختر سيرفس.\n\n" +
    "إذا كنت عميل جديد وتريد معرفة الحل الأنسب، اختر استشارة.\n\n" +
    "------------------------------\n\n" +
    `Hello${englishName} 👋\n\n` +
    "Sure, please choose the right booking type:\n\n" +
    "If you are an existing client and need service / follow-up / fitting / adjustment, choose Service.\n\n" +
    "If you are a new client and want to know the best solution, choose Consultation.";
}

function getDirectBookingChoiceButtons() {
  return [
    { id: "book_service_flow", title: "Book Service | سيرفس" },
    { id: "consult_menu", title: "Consult | استشارة" }
  ];
}

function buildPausedCustomerMessageBody(message, profileName = "", originalText = "") {
  if (message?.type === "image") {
    return buildIncomingCustomerImageBody(message);
  }

  const actionText = getSmartCustomerActionText(message, originalText || "");

  return buildCustomerActionBody(
    profileName,
    actionText || originalText || "Customer message received while bot is paused"
  );
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

function cleanCustomerName(value) {
  const name = (value || "")
    .toString()
    .trim()
    .replace(/\s+/g, " ");

  if (!name) return "";

  return name.slice(0, 40);
}

function getWhatsAppCustomerName(contact = {}) {
  return cleanCustomerName(contact?.profile?.name || "");
}

function buildPersonalGreeting(customerName = "") {
  const cleanName = cleanCustomerName(customerName);

  if (!cleanName) {
    return "مرحبا 👋\nHello 👋";
```

## Welcome to Iconic Hair Care
Found at line 16688
```js

      replyText = buildTeamHandoffBody(profileName);
      replyButtons = null;
    }

    /* القائمة الرئيسية */
    else {
      const personalGreeting = buildPersonalGreeting(profileName);

      replyText =
        `${personalGreeting}\n\n` +
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
```

## أهلًا بك في Iconic Hair Care
Found at line 16682
```js
        branch: lineConfig.branch,
        status: "Talk to Team",
        assignee: getBranchTeamAssignee(lineConfig.branch),
        tags: ["Human Support", "Bot Paused"],
        updatedBy: "Customer Requested Team"
      });

      replyText = buildTeamHandoffBody(profileName);
      replyButtons = null;
    }

    /* القائمة الرئيسية */
    else {
      const personalGreeting = buildPersonalGreeting(profileName);

      replyText =
        `${personalGreeting}\n\n` +
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
```

## احجز موعد السيرفس خلال ثواني
Found at line 1444
```js
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
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_id: bookingFlowConfig.flowId,
          flow_token: flowToken,
          flow_cta: selectedFlowCta,
          flow_action: "navigate",
          flow_action_payload: isServiceBookingFlow
            ? {
                screen: "SERVICE_BOOKING",
                data: {
                  ...getServiceBookingFlowData(options.branch || lineConfig.branch, "Today"),
                  default_branch: options.branch || lineConfig.branch,
                  customer_name: options.customerName || "",
                  request_type: "Service Appointment",
                  flow_type: "service_booking"
                }
              }
```

## Book your service appointment
Found at line 1452
```js
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
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_id: bookingFlowConfig.flowId,
          flow_token: flowToken,
          flow_cta: selectedFlowCta,
          flow_action: "navigate",
          flow_action_payload: isServiceBookingFlow
            ? {
                screen: "SERVICE_BOOKING",
                data: {
                  ...getServiceBookingFlowData(options.branch || lineConfig.branch, "Today"),
                  default_branch: options.branch || lineConfig.branch,
                  customer_name: options.customerName || "",
                  request_type: "Service Appointment",
                  flow_type: "service_booking"
                }
              }
            : (isAbuDhabiLine(finalPhoneNumberId)
                ? {
                    screen: "CONSULTATION_BOOKING",
                    data: {
                      default_branch: "Abu Dhabi",
                      selected_branch: "Abu Dhabi",
                      customer_name: options.customerName || "",
                      request_type: bookingFlowConfig.requestType,
```

## flowBody =
Found at line 1440
```js
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
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_id: bookingFlowConfig.flowId,
          flow_token: flowToken,
          flow_cta: selectedFlowCta,
          flow_action: "navigate",
          flow_action_payload: isServiceBookingFlow
            ? {
                screen: "SERVICE_BOOKING",
                data: {
                  ...getServiceBookingFlowData(options.branch || lineConfig.branch, "Today"),
                  default_branch: options.branch || lineConfig.branch,
                  customer_name: options.customerName || "",
```

## buildWhatsAppFlowConfirmationBody
Found at line 2102
```js
function buildWhatsAppFlowBookingRequestMessage(flowData = {}) {
  return [
    "Source: WhatsApp Flow",
    `Branch: ${flowData.branch || ""}`,
    `Customer name: ${flowData.customerName || ""}`,
    `Phone: ${flowData.phone || ""}`,
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
  const customerName = cleanCustomerName(flowData.customerName || "") || "there";
  const branch = flowData.branch || "Dubai";
  const branchAr = getFastBookingBranchArabic(branch);
  const preferredTime = flowData.preferredTime || "Flexible / Any available time";
  const requestType = flowData.serviceInterest || flowData.requestType || "Booking Request";

  return [
    `${BUSINESS_NAME_SPACED} ✨`,
    "",
    `Hello ${customerName} 👋`,
    "",
    "تم استلام طلب الحجز ✅",
    "سيقوم فريقنا بمراجعة التوفر وتأكيد الموعد النهائي قريباً.",
    "",
    "Your booking request has been received ✅",
    "Our team will check availability and confirm the exact appointment shortly.",
    "",
    `نوع الطلب / Request type: ${requestType}`,
    `الفرع / Branch: ${branchAr} - ${branch}`,
    `الوقت المفضل / Preferred time: ${preferredTime}`,
    flowData.consultationType ? `نوع الاستشارة / Consultation type: ${flowData.consultationType}` : "",
    flowData.serviceType ? `نوع الخدمة / Service type: ${flowData.serviceType}` : "",
    flowData.teamMember ? `الموظف / Team member: ${flowData.teamMember}` : "",
    "",
    "هل تحب نذكّرك قبل موعدك بساعة؟",
    "Would you like us to remind you 1 hour before your appointment?"
  ].filter((line) => line !== "").join(String.fromCharCode(10));
}

function getAppointmentReminderOptInButtons() {
  return [
    { id: "appointment_reminder_yes", title: "Yes | نعم" },
    { id: "appointment_reminder_no", title: "No | لا" }
  ];
}

function isAppointmentReminderYesText(text) {
  const value = compactText(text);
  if (!value) return false;
  return value === "appointment_reminder_yes" ||
    value === "yes | نعم" ||
    value === "yes" ||
    value === "نعم";
}

function isAppointmentReminderNoText(text) {
  const value = compactText(text);
  if (!value) return false;
  return value === "appointment_reminder_no" ||
    value === "no | لا" ||
    value === "no" ||
    value === "لا";
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
```

Found at line 2225
```js
    message: requestMessage,
    requestType: flowData.serviceInterest || "WhatsApp Flow",
    bookingStatus: "Pending"
  });

  console.log("[Staff Booking Notify] preparing", {
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
  const confirmationButtons = getAppointmentReminderOptInButtons();

  await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
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
```

## BUSINESS_NAME_SPACED
Found at line 227
```js

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


function getBookingFlowConfigForLine(phoneNumberId, displayPhoneNumber = "") {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const isAbuDhabi = isAbuDhabiLine(finalPhoneNumberId, displayPhoneNumber);
  const lineConfig = getLineConfig(finalPhoneNumberId, displayPhoneNumber);

  if (isAbuDhabi) {
```

Found at line 880
```js
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
```

Found at line 884
```js
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
```

Found at line 890
```js
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

function humanizeActionId(value) {
```

Found at line 893
```js
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

function humanizeActionId(value) {
  const text = (value || "").toString().trim();

  if (!text) return "";
```

Found at line 1442
```js

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
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_id: bookingFlowConfig.flowId,
          flow_token: flowToken,
          flow_cta: selectedFlowCta,
          flow_action: "navigate",
          flow_action_payload: isServiceBookingFlow
            ? {
                screen: "SERVICE_BOOKING",
                data: {
                  ...getServiceBookingFlowData(options.branch || lineConfig.branch, "Today"),
                  default_branch: options.branch || lineConfig.branch,
                  customer_name: options.customerName || "",
                  request_type: "Service Appointment",
                  flow_type: "service_booking"
```

Found at line 1450
```js

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
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_id: bookingFlowConfig.flowId,
          flow_token: flowToken,
          flow_cta: selectedFlowCta,
          flow_action: "navigate",
          flow_action_payload: isServiceBookingFlow
            ? {
                screen: "SERVICE_BOOKING",
                data: {
                  ...getServiceBookingFlowData(options.branch || lineConfig.branch, "Today"),
                  default_branch: options.branch || lineConfig.branch,
                  customer_name: options.customerName || "",
                  request_type: "Service Appointment",
                  flow_type: "service_booking"
                }
              }
            : (isAbuDhabiLine(finalPhoneNumberId)
                ? {
                    screen: "CONSULTATION_BOOKING",
                    data: {
                      default_branch: "Abu Dhabi",
                      selected_branch: "Abu Dhabi",
```

Found at line 1457
```js

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
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_id: bookingFlowConfig.flowId,
          flow_token: flowToken,
          flow_cta: selectedFlowCta,
          flow_action: "navigate",
          flow_action_payload: isServiceBookingFlow
            ? {
                screen: "SERVICE_BOOKING",
                data: {
                  ...getServiceBookingFlowData(options.branch || lineConfig.branch, "Today"),
                  default_branch: options.branch || lineConfig.branch,
                  customer_name: options.customerName || "",
                  request_type: "Service Appointment",
                  flow_type: "service_booking"
                }
              }
            : (isAbuDhabiLine(finalPhoneNumberId)
                ? {
                    screen: "CONSULTATION_BOOKING",
                    data: {
                      default_branch: "Abu Dhabi",
                      selected_branch: "Abu Dhabi",
                      customer_name: options.customerName || "",
                      request_type: bookingFlowConfig.requestType,
                      flow_type: "consultation_booking",
                      today_available: false,
                      today_unavailable_message: "Today is not available for Abu Dhabi consultation booking. Please choose Tomorrow or Day After Tomorrow."
                    }
                  }
```
