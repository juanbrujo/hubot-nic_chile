'use strict'

// Parseo del HTML de Whois.do. El HTML de NIC trae 17KB de navegación,
// así que cheerio sigue siendo la opción más segura para extraer los campos.

const cheerio = require('cheerio')
const { formatearFecha } = require('./nic')

const CAMPOS = {
  'titular:': 'titular',
  'agente registrador:': 'registrador',
  'fecha de creación:': 'creacion',
  'fecha de última modificación:': 'modificacion',
  'fecha de expiración:': 'expiracion',
  'servidor de nombre:': 'nameserver',
  'sitio web:': 'sitio'
}

const NO_EXISTE = /nombre de dominio no existe/i

function limpiar (texto) {
  return String(texto || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parsea la página de whois de NIC Chile.
 * @param {string} html
 * @param {string} dominio
 * @returns {{disponible: true, dominio: string}
 *         | {disponible: false, dominio: string, titular: string|null, ...}
 *         | {error: string}}
 */
function parseWhois (html, dominio) {
  if (typeof html !== 'string' || !html.trim()) {
    return { error: 'NIC devolvió una respuesta vacía.' }
  }

  const $ = cheerio.load(html)
  const texto = limpiar($('body').text())

  if (NO_EXISTE.test(texto)) {
    return { disponible: true, dominio }
  }

  // Los campos vienen como <b>Etiqueta:</b> valor, a veces el valor está en el
  // mismo contenedor y a veces en el siguiente nodo. Recorremos el body plano.
  const resultado = { disponible: false, dominio, nameservers: [] }
  const crudo = $('body')
    .find('*')
    .contents()
    .filter(function () { return this.type === 'text' })
    .map(function () { return limpiar($(this).text()) })
    .get()
    .filter(Boolean)

  for (let i = 0; i < crudo.length; i++) {
    const etiqueta = crudo[i].toLowerCase()
    const campo = CAMPOS[etiqueta]
    if (!campo) continue

    const valor = crudo[i + 1] || null
    if (!valor) continue

    if (campo === 'nameserver') {
      if (!resultado.nameservers.includes(valor)) resultado.nameservers.push(valor)
      continue
    }
    if (!resultado[campo]) resultado[campo] = valor
  }

  for (const campo of ['creacion', 'modificacion', 'expiracion']) {
    if (resultado[campo]) resultado[campo] = formatearFecha(resultado[campo]) || resultado[campo]
  }

  // Sin titular ni agente registrador no es una ficha válida: probablemente
  // NIC cambió el HTML o devolvió una página de error.
  if (!resultado.titular && !resultado.registrador) {
    return { error: 'No pude interpretar la respuesta de NIC (¿cambió el HTML del whois?).' }
  }

  return resultado
}

module.exports = { parseWhois, CAMPOS }
