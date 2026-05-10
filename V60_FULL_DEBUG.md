# V60 Full Debug
Started: Sun May 10 17:08:49 UTC 2026

## BOT_VERSION
69:const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-flow-customer-name-staff-notifications-and-resume-bot";
3307:    version: BOT_VERSION,
3711:      botVersion: BOT_VERSION,
16622:    version: BOT_VERSION,

## Marker checks
staff helper old/new base present: 0
staff multi helper present: 1
flow customerName extraction present: 1

## Around flow booking data
function getWhatsAppFlowBookingData(message, lineConfig = {}) {
  const payload = parseWhatsAppFlowResponse(message);

  if (!payload) {
    return null;
  }

  const branchValue = findFlowResponseValue(payload, ["branch", "فرع"]);
  const dayValue = findFlowResponseValue(payload, ["preferred_day", "day", "اليوم"]);
  const timeValue = findFlowResponseValue(payload, ["preferred_time", "time", "وقت"]);
  const serviceValue = findFlowResponseValue(payload, ["service_interest", "request_type", "نوع"]);
  const serviceTypeValue = findFlowResponseValue(payload, ["service_type", "service", "service appointment", "سيرفس"]);
  const consultationTypeValue = findFlowResponseValue(payload, ["consultation_type", "consultation", "consult type", "استشارة"]);
  const teamMemberValue = findFlowResponseValue(payload, ["team_member", "team member", "staff", "employee", "موظف", "فريق"]);
  const notesValue = findFlowResponseValue(payload, ["notes", "note", "preferred_exact_time", "ملاحظ"]);

  const branch = normalizeFlowBranch(branchValue, lineConfig.branch || "Dubai");
  const normalizedServiceType = normalizeFlowChoiceText(serviceTypeValue);
  const normalizedTeamMember = normalizeFlowChoiceText(teamMemberValue);
  const isServiceAppointment = Boolean(normalizedServiceType || normalizedTeamMember);

  const normalizedConsultationType = normalizeFlowChoiceText(consultationTypeValue);

  return {
    rawPayload: payload,
    branch,
    preferredDay: normalizeFlowDay(dayValue),
    preferredTime: normalizeFlowTime(timeValue),
    serviceInterest: isServiceAppointment ? "Service Appointment" : (normalizedConsultationType || normalizeFlowServiceInterest(serviceValue)),
    serviceType: normalizedServiceType,
    consultationType: normalizedConsultationType,
    teamMember: normalizedTeamMember,
    notes: notesValue || ""
  };
}

function buildWhatsAppFlowBookingRequestMessage(flowData = {}) {
  return [
    "Source: WhatsApp Flow",
    `Branch: ${flowData.branch || ""}`,
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

## Around handle flow submit
async function handleWhatsAppFlowBookingSubmit({
  from,
  message,
  incomingPhoneNumberId,
  lineConfig,
  profileName
}) {
  if (!isWhatsAppFlowReply(message)) {
    return false;
  }

  const flowData = getWhatsAppFlowBookingData(message, lineConfig);

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
    customerName: profileName,
    branch: selectedBranch,
    message: requestMessage,
    requestType: "WhatsApp Flow",
    bookingStatus: "Pending"
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
