const isNaN = require("lodash/isNaN")

export const formatBgValue = (value) => {
  if (isNaN(value)) {
    return null
  }
  return (value / 18).toFixed(2)
}
