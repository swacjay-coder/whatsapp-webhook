from pathlib import Path
import json

server_path = Path('server.js')
s = server_path.read_text()


def replace_once(label, old, new):
    global s
    if new in s:
        print(f'[V60.2.2] {label}: already applied')
        return
    if old not in s:
        raise SystemExit(f'[V60.2.2] missing block: {label}')
    s = s.replace(old, new, 1)
    print(f'[V60.2.2] {label}: applied')

replace_once(
    'version',
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-2-1-bilingual-flow-confirmation-header-all-button-replies";',
    'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-2-2-clean-customer-name-and-new-header-all-replies";'
)

old_direct = '''function buildDirectBookingChoiceBody(customerName = "") {
  const cleanName = cleanCustomerName(customerName);
  const arabicName = cleanName ? ` ${cleanName}` : "";
  const englishName = cleanName ? ` ${cleanName}` : "";

  return `مرحبا${arabicName} 👋\\n\\n` +
    "أكيد، اختر نوع الحجز المناسب لك:\\n\\n" +
    "إذا كنت عميل حالي وتريد خدمة / متابعة / تركيب / تعديل، اختر سيرفس.\\n\\n" +
    "إذا كنت عميل جديد وتريد معرفة الحل الأنسب، اختر استشارة.\\n\\n" +
    "------------------------------\\n\\n" +
    `Hello${englishName} 👋\\n\\n` +
    "Sure, please choose the right booking type:\\n\\n" +
    "If you are an existing client and need service / follow-up / fitting / adjustment, choose Service.\\n\\n" +
    "If you are a new client and want to know the best solution, choose Consultation.";
}
'''

new_direct = '''function buildDirectBookingChoiceBody(customerName = "") {
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
replace_once('direct booking choice name once', old_direct, new_direct)

old_greeting = '''function buildPersonalGreeting(customerName = "") {
  const cleanName = cleanCustomerName(customerName);

  if (!cleanName) {
    return "مرحبا 👋\\nHello 👋";
  }

  return `مرحبا ${cleanName} 👋\\nHello ${cleanName} 👋`;
}
'''
new_greeting = '''function buildPersonalGreeting(customerName = "") {
  const cleanName = cleanCustomerName(customerName);

  if (!cleanName) {
    return "Hello 👋";
  }

  return `Hello ${cleanName} 👋`;
}
'''
replace_once('personal greeting name once', old_greeting, new_greeting)

old_flow_confirmation_part = '''    `Hello ${customerName} 👋`,
    "",
    "تم استلام طلب الحجز ✅",'''
new_flow_confirmation_part = '''    `Thank you ${customerName}`,
    "",
    "تم استلام طلب الحجز ✅",'''
replace_once('flow confirmation thank you name once', old_flow_confirmation_part, new_flow_confirmation_part)

old_main_menu = '''      replyText =
        `${personalGreeting}\\n\\n` +
        `${BUSINESS_NAME_SPACED} ✨\\n\\n` +
        "أهلًا بك في Iconic Hair Care.\\n\\n" +
        "النتيجة الطبيعية تبدأ من اختيار صحيح.\\n" +
        "يمكنك الآن حجز استشارة، معرفة خدماتنا، أو فتح موقع الفرع مباشرة.\\n\\n" +
        "اختر ما يناسبك:\\n\\n" +
        "------------------------------\\n\\n" +
        `${BUSINESS_NAME_SPACED} ✨\\n\\n` +
        "Welcome to Iconic Hair Care.\\n\\n" +
        "A natural result starts with the right choice.\\n" +
        "You can book a consultation, explore our services, or open the branch location directly.\\n\\n" +
        "Please choose:";

      replyButtons = getMainMenuButtons();
      replyOptions = { headerImageUrl: MAIN_MENU_HEADER_IMAGE_URL };'''
new_main_menu = '''      replyText =
        `${personalGreeting}\\n\\n` +
        "أهلًا بك في Iconic Hair Care.\\n\\n" +
        "النتيجة الطبيعية تبدأ من اختيار صحيح.\\n" +
        "يمكنك الآن حجز استشارة، معرفة خدماتنا، أو فتح موقع الفرع مباشرة.\\n\\n" +
        "اختر ما يناسبك:\\n\\n" +
        "------------------------------\\n\\n" +
        "Welcome to Iconic Hair Care.\\n\\n" +
        "A natural result starts with the right choice.\\n" +
        "You can book a consultation, explore our services, or open the branch location directly.\\n\\n" +
        "Please choose:";

      replyButtons = getMainMenuButtons();
      replyOptions = { headerImageUrl: BOT_HEADER_IMAGE_URL };'''
replace_once('main menu remove old text header', old_main_menu, new_main_menu)

old_flow_body = '''  const flowBody = (isServiceBookingFlow
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
  ).join(String.fromCharCode(10));'''
new_flow_body = '''  const customerNameForFlow = cleanCustomerName(options.customerName || "");
  const flowGreeting = customerNameForFlow ? `Hello ${customerNameForFlow} 👋` : "Hello 👋";

  const flowBody = (isServiceBookingFlow
    ? [
        flowGreeting,
        "",
        "احجز موعد السيرفس خلال ثواني من داخل واتساب.",
        "اختر الفرع، اليوم، الوقت، واسم الموظف المفضل إن وجد. الفريق سيؤكد الموعد النهائي بعد مراجعة التوفر.",
        "",
        "------------------------------",
        "",
        "Book your service appointment in seconds inside WhatsApp.",
        "Choose the branch, preferred day, preferred time, and preferred team member if any. Our team will confirm the final appointment after checking availability."
      ]
    : [
        flowGreeting,
        "",
        "احجز استشارتك خلال ثواني من داخل واتساب.",
        "اختر اليوم والوقت المناسب، وفريقنا سيؤكد الموعد النهائي بعد مراجعة التوفر.",
        "",
        "------------------------------",
        "",
        "Book your consultation in seconds inside WhatsApp.",
        "Choose your preferred day and time. Our team will confirm the final appointment after checking availability."
      ]
  ).join(String.fromCharCode(10));'''
replace_once('flow invite body remove old text header and name once', old_flow_body, new_flow_body)

old_flow_header = '''      header: {
        type: "text",
        text: selectedFlowHeader
      },'''
new_flow_header = '''      header: BOT_HEADER_IMAGE_URL
        ? {
            type: "image",
            image: { link: BOT_HEADER_IMAGE_URL }
          }
        : {
            type: "text",
            text: selectedFlowHeader
          },'''
replace_once('flow invite image header', old_flow_header, new_flow_header)

server_path.write_text(s)

pkg_path = Path('package.json')
pkg = json.loads(pkg_path.read_text())
pkg['scripts']['start'] = 'node --check server.js && node server.js'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')

print('[V60.2.2] cleaned names and headers')
