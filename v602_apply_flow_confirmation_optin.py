from pathlib import Path
import json

server_path = Path('server.js')
s = server_path.read_text()

HEADER_URL = 'https://iconichaircare.com/wp-content/uploads/2026/05/ChatGPT-Image-May-8-2026-12_12_30-AM.jpg'


def replace_once(label, old, new):
    global s
    if new in s:
        print(f'[V60.2] {label}: already applied')
        return
    if old not in s:
        raise SystemExit(f'[V60.2] missing block: {label}')
    s = s.replace(old, new, 1)
    print(f'[V60.2] {label}: applied')

replace_once(
    'version and header image constant',
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-1-fix-flow-staff-notification-routing";\n\nconst VERIFY_TOKEN = process.env.VERIFY_TOKEN;',
    f'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-2-english-flow-confirmation-reminder-optin";\nconst BOT_HEADER_IMAGE_URL = (process.env.BOT_HEADER_IMAGE_URL || "{HEADER_URL}").toString().trim();\n\nconst VERIFY_TOKEN = process.env.VERIFY_TOKEN;'
)

old_confirmation = '''function buildWhatsAppFlowConfirmationBody(flowData = {}) {
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
'''

new_confirmation = '''function buildWhatsAppFlowConfirmationBody(flowData = {}) {
  const customerName = cleanCustomerName(flowData.customerName || "") || "there";
  const branch = flowData.branch || "Dubai";
  const preferredTime = flowData.preferredTime || "Flexible / Any available time";
  const requestType = flowData.serviceInterest || flowData.requestType || "Booking Request";

  return [
    `${BUSINESS_NAME_SPACED} ✨`,
    "",
    `Hello ${customerName} 👋`,
    "",
    "Your booking request has been received.",
    "Our team will check availability and confirm the exact appointment shortly.",
    "",
    `Request type: ${requestType}`,
    `Branch: ${branch}`,
    `Preferred time: ${preferredTime}`,
    flowData.consultationType ? `Consultation type: ${flowData.consultationType}` : "",
    flowData.serviceType ? `Service type: ${flowData.serviceType}` : "",
    flowData.teamMember ? `Team member: ${flowData.teamMember}` : "",
    "",
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
'''

replace_once('flow confirmation body and reminder buttons', old_confirmation, new_confirmation)

replace_once(
    'flow confirmation buttons and header image',
    '''  const confirmationBody = buildWhatsAppFlowConfirmationBody(flowData);
  const confirmationButtons = getConsultActionButtons();

  await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);''',
    '''  const confirmationBody = buildWhatsAppFlowConfirmationBody(flowData);
  const confirmationButtons = getAppointmentReminderOptInButtons();

  await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });'''
)

replace_once(
    'reminder opt-in handler before pause gate',
    '''    if (!isOptInMessage && !isOptOutMessage && !isReminderDeclineMessage) {
      const pausedStatus = await getBotPausedStatusForConversation(from, incomingPhoneNumberId);''',
    '''    if (isAppointmentReminderYesText(originalText || text)) {
      await saveConversationStateToGoogleSheetFromServer({
        phone: from,
        phoneNumberId: incomingPhoneNumberId,
        branch: lineConfig.branch,
        status: "Appointment Reminder Opt-in",
        assignee: getBranchTeamAssignee(lineConfig.branch),
        tags: ["Appointment Reminder", "Opt-in", "1 Hour Before"],
        updatedBy: "Appointment Reminder Button"
      });

      const reminderYesBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋\n\nDone. We will remind you 1 hour before your appointment.`;
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

      const reminderNoBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋\n\nNo problem. We will not send a reminder for this appointment.`;
      await sendWhatsAppMessage(from, reminderNoBody, incomingPhoneNumberId);
      addInboxMessage(from, "bot", reminderNoBody, "Appointment Reminder Declined", incomingPhoneNumberId, { customerName: profileName, messageType: "Appointment Reminder Declined" });
      return res.sendStatus(200);
    }

    if (!isOptInMessage && !isOptOutMessage && !isReminderDeclineMessage) {
      const pausedStatus = await getBotPausedStatusForConversation(from, incomingPhoneNumberId);'''
)

server_path.write_text(s)

pkg_path = Path('package.json')
pkg = json.loads(pkg_path.read_text())
pkg['scripts']['start'] = 'node --check server.js && node server.js'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')

print('[V60.2] applied flow confirmation reminder opt-in')
