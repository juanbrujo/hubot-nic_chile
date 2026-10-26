'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const {
  normalizarDominio,
  normalizarRango,
  urlUltimos,
  urlWhois,
  parseCsv,
  esCsvValido,
  formatearFecha
} = require('../lib/nic')
const { parseWhois } = require('../lib/whois')
const { formatearListado, formatearInfo, formatearAyuda, MAX_DOMINIOS } = require('../lib/slack')

const fixture = nombre => fs.readFileSync(path.join(__dirname, 'fixtures', nombre), 'utf8')

test.describe('normalizarDominio', () => {
  test.it('agrega .cl cuando falta', () => {
    assert.deepEqual(normalizarDominio('linux'), { ok: true, dominio: 'linux.cl' })
  })

  test.it('normaliza mayúsculas y espacios', () => {
    assert.deepEqual(normalizarDominio('  MiDominio.CL '), { ok: true, dominio: 'midominio.cl' })
  })

  test.it('limpia protocolo y ruta', () => {
    assert.deepEqual(normalizarDominio('https://www.nic.cl/registry/'), { ok: true, dominio: 'www.nic.cl' })
  })

  test.it('acepta subdominios', () => {
    assert.deepEqual(normalizarDominio('a.b.cl'), { ok: true, dominio: 'a.b.cl' })
  })

  test.it('rechaza vacío', () => {
    const r = normalizarDominio('')
    assert.equal(r.ok, false)
    assert.match(r.error, /Falta el dominio/)
  })

  test.it('rechaza TLD que no es .cl', () => {
    assert.equal(normalizarDominio('ejemplo.com').ok, false)
  })

  test.it('rechaza caracteres inválidos', () => {
    assert.equal(normalizarDominio('con espacio.cl').ok, false)
    assert.equal(normalizarDominio('-guion.cl').ok, false)
    assert.equal(normalizarDominio('guion-.cl').ok, false)
    assert.equal(normalizarDominio('ñandu.cl').ok, false)
  })
})

test.describe('normalizarRango', () => {
  test.it('default 1h', () => {
    assert.equal(normalizarRango(), '1h')
    assert.equal(normalizarRango(''), '1h')
  })

  test.it('traduce alias', () => {
    assert.equal(normalizarRango('hora'), '1h')
    assert.equal(normalizarRango('día'), '1d')
    assert.equal(normalizarRango('24h'), '1d')
    assert.equal(normalizarRango('semana'), '1w')
    assert.equal(normalizarRango('mes'), '1m')
  })

  test.it('rechaza rangos desconocidos', () => {
    assert.equal(normalizarRango('2años'), null)
  })
})

test.describe('urls', () => {
  test.it('ultimos siempre lleva t y f=csv', () => {
    assert.equal(urlUltimos('1d'), 'https://www.nic.cl/registry/Ultimos.do?t=1d&f=csv')
  })

  test.it('whosido escapa el dominio', () => {
    assert.equal(urlWhois('nic.cl'), 'https://www.nic.cl/registry/Whois.do?d=nic.cl')
  })
})

test.describe('parseCsv', () => {
  test.it('parsea el fixture real de nic.cl', () => {
    const dominios = parseCsv(fixture('ultimos-1h.csv'))
    assert.ok(dominios.length > 0)
    assert.equal(dominios[0].dominio.endsWith('.cl'), true)
    assert.match(dominios[0].fecha, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test.it('ignora cabecera y líneas vacías', () => {
    const csv = 'Nombre Dominio,Fecha Inscripción\nfoo.cl,2026-10-26 18:40:23.0\n\nbar.cl,2026-10-26 18:41:00.0\n'
    assert.deepEqual(parseCsv(csv).map(d => d.dominio), ['foo.cl', 'bar.cl'])
  })

  test.it('descarta filas que no son .cl', () => {
    const csv = 'Nombre Dominio,Fecha Inscripción\nfoo.cl,2026-10-26 18:40:23.0\nbasura,,\n'
    assert.deepEqual(parseCsv(csv).map(d => d.dominio), ['foo.cl'])
  })

  test.it('no explota con input inválido', () => {
    assert.deepEqual(parseCsv(null), [])
    assert.deepEqual(parseCsv(''), [])
  })
})

test.describe('esCsvValido', () => {
  test.it('acepta CSV real', () => {
    assert.equal(esCsvValido(fixture('ultimos-1h.csv')), true)
  })

  test.it('rechaza HTML de nic.cl (falta el parámetro t)', () => {
    assert.equal(esCsvValido(fixture('whois-registrado.html')), false)
  })
})

test.describe('formatearFecha', () => {
  test.it('convierte al formato local', () => {
    assert.equal(formatearFecha('2026-10-26 18:40:23.0'), '26-10-2026 18:40')
  })

  test.it('devuelve el texto cuando no matchea formato', () => {
    assert.equal(formatearFecha('Anterior a 1997-09-09'), 'Anterior a 1997-09-09')
    assert.equal(formatearFecha(null), null)
  })
})

test.describe('parseWhois · dominio registrado', () => {
  const data = parseWhois(fixture('whois-registrado.html'), 'nic.cl')

  test.it('detecta que está registrado', () => {
    assert.equal(data.disponible, false)
  })

  test.it('extrae titular y registrador', () => {
    assert.equal(data.titular, 'UNIVERSIDAD DE CHILE')
    assert.equal(data.registrador, 'NIC Chile')
  })

  test.it('extrae fechas y nameservers', () => {
    assert.equal(data.expiracion, '08-02-2030 21:00')
    assert.equal(data.creacion, 'Anterior a 1997-09-09')
    assert.deepEqual(data.nameservers, ['a.nic.cl', 'slave.sth.netnod.se', 'b.nic.cl', 'c.nic.cl'])
  })

  test.it('extrae sitio web', () => {
    assert.equal(data.sitio, 'www.nic.cl')
  })
})

test.describe('parseWhois · dominio disponible', () => {
  const data = parseWhois(fixture('whois-disponible.html'), 'xokutest297595936.cl')

  test.it('detecta que está disponible', () => {
    assert.deepEqual(data, { disponible: true, dominio: 'xokutest297595936.cl' })
  })
})

test.describe('parseWhois · respuestas raras', () => {
  test.it('error si el html viene vacío', () => {
    assert.match(parseWhois('', 'nic.cl').error, /vacía/)
  })

  test.it('error si el html no es una ficha de whois', () => {
    assert.match(parseWhois(fixture('ultimos-1h.csv'), 'nic.cl').error, /No pude interpretar/)
  })
})

test.describe('formatearListado', () => {
  const dominios = Array.from({ length: 20 }, (_, i) => ({ dominio: `dominio${i}.cl`, fecha: '2026-10-26 18:00:00.0' }))

  test.it('usa Block Kit con attachments', () => {
    const msg = formatearListado(dominios, '1h')
    assert.ok(Array.isArray(msg.attachments))
    assert.equal(msg.attachments[0].blocks[0].type, 'header')
  })

  test.it('trunca a 15 y avisa cuántos quedan', () => {
    const msg = formatearListado(dominios, '1h')
    const seccion = msg.attachments[0].blocks.find(b => b.type === 'section')
    assert.equal(seccion.text.text.split('\n').length, MAX_DOMINIOS)
    assert.match(JSON.stringify(msg.attachments), /y 5 más/)
  })

  test.it('siempre incluye fallback de texto plano', () => {
    const msg = formatearListado(dominios, '1h')
    assert.match(msg.text, /20 dominios inscritos/)
  })

  test.it('singular con un solo dominio', () => {
    const msg = formatearListado([{ dominio: 'solo.cl', fecha: '' }], '1h')
    assert.match(msg.text, /1 dominio inscrito en la última hora/)
  })

  test.it('mensaje cuando no hay dominios', () => {
    const msg = formatearListado([], '1d')
    assert.match(msg.text, /Sin dominios inscritos en las últimas 24 horas/)
    assert.equal(msg.attachments, undefined)
  })
})

test.describe('formatearInfo', () => {
  test.it('dominio registrado muestra ficha', () => {
    const msg = formatearInfo(parseWhois(fixture('whois-registrado.html'), 'nic.cl'))
    const plano = JSON.stringify(msg)
    assert.match(plano, /está registrado/)
    assert.match(plano, /UNIVERSIDAD DE CHILE/)
    assert.match(msg.text, /nic\.cl/)
  })

  test.it('dominio disponible muestra botón de inscripción', () => {
    const msg = formatearInfo(parseWhois(fixture('whois-disponible.html'), 'xokutest297595936.cl'))
    assert.match(msg.text, /está disponible/)
    const acciones = msg.attachments[0].blocks.find(b => b.type === 'actions')
    assert.equal(acciones.elements[0].text.text, 'Inscribir en NIC')
  })

  test.it('propaga el error del parser', () => {
    const msg = formatearInfo({ error: 'NIC devolvió una respuesta vacía.' })
    assert.match(msg.text, /warning/)
  })
})

test.describe('formatearAyuda', () => {
  test.it('lista los comandos', () => {
    const msg = formatearAyuda()
    assert.match(msg.text, /nic listado/)
    assert.match(msg.text, /nic info/)
  })
})
