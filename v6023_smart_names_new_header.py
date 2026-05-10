from pathlib import Path
import json

server_path = Path('server.js')
s = server_path.read_text()

NEW_HEADER_URL = 'https://iconichaircare.com/wp-content/uploads/2026/05/BE6F2E6E-357D-486A-ADC3-0A8F70D22A26.jpg'
OLD_HEADER_URL = 'https://iconichaircare.com/wp-content/uploads/2026/05/ChatGPT-Image-May-8-2026-12_12_30-AM.jpg'


def replace_once(label, old, new):
    global s
    if new in s:
        print(f'[V60.2.3] {label}: already applied')
        return True
    if old not in s:
        print(f'[V60.2.3] missing block: {label}')
        return False
    s = s.replace(old, new, 1)
    print(f'[V60.2.3] {label}: applied')
    return True

# Version + header URL
version_applied = False
for old_version in [
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-2-2-clean-customer-name-and-new-header-all-replies";',
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-2-1-bilingual-flow-confirmation-header-all-button-replies";',
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-2-english-flow-confirmation-reminder-optin";'
]:
    if old_version in s:
        s = s.replace(old_version, 'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-2-3-smart-customer-name-and-new-header-all-replies";', 1)
        print('[V60.2.3] version applied')
        version_applied = True
        break
if not version_applied and 'iconic-team-inbox-v31-5-8-60-2-3-smart-customer-name-and-new-header-all-replies' not in s:
    raise SystemExit('[V60.2.3] version block not found')

if OLD_HEADER_URL in s:
    s = s.replace(OLD_HEADER_URL, NEW_HEADER_URL)
    print('[V60.2.3] header URL replaced')
elif NEW_HEADER_URL in s:
    print('[V60.2.3] header URL already new')
else:
    raise SystemExit('[V60.2.3] no header URL found')

# Helper
helper_anchor = '''function buildPersonalGreeting(customerName = "") {
  const cleanName = cleanCustomerName(customerName);

  if (!cleanName) {
    return "Hello 👋";
  }

  return `Hello ${cleanName} 👋`;
}
'''
if 'function namePhrase(customerName = "", fallback = "")' not in s:
    replace_once('namePhrase helper', helper_anchor, helper_anchor + '''
function namePhrase(customerName = "", fallback = "") {
  const cleanName = cleanCustomerName(customerName);
  return cleanName || fallback || "";
}
''')

# Direct booking current V60.2.2 block
old_direct_current = '''function buildDirectBookingChoiceBody(customerName = "") {
  const cleanName = cleanCustomerName(customerName);
  const greeting = cleanName ? `Hello ${cleanName} 👋` : "Hello 👋";

  return `${greeting}\\n\\n` +
    "أكيد، اختر نوع الحجز المناسب لك:\\n\\n" +
    "إذا كنت عميل حالي وتريد خدمة / متابعة / تركيب / تعديل، اختر سيرفس.\\n\\n" +
    "إذا كنت عميل جديد وتريد معرفة الحل الأنسب، اختر استشارة.\\n\\n" +
    "------------------------------\\n\\n" +
    "Sure, please choose the right booking type:\\n\\n" +
    "If you are an existing client and need service / follow-up / fitting / adjustment, choose Service.\\n\\n" +
    "If you are a new client and want to know the best solution, choose Consultation.";
}
'''
new_direct = '''function buildDirectBookingChoiceBody(customerName = "") {
  const cleanName = namePhrase(customerName);
  const intro = cleanName ? `أكيد ${cleanName}، اختر نوع الحجز المناسب لك:` : "أكيد، اختر نوع الحجز المناسب لك:";

  return `${intro}\\n\\n` +
    "إذا كنت عميل حالي وتريد خدمة / متابعة / تركيب / تعديل، اختر سيرفس.\\n\\n" +
    "إذا كنت عميل جديد وتريد معرفة الحل الأنسب، اختر استشارة.\\n\\n" +
    "------------------------------\\n\\n" +
    "Sure, please choose the right booking type:\\n\\n" +
    "If you are an existing client and need service / follow-up / fitting / adjustment, choose Service.\\n\\n" +
    "If you are a new client and want to know the best solution, choose Consultation.";
}
'''
replace_once('direct booking smart name current', old_direct_current, new_direct)

# Team handoff original block may still exist
old_team = '''function buildTeamHandoffBody(customerName = "") {
  const cleanName = cleanCustomerName(customerName);
  const arabicName = cleanName ? ` ${cleanName}` : "";
  const englishName = cleanName ? ` ${cleanName}` : "";

  return `تمام${arabicName} 👌\\n\\n` +
    "تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.\\n\\n" +
    "------------------------------\\n\\n" +
    `Sure${englishName} 👌\\n\\n` +
    "Your conversation has been forwarded to our team, and one of our specialists will assist you shortly.";
}
'''
new_team = '''function buildTeamHandoffBody(customerName = "") {
  const cleanName = namePhrase(customerName);
  const intro = cleanName ? `تمام ${cleanName} 👌` : "تمام 👌";

  return `${intro}\\n\\n` +
    "تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.\\n\\n" +
    "------------------------------\\n\\n" +
    "Your conversation has been forwarded to our team, and one of our specialists will assist you shortly.";
}
'''
replace_once('team handoff smart name', old_team, new_team)

# Flow confirmation should use Thank you only, no Hello.
replace_once(
    'flow confirmation Thank you',
    '    `Hello ${customerName} 👋`,\n    "",\n    "تم استلام طلب الحجز ✅",',
    '    `Thank you ${customerName}`,\n    "",\n    "تم استلام طلب الحجز ✅",'
)

# Reminder opt-in replies current blocks
old_yes = '''      const reminderYesBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋\n\nتم تسجيل طلب التذكير ✅\nسنرسل لك تذكير قبل موعدك بساعة.\n\nDone ✅\nWe will remind you 1 hour before your appointment.`;'''
new_yes = '''      const reminderName = cleanCustomerName(profileName);
      const reminderYesBody = `${reminderName ? `تمام ${reminderName}، تم تسجيل طلب التذكير ✅` : "تم تسجيل طلب التذكير ✅"}\n\nسنرسل لك تذكير قبل موعدك بساعة.\n\nDone ✅\nWe will remind you 1 hour before your appointment.`;'''
replace_once('reminder yes smart name', old_yes, new_yes)

old_no = '''      const reminderNoBody = `Hello ${cleanCustomerName(profileName) || "there"} 👋\n\nتمام، لن نرسل تذكير لهذا الموعد.\n\nNo problem. We will not send a reminder for this appointment.`;'''
new_no = '''      const reminderName = cleanCustomerName(profileName);
      const reminderNoBody = `${reminderName ? `تمام ${reminderName}، لن نرسل تذكير لهذا الموعد.` : "تمام، لن نرسل تذكير لهذا الموعد."}\n\nNo problem. We will not send a reminder for this appointment.`;'''
replace_once('reminder no smart name', old_no, new_no)

server_path.write_text(s)

pkg_path = Path('package.json')
pkg = json.loads(pkg_path.read_text())
pkg['scripts']['start'] = 'node --check server.js && node server.js'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')

print('[V60.2.3] smart names and new header applied')
