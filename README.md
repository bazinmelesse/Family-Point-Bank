# Family Point Bank

A points and rewards app for kids aged 2 to 16. Parents add or take away points for chores, school and behavior, and kids cash points in for rewards (screen time, outings, a day with Mom or Dad) or for money.

## Features

- **Kids:** add as many as you like, each with an age and a color. Each card shows the balance, its dollar value, and progress toward a saving goal.
- **+ Points / − Points:** pick from a list of chores and behaviors, or enter a custom amount and reason. Choices that suit the kid's age show first.
- **Cash in:** spend points on a reward or cash out money at a set rate (10 points = $1 by default, changeable in Settings).
- **History:** every change, newest first, with undo.
- **Kid view:** a big, read-only screen for kids. Leaving it takes a grown-up question, set in Settings: math from easy to very hard, or your own question and answer.

## Running it

It is a single file, `index.html`, with no build step and no dependencies. Fonts load from Google Fonts.

- **On your computer:** open `index.html` in a browser.
- **On the web:** turn on GitHub Pages for this repo (Settings → Pages → deploy from the `main` branch, root folder). The app will be at `https://<your-username>.github.io/<repo-name>/`.
- **Kid view on a kid's device:** add `#kidview` to the end of the address.

## Where data is saved

There are two ways the same page saves data:

| Where it runs | How data is saved | Syncs between parents? |
| --- | --- | --- |
| Inside Claude (the shared Artifact) | Claude's shared artifact database | Yes, live |
| Anywhere else (this repo, GitHub Pages) | The browser's local storage on that device | No |

Outside Claude, each phone or browser keeps its own copy. Clearing browser data erases it.

To sync between parents outside Claude, the app needs a backend such as Firebase or Supabase. The storage code is in four small functions (`addDoc`, `delDoc`, `updDoc` and `saveSettings`) plus the subscriptions in `start()`, so the backend can be swapped in there.

## Wall display for an old iPad

`display.html` is a full-screen board that shows each kid's total points in very large numbers, readable from across a room. It is written in plain CSS and old-style JavaScript so it runs on iPads as old as iOS 9.

- Open `display.html` in Safari on the iPad (for example `https://<your-username>.github.io/<repo-name>/display.html`).
- Tap Share → **Add to Home Screen**. Opening it from the home screen icon runs it full screen with no browser bars.
- Set **Settings → Display & Brightness → Auto-Lock → Never** on the iPad and keep it plugged in. Web pages can't stop an old iPad from sleeping on their own.
- It refreshes itself every few seconds and fits 1 to 6+ kids in either orientation.

**Where the display gets its numbers.** By default it reads the points saved on the same device, in the same browser. Points added on a phone won't show on the iPad, because each device keeps its own copy (see "Where data is saved"). Also, iOS gives a home screen app its own storage, separate from Safari.

To show points added on another device, the display can read a shared online copy instead: add `?src=<url>` to the address, where the URL returns JSON in the same shape the app saves (`kids` and `log`). A free Firebase Realtime Database works for this, since its data can be read at `https://<project>.firebaseio.com/<path>.json`. In that mode it checks every 30 seconds. The main app would need to write to the same place, which it doesn't do yet.

## Files

- `index.html`: the whole app.
- `display.html`: the full-screen points board for a wall iPad.
- `icon-180.png`: the home screen icon for the board.
- `data/starter-data.json`: the starter chores, behaviors and rewards the app begins with. It's for reference only, since the same lists are built into `index.html`.

## Data model

| Collection | Fields |
| --- | --- |
| `kids` | `name`, `age` (2–16), `color`, `goalId`, `createdAt` |
| `activities` | `label`, `points`, `type` (`earn` or `lose`), `minAge`, `maxAge` |
| `rewards` | `label`, `cost`, `category` (`screen`, `privilege`, `outing`, `time`) |
| `log` | `kidId`, `label`, `points` (negative for losses and cash-ins), `kind` (`earn`, `lose`, `redeem`), `at`, `by` |
| `settings/main` | `pointsPerDollar` |

A kid's balance is the sum of their `log` entries.
