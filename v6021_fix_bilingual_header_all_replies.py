from pathlib import Path
import json

server_path = Path('server.js')
s = server_path.read_text()


def replace_once(label, old, new):
    global s
    if new in s:
        print(f'[V60.2.1] {label}: already applied')
        return
    if old not in s:
        raise SystemExit(f'[V60.2.1] missing block: {label}')
    s = s.replace(old, new, 1)
    print(f'[V60.2.1] {label}: applied')

replace_once(
    'version',
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-2-english-flow-confirmation-reminder-optin";',
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-2-1-bilingual-flow-confirmation-header-all-button-replies";'
)

replace_once(
    'default header on all button replies',
    '  const headerImageUrl = (options.headerImageUrl || "").toString().trim();',
    '  const headerImageUrl = (options.headerImageUrl || BOT_HEADER_IMAGE_URL || "").toString().trim();'
)

old_flow_body = '''function buildWhatsAppFlowConfirmationBody(flowData = {}) {
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
'''

new_flow_body = '''function buildWhatsAppFlowConfirmationBody(flowData = {}) {
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
'''

replace_once('bilingual flow confirmation body', old_flow_body, new_flow_body)

replace_once(
    'reminder yes bilingual',
    '''      const reminderYesBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋\n\nDone. We will remind you 1 hour before your appointment.`;''',
    '''      const reminderYesBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋\n\nتم تسجيل طلب التذكير ✅\nسنرسل لك تذكير قبل موعدك بساعة.\n\nDone ✅\nWe will remind you 1 hour before your appointment.`;'''
)

replace_once(
    'reminder no bilingual',
    '''      const reminderNoBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋\n\nNo problem. We will not send a reminder for this appointment.`;''',
    '''      const reminderNoBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋\n\nتمام، لن نرسل تذكير لهذا الموعد.\n\nNo problem. We will not send a reminder for this appointment.`;'''
)

server_path.write_text(s)

pkg_path = Path('package.json')
pkg = json.loads(pkg_path.read_text())
pkg['scripts']['start'] = 'node --check server.js && node server.js'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')

print('[V60.2.1] fixed bilingual confirmation and default button headers')
