// @ts-check

import { IncomingMessage, ServerResponse, createServer } from 'node:http'
import process from 'node:process'
import mqtt from 'mqtt'

const env = {
  MQTT_URL: process.env.MQTT_URL || 'mqtt://150.158.34.121:1883',
  MQTT_USER: process.env.MQTT_USER || 'iot',
  MQTT_PASS: process.env.MQTT_PASS || '123',
}

const client = mqtt.connect(env.MQTT_URL, {
  username: env.MQTT_USER,
  password: env.MQTT_PASS,
})

client.on('error', err => console.log('[mqtt_error]', err))

const server = createServer((req, res) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`)

  if (url.pathname !== '/api/status') {
    res.statusCode = 404
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end()
    return
  }

  if (req.headers.authorization !== 'nayukidayo') {
    res.statusCode = 401
    res.end()
    return
  }

  setStatus(req, res)
})

server.listen('3000', () => console.log('Server is running'))

/**
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 */
function setStatus(req, res) {
  const buf = []
  req.on('data', chunk => buf.push(chunk))
  req.on('end', async () => {
    try {
      /** @type {{addr: number, status: number}} */
      const data = JSON.parse(Buffer.concat(buf).toString())
      const addr = data.addr.toString(16).padStart(2, '0')
      const status = data.status === 1 ? '01' : '02'
      await sendMsg(addr, status)
      res.statusCode = 200
    } catch (err) {
      console.log('[setStatus]', err)
      res.statusCode = 400
    } finally {
      res.end()
    }
  })
}

/**
 * @param {string} addr
 * @param {string} status
 * @returns {Promise}
 */
function sendMsg(addr, status) {
  const msg = Buffer.from(`${addr}100005000102${status}640000`, 'hex')
  return client.publishAsync('BJDSKJY/Get', msg, { qos: 1 })
}

process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))
