# Family Point Bank (React Native + Expo)

The phone and tablet version of Family Point Bank, built with React Native and Expo. It does everything the web app in the folder above does, plus two new things:

- **Kid view shows every kid at once.** All kids sit side by side on one screen, each with their points (stars for kids 6 and under), the money it's worth, their saving goal, and today's and upcoming calendar items. Whole-family items show along the bottom. It's sized for an iPad on the wall in either orientation, keeps the screen awake, and updates the clock and "today" on its own. Leaving it takes the grown-up question from Settings.
- **Calendar tab.** A month view with a colored dot per kid on each day. Add activities like practices, lessons, school or appointments for one kid, several kids, or the whole family. Each one can happen once, every day, on weekdays or every week, with an optional last day, times and place. Tap one to change or delete it.

Everything else carries over: kids with ages and colors, + Points / − Points from age-matched lists or a custom amount, cash in for rewards or money, saving goals, the earn & lose list, rewards, history with undo, points-per-dollar and the kid view lock.

## Running it

You need Node.js 20 or newer and the **Expo Go** app on your phone or iPad.

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the camera (iPhone/iPad) or Expo Go (Android). Press `w` to open it in a browser instead.

To install it as a real app on the iPad without Expo Go, build it with EAS: `npx eas-cli@latest build --profile preview --platform ios` (needs a free Expo account; installing on an iPad also needs an Apple Developer account).

## Where data is saved

Each device saves its own copy with AsyncStorage, so the app works offline and opens instantly. Turn on **sync** to share one copy between both parents' phones and the iPad: points, kids, rewards, calendar and settings show up on every device within a second or two.

### Turning on sync (about 10 minutes, free)

Sync uses a Firebase Realtime Database. The free Spark plan is far more than a family needs.

1. Go to <https://console.firebase.google.com>, sign in with a Google account, and click **Create a project**. Any name works, for example `family-points`. You can turn Google Analytics off.
2. In the left menu open **Build → Realtime Database** and click **Create Database**. Pick the location closest to you, choose **Start in locked mode**, and click **Enable**.
3. Open the **Rules** tab, replace everything there with the contents of [`firebase-rules.json`](firebase-rules.json), and click **Publish**.
4. On the **Data** tab, copy the database address at the top. It looks like `https://family-points-default-rtdb.firebaseio.com`.
5. In the app on your phone, open **Settings → Sync between devices**, paste the address, and tap **Start a new family**. This uploads the kids and points already on that phone and shows a **family code**.
6. On every other phone or iPad, open **Settings**, paste the same address, type the family code, and tap **Join**. Tap **Share code** on the first phone to send it.

**About the family code.** The rules only let someone read or change your family's data if they know the 29-character code, and they can't list other families. Anyone who has the code can see and change your points, so keep it within the family. To start over with a new code, tap **Turn off sync on this device** on every device, then **Start a new family** again.

**Old iPad board.** `display.html` (the web board for older iPads) can show the synced points too. The app's Settings shows the address to use, in the form `display.html?src=https://<your-database>/families/<family-code>.json`.

### Without sync

Use **Settings → Copy all data** on one device and paste it into **Settings → Paste data** on another. Data saved by the web app (`fpb-data` in the browser's local storage) has the same shape, so it can be pasted in too.

## Code layout

| Path | What's in it |
| --- | --- |
| `App.tsx` | Header, tab bar, and switching into the kid view |
| `src/store.tsx` | All data and the functions that change it, saved with AsyncStorage and sent to Firebase when sync is on |
| `src/sync.ts` | Firebase Realtime Database connection, family codes, and the online data layout |
| `firebase-rules.json` | Database rules to paste into the Firebase console |
| `src/types.ts` | Data model, including calendar events |
| `src/utils.ts` | Balances, money, dates and repeat rules, the lock question |
| `src/screens/` | One file per tab, plus `KidBoard.tsx` for the kid view |
| `src/components/` | Shared buttons, inputs, sheets and the points sheet |

Calendar events are stored as `{ title, kidIds, date, start, end, repeat, until, place }`. An empty `kidIds` means the whole family. `repeat` is `none`, `daily`, `weekdays` or `weekly`, and dates are `YYYY-MM-DD` in local time.

Online, a family lives at `/families/<code>` with each list stored as an object keyed by id (`kids`, `activities`, `rewards`, `log`, `events`) plus `settings`. Each change writes only the item it touches, so two parents logging points at the same moment don't overwrite each other.

Check types with `npm run typecheck`.
