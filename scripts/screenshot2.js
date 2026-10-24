const puppeteer = require('puppeteer');
const path = require('path');

const BASE = 'http://localhost:8099';

async function shot(page, file, fn) {
  await fn();
  await page.screenshot({ path: file, type: 'png' });
  console.log('captured', path.basename(file));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const tmp = 'C:\\Users\\Lenovo\\Desktop\\TerraTrend\\docs\\screenshots';

  /* panel redesign */
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE + '/?spot=sea-level', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#launch-btn', { visible: true });
    await page.click('#launch-btn');
    await page.waitForFunction(() => document.body.classList.contains('app-armed'));
    await shot(page, tmp + '\\globe.png', async () => { await new Promise(r => setTimeout(r, 3500)); });
    await page.close();
  }

  /* sidebar pills */
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE + '/?spot=wildfire', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#launch-btn', { visible: true });
    await page.click('#launch-btn');
    await page.waitForFunction(() => document.body.classList.contains('app-armed'));
    await new Promise(r => setTimeout(r, 3000));
    /* crop just the sidebar */
    const sidebar = await page.$('.var-sidebar');
    await sidebar.screenshot({ path: tmp + '\\sidebar-check.png' });
    console.log('captured sidebar-check.png');
    await page.close();
  }

  /* method modal */
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#launch-btn', { visible: true });
    await page.click('#launch-btn');
    await page.waitForFunction(() => document.body.classList.contains('app-armed'));
    await new Promise(r => setTimeout(r, 1000));
    await page.click('#rail-method');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: tmp + '\\method-check.png' });
    console.log('captured method-check.png');
    await page.close();
  }

  /* about modal */
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#launch-btn', { visible: true });
    await page.click('#launch-btn');
    await page.waitForFunction(() => document.body.classList.contains('app-armed'));
    await new Promise(r => setTimeout(r, 1000));
    await page.click('#rail-about');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: tmp + '\\about-check.png' });
    console.log('captured about-check.png');
    await page.close();
  }

  await browser.close();
  console.log('done');
})();
