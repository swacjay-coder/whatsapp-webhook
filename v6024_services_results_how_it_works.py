from pathlib import Path
import re

server_path = Path('server.js')
s = server_path.read_text()

VERSION = 'iconic-team-inbox-v31-5-8-60-2-4-services-results-how-it-works-video'
HEADER_URL = 'https://iconichaircare.com/wp-content/uploads/2026/05/BE6F2E6E-357D-486A-ADC3-0A8F70D22A26.jpg'
HOW_IT_WORKS_VIDEO_URL = 'https://iconichaircare.com/wp-content/uploads/2026/05/WhatsApp-Video-2026-04-30-at-4.32.42-PM.mp4'


def fail(msg):
    raise SystemExit(f'[V60.2.4] {msg}')


def apply_once(label, old, new):
    global s
    if new in s:
        print(f'[V60.2.4] {label}: already applied')
        return True
    if old not in s:
        print(f'[V60.2.4] {label}: anchor not found')
        return False
    s = s.replace(old, new, 1)
    print(f'[V60.2.4] {label}: applied')
    return True

# 1) Version bump only. Do not change BOT_HEADER_IMAGE_URL value.
s = re.sub(
    r'const BOT_VERSION = "iconic-team-inbox-v31-5-8-[^"]+";',
    f'const BOT_VERSION = "{VERSION}";',
    s,
    count=1,
)

if HEADER_URL not in s:
    fail('expected current BOT_HEADER_IMAGE_URL/new header URL is missing; refusing to continue')

# 2) Add How it works video constant near BOT_HEADER_IMAGE_URL.
if 'HOW_IT_WORKS_VIDEO_URL' not in s:
    anchor = f'const BOT_HEADER_IMAGE_URL = (process.env.BOT_HEADER_IMAGE_URL || "{HEADER_URL}").toString().trim();'
    replacement = anchor + "\n" + f'const HOW_IT_WORKS_VIDEO_URL = (process.env.HOW_IT_WORKS_VIDEO_URL || "{HOW_IT_WORKS_VIDEO_URL}").toString().trim();'
    if not apply_once('How it works video constant', anchor, replacement):
        fail('could not add HOW_IT_WORKS_VIDEO_URL constant')

# 3) Add generic video-by-link helper without touching existing Results video logic.
video_helper = r'''
async function sendWhatsAppVideoByLink(to, videoUrl, caption = "", phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
  const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
  const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;
  const cleanVideoUrl = (videoUrl || "").toString().trim();

  if (!cleanVideoUrl) {
    throw new Error("sendWhatsAppVideoByLink missing video URL");
  }

  const videoPayload = { link: cleanVideoUrl };
  const cleanCaption = (caption || "").toString().trim();
  if (cleanCaption) {
    videoPayload.caption = cleanCaption;
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "video",
    video: videoPayload
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[Iconic] sendWhatsAppVideoByLink failed", JSON.stringify(data));
    throw new Error("sendWhatsAppVideoByLink failed");
  }
  return data;
}
'''

if 'async function sendWhatsAppVideoByLink(' not in s:
    send_button_match = re.search(r'async function sendWhatsAppButtonMessage\([\s\S]*?\n}\n', s)
    if not send_button_match:
        fail('sendWhatsAppButtonMessage helper not found; refusing to add video helper')
    insert_at = send_button_match.end()
    s = s[:insert_at] + video_helper + s[insert_at:]
    print('[V60.2.4] video helper inserted')
else:
    print('[V60.2.4] video helper already exists')

# 4) Add message builders for Services / Results / How it works.
builders = r'''
function buildServicesMenuBody(customerName = "") {
  const cleanName = namePhrase(customerName);
  const intro = cleanName ? `أكيد ${cleanName} ✨` : "أكيد ✨";

  return `${intro}\n\n` +
    "في Iconic Hair Care نقدم حلول Hair Replacement بمظهر طبيعي 100%، بدون جراحة.\n\n" +
    "You can explore our services, see real results, or learn how the process works with our team.\n\n" +
    "شو تحب تشوف أولاً؟\n" +
    "What would you like to check first?";
}

function buildResultsFollowupBody(customerName = "") {
  const cleanName = namePhrase(customerName);
  const intro = cleanName ? `أكيد ${cleanName} ✨` : "أكيد ✨";

  return `${intro}\n\n` +
    "هذه بعض النتائج الحقيقية من Iconic Hair Care.\n" +
    "مظهر طبيعي، بدون جراحة، وبشكل يناسبك تماماً.\n\n" +
    "Here are some real results from Iconic Hair Care.\n" +
    "Natural look, non-surgical, and designed to suit you.\n\n" +
    "شو تحب تعمل بعد ما شفت النتائج؟\n" +
    "What would you like to do next?";
}

function buildHowItWorksBody(customerName = "") {
  const cleanName = namePhrase(customerName);
  const intro = cleanName ? `أكيد ${cleanName} ✨` : "أكيد ✨";

  return `${intro}\n\n` +
    "الفكرة بسيطة:\n" +
    "نختار لك الشكل المناسب، اللون المناسب، والكثافة المناسبة لشعرك، ثم يتم التركيب بطريقة طبيعية بدون جراحة.\n\n" +
    "The process is simple:\n" +
    "We choose the right style, color, and density for you, then apply it naturally with no surgery.\n\n" +
    "شو تحب تعمل الآن؟\n" +
    "What would you like to do now?";
}
'''

if 'function buildServicesMenuBody(' not in s:
    helper_anchor = 'function namePhrase(customerName = "", fallback = "") {'
    idx = s.find(helper_anchor)
    if idx == -1:
        fail('namePhrase helper not found; refusing to insert services builders')
    end_idx = s.find('\n}\n', idx)
    if end_idx == -1:
        fail('could not find end of namePhrase helper')
    end_idx += len('\n}\n')
    s = s[:end_idx] + builders + s[end_idx:]
    print('[V60.2.4] services builders inserted')
else:
    print('[V60.2.4] services builders already exist')

# 5) Add a focused pre-router for Services/Results/How it works buttons.
# This block reads the incoming button/list/text title directly from the WhatsApp message object.
pre_router = r'''
      // V60.2.4 Services / Results / How it works premium route
      const iconicServicesRawText = (
        message?.interactive?.button_reply?.title ||
        message?.interactive?.list_reply?.title ||
        message?.button?.text ||
        message?.text?.body ||
        ""
      ).toString().trim();
      const iconicServicesText = normalizeText(iconicServicesRawText);

      if (["services | خدماتنا", "services", "خدماتنا"].includes(iconicServicesText)) {
        await sendWhatsAppButtonMessage(from, buildServicesMenuBody(profileName), [
          { id: "results", title: "Results | نتائج" },
          { id: "location", title: "Location | موقعنا" },
          { id: "how_it_works", title: "How it works | كيف يعمل" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildServicesMenuBody(profileName), "Services Menu", incomingPhoneNumberId, { customerName: profileName, messageType: "Services Menu" });
        return res.sendStatus(200);
      }

      if (["how it works | كيف يعمل", "how it works", "كيف يعمل"].includes(iconicServicesText)) {
        await sendWhatsAppVideoByLink(from, HOW_IT_WORKS_VIDEO_URL, "", incomingPhoneNumberId);
        await sendWhatsAppButtonMessage(from, buildHowItWorksBody(profileName), [
          { id: "booking", title: "Booking | حجز" },
          { id: "results", title: "Results | نتائج" },
          { id: "team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildHowItWorksBody(profileName), "How it works", incomingPhoneNumberId, { customerName: profileName, messageType: "How it works" });
        return res.sendStatus(200);
      }
'''

if 'V60.2.4 Services / Results / How it works premium route' not in s:
    # Insert after profileName is defined inside webhook handler so message/from/profileName/incomingPhoneNumberId are in scope.
    webhook_idx = s.find('app.post("/webhook", async (req, res) => {')
    if webhook_idx == -1:
        fail('webhook handler not found')
    # Prefer an anchor after profileName inside webhook.
    profile_match = re.search(r'\n\s*const profileName\s*=.*?;\n', s[webhook_idx:])
    if not profile_match:
        fail('profileName assignment not found inside webhook; refusing to insert pre-router')
    insert_at = webhook_idx + profile_match.end()
    s = s[:insert_at] + pre_router + s[insert_at:]
    print('[V60.2.4] services pre-router inserted')
else:
    print('[V60.2.4] services pre-router already exists')

# 6) Clean old visible button titles in this route only where exact old service/result menus are found.
# Safe global title replacements are limited to the old services-related choice, not Flow IDs or reminders.
s = s.replace('Consult | استشارة', 'How it works | كيف يعمل') if 'Services | خدماتنا' in s else s

server_path.write_text(s)
print('[V60.2.4] helper completed')
