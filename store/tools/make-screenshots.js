// Makes the store screenshots from the web build, filled with a sample family.
// From mobile/:  npx expo export --platform web --output-dir dist
//                node ../store/tools/make-screenshots.js ../store/screenshots "$(node -e '...STARTER as JSON...')" dist
// Needs Playwright. The sample kids, points and calendar are set up below.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.argv[4] || 'dist', out = process.argv[2];
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  const ext = path.extname(f);
  r.setHeader('Content-Type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf' }[ext] || 'application/octet-stream');
  fs.createReadStream(f).pipe(r);
}).listen(8099);
const STARTER = JSON.parse(process.argv[3]);
const now = Date.now(), day = 864e5;
const d = (off) => { const x = new Date(now + off * day); return x.toISOString().slice(0, 10); };
const kids = [
  { id: 'kM', name: 'Maya', age: 11, color: 'k2', goalId: 'r07', createdAt: now - 30 * day },
  { id: 'kL', name: 'Leo', age: 8, color: 'k1', goalId: 'r07', createdAt: now - 30 * day },
  { id: 'kA', name: 'Ada', age: 5, color: 'k3', goalId: 'r06', createdAt: now - 30 * day },
];
const log = []; let n = 0;
const add = (kidId, label, points, kind, hoursAgo) => log.push({ id: 'g' + n++, kidId, label, points, kind, at: now - hoursAgo * 36e5 });
for (let i = 0; i < 7; i++) {
  add('kM', 'Finish homework', 10, 'earn', 24 * i + 5); add('kM', 'Empty the dishwasher', 10, 'earn', 24 * i + 3);
  add('kL', 'Read for 20 minutes', 10, 'earn', 24 * i + 4); if (i % 2) add('kL', 'Make bed', 5, 'earn', 24 * i + 10);
  add('kA', 'Put toys away', 5, 'earn', 24 * i + 6); if (i % 3 === 0) add('kA', 'Brush teeth without a reminder', 3, 'earn', 24 * i + 12);
}
add('kL', 'Not listening after two reminders', -5, 'lose', 2); add('kM', '30 min extra screen time', -20, 'redeem', 1);
add('kA', 'Kind act or helping a sibling', 5, 'earn', 0.5); add('kM', 'Ice cream outing', -40, 'redeem', 30);
const events = [
  { id: 'v1', title: 'Soccer practice', kidIds: ['kM'], date: d(-20), start: '16:30', end: '18:00', repeat: 'weekly', place: 'Riverside Park', createdAt: now },
  { id: 'v2', title: 'Piano lesson', kidIds: ['kL'], date: d(-19), start: '15:45', end: '16:15', repeat: 'weekly', createdAt: now },
  { id: 'v3', title: 'Swim class', kidIds: ['kA', 'kL'], date: d(-17), start: '10:00', end: '10:45', repeat: 'weekly', place: 'Community pool', createdAt: now },
  { id: 'v4', title: 'Family movie night', kidIds: [], date: d(-18), start: '19:00', repeat: 'weekly', createdAt: now },
  { id: 'v5', title: 'School', kidIds: ['kM', 'kL', 'kA'], date: d(-30), start: '08:15', end: '15:00', repeat: 'weekdays', createdAt: now },
  { id: 'v6', title: 'Dentist', kidIds: ['kA'], date: d(2), start: '09:30', place: 'Dr. Lee', repeat: 'none', createdAt: now },
];
const data = { ...STARTER, kids, log, events };
const shots = [
  // name, viewport, scale, tab, kidMode, scheme
  ['kids', 'kids', false, 'light'], ['calendar', 'calendar', false, 'light'], ['rewards', 'rewards', false, 'light'],
  ['history', 'history', false, 'light'], ['kidview', 'kids', true, 'dark'],
];
const devices = {
  'iphone-6.9': { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 },
  'ipad-13': { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2 },
  'android-phone': { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 },
  'android-tablet': { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 },
};
(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of Object.entries(devices)) {
    fs.mkdirSync(`${out}/${dev}`, { recursive: true });
    let i = 1;
    for (const [name, tab, kidMode, scheme] of shots) {
      const ctx = await b.newContext({ ...opts, colorScheme: scheme });
      await ctx.addInitScript(([data, prefs]) => { localStorage.setItem('fpb-data', data); localStorage.setItem('fpb-prefs', prefs); },
        [JSON.stringify(data), JSON.stringify({ localOnly: true, kidMode, tab })]);
      const p = await ctx.newPage();
      await p.goto('http://localhost:8099/');
      await p.waitForTimeout(2500);
      await p.screenshot({ path: `${out}/${dev}/${i++}-${name}.png` });
      await ctx.close();
    }
  }
  await b.close(); srv.close();
})();
