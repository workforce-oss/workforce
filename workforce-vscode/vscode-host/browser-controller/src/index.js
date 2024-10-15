const puppeteer = require('puppeteer');

(async () => {
    // get args from command line
    const args = process.argv.slice(2);
    console.log(args);
    let serverBasePath = '';
    // if "--server-base-path" is provided, set the server base path
    if (args[0] === '--server-base-path') {
        serverBasePath = args[1];
    }
    const browser = await puppeteer.launch({args: ['--no-sandbox']});
    const page = await browser.newPage();

    await page.goto('http://localhost:3000' + serverBasePath);

    await page.setViewport({ width: 1080, height: 1024 });

    // //wait for an anchor with the text Yes inside of a div with class dialog-buttons
    // try {
    // const div = await page.waitForSelector("//div[@class='dialog-buttons']/a[contains(text(), 'Yes')]", {timeout: 30000});
    // const anchor = await page.waitForSelector("::-p-text('Yes')", {timeout: 30000});

    // // //click the anchor

    // await anchor.click();
    // } catch (error) {
    //     console.log('Timeout Error: no workspace trust dialog button found in 30 seconds');
    // }
    // wait for 10 seconds
    try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    } catch (error) {
        console.log('Timeout Error: Networkidle2 not reached in 60 seconds');
    }

    console.log('Page loaded');

    // while (true) {
    //     const a = await page.waitForSelector("::-p-text('Yes')", {time});
    //     await a.click();
    // }
    
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await wait(1000*60*60) // wait for an hour
})();