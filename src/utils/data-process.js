export function getByValue(map, searchValue) {
  let keys
  for (const [key, value] of map.entries()) {
    if (value === searchValue) { keys = key }
  }
  return keys
}

export function strToNumber(numberStr) {
  var index = numberStr.indexOf('Ki')
  var number = 1
  if (index !== -1) {
    numberStr = numberStr.replace('Ki', '')
    number = number * 1024
  }
  index = numberStr.indexOf('Mi')
  if (index !== -1) {
    numberStr = numberStr.replace('Mi', '')
    number = number * 1024 * 1024
  }
  index = numberStr.indexOf('Gi')
  if (index !== -1) {
    numberStr = numberStr.replace('Gi', '')
    number = number * 1024 * 1024 * 1024
  }
  return numberStr * number
}
export function numberToStr(limit) {
  var size = ''
  if (limit < 0.1 * 1024) { // 如果小于0.1KB转化成B
    size = limit.toFixed(2) + 'B'
  } else if (limit < 0.1 * 1024 * 1024) { // 如果小于0.1MB转化成KB
    size = (limit / 1024).toFixed(2) + 'Ki'
  } else if (limit < 0.1 * 1024 * 1024 * 1024) { // 如果小于0.1GB转化成MB
    size = (limit / (1024 * 1024)).toFixed(2) + 'Mi'
  } else { // 其他转化成GB
    size = (limit / (1024 * 1024 * 1024)).toFixed(2) + 'Gi'
  }

  var sizestr = size + ''
  var len = sizestr.indexOf('\.')
  var dec = sizestr.substr(len + 1, 2)
  if (dec === '00') { // 当小数点后为00时 去掉小数部分
    return sizestr.substring(0, len) + sizestr.substr(len + 3, 2)
  }
  return sizestr
}

export function randomString(e) {
  e = e || 32
  var t = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
  var a = t.length
  var n = ''
  for (let i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a))
  return n
}
