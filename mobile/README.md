# Family Point Bank (React Native + Expo)

The phone and tablet version of Family Point Bank, built with React Native and Expo. It does everything the web app in the folder above does, plus two new things:

- **Kid view shows every kid at once.** All kids sit side by side on one screen, each with their points (stars for kids 6 and under), the money it's worth, their saving goal, and today's and upcoming calendar items. Whole-family items show along the bottom. It's sized for an iPad on the wall in either orientation, keeps the screen awake, and updates the clock and "today" on its own. Leaving it takes the grown-up question from Settings.
- **Calendar tab.** A month view with a colored dot per kid on each day. Add activities like practices, lessons, school or appointments for one kid, several kids, or the whole family. Each one can happen once, every day, on weekdays or every week, with an optional last day, times and place. Tap one to change or delete it.

Everything else carries over: kids with ages and colors, + Points / − Points from age-matched lists or a custom amount, cash in for rewards or money, saving goals, the earn & lose list, rewards, history with undo, points-per-dollar and the kid view lock.

## Installing it on phones and the iPad (free)

The app is published as a home-screen web app on GitHub Pages, at
`https://bazinmelesse.github.io/Family-Point-Bank/app/`.

1. Open that address in **Safari** on the iPhone or iPad.
2. Tap **Share → Add to Home Screen**, then **Add**.
3. Open it from the new **Points** icon. It runs full screen like a normal app.
4. Create an account and start or join your family (see below).

It updates on its own: every change merged into `main` is rebuilt and published by `.github/workflows/pages.yml`.

**One-time setup:** in the repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**. The next push to `main` publishes the site. You can also run it by hand from **Actions → Publish to GitHub Pages → Run workflow**.

On iPhone, an app added to the home screen keeps its own storage and sign-in, separate from Safari, so sign in from inside the home-screen app.

## Running it for development

You need Node.js 20 or newer, the **Expo Go** app on your phone, and a free Expo account. Sign in to the same account in Expo Go and on the computer (`npx eas-cli login`).

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the camera (iPhone/iPad) or Expo Go (Android). Press `w` to open it in a browser instead. If the phone can't reach the computer, use `npx expo start --tunnel`.

## Publishing to the App Store and Google Play

The app is built, signed and uploaded in the cloud with EAS, so no Mac or Xcode is needed. Settings are in `app.json` and `eas.json`; store text, form answers, screenshots and graphics are in [`../store/`](../store/listing.md). The privacy policy, help and account deletion pages (`privacy.html`, `support.html`, `delete-account.html` at the top of the repo) are published by the GitHub Pages workflow, and the app links to them from Settings and the sign-in screen.

```bash
cd mobile
npx eas-cli@latest login            # your free Expo account
npx eas-cli@latest init             # once: links the app to an Expo project (adds extra.eas.projectId to app.json; commit it)
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform ios --latest      # uploads to App Store Connect / TestFlight
npx eas-cli@latest submit --platform android --latest  # uploads to Google Play (internal testing track, as a draft)
```

The first iOS build asks you to sign in with your Apple Developer account and creates the certificates for you. Google Play needs the very first upload done by hand in the Play Console (download the `.aab` from the EAS build page); after that `eas submit` works with a Google service account key. Build numbers go up on their own (`autoIncrement` in `eas.json`); change `version` in `app.json` for each new release.

Both stores require that people can delete their account inside the app: **Settings → Delete my account** (also on the start-or-join screen). It asks for the password again, deletes the whole family if they are the last grown-up in it (otherwise just removes them), and then deletes the sign-in.

## Accounts and families

Anyone with the app's link can create a free account (email and password) and start a family. A family's kids, points, rewards, calendar and settings are shared live with every grown-up in that family and with nobody else.

- **Start a family:** the first parent signs up and taps **Start a family**. Kids already added on that device (from trying it without an account) come along.
- **Invite the other parent:** **Settings** shows the family's invite code. The other parent creates their own account, taps **Join**, and enters the code. The iPad can sign in to either parent's account.
- **Manage:** Settings lists everyone in the family and can remove someone, make a new invite code (the old one stops working), rename the family, sign out, or leave the family.
- **Without an account:** "try it without an account" keeps everything on that one device. Settings → **Create an account** moves it into a family later.
- **Old iPad board:** Settings → **Turn on old iPad board** publishes just the kids' names, colors and totals at a hard-to-guess address that `display.html?src=` can read.

Every family uses the same Firebase project, so friends and family don't set anything up themselves. The free Spark plan covers dozens of families. The database rules in [`firebase-rules.json`](firebase-rules.json) only let people read and change a family they belong to, and joining requires that family's current invite code.

### One-time Firebase setup (for whoever runs the app)

1. In the [Firebase console](https://console.firebase.google.com), create a project and a **Realtime Database** (locked mode).
2. **Realtime Database → Rules:** paste [`firebase-rules.json`](firebase-rules.json) and click **Publish**.
3. **Authentication → Get started → Email/Password:** turn on the first switch and save.
4. **Project settings → Your apps → `</>` (Web):** register an app and copy the `firebaseConfig` values into [`src/firebaseConfig.ts`](src/firebaseConfig.ts).

This repo is already set up with the `point-system-for-kids` project. If `src/firebaseConfig.ts` is ever emptied, the app falls back to this-device-only mode.

### Testing against the Firebase emulators

Start the Auth emulator on port 9099 and the Realtime Database emulator on port 9000 (project `demo-fpb`) with the rules above, then run `EXPO_PUBLIC_FIREBASE_EMULATOR=1 npx expo start`.

### Data on each device

Each device keeps a copy of its family's data with AsyncStorage, so the app opens instantly and works offline; changes made offline send when it reconnects. **Settings → Copy all data / Paste data** is a backup, and also imports data saved by the original web app.

## Code layout

| Path | What's in it |
| --- | --- |
| `App.tsx` | Header, tab bar, and switching into the kid view |
| `src/store.tsx` | Sign-in state, the current family, all data and the functions that change it |
| `src/cloud.ts` | Families, invite codes, members and the online data layout |
| `src/firebase.ts`, `src/firebaseConfig.ts` | Firebase setup and the project's web config |
| `src/screens/AccountScreens.tsx` | Sign up, sign in, password reset, start or join a family |
| `firebase-rules.json` | Database rules to paste into the Firebase console |
| `src/types.ts` | Data model, including calendar events |
| `src/utils.ts` | Balances, money, dates and repeat rules, the lock question |
| `src/screens/` | One file per tab, plus `KidBoard.tsx` for the kid view |
| `src/components/` | Shared buttons, inputs, sheets and the points sheet |

Calendar events are stored as `{ title, kidIds, date, start, end, repeat, until, place }`. An empty `kidIds` means the whole family. `repeat` is `none`, `daily`, `weekdays` or `weekly`, and dates are `YYYY-MM-DD` in local time.

Online, a family lives at `/families/<id>` (see the comment at the top of `src/cloud.ts`) with each list stored as an object keyed by id (`kids`, `activities`, `rewards`, `log`, `events`) plus `settings`. Each change writes only the item it touches, so two parents logging points at the same moment don't overwrite each other.

Check types with `npm run typecheck`.
