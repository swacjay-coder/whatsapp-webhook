# Iconic Hair Care Team Inbox - Project Memory V59

Last updated: 2026-05-10

## Current live version

Current live version on Render:

```txt
iconic-team-inbox-v31-5-8-59-direct-booking-intent-abu-dhabi-consultation-and-bot-pause
```

Version check URL:

```txt
https://whatsapp-webhook-g0c5.onrender.com/api/version
```

Confirmed `/api/version` returned V59 live.

## Repo and deployment

GitHub repo:

```txt
https://github.com/iconichaircare7-dot/whatsapp-webhook
```

Render service:

```txt
whatsapp-webhook-g0c5
```

Render public URL:

```txt
https://whatsapp-webhook-g0c5.onrender.com
```

Render Start Command must be:

```txt
npm start
```

Why: `package.json` start script applies `v59.patch` before running `server.js`.

Current `package.json` start script:

```txt
grep -q v31-5-8-59 server.js || git apply v59.patch && node --check server.js && node server.js
```

This means:

1. If `server.js` is not already V59, Render applies `v59.patch`.
2. Then it runs `node --check server.js`.
3. Then it starts `node server.js`.

## Important deployment improvement

A Render Deploy Hook was created in Render and saved as a GitHub Actions secret:

```txt
RENDER_DEPLOY_HOOK
```

A GitHub Action was created:

```txt
.github/workflows/render-deploy.yml
```

Workflow name:

```txt
Deploy to Render
```

It triggers Render deploy by calling the secret deploy hook.

A trigger file was added:

```txt
.render-deploy-trigger.txt
```

Updating this file can trigger the workflow and deploy Render without manually entering Render.

GitHub Actions URL:

```txt
https://github.com/iconichaircare7-dot/whatsapp-webhook/actions
```

## Key commits from this work

V59 patch file added:

```txt
054b296dbfe4a6c3b93df456267f4528783fafb7
Add V59 patch
```

Package start command changed to apply V59 patch:

```txt
fd0e3c0479c980e99a0846956e08b7be26994c78
Apply V59 patch before start
```

GitHub Action added:

```txt
21fd88a981e9e9c02ecad2eddb4d687085e15aa2
Add Render deploy workflow
```

First deploy trigger committed:

```txt
a23a4bd2d4c82bae9a547eba76859d0cba5b7f4d
Trigger Render deploy
```

## V59 purpose

V59 improves customer routing and bot behavior:

1. Direct consultation intent opens Consultation Flow immediately.
2. Direct service intent opens Service Booking Flow immediately.
3. General booking intent sends only two buttons: Service or Consultation.
4. Abu Dhabi Consultation Flow is added.
5. Team / Help requests send one final handoff message and pause the bot.
6. Staff replies from Team Inbox pause the bot for that customer.

## Abu Dhabi Consultation Flow

Abu Dhabi Consultation Flow ID:

```txt
1648749433033956
```

The code adds these environment fallback constants through V59 patch:

```txt
ICONIC_CONSULTATION_FLOW_ID_ABU_DHABI=1648749433033956
ICONIC_CONSULTATION_FLOW_TOKEN_PREFIX_ABU_DHABI=iconic_consultation_flow_abudhabi
```

Abu Dhabi consultation flow behavior:

```txt
Screen: CONSULTATION_BOOKING
Branch: Abu Dhabi
No Today dynamic logic
Tomorrow / Day After Tomorrow only inside the static Flow
```

## Dubai Consultation Flow

Dubai Consultation Flow ID:

```txt
1607726336999909
```

Dubai uses:

```txt
ICONIC_CONSULTATION_FLOW_ID_DUBAI=1607726336999909
Screen: CONSULTATION_BOOKING
Dynamic Today time options through endpoint
```

Important issue solved earlier:

If Flow send fails with:

```txt
(#131009) Parameter value is not valid
Sending a flow in a draft state requires setting the mode to 'draft'.
```

It means the Flow is still Draft in Meta and must be Published. Do not change code for this; publish the Flow.

## Service Booking Flow

Dubai Service Flow ID:

```txt
1707428933768266
```

Abu Dhabi Service Flow ID:

```txt
986634320965936
```

Correct ENV name for Abu Dhabi service:

```txt
ICONIC_SERVICE_BOOKING_FLOW_ID_ABU_DHABI
```

Do not use wrong name:

```txt
ICONIC_SERVICE_BOOKING_FLOWID_ABU_DHABI
```

Service flow behavior remains unchanged in V59.

## Direct intent behavior added in V59

### Consultation intent opens Consultation Flow directly

Trigger examples:

```txt
استشارة
استشاره
بدي استشارة
بدي استشاره
اريد استشارة
أريد استشارة
حجز استشارة
حجز استشاره
consult
consultation
book consult
book consultation
i want consultation
```

Behavior:

```txt
Dubai number -> opens Dubai Consultation Flow
Abu Dhabi number -> opens Abu Dhabi Consultation Flow
```

### Service intent opens Service Flow directly

Trigger examples:

```txt
سيرفس
خدمة
خدمه
حجز سيرفس
موعد سيرفس
موعد خدمة
موعد خدمه
متابعة
تركيب
تعديل
service
book service
service appointment
follow up
follow-up
fitting
adjustment
```

Behavior:

```txt
Opens Service Booking Flow directly according to branch / phone_number_id
```

### General booking intent sends only two buttons

Trigger examples:

```txt
حجز
موعد
حجز موعد
بدي احجز
اريد حجز
أريد حجز
احجز موعد
booking
book
appointment
book appointment
i want to book
```

Bot reply:

```txt
مرحبا {{customerName}} 👋

أكيد، اختر نوع الحجز المناسب لك:

إذا كنت عميل حالي وتريد خدمة / متابعة / تركيب / تعديل، اختر سيرفس.

إذا كنت عميل جديد وتريد معرفة الحل الأنسب، اختر استشارة.

------------------------------

Hello {{customerName}} 👋

Sure, please choose the right booking type:

If you are an existing client and need service / follow-up / fitting / adjustment, choose Service.

If you are a new client and want to know the best solution, choose Consultation.
```

Buttons:

```txt
Book Service | سيرفس
Consult | استشارة
```

## Team handoff and bot pause behavior

If customer presses or writes:

```txt
Team | فريقنا
Help | ساعدني
Talk to Team
تكلم مع الفريق
تواصل مع الفريق
احكي مع الفريق
فريق
موظف
support
human
```

Bot sends one final message:

```txt
تمام {{customerName}} 👌

تم تحويل المحادثة لفريقنا، وراح يتابع معك أحد المختصين بأقرب وقت.

------------------------------

Sure {{customerName}} 👌

Your conversation has been forwarded to our team, and one of our specialists will assist you shortly.
```

Then bot status becomes:

```txt
Talk to Team
Bot paused
```

After that, future messages from the same customer should be logged but the bot should not auto-reply.

If staff replies from Team Inbox, conversation status becomes:

```txt
Human Reply
Bot paused
```

Future customer messages should not trigger bot auto-replies.

## Do not touch without explicit reason

Do not change these unless explicitly requested:

```txt
/api/wake
reminders
cron-job
FOLLOW_UP_DELAY_DAYS
FOLLOW_UP_TEMPLATE_NAME_DUBAI
FOLLOW_UP_TEMPLATE_NAME_ABU_DHABI
opt-in / opt-out
Google Sheets reminder logic
Flyksoft
Service Flow structure
Dubai Consultation Flow structure
```

## Existing approved quick reply structure

Main Menu buttons:

```txt
Booking | حجز
Services | خدماتنا
Team | فريقنا
```

Booking menu now should use only:

```txt
Book Service | سيرفس
Consult | استشارة
```

No more extra Help button in the booking choice when customer asks for general booking.

## Testing checklist after deploy

After any deploy, test:

```txt
https://whatsapp-webhook-g0c5.onrender.com/api/version
```

Expected version:

```txt
iconic-team-inbox-v31-5-8-59-direct-booking-intent-abu-dhabi-consultation-and-bot-pause
```

WhatsApp tests:

```txt
1. Send: استشارة
Expected: Consultation Flow opens directly.

2. Send: سيرفس
Expected: Service Flow opens directly.

3. Send: حجز موعد
Expected: bot sends two buttons only:
Book Service | سيرفس
Consult | استشارة

4. Press Team | فريقنا
Expected: final handoff message is sent, then bot pauses.

5. Staff replies from Team Inbox
Expected: conversation becomes Human Reply and bot pauses.
```

## Important operational notes

- Repo is public, so never commit Render Deploy Hook URL directly.
- Render Deploy Hook is stored safely as GitHub Secret `RENDER_DEPLOY_HOOK`.
- If future assistant says the file is too big to edit, use patch approach again.
- The working approach is: create a small patch file, update `package.json` or apply patch safely, then deploy through GitHub Action.
- Always verify with `/api/version` after deployment.

## Current known stable base

Use V59 as current active base. Do not go back to V58 unless explicitly rolling back.

```txt
Current active base: V31.5.8.59
```