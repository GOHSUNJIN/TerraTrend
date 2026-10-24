const puppeteer = require('puppeteer');
const path = require('path');

const BASE = 'http://localhost:8099';
const OUT  = path.join(__dirname, '..', 'docs', 'screenshots');

async function shot(page, file, fn) {
  await fn(page);
  await page.screenshot({ path: path.join(OUT, file), type: 'png' });
  console.log('captured', file);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  /* ── 1. Splash screen ─────────────────────────────────────────────── */
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#splash', { visible: true });
    await shot(page, 'splash.png', async () => {
      await new Promise(r => setTimeout(r, 800));
    });
    await page.close();
  }

  /* ── 2. Globe – co2 hotspot open ──────────────────────────────────── */
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE + '/?spot=co2', { waitUntil: 'networkidle2', timeout: 20000 });
    // dismiss splash
    await page.waitForSelector('#launch-btn', { visible: true });
    await page.click('#launch-btn');
    // wait for splash to be dismissed (body gets app-armed class)
    await page.waitForFunction(() => document.body.classList.contains('app-armed'));
    await new Promise(r => setTimeout(r, 3500));
    await shot(page, 'globe.png', async () => {
      await new Promise(r => setTimeout(r, 500));
    });
    await page.close();
  }

  /* ── 3. Case files / sidebar ──────────────────────────────────────── */
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE + '/?spot=temperature', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#launch-btn', { visible: true });
    await page.click('#launch-btn');
    await page.waitForFunction(() => document.body.classList.contains('app-armed'));
    await new Promise(r => setTimeout(r, 3500));
    await shot(page, 'case-files.png', async () => {
      await new Promise(r => setTimeout(r, 500));
    });
    await page.close();
  }

  /* ── 4. Mobile viewport ───────────────────────────────────────────── */
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await page.goto(BASE + '/?spot=arctic-ice', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#launch-btn', { visible: true });
    await page.click('#launch-btn');
    await page.waitForFunction(() => document.body.classList.contains('app-armed'));
    await new Promise(r => setTimeout(r, 3500));
    await shot(page, 'mobile-globe.png', async () => {
      await new Promise(r => setTimeout(r, 500));
    });
    await page.close();
  }

  await browser.close();
  console.log('done');
})();
