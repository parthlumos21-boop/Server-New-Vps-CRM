const puppeteer = require('puppeteer-core');
(async () => {
  try {
    const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:3000');
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'keval@swatiswitchgears.com');
    await page.type('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Logged in successfully');
    
    await page.goto('http://127.0.0.1:3000/admin/integrations/whatsapp');
    
    await new Promise(r => setTimeout(r, 5000));
    
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Page Text:', text.includes('INITIALIZING') || text.includes('QR_READY') || text.includes('DISCONNECTED') ? 'Found status' : 'No status');
    console.log(text.substring(0, 500)); 

    await page.screenshot({ path: 'whatsapp_qr_test.png' });
    console.log('Screenshot saved to whatsapp_qr_test.png');
    
    await browser.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
