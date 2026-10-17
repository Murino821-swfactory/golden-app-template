# Daily reminders and history

The dashboard and public `/checkin` share the same daily form. Push opens
`/checkin?today=1#daily-form`, resolving the device's current date even when a notification
was delivered earlier. A phone notification requires a tap to open the form.

Every pillar change and note input is written synchronously to localStorage. Closing the
window needs no Save button. Signed-in visitors additionally sync to their existing private
Firestore check-in document. Visibility/pagehide attempts to flush pending uploads; the
local dirty marker survives interruptions and reconnecting retries reconciliation. The UI
distinguishes device storage from cloud sync and warns when browser storage is blocked.

History lists each elapsed day of a chosen month, notes, completed pillars, active days,
complete days and completion rate. The monthly view compares twelve months ending at the
chosen month; navigation can reach older history. Future days do not dilute percentages.

Daily push is opt-in per device, defaults to **08:00**, and uses the browser's IANA time
zone. Open Daily reminder, sign in and enable push. On iOS/iPadOS 16.4+, install from Safari
to the Home Screen first, launch that app and enable notifications there. Permission denial
and unsupported browsers show instructions; calendar links remain available as a fallback.
Calendar reminders and push are independent; enabling both can produce two reminders.
Users change the time or disable this device in the same dialog. Revisiting the dialog reads
server state; re-enabling obtains the current FCM token. Each account has at most five devices.

The service worker lives under this prototype's base path and does not cache pages or
private data. Notification clicks cannot leave its check-in routes. Firebase's existing
Messaging configuration is reused; `NEXT_PUBLIC_FIREBASE_VAPID_KEY` can supply a project
Web Push public key when required by the push service. No private key is bundled.

## Release dependency

Deploy factory-web's `unbrokenReminder` callable and `unbrokenDailyReminders` scheduler
before republishing this `demo/unbroken` branch. The functions use authenticated registration,
server-only device documents and Firebase Cloud Messaging. No changes to shared Firestore
check-in rules are required. Never merge this prototype into template `main`.

Before production acceptance, use real Android Chrome and an installed iPhone app to enable
notifications, close the app, receive a scheduled notification, tap it and verify today's
form. Close immediately after typing, reopen, and verify note and monthly totals. Automated
browser tests cannot verify OS permission prompts or real FCM delivery.
