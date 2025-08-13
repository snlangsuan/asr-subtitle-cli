import axios from 'axios'
import https from 'node:https'

export const useHttpInstance = (token, baseUrl) => {
  const instance = new axios.create({
    baseURL: baseUrl,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': token,
    },
  })
  return instance
}
