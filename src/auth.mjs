import axios from 'axios'
import { AUTH_API_URL } from './constants.mjs'
import { setAppToken } from './libs/utils.mjs'
import chalk from 'chalk'

async function validateToken(token) {
  try {
    const res = await axios.post(AUTH_API_URL, { token })
    return res.status === 200 && res.data.valid
  } catch (error) {
    console.log(chalk.red(`[error] ${error.message}`))
    return false
  }
}

export default async  function setAuthToken(token) {
  if (!token) {
    console.log(chalk.red('[error] Please provide your token.'))
    return
  }
  const isValid = await validateToken(token)
  if (isValid) {
    setAppToken(token)
    console.log(chalk.green('[info] Login successful! Your token has been stored securely.'))
  } else {
    console.log(chalk.red('[error] Invalid token.'))
  }
}