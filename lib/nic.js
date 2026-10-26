'use strict'

// Helpers puros: sin red, sin Hubot. Todo lo que se pueda testear input→output vive acá.

const NIC_BASE = 'https://www.nic.cl/registry'

// Rangos aceptados por Ultimos.do
const RANGOS = {
  '1h': 'en la última hora',
  '1d': 'en las últimas 24 horas',
  '1w': 'en la última semana',
  '1m': 'en el último mes'
}

// Alias que la gente escribe en Slack
const ALIAS_RANGO = {
  '1h': '1h',
  hora: '1h',
  '1d': '1d',
  dia: '1d',
  día: '1d',
  '24h': '1d',
  ayer: '1d',
  '1w': '1w',
  semana: '1w',
  '1m': '1m',
  mes: '1m'
}

const DOMINIO_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+cl$/

/**
 * Normaliza y valida un dominio .cl.
 * Acepta "foo", "foo.cl", " foo.CL ".
 * @returns {{ok: true, dominio: string} | {ok: false, error: string}}
 */
function normalizarDominio (input) {
  const limpio = String(input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!limpio) return { ok: false, error: 'Falta el dominio. Ejemplo: `nic info linux.cl`' }

  const dominio = limpio.includes('.') ? limpio : `${limpio}.cl`
  if (!DOMINIO_RE.test(dominio)) {
    return { ok: false, error: `\`${limpio}\` no es un dominio .cl válido.` }
  }
  return { ok: true, dominio }
}

/**
 * Traduce lo que escribió el usuario a un rango válido de Ultimos.do.
 */
function normalizarRango (input) {
  if (!input) return '1h'
  return ALIAS_RANGO[String(input).trim().toLowerCase()] || null
}

function urlUltimos (rango) {
  return `${NIC_BASE}/Ultimos.do?t=${rango}&f=csv`
}

function urlWhois (dominio) {
  return `${NIC_BASE}/Whois.do?d=${encodeURIComponent(dominio)}`
}

/**
 * Parsea el CSV de Ultimos.do.
 * Formato: "Nombre Dominio,Fecha Inscripción\nfoo.cl,2026-10-26 18:40:23.0\n..."
 * @returns {Array<{dominio: string, fecha: string}>}
 */
function parseCsv (csv) {
  if (typeof csv !== 'string') return []

  return csv
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .slice(1) // sin cabecera
    .map(linea => linea.trim())
    .filter(Boolean)
    .map(linea => {
      const [dominio, fecha] = linea.split(',')
      return {
        dominio: (dominio || '').trim(),
        // NIC agrega milisegundos: "2026-10-26 18:40:23.0" -> "2026-10-26 18:40:23"
        fecha: (fecha || '').trim().replace(/\.\d+$/, '')
      }
    })
    .filter(d => d.dominio.endsWith('.cl'))
}

/**
 * ¿El CSV vino realmente vacío o nos devolvieron el HTML del sitio?
 * NIC responde HTML cuando el parámetro `t` falta o es inválido.
 */
function esCsvValido (body) {
  return typeof body === 'string' && /Nombre Dominio/.test(body.split(/\r?\n/)[0] || '')
}

/**
 * Formatea "2026-10-26 18:40:23.0" → "26-10-2026 18:40".
 */
function formatearFecha (fecha) {
  if (!fecha) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(fecha)
  if (!m) return fecha
  return `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}`
}

/**
 * Recorta la lista y devuelve cuántos quedaron fuera.
 */
function truncarLista (lista, max) {
  const visibles = lista.slice(0, max)
  return { visibles, resto: lista.length - visibles.length }
}

module.exports = {
  NIC_BASE,
  RANGOS,
  ALIAS_RANGO,
  normalizarDominio,
  normalizarRango,
  urlUltimos,
  urlWhois,
  parseCsv,
  esCsvValido,
  formatearFecha,
  truncarLista
}
