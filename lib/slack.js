'use strict'

// Construcción de mensajes. Devuelve estructuras de Slack Block Kit
// (attachments), con fallback a mrkdwn plano para adapters que no las soportan.

const { RANGOS } = require('./nic')

const MAX_DOMINIOS = 15

function plural (n, singular, plural_) {
  return `${n} ${n === 1 ? singular : plural_}`
}

/**
 * Mensaje de error uniforme.
 */
function mensajeError (texto) {
  return { text: `:warning: ${texto}` }
}

/**
 * Listado de dominios recién inscritos.
 * @param {Array<{dominio:string, fecha:string}>} dominios
 * @param {string} rango clave de RANGOS
 * @param {number} max
 */
function formatearListado (dominios, rango, max = MAX_DOMINIOS) {
  const periodo = RANGOS[rango] || RANGOS['1h']

  if (!dominios || dominios.length === 0) {
    return { text: `Sin dominios inscritos ${periodo}.` }
  }

  const total = dominios.length
  const visibles = dominios.slice(0, max)
  const resto = total - visibles.length

  const fallbackText = `*${plural(total, 'dominio inscrito', 'dominios inscritos')} ${periodo}:* ` +
    visibles.map(d => d.dominio).join(', ') +
    (resto > 0 ? ` _(y ${resto} más)_` : '')

  return {
    text: fallbackText,
    attachments: [
      {
        color: '#1f7a4d',
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `NIC Chile · dominios ${periodo}`, emoji: true }
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `*${plural(total, 'dominio inscrito', 'dominios inscritos')}* · mostrando ${visibles.length}` }
            ]
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: visibles.map(d => `• \`${d.dominio}\``).join('\n') }
          },
          ...(resto > 0
            ? [{
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `_y ${resto} más. Usa \`nic info <dominio>\` para revisar uno._` }]
            }]
            : []),
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: 'Fuente: nic.cl/registry/Ultimos.do' }]
          }
        ]
      }
    ]
  }
}

/**
 * Ficha de un dominio consultado vía whois.
 * @param {object} data resultado de parseWhois
 */
function formatearInfo (data) {
  if (!data) return mensajeError('No pude consultar el dominio.')

  if (data.error) return mensajeError(data.error)

  if (data.disponible) {
    const url = 'https://www.nic.cl/registry/Inscripcion.do'
    return {
      text: `:white_check_mark: \`${data.dominio}\` está disponible.`,
      attachments: [
        {
          color: '#2eb67d',
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `:white_check_mark: *\`${data.dominio}\` está disponible*` }
            },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: 'No registrado en NIC Chile. Puedes inscribirlo.' }]
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Inscribir en NIC', emoji: true },
                  url,
                  style: 'primary'
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Ver whois', emoji: true },
                  url: `https://www.nic.cl/registry/Whois.do?d=${encodeURIComponent(data.dominio)}`
                }
              ]
            }
          ]
        }
      ]
    }
  }

  const fields = []
  if (data.titular) fields.push({ type: 'mrkdwn', text: `*Titular*\n${data.titular}` })
  if (data.registrador) fields.push({ type: 'mrkdwn', text: `*Agente registrador*\n${data.registrador}` })
  if (data.creacion) fields.push({ type: 'mrkdwn', text: `*Creación*\n${data.creacion}` })
  if (data.expiracion) fields.push({ type: 'mrkdwn', text: `*Expiración*\n${data.expiracion}` })
  if (data.modificacion) fields.push({ type: 'mrkdwn', text: `*Última modificación*\n${data.modificacion}` })
  if (data.sitio) fields.push({ type: 'mrkdwn', text: `*Sitio web*\n${data.sitio}` })

  const ns = data.nameservers || []
  if (ns.length) fields.push({ type: 'mrkdwn', text: `*Nameservers*\n${ns.map(n => `\`${n}\``).join(', ')}` })

  const resumen = [
    `*\`${data.dominio}\` está registrado*`,
    data.titular ? `Titular: ${data.titular}` : null,
    data.expiracion ? `Expira: ${data.expiracion}` : null
  ].filter(Boolean).join(' · ')

  return {
    text: resumen,
    attachments: [
      {
        color: '#d93f0b',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `:no_entry: *\`${data.dominio}\` está registrado*` }
          },
          { type: 'divider' },
          { type: 'section', fields },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Ver en NIC', emoji: true },
                url: `https://www.nic.cl/registry/Whois.do?d=${encodeURIComponent(data.dominio)}`
              }
            ]
          }
        ]
      }
    ]
  }
}

/**
 * Ayuda del script.
 */
function formatearAyuda () {
  return {
    text: [
      '*Comandos NIC*',
      '• `nic listado [1h|1d|1w|1m]` — dominios recién inscritos (por defecto 1h)',
      '• `nic info <dominio>` — estado y datos del whois'
    ].join('\n')
  }
}

module.exports = { formatearListado, formatearInfo, formatearAyuda, mensajeError, MAX_DOMINIOS }
