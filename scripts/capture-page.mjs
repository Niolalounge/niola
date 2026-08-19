import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const [url, widthValue, heightValue, outputValue, languageValue] = process.argv.slice(2)
const width = Number(widthValue)
const height = Number(heightValue)

if (!url || !width || !height || !outputValue) {
  throw new Error('Usage: node scripts/capture-page.mjs <url> <width> <height> <output>')
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const port = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'niola-capture-'))
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-software-rasterizer',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

async function getTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
      const target = targets.find((item) => item.type === 'page')
      if (target) return target
    } catch {
      // Chrome is still starting.
    }
    await delay(100)
  }
  throw new Error('Chrome DevTools did not become available.')
}

let sequence = 0
const pending = new Map()
const eventWaiters = new Map()

function waitForEvent(name, timeout = 12000) {
  return new Promise((resolveEvent, rejectEvent) => {
    const timer = setTimeout(() => rejectEvent(new Error(`Timed out waiting for ${name}`)), timeout)
    eventWaiters.set(name, (params) => {
      clearTimeout(timer)
      resolveEvent(params)
    })
  })
}

try {
  const target = await getTarget()
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolveSocket, rejectSocket) => {
    socket.addEventListener('open', resolveSocket, { once: true })
    socket.addEventListener('error', rejectSocket, { once: true })
  })

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolveCommand, rejectCommand } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) rejectCommand(new Error(message.error.message))
      else resolveCommand(message.result)
      return
    }
    const resolveEvent = eventWaiters.get(message.method)
    if (resolveEvent) {
      eventWaiters.delete(message.method)
      resolveEvent(message.params)
    }
  })

  const send = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
    sequence += 1
    pending.set(sequence, { resolveCommand, rejectCommand })
    socket.send(JSON.stringify({ id: sequence, method, params }))
  })

  await send('Page.enable')
  await send('Runtime.enable')
  if (languageValue && languageValue !== 'toggle') {
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try { localStorage.setItem('niola-language', ${JSON.stringify(languageValue)}) } catch {}`,
    })
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 600,
    screenWidth: width,
    screenHeight: height,
  })

  const loaded = waitForEvent('Page.loadEventFired')
  await send('Page.navigate', { url })
  await loaded
  await send('Runtime.evaluate', {
    expression: 'document.fonts.ready',
    awaitPromise: true,
    returnByValue: true,
  })
  await delay(1800)
  if (languageValue === 'toggle') {
    await send('Runtime.evaluate', {
      expression: "document.querySelector('.language-switcher')?.click()",
    })
    await delay(250)
  }

  const audit = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      viewport: [innerWidth, innerHeight],
      url: location.href,
      scrollY,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      direction: document.documentElement.dir,
      language: document.documentElement.lang,
      heroLines: [...document.querySelectorAll('.hero-scene h1 span')].map((node) => {
        const rect = node.getBoundingClientRect();
        return { text: node.textContent, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
      logo: (() => {
        const node = document.querySelector('.site-nav__logo');
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      })(),
      requestedAnchor: (() => {
        const node = document.getElementById(location.hash.slice(1));
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return { offsetTop: node.offsetTop, top: rect.top, height: rect.height };
      })(),
    })`,
    returnByValue: true,
  })

  const screenshot = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  })
  writeFileSync(resolve(outputValue), Buffer.from(screenshot.data, 'base64'))
  console.log(audit.result.value)
  socket.close()
} finally {
  chrome.kill()
  await delay(150)
  rmSync(profile, { recursive: true, force: true })
}
