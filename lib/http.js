'use strict'

// Cliente HTTP con timeout y un reintento. Usa el cliente de Hubot
// (así sigue funcionando con cualquier adapter) o fetch nativo.

const TIMEOUT_MS = 12000
const USER_AGENT = 'hubot-nic_chile (+https://github.com/juanbrujo/hubot-nic_chile)'

function getConRobot (robot, url) {
  return new Promise((resolve, reject) => {
    robot.http(url)
      .header('User-Agent', USER_AGENT)
      .header('Accept', 'text/csv,text/html;q=0.9,*/*;q=0.8')
      .timeout(TIMEOUT_MS)
      .get()(function (err, res, body) {
        if (err) return reject(err)
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`NIC respondió HTTP ${res.statusCode}`))
        }
        resolve(body)
      })
  })
}

async function getConFetch (url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/csv,text/html;q=0.9,*/*;q=0.8' },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  if (!res.ok) throw new Error(`NIC respondió HTTP ${res.status}`)
  return res.text()
}

/**
 * GET con un reintento. Prefiere robot.http (compatible con todos los adapters)
 * y cae a fetch nativo si no hay robot.
 */
async function get (url, { robot, intentos = 2 } = {}) {
  const puedeHttp = robot && typeof robot.http === 'function'
  let ultimoError
  for (let i = 0; i < intentos; i++) {
    try {
      return puedeHttp ? await getConRobot(robot, url) : await getConFetch(url)
    } catch (err) {
      ultimoError = err
      if (i < intentos - 1) await new Promise(r => setTimeout(r, 600))
    }
  }
  throw ultimoError
}

module.exports = { get, TIMEOUT_MS, USER_AGENT }
