const puppeteer = require('puppeteer')
const fs = require('fs').promises
const Jimp = require('jimp')
const pixelmatch = require('pixelmatch')
const { cv } = require('opencv-wasm')
const cloudscraper = require('cloudscraper')

async function findPuzzlePosition (page) {
    let images = await page.$$eval('.geetest_canvas_img canvas', canvases => canvases.map(canvas => canvas.toDataURL().replace(/^data:image\/png;base64,/, '')))

    await fs.writeFile(`./puzzle.png`, images[1], 'base64')

    let srcPuzzleImage = await Jimp.read('./puzzle.png')
    let srcPuzzle = cv.matFromImageData(srcPuzzleImage.bitmap)
    let dstPuzzle = new cv.Mat()

    cv.cvtColor(srcPuzzle, srcPuzzle, cv.COLOR_BGR2GRAY)
    cv.threshold(srcPuzzle, dstPuzzle, 127, 255, cv.THRESH_BINARY)

    let kernel = cv.Mat.ones(5, 5, cv.CV_8UC1)
    let anchor = new cv.Point(-1, -1)
    cv.dilate(dstPuzzle, dstPuzzle, kernel, anchor, 1)
    cv.erode(dstPuzzle, dstPuzzle, kernel, anchor, 1)

    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(dstPuzzle, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let contour = contours.get(0)
    let moment = cv.moments(contour)

    return [Math.floor(moment.m10 / moment.m00), Math.floor(moment.m01 / moment.m00)]
}

async function findDiffPosition (page) {
    await page.waitFor(100)

    let srcImage = await Jimp.read('./diff.png')
    let src = cv.matFromImageData(srcImage.bitmap)

    let dst = new cv.Mat()
    let kernel = cv.Mat.ones(5, 5, cv.CV_8UC1)
    let anchor = new cv.Point(-1, -1)

    cv.threshold(src, dst, 127, 255, cv.THRESH_BINARY)
    cv.erode(dst, dst, kernel, anchor, 1)
    cv.dilate(dst, dst, kernel, anchor, 1)
    cv.erode(dst, dst, kernel, anchor, 1)
    cv.dilate(dst, dst, kernel, anchor, 1)

    cv.cvtColor(dst, dst, cv.COLOR_BGR2GRAY)
    cv.threshold(dst, dst, 150, 255, cv.THRESH_BINARY_INV)

    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let contour = contours.get(0)
    let moment = cv.moments(contour)

    return [Math.floor(moment.m10 / moment.m00), Math.floor(moment.m01 / moment.m00)]
}

async function saveSliderCaptchaImages(page) {
    await page.waitForSelector('.tab-item.tab-item-1')
    await page.click('.tab-item.tab-item-1')

    await page.waitForSelector('[aria-label="Click to verify"]')
    await page.waitFor(1000)

    await page.click('[aria-label="Click to verify"]')

    await page.waitForSelector('.geetest_canvas_img canvas', { visible: true })
    await page.waitFor(1000)
    let images = await page.$$eval('.geetest_canvas_img canvas', canvases => {
        return canvases.map(canvas => canvas.toDataURL().replace(/^data:image\/png;base64,/, ''))
    })

    await fs.writeFile(`./captcha.png`, images[0], 'base64')
    await fs.writeFile(`./original.png`, images[2], 'base64')
}

async function saveDiffImage() {
    const originalImage = await Jimp.read('./original.png')
    const captchaImage = await Jimp.read('./captcha.png')

    const { width, height } = originalImage.bitmap
    const diffImage = new Jimp(width, height)

    const diffOptions = { includeAA: true, threshold: 0.2 }

    pixelmatch(originalImage.bitmap.data, captchaImage.bitmap.data, diffImage.bitmap.data, width, height, diffOptions)
    diffImage.write('./diff.png')
}
async function login(url, auth, buttonSelector, timeout){
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const res = cloudscraper.get(url);
    if(typeof res !== 'object') throw new Error('Cloudscraper is not object')
    const headers = {...res.headers}
    delete headers.Host
    await page.setExtraHTTPHeaders(headers);
    if(res.response?.headers.setCookie){
        console.log('cc');
        const cookies = res.headers.cookie.split('; ').map(cookie => {
            const [name, value] = cookie.split('=');
            return { name, value };
        });
        await page.setCookie(...cookies);
    }
    await page.goto(url,{ waitUntil: 'networkidle0', timeout: 60000 });
    await page.setViewport({width: 1080, height: 1024})
    for (let index = 0; index < auth.length; index++) {
        const element = auth[index];
        await page.waitForSelector(element.selector);
        await page.evaluate(({value, selector}) => {
            const input = document.querySelector(selector);
            input.value = value;
        }, element);
        
    }
    const button = await page.waitForSelector(buttonSelector)
    await button.click()
}
(async function() {
    const auth = [
        {
            selector: '#email',
            value: 'asfasad@asda.com'
        },
        {
            selector: '#password',
            value: 'saasdasasd'
        }
    ]
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const res = cloudscraper.get('https://app.stormgain.com/#modal_login');
    if(typeof res !== 'object') throw new Error('Cloudscraper is not object')
    const headers = {...res.headers}
    delete headers.Host
    await page.setExtraHTTPHeaders(headers);
    if(res.response?.headers.setCookie){
        console.log('cc');
        const cookies = res.headers.cookie.split('; ').map(cookie => {
            const [name, value] = cookie.split('=');
            return { name, value };
        });
        await page.setCookie(...cookies);
    }
    await page.goto('https://app.stormgain.com/#modal_login',{ waitUntil: 'networkidle0', timeout: 60000 });
    await page.setViewport({width: 1080, height: 1024})
    for (let index = 0; index < auth.length; index++) {
        const element = auth[index];
        await page.waitForSelector(element.selector);
        await page.evaluate(({value, selector}) => {
            const input = document.querySelector(selector);
            input.value = value;
        }, element);
        
    }
    const button = await page.waitForSelector('.controls input')
    await button.click()
  
    await page.waitForSelector('.geetest_canvas_img canvas', { visible: true })
    let images = await page.$$eval('.geetest_canvas_img canvas', canvases => {
        return canvases.map(canvas => canvas.toDataURL().replace(/^data:image\/png;base64,/, ''))
    })
  
    await fs.writeFile(`./captcha.png`, images[0], 'base64')
    await fs.writeFile(`./original.png`, images[2], 'base64')
  
    const originalImage = await Jimp.read('./original.png')
    const captchaImage = await Jimp.read('./captcha.png')
  
    const { width, height } = originalImage.bitmap
    const diffImage = new Jimp(width, height)
  
    const diffOptions = { includeAA: true, threshold: 0.2 }
  
    pixelmatch(originalImage.bitmap.data, captchaImage.bitmap.data, diffImage.bitmap.data, width, height, diffOptions)
    diffImage.write('./diff.png')
    
    await page.waitFor(100)
  
    let srcImage = await Jimp.read('./diff.png')
    let src = cv.matFromImageData(srcImage.bitmap)
  
    let dst = new cv.Mat()
    let kernel = cv.Mat.ones(5, 5, cv.CV_8UC1)
    let anchor = new cv.Point(-1, -1)
  
    cv.threshold(src, dst, 127, 255, cv.THRESH_BINARY)
    cv.erode(dst, dst, kernel, anchor, 1)
    cv.dilate(dst, dst, kernel, anchor, 1)
    cv.erode(dst, dst, kernel, anchor, 1)
    cv.dilate(dst, dst, kernel, anchor, 1)
  
    cv.cvtColor(dst, dst, cv.COLOR_BGR2GRAY)
    cv.threshold(dst, dst, 150, 255, cv.THRESH_BINARY_INV)
  
    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
  
    let contour = contours.get(0)
    let moment = cv.moments(contour)
  
    const [cx, cy] =  [Math.floor(moment.m10 / moment.m00), Math.floor(moment.m01 / moment.m00)]
  
    const sliderHandle = await page.$('.geetest_slider_button')
    const handle = await sliderHandle.boundingBox()
  
    let xPosition = handle.x + handle.width / 2
    let yPosition = handle.y + handle.height / 2
    await page.mouse.move(xPosition, yPosition)
    await page.mouse.down()
  
    xPosition = handle.x + cx - handle.width / 2
    yPosition = handle.y + handle.height / 3
    await page.mouse.move(xPosition, yPosition, { steps: 25 })
  
    await page.waitFor(100)
  
    let [cxPuzzle, cyPuzzle] = await findPuzzlePosition(page)
  
    xPosition = xPosition + cx - cxPuzzle
    yPosition = handle.y + handle.height / 2
    await page.mouse.move(xPosition, yPosition, { steps: 5 })
    await page.mouse.up()
  
    await page.waitFor(3000)
    console.log('success krasava');
    await browser.close()
})();