import Cookies from 'js-cookie'

const Token = 'cToken'
const TokenKey = 'cTokenKey'

export function getToken() {
  return Cookies.get(Token)
}

export function setToken(token) {
  return Cookies.set(Token, token)
}

export function removeToken() {
  return Cookies.remove(Token)
}

export function getTokenKey() {
  return Cookies.get(TokenKey)
}

export function setTokenKey(tokenKey) {
  return Cookies.set(TokenKey, tokenKey)
}

export function removeTokenKey() {
  return Cookies.remove(TokenKey)
}
