# Iconic Hair Care Team Inbox - Project Memory V60.2.3

Last updated: 2026-05-11

## Current stable live version

Current confirmed working live version:

```txt
V31.5.8.60.2.3
iconic-team-inbox-v31-5-8-60-2-3-smart-customer-name-and-new-header-all-replies
```

Version check URL:

```txt
https://whatsapp-webhook-g0c5.onrender.com/api/version
```

Render service:

```txt
whatsapp-webhook-g0c5
```

Render public URL:

```txt
https://whatsapp-webhook-g0c5.onrender.com
```

GitHub repo:

```txt
https://github.com/iconichaircare7-dot/whatsapp-webhook
```

## Stable result confirmed by Osama

Osama confirmed after deploy/test:

```txt
ممتاز كلو تمام
```

Meaning: V60.2.3 is the current stable base. Do not revert to V60.2.2, V60.2.1, V60.2, V60.1, V59, or older unless explicitly rolling back.

## V60.2.3 final behavior

### Header image

The new header image is now the active bot header:

```txt
https://iconichaircare.com/wp-content/uploads/2026/05/BE6F2E6E-357D-486A-ADC3-0A8F70D22A26.jpg
```

Rule:

```txt
Use this new header image on all bot button replies where WhatsApp supports interactive image headers.
Remove/avoid old text header repetition inside message bodies:
I C O N I C   H A I R   C A R E ✨
```

The previous old header URL was replaced and should not be used unless Osama asks:

```txt
https://iconichaircare.com/wp-content/uploads/2026/05/ChatGPT-Image-May-8-2026-12_12_30-AM.jpg
```

### Customer name rule

Customer name should appear only once per bot message.

Main menu only:

```txt
Hello Osama 👋
```

Other replies should use contextual wording, not a generic repeated greeting. Examples:

```txt
أكيد Osama، ...
تمام Osama، ...
Thank you Osama
وصلنا طلبك Osama
```

Do not repeat the name in both Arabic and English in the same message:

```txt
Wrong:
مرحبا Osama 👋
Hello Osama 👋
```

### Flow confirmation behavior

After Service Flow or Consultation Flow submit, the confirmation message remains bilingual Arabic + English and includes reminder opt-in in the same message.

Name rule in Flow confirmation:

```txt
Thank you Osama
```

Do not use:

```txt
Hello Osama 👋
```

inside Flow confirmation.

The Flow confirmation includes:

```txt
تم استلام طلب الحجز ✅
سيقوم فريقنا بمراجعة التوفر وتأكيد الموعد النهائي قريباً.

Your booking request has been received ✅
Our team will check availability and confirm the exact appointment shortly.

نوع الطلب / Request type: ...
الفرع / Branch: ...
الوقت المفضل / Preferred time: ...

هل تحب نذكّرك قبل موعدك بساعة؟
Would you like us to remind you 1 hour before your appointment?
```

Buttons:

```txt
Yes | نعم
No | لا
```

### Appointment reminder opt-in

If customer presses:

```txt
Yes | نعم
```

Save state:

```txt
Appointment Reminder Opt-in
Tags: Appointment Reminder, Opt-in, 1 Hour Before
```

Reply style:

```txt
تمام Osama، تم تسجيل طلب التذكير ✅
سنرسل لك تذكير قبل موعدك بساعة.

Done ✅
We will remind you 1 hour before your appointment.
```

If customer presses:

```txt
No | لا
```

Save state:

```txt
Appointment Reminder Declined
Tags: Appointment Reminder, Declined
```

Reply style:

```txt
تمام Osama، لن نرسل تذكير لهذا الموعد.

No problem. We will not send a reminder for this appointment.
```

## Important confirmed commits

V60.1 staff notification fix:

```txt
8dcb58a93794d736d22f1ab6557555fe1198061b
Apply V60.1 staff notify routing fix
```

V60.2 reminder opt-in first implementation:

```txt
e6d364f4f9f9cffc7077a1d66e4e574bb9c2d717
Apply V60.2 flow confirmation reminder opt-in
```

V60.2.1 bilingual/header fix:

```txt
55dfad16bbb787486bff73c6245f525bbbbdbeb1
Apply V60.2.1 bilingual header fix
```

V60.2.2 clean names and headers:

```txt
9f4cb00ba642606ecc1a24aca75144da5b1407b2
Apply V60.2.2 clean names and headers
```

V60.2.3 final smart names and new header:

```txt
7997b8a837a9d6517b86b919e7184f64facaf165
Apply V60.2.3 smart names and new header
```

V60.2.3 deploy trigger:

```txt
a83c3daf05022407ea08bdc248241092d9ac8570
Deploy V6023
```

## Do-not-touch working settings

These settings and variables are confirmed working. Do not change them unless Osama explicitly asks:

```txt
DUBAI_STAFF_NUMBER=971503424811
ABU_DHABI_STAFF_NUMBER=<current Abu Dhabi staff number in Render ENV>
ICONIC_CONSULTATION_FLOW_ID_DUBAI=1607726336999909
ICONIC_CONSULTATION_FLOW_ID_ABU_DHABI=1648749433033956
ICONIC_SERVICE_BOOKING_FLOW_ID_DUBAI=1707428933768266
ICONIC_SERVICE_BOOKING_FLOW_ID_ABU_DHABI=986634320965936
BOT_HEADER_IMAGE_URL=https://iconichaircare.com/wp-content/uploads/2026/05/BE6F2E6E-357D-486A-ADC3-0A8F70D22A26.jpg
```

Important:

```txt
Dubai staff notification tested and confirmed delivered to 971503424811.
Abu Dhabi staff notification tested and confirmed delivered to Abu Dhabi staff.
Do not replace DUBAI_STAFF_NUMBER back to 971569979163 unless retested and confirmed delivered/read.
```

Old Dubai staff number issue:

```txt
971569979163 received outbound failures from WhatsApp Cloud API with error code 131000 / Something went wrong.
This number should not be used alone as the active Dubai staff notification recipient for now.
If Osama insists, use it only alongside the working number:
DUBAI_STAFF_NUMBER=971503424811,971569979163
```

## Flow IDs and branch mapping

Dubai phone number:

```txt
Dubai display number: 97143963333
Dubai phone_number_id: 1100042333191350
```

Abu Dhabi phone number:

```txt
Abu Dhabi display number: 97125622778
Abu Dhabi phone_number_id: 1000146433192239
```

Dubai Consultation Flow:

```txt
ICONIC_CONSULTATION_FLOW_ID_DUBAI=1607726336999909
Screen: CONSULTATION_BOOKING
Branch payload: Dubai
Dynamic Today time options through endpoint
```

Abu Dhabi Consultation Flow:

```txt
ICONIC_CONSULTATION_FLOW_ID_ABU_DHABI=1648749433033956
Screen: CONSULTATION_BOOKING
Branch payload: Abu Dhabi
No Today dynamic logic in Abu Dhabi static Flow
```

Dubai Service Booking Flow:

```txt
ICONIC_SERVICE_BOOKING_FLOW_ID_DUBAI=1707428933768266
```

Abu Dhabi Service Booking Flow:

```txt
ICONIC_SERVICE_BOOKING_FLOW_ID_ABU_DHABI=986634320965936
```

Correct Abu Dhabi Service ENV name:

```txt
ICONIC_SERVICE_BOOKING_FLOW_ID_ABU_DHABI
```

Do not use wrong name:

```txt
ICONIC_SERVICE_BOOKING_FLOWID_ABU_DHABI
```

## Abu Dhabi Consultation Flow JSON reference

Abu Dhabi Consultation Flow must follow Dubai's structure/version style:

```txt
version: 7.2
data_api_version: 3.0
routing_model: { CONSULTATION_BOOKING: [] }
screen id: CONSULTATION_BOOKING
title: Abu Dhabi Consultation
branch payload: Abu Dhabi
preferred_day: tomorrow, day_after_tomorrow
preferred_time: static list
consultation_type: same as Dubai
no branch dropdown shown to customer
```

Accepted Abu Dhabi Flow direction:

```txt
Use the same structure as Dubai Consultation Flow.
Remove Today.
Remove dynamic data_exchange.
Use static preferred_time data-source.
Do not show Branch to customer.
Include branch: Abu Dhabi in complete payload.
Include request_type: Consultation Booking in complete payload.
```

## Render/GitHub deployment workflow

Render Deploy Hook is saved as GitHub Actions secret:

```txt
RENDER_DEPLOY_HOOK
```

GitHub workflow:

```txt
.github/workflows/render-deploy.yml
```

Trigger files:

```txt
.render-deploy-trigger.txt
.apply-v60-direct-trigger.txt
```

To deploy without entering Render:

```txt
Update .render-deploy-trigger.txt
GitHub Action Deploy to Render runs
Render deploy starts
Verify /api/version
```

## Current package start command

Current start command in package.json:

```txt
node --check server.js && node server.js
```

Do not revert this to old patch start commands unless intentionally rolling back.

## Future edit rule

For future code changes:

```txt
Do not ask Osama to download/upload full server.js manually.
Use GitHub workflow / helper script / patch approach.
Run node --check server.js before deploy.
Trigger Render deploy through GitHub Action.
Verify /api/version after deploy.
```

## Do not touch without explicit request

Do not change these unless explicitly requested:

```txt
/api/wake
/api/reminders/preview
/api/reminders/send-due
FOLLOW_UP_DELAY_DAYS
FOLLOW_UP_TEMPLATE_NAME_DUBAI
FOLLOW_UP_TEMPLATE_NAME_ABU_DHABI
cron-job
old opt-in / opt-out logic
Google Sheets reminder logic
Flyksoft
Service Flow structure
Dubai Consultation Flow dynamic behavior
staff notification ENV variables
Flow IDs
BOT_HEADER_IMAGE_URL
```

## Testing checklist after deploy

After deploy check:

```txt
https://whatsapp-webhook-g0c5.onrender.com/api/version
```

Expected currently:

```txt
iconic-team-inbox-v31-5-8-60-2-3-smart-customer-name-and-new-header-all-replies
```

WhatsApp tests:

```txt
1. Send main menu/general message
Expected: new image header + only one greeting: Hello Osama 👋

2. Send: حجز موعد
Expected: new image header + contextual name once: أكيد Osama، اختر نوع الحجز المناسب لك

3. Send: استشارة
Expected: Consultation Flow opens directly.

4. Send: سيرفس
Expected: Service Flow opens directly.

5. Submit Dubai Flow
Expected: Team Inbox + Google Sheet + notification to 971503424811 + bilingual confirmation with Thank you Osama + Yes/No reminder buttons.

6. Submit Abu Dhabi Flow
Expected: Team Inbox + Google Sheet + notification to Abu Dhabi staff + bilingual confirmation with Thank you Osama + Yes/No reminder buttons.

7. Press Team | فريقنا
Expected: final handoff message uses contextual name once, then bot pauses.

8. Send: تشغيل البوت or resume bot
Expected: Bot Active confirmation.
```

## Important operational note

Testing from staff numbers can confuse conversation states and staff notification tests. Prefer using a non-staff customer number for Flow tests.

If testing old staff number 971569979163, verify WhatsApp delivery status first. Previously it failed outbound delivery with:

```txt
code: 131000
Something went wrong
```
