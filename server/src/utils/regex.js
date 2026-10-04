/**
 * Escapes user input before it is embedded in a RegExp, preventing ReDoS and
 * accidental wildcard matches.
 * @param {string} value
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive exact match, e.g. for city names typed in any casing.
 * @param {string} value
 */
function exactInsensitive(value) {
  return new RegExp(`^${escapeRegex(value.trim())}$`, 'i');
}

module.exports = { escapeRegex, exactInsensitive };
