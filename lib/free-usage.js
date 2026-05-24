/**
 * Free-tier translate usage: 1 per calendar day, 5 per calendar month (per email).
 * @typedef {{ dailyKey: string, dailyCount: number, monthKey: string, monthCount: number }} UsageRecord
 * @typedef {{ email: string, dailyUsed: number, dailyRemaining: number, monthlyUsed: number, monthlyRemaining: number, dailyLimit: number, monthlyLimit: number }} UsageSummary
 */
;(function (global) {
  const USAGE_STORAGE_KEY = "freeTranslateUsage-v1"
  const FREE_DAILY_LIMIT = 1
  const FREE_MONTHLY_LIMIT = 5
  const POPUP_SESSION_KEY = "popupSession-v1"
  const EXTENSION_AUTH_KEY = "extensionAuth-v1"

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase()
  }

  function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10)
  }

  function monthKey(date = new Date()) {
    return date.toISOString().slice(0, 7)
  }

  async function storageGet(key) {
    const result = await chrome.storage.local.get(key)
    return result[key] ?? null
  }

  async function storageSet(key, value) {
    await chrome.storage.local.set({ [key]: value })
  }

  async function getUsageMap() {
    return (await storageGet(USAGE_STORAGE_KEY)) || {}
  }

  async function setUsageMap(map) {
    await storageSet(USAGE_STORAGE_KEY, map)
  }

  function freshRecord(now = new Date()) {
    return {
      dailyKey: dayKey(now),
      dailyCount: 0,
      monthKey: monthKey(now),
      monthCount: 0
    }
  }

  /** @returns {UsageRecord} */
  function normalizeRecord(record, now = new Date()) {
    const base = freshRecord(now)
    if (!record || typeof record !== "object") {
      return base
    }
    const today = dayKey(now)
    const month = monthKey(now)
    return {
      dailyKey: record.dailyKey === today ? today : today,
      dailyCount: record.dailyKey === today ? Math.max(0, Number(record.dailyCount) || 0) : 0,
      monthKey: record.monthKey === month ? month : month,
      monthCount: record.monthKey === month ? Math.max(0, Number(record.monthCount) || 0) : 0
    }
  }

  /** @returns {UsageSummary | null} */
  function toSummary(email, record) {
    const normalized = normalizeEmail(email)
    if (!normalized) return null
    const dailyUsed = record.dailyCount
    const monthlyUsed = record.monthCount
    return {
      email: normalized,
      dailyUsed,
      dailyRemaining: Math.max(0, FREE_DAILY_LIMIT - dailyUsed),
      monthlyUsed,
      monthlyRemaining: Math.max(0, FREE_MONTHLY_LIMIT - monthlyUsed),
      dailyLimit: FREE_DAILY_LIMIT,
      monthlyLimit: FREE_MONTHLY_LIMIT
    }
  }

  async function resolveActiveEmail(preferredEmail) {
    const preferred = normalizeEmail(preferredEmail)
    if (preferred) return preferred

    const auth = await storageGet(EXTENSION_AUTH_KEY)
    if (auth?.status === "authenticated" && auth?.user?.email) {
      return normalizeEmail(auth.user.email)
    }

    const session = await storageGet(POPUP_SESSION_KEY)
    if (session?.email) {
      return normalizeEmail(session.email)
    }

    return ""
  }

  /** @returns {Promise<UsageSummary | null>} */
  async function getUsageSummary(email) {
    const normalized = await resolveActiveEmail(email)
    if (!normalized) return null

    const map = await getUsageMap()
    const record = normalizeRecord(map[normalized])
    return toSummary(normalized, record)
  }

  /**
   * Record one translate session. Returns updated summary, or null if no email.
   * @returns {Promise<UsageSummary | null>}
   */
  async function recordTranslate(email) {
    const normalized = await resolveActiveEmail(email)
    if (!normalized) return null

    const map = await getUsageMap()
    const record = normalizeRecord(map[normalized])
    record.dailyCount += 1
    record.monthCount += 1
    map[normalized] = record
    await setUsageMap(map)
    return toSummary(normalized, record)
  }

  /**
   * Refund one translate session (e.g. on translation failure).
   * @returns {Promise<UsageSummary | null>}
   */
  async function refundTranslate(email) {
    const normalized = await resolveActiveEmail(email)
    if (!normalized) return null

    const map = await getUsageMap()
    const record = normalizeRecord(map[normalized])
    record.dailyCount = Math.max(0, record.dailyCount - 1)
    record.monthCount = Math.max(0, record.monthCount - 1)
    map[normalized] = record
    await setUsageMap(map)
    return toSummary(normalized, record)
  }

  /** @returns {Promise<boolean>} */
  async function canTranslate(email) {
    const summary = await getUsageSummary(email)
    if (!summary) return false
    return summary.dailyRemaining > 0 && summary.monthlyRemaining > 0
  }

  global.FreeUsage = {
    USAGE_STORAGE_KEY,
    FREE_DAILY_LIMIT,
    FREE_MONTHLY_LIMIT,
    getUsageSummary,
    recordTranslate,
    refundTranslate,
    canTranslate,
    resolveActiveEmail
  }
})(typeof globalThis !== "undefined" ? globalThis : window)
