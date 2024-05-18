import { createServer } from 'node:http'
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
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (req.headers.authorization !== 'nayukidayo') {
    res.statusCode = 401
    res.end()
    return
  }

  if (url.pathname !== '/api/status') {
    res.statusCode = 404
    res.end()
    return
  }

  if (req.method === 'POST') {
    return setStatus(req, res)
  }

  res.statusCode = 405
  res.end()
})

server.listen('3000', () => console.log('Server is running'))

function setStatus(req, res) {
  const buf = []
  req.on('data', chunk => buf.push(chunk))
  req.on('end', async () => {
    try {
      const data = JSON.parse(Buffer.concat(buf).toString())
      if (data.status === 1) {
        const msg = Buffer.from('011000050001020164CD89', 'hex')
        await client.publishAsync('BJDSKJY/Get', msg, { qos: 1 })
      } else {
        const msg = Buffer.from('011000050001020264CD89', 'hex')
        await client.publishAsync('BJDSKJY/Get', msg, { qos: 1 })
      }
      res.statusCode = 200
    } catch (err) {
      console.log('[setStatus]', err)
      res.statusCode = 400
    } finally {
      res.end()
    }
  })
}

process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))
