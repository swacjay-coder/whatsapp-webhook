from pathlib import Path

p = Path('server.js')
s = p.read_text()

OLD_VERSION = 'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-0-1-details-label-and-body-safe";'
NEW_VERSION = 'const BOT_VERSION = "iconic-team-inbox-v31-5-8-60-3-0-2-services-video-header-single-message";'
RESULTS_URL = 'https://iconichaircare.com/wp-content/uploads/2026/05/WhatsApp-Video-2026-04-30-at-4.32.42-PM.mp4'

def must_find(text, label):
    if text not in s:
        raise SystemExit('[V60.3.0.2] missing: ' + label)

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('[V60.3.0.2] ' + label + ' expected 1, found ' + str(count))
    return text.replace(old, new, 1)

must_find(OLD_VERSION, 'old BOT_VERSION')
s = replace_once(s, OLD_VERSION, NEW_VERSION, 'BOT_VERSION')

how_line = 'const HOW_IT_WORKS_VIDEO_URL = (process.env.HOW_IT_WORKS_VIDEO_URL || "' + RESULTS_URL + '").toString().trim();'
if how_line not in s:
    raise SystemExit('[V60.3.0.2] HOW_IT_WORKS_VIDEO_URL line not found exactly')
results_line = 'const RESULTS_VIDEO_URL = (process.env.RESULTS_VIDEO_URL || "' + RESULTS_URL + '").toString().trim();'
if 'const RESULTS_VIDEO_URL =' not in s:
    s = s.replace(how_line, how_line + '\n' + results_line, 1)

old_header_const = '  const headerImageUrl = (options.headerImageUrl || BOT_HEADER_IMAGE_URL || "").toString().trim();'
new_header_const = old_header_const + '\n  const headerVideoUrl = (options.headerVideoUrl || "").toString().trim();'
if 'const headerVideoUrl =' not in s:
    s = replace_once(s, old_header_const, new_header_const, 'headerVideoUrl const')

old_header_payload = '''      ...(headerImageUrl
        ? {
            header: {
              type: "image",
              image: { link: headerImageUrl }
            }
          }
        : {}),'''
new_header_payload = '''      ...(headerVideoUrl
        ? {
            header: {
              type: "video",
              video: { link: headerVideoUrl }
            }
          }
        : headerImageUrl
          ? {
              header: {
                type: "image",
                image: { link: headerImageUrl }
              }
            }
          : {}),'''
s = replace_once(s, old_header_payload, new_header_payload, 'interactive header payload')

services_block = '''      if (iconicIsServicesRoute) {
        await sendWhatsAppButtonMessage(from, buildServicesMenuBody(profileName), [
          { id: "results", title: "Results | نتائج" },
          { id: "location", title: "Location | موقعنا" },
          { id: "how_it_works", title: "Details | التفاصيل" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildServicesMenuBody(profileName), "Services Menu", incomingPhoneNumberId, { customerName: profileName, messageType: "Services Menu" });
        return res.sendStatus(200);
      }
'''
results_block = services_block + '''
      if (iconicIsResultsRoute) {
        await sendWhatsAppButtonMessage(from, buildResultsFollowupBody(profileName), [
          { id: "how_it_works", title: "Details | التفاصيل" },
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerVideoUrl: RESULTS_VIDEO_URL });
        addInboxMessage(from, "bot", buildResultsFollowupBody(profileName), "Results Video Header", incomingPhoneNumberId, { customerName: profileName, messageType: "Results Video Header" });
        return res.sendStatus(200);
      }
'''
if 'Results Video Header' not in s:
    s = replace_once(s, services_block, results_block, 'insert Results route')

old_details = '''      if (iconicIsHowItWorksRoute) {
        await sendWhatsAppVideoByLink(from, HOW_IT_WORKS_VIDEO_URL, "", incomingPhoneNumberId);
        await sendWhatsAppButtonMessage(from, buildHowItWorksBody(profileName), [
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "results", title: "Results | نتائج" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL });
        addInboxMessage(from, "bot", buildHowItWorksBody(profileName), "How it works", incomingPhoneNumberId, { customerName: profileName, messageType: "How it works" });
        return res.sendStatus(200);
      }
'''
new_details = '''      if (iconicIsHowItWorksRoute) {
        await sendWhatsAppButtonMessage(from, buildHowItWorksBody(profileName), [
          { id: "booking_menu", title: "Booking | حجز" },
          { id: "results", title: "Results | نتائج" },
          { id: "talk_to_team", title: "Team | فريقنا" }
        ], incomingPhoneNumberId, { headerVideoUrl: HOW_IT_WORKS_VIDEO_URL });
        addInboxMessage(from, "bot", buildHowItWorksBody(profileName), "Details Video Header", incomingPhoneNumberId, { customerName: profileName, messageType: "Details Video Header" });
        return res.sendStatus(200);
      }
'''
s = replace_once(s, old_details, new_details, 'Details route single message')

checks = [
    'const RESULTS_VIDEO_URL =',
    'const headerVideoUrl =',
    'type: "video"',
    'Results Video Header',
    'Details Video Header',
    '{ id: "how_it_works", title: "Details | التفاصيل" }',
    '{ id: "booking_menu", title: "Booking | حجز" }',
    '{ id: "talk_to_team", title: "Team | فريقنا" }',
    'iconic-team-inbox-v31-5-8-60-3-0-2-services-video-header-single-message',
]
for item in checks:
    if item not in s:
        raise SystemExit('[V60.3.0.2] check missing: ' + item)

if 'sendWhatsAppVideoByLink(from, HOW_IT_WORKS_VIDEO_URL' in s:
    raise SystemExit('[V60.3.0.2] Details still sends separate video')

p.write_text(s)
print('[V60.3.0.2] patch applied successfully')
