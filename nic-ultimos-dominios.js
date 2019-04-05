// Description:
//   Hubot script que muestra dominios inscritos en nic.cl en la última hora
//
// Dependencies:
//   cheerio
//
// Configuration:
//   None
//
// Commands:
//   hubot lista dominios|nic
//
// Author:
//   @jorgeepunan

const cheerio = require('cheerio')

module.exports = function(robot) {
  robot.respond(/lista (dominios|nic)/i, function(msg) {

    const url = 'https://www.nic.cl/registry/Ultimos.do?t=1h'

    msg.robot.http(url).get()(function(err, res, body) {

      const $ = cheerio.load(body)
      let domains = []

      $('.tablabusqueda td div a').each(function() {
        domains.push( $(this).text() )
      });

      msg.send( '*' + $('.tablabusqueda tr:first-child td').text() + ':* ' + domains.join(', '))

    })

  })
}
