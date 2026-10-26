# Hubot NIC Chile

**Hubot script para consultar dominios `.cl` inscritos en nic.cl y su whois.**
Renderiza las respuestas con **Slack Block Kit** (con fallback a texto plano).

### Instalación

```
$ npm install hubot-nic_chile --save
```

Agregar en `external-scripts.json`:

```json
[
  "hubot-nic_chile"
]
```

### Comandos

```
nic listado [1h|1d|1w|1m]    dominios inscritos en el periodo (default: 1h)
nic info <dominio>           estado del dominio y datos del whois
nic ayuda                    ayuda
```

Alias aceptados: `nic lista`, `nic list`, `nic dominios`, `nic whois`.
Rangos: `1h`, `hora`, `1d`, `dia`, `día`, `24h`, `ayer`, `1w`, `semana`, `1m`, `mes`.

### Ejemplos

```
hubot> hubot nic listado
NIC Chile · dominios en la última hora
59 dominios inscritos · mostrando 15
• peludosyciaspa.cl
• maferjogroup.cl
...
_y 44 más. Usa `nic info <dominio>` para revisar uno._
```

```
hubot> hubot nic info nic.cl
:no_entry: nic.cl está registrado
Titular            UNIVERSIDAD DE CHILE
Agente registrador NIC Chile
Creación           Anterior a 1997-09-09
Expiración         08-02-2030 21:00
Nameservers        a.nic.cl, b.nic.cl, c.nic.cl, slave.sth.netnod.se
```

```
hubot> hubot nic info dominioquenoexiste123.cl
:white_check_mark: dominioquenoexiste123.cl está disponible
[ Inscribir en NIC ] [ Ver whois ]
```

### Configuración

| Variable | Default | Descripción |
| --- | --- | --- |
| `NIC_CACHE_TTL_MS` | `60000` | TTL del cache de respuestas. `0` lo desactiva. |

### Notas

- El listado usa el endpoint CSV de NIC (`Ultimos.do?...&f=csv`) y el whois parsea el HTML de `Whois.do`.
- Si nic.cl cambia el HTML del whois, el script responde con un error explícito en vez de fallar en silencio.
- Node >= 18.

### Tests

```
$ npm test
```

Tests de input→output sobre fixtures reales (`test/fixtures/`). No tocan la red.

### Licencia

[MIT](https://opensource.org/licenses/MIT)
