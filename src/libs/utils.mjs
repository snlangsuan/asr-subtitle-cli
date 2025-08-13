import { ACCOUNT_NAME, SERVICE_NAME } from '../constants.mjs'
import keytar from 'keytar'

export const getAppToken = async () => {
  const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
  return token
}

export const setAppToken = async (token) => {
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, token)
}
