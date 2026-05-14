# Iconic Hair Care — Working Rules

This file is a persistent reference for future work on this repository.

## Main rule
When any feature, fix, or setup is tested and confirmed working, it must be treated as the current working reference.

Before any future change:
1. Identify the correct area/file.
2. Explain the exact change scope first.
3. Do not touch unrelated working parts.
4. Make the smallest safe change.
5. Check syntax before deploy when code is edited.
6. Deploy manually when required.
7. Confirm with the version endpoint or a real test.
8. Record the final working state.

## Separation rules

### WhatsApp
- Main file: `server.js`
- Do not mix WhatsApp changes with Instagram/Messenger changes.
- Do not touch WhatsApp flows, reminders, cron, Flyksoft, Google Sheets reminder logic, or environment variables unless explicitly requested.

### Instagram + Messenger Meta DM
- Main file: `meta-dm/server.js`
- Render service: `iconic-meta-dm`
- URL: `https://iconic-meta-dm.onrender.com`
- Version endpoint: `https://iconic-meta-dm.onrender.com/api/version`
- Current working version should be confirmed from `/api/version` after every deploy.

## Confirmed Meta DM working state
- Instagram DM is confirmed working.
- Messenger is configured and working.
- WhatsApp Team Inbox was not touched during Meta DM work.
- If Instagram Test webhook reaches Render but real Instagram DMs do not reach Logs, the issue may be a stale Instagram account webhook subscription. The confirmed fix was: in Instagram API setup, toggle the Instagram account Webhook Subscription OFF, wait about 10 seconds, then turn it ON again. After that, real Instagram DM events reached Render again.

## Important Meta DM routing
- Instagram sends use `graph.instagram.com`.
- Messenger sends use `graph.facebook.com`.

## Important Meta DM token note
- For the current Instagram route, `INSTAGRAM_ACCESS_TOKEN` must be the Instagram token that works with `graph.instagram.com`.
- Do not paste or store secret tokens in this file.

## Known Instagram information
- Instagram account: `@iconichaircare`
- Instagram Business Account ID: `17841405436149878`
- Webhook callback: `https://iconic-meta-dm.onrender.com/webhook`

## Pending Meta DM work
- Improve Instagram/Messenger auto-replies step by step, starting from the current clean working base.
- Do not reintroduce `smart-name` customer profile lookup until it is redesigned safely; the previous smart-name attempt stopped replies.
- Do not reintroduce Meta DM Team Inbox unless explicitly requested.
- Pending staff notification feature: when a Meta DM booking request is completed, notify Dubai staff number ending `811` for Dubai branch and Abu Dhabi staff number ending `616` for Abu Dhabi branch. This is postponed and must be implemented later as a separate change, not mixed with reply-copy improvements.

## Future assistant behavior
- Always proceed step by step.
- Avoid many options at once.
- Give copy-friendly fields when asking for ENV, URLs, commands, or code.
- If something is not confirmed, say it is not confirmed.
- If a working state is confirmed by real test, treat it as the current base.
