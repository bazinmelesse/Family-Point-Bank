# Store listing text and form answers

Copy and paste these into App Store Connect and the Google Play Console. Anything in CAPITALS (like CONTACT_EMAIL) is for Baz to fill in.

## Names and links

| Field | Value |
| --- | --- |
| App name | Family Point Bank (if the name is taken on the App Store, try "Family Point Bank: Chores") |
| iOS bundle ID / Android package | `com.familypointbank.app` |
| Privacy policy URL | https://bazinmelesse.github.io/Family-Point-Bank/privacy.html |
| Support URL | https://bazinmelesse.github.io/Family-Point-Bank/support.html |
| Account deletion URL (Google) | https://bazinmelesse.github.io/Family-Point-Bank/delete-account.html |
| Marketing URL (optional) | https://bazinmelesse.github.io/Family-Point-Bank/support.html |
| Category | Lifestyle (secondary on iOS: Productivity). Google: Parenting |
| Price | Free, no in-app purchases, no ads |

## App Store text

**Subtitle (30 max):** Points, rewards and chores

**Promotional text (170 max):**
Kids earn points for chores, homework and kindness, then cash them in for screen time, outings or a day with Mom or Dad. Shared live with the other parent.

**Keywords (100 max, comma separated, no spaces):**
chores,chore chart,allowance,reward chart,kids,points,behavior,parenting,family,tokens,star chart

## Google Play text

**Short description (80 max):**
Kids earn points for chores and cash them in for rewards, screen time or money.

## Description (both stores, 4000 max)

Family Point Bank turns chores, homework and good behavior into points your kids can see grow, and cash in for things they actually want.

EARN AND LOSE POINTS
• Tap + Points for chores, homework, reading or a kind act. Tap − Points when rules get broken.
• Comes with chores and behaviors for ages 2 to 16, and the right ones show first for each kid. Add your own anytime.

CASH IN FOR REWARDS OR MONEY
• Rewards like extra screen time, staying up late, a trip to the park, the movies, or a day with Mom or Dad.
• Or cash out for money at your family's rate (10 points = $1 to start).
• Each kid can pick a saving goal and watch the progress bar fill up.

KID VIEW FOR THE WHOLE FAMILY
• A big, colorful screen with every kid's points side by side, made for an iPad or tablet on the wall.
• Little ones see stars instead of numbers.
• Shows today's activities and what's coming up. Leaving it takes a grown-up question.

FAMILY CALENDAR
• Practices, lessons, school and appointments for each kid or the whole family, once or repeating.

SHARED WITH THE OTHER PARENT
• Invite the other parent with a code. Points update live on every grown-up's phone and the wall tablet.
• Full history with undo, so you always know who earned what and when.

PRIVATE BY DESIGN
• No ads, no tracking, no in-app purchases. Your family's data is only visible to the grown-ups in your family.
• Try it without an account, with everything kept on one device.

Family Point Bank only keeps track of points. Any money or rewards are given by you, outside the app.

## What's new (version 1.0.0)

First release.

## Screenshots

In `store/screenshots/`, made from the real app with a sample family:

| Store slot | Folder | Size |
| --- | --- | --- |
| App Store iPhone 6.9" | `iphone-6.9/` | 1320 × 2868 |
| App Store iPad 13" | `ipad-13/` | 2064 × 2752 |
| Google Play phone | `android-phone/` | 1080 × 1920 |
| Google Play 10" tablet | `android-tablet/` | 1920 × 1200 |

Google Play also needs `store/graphics/play-icon-512.png` (app icon) and `store/graphics/play-feature-graphic-1024x500.png` (feature graphic).

## App Store Connect forms

**Age rating questionnaire:** answer "None" / "No" to everything (no violence, no mature themes, no gambling, no contests, no unrestricted web access, no user-generated content shared with strangers, no messaging). Expected rating: 4+.

**Made for Kids / Kids category:** do **not** choose the Kids category. The app is used by parents to manage their kids' points; kids only look at the read-only kid view. Choosing Kids adds strict extra rules (parental gates on every link, no third-party services that collect data) that would need more work and slow review.

**App Privacy ("nutrition label"):** Data is collected. Not used for tracking. For each type below choose: used for **App Functionality** only, **linked to the user**, **not used for tracking**.
- Contact Info → Email Address
- Identifiers → User ID
- User Content → Other User Content (kids' first names and ages, points history, rewards, calendar items)

Nothing else (no location, contacts, health, purchases, browsing, usage data, diagnostics, or advertising data).

**Export compliance:** the app only uses standard HTTPS. This is already answered in the app (`usesNonExemptEncryption: false`), so App Store Connect won't ask.

**Sign-in information for App Review** (required, because the app needs an account):
- Create a demo account in the app first, start a family called "Review family", add two or three kids and a few points.
- Username: `DEMO_EMAIL` · Password: `DEMO_PASSWORD`
- Notes for the reviewer:
  > Family Point Bank is for parents. Sign in with the demo account above to see a family with kids and points. Tap + Points, − Points or Cash in on a kid. "Kid view" (top right) is the read-only screen for kids; leave it by tapping "Grown-ups" and answering the simple math question. Account deletion: Settings → bottom of the family card → Delete my account. You can also tap "try it without an account" on the first screen to use the app with no sign-in.

## Google Play Console forms

**App content → Target audience:** choose **18 and over** only, because the app is for parents. Choosing any age group under 13 puts the app in Google's Families program, which adds its own review and rules. If Google asks whether the app could appeal to children, explain that kids only see a read-only display that a parent sets up and controls.

**Data safety:**
- Does the app collect or share user data? **Yes, collects. Does not share.**
- Is all data encrypted in transit? **Yes.**
- Can users request data deletion? **Yes** (in the app, and at the account deletion URL above).
- Data types collected (all: *Collected*, *not shared*, *required for app functionality*, *not optional* except where noted):
  - Personal info → **Email address** (purpose: Account management)
  - Personal info → **User IDs** (purpose: Account management)
  - Personal info → **Name** (kids' first names a parent types in; purpose: App functionality)
  - App activity → **Other user-generated content** (points history, rewards, calendar; purpose: App functionality)

**Content rating (IARC questionnaire):** category "Utility, Productivity, Communication, or Other". Answer No to violence, sexuality, language, controlled substances, gambling, user interaction/sharing between strangers, and location sharing. Expected rating: Everyone / PEGI 3.

**Ads:** No ads.

**App access:** "All or some functionality is restricted" → add the same demo account and instructions as for Apple.

**Government app / financial features / health:** No to each. Under "Financial features", choose "My app doesn't provide any financial features" (points are not real money).
