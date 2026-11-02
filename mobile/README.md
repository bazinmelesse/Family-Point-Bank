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

On the device, using AsyncStorage. Each phone or iPad keeps its own copy, the same as the web app outside Claude. To move data between devices, use **Settings → Copy all data** on one and paste it into **Settings → Paste data** on the other. Data saved by the web app (`fpb-data` in the browser's local storage) has the same shape, so it can be pasted in too.

Live syncing between parents' phones and the wall iPad needs a shared backend such as Firebase or Supabase. All writes go through `src/store.tsx`, so that's the one file to change.

## Code layout

| Path | What's in it |
| --- | --- |
| `App.tsx` | Header, tab bar, and switching into the kid view |
| `src/store.tsx` | All data and the functions that change it, saved with AsyncStorage |
| `src/types.ts` | Data model, including calendar events |
| `src/utils.ts` | Balances, money, dates and repeat rules, the lock question |
| `src/screens/` | One file per tab, plus `KidBoard.tsx` for the kid view |
| `src/components/` | Shared buttons, inputs, sheets and the points sheet |

Calendar events are stored as `{ title, kidIds, date, start, end, repeat, until, place }`. An empty `kidIds` means the whole family. `repeat` is `none`, `daily`, `weekdays` or `weekly`, and dates are `YYYY-MM-DD` in local time.

Check types with `npm run typecheck`.
