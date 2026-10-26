// Description:
//   Dominios .cl inscritos en nic.cl y consulta whois. Soporta Block Kit.
//
// Dependencies:
//   cheerio
//
// Configuration:
//   NIC_CACHE_TTL_MS - TTL del cache de listado en ms (default: 60000)
//
// Commands:
//   nic listado [1h|1d|1w|1m] - Dominios inscritos en el periodo (default: última hora)
//   nic info <dominio>        - Estado del dominio y datos del whois
//   nic ayuda                 - Muestra la ayuda
//
// Author:
//   @jorgeepunan

const { get } = require('./lib/http')
const { normalizarDominio, normalizarRango, urlUltimos, urlWhois, parseCsv, esCsvValido } = require('./lib/nic')
const { parseWhois } = require('./lib/whois')
const { formatearListado, formatearInfo, formatearAyuda, mensajeError } = require('./lib/slack')

const ERROR_NIC = 'No pude consultar NIC Chile. Intenta de nuevo en un momento.'

module.exports = function (robot) {
  const ttl = Number(process.env.NIC_CACHE_TTL_MS) >= 0 ? Number(process.env.NIC_CACHE_TTL_MS) : 60000
  const cache = new Map() // url -> { ts, body }

  async function obtener (url) {
    const ahora = Date.now()
    const guardado = cache.get(url)
    if (guardado && ahora - guardado.ts < ttl) return guardado.body

    const body = await get(url, { robot })
    if (ttl > 0) cache.set(url, { ts: ahora, body })
    return body
  }

  function responder (msg, payload) {
    // Los adapters que entienden Block Kit aceptan el objeto completo;
    // el resto solo necesita un string.
    if (payload && payload.attachments) return msg.send(payload)
    return msg.send(payload && payload.text ? payload.text : String(payload))
  }

  robot.respond(/nic\s+(?:listado|lista|list|dominios)(?:\s+(\S+))?$/i, async function (msg) {
    const rango = normalizarRango(msg.match[1])
    if (!rango) {
      return responder(msg, mensajeError(`Rango inválido: \`${msg.match[1]}\`. Usa 1h, 1d, 1w o 1m.`))
    }

    try {
      const body = await obtener(urlUltimos(rango))
      if (!esCsvValido(body)) {
        return responder(msg, mensajeError('NIC no devolvió el listado esperado (¿cambió el formato?).'))
      }
      return responder(msg, formatearListado(parseCsv(body), rango))
    } catch (err) {
      robot.logger && robot.logger.error(`[nic] listado: ${err.message}`)
      return responder(msg, mensajeError(ERROR_NIC))
    }
  })

  robot.respond(/nic\s+(?:info|whois|detalle)(?:\s+(.+))?$/i, async function (msg) {
    const entrada = (msg.match[1] || '').trim()
    if (!entrada) return responder(msg, formatearAyuda())

    const normalizado = normalizarDominio(entrada)
    if (!normalizado.ok) return responder(msg, mensajeError(normalizado.error))

    try {
      const html = await obtener(urlWhois(normalizado.dominio))
      return responder(msg, formatearInfo(parseWhois(html, normalizado.dominio)))
    } catch (err) {
      robot.logger && robot.logger.error(`[nic] info: ${err.message}`)
      return responder(msg, mensajeError(ERROR_NIC))
    }
  })

  robot.respond(/nic\s*(ayuda|help)?$/i, function (msg) {
    responder(msg, formatearAyuda())
  })
}

module.exports.formatearListado = formatearListado
module.exports.formatearInfo = formatearInfo
module.exports.parseCsv = parseCsv
module.exports.parseWhois = parseWhois
