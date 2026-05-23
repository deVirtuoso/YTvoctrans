/** @typedef {{ email: string, signedInAt: number }} PopupSession */

const AUTH_BASE_URL = "https://y-tvoctrans.vercel.app"
const GOOGLE_WEBSTORE_REVIEW_URL =
  "https://chromewebstore.google.com/detail/pehpbnbmhhgbnhjmcdggodlfjlhfggja/reviews"

const UPGRADE_URL = AUTH_BASE_URL + "/api/checkout"
const AUTH_GOOGLE_URL = AUTH_BASE_URL + "/api/auth/google"

const MS_PER_DAY = 24 * 60 * 60 * 1000

const DEV_TEST_EMAIL = "test@test.com"
const DEV_TEST_PASSWORD = "password"
/** Trial start offset for dev account: 2 days ago → "1 day remaining" */
const DEV_TRIAL_OFFSET_MS = 2 * MS_PER_DAY

const POPUP_SESSION_KEY = "popupSession-v1"
const TRIAL_START_KEY = "popupTrialStartByEmail-v1"
const EXTENSION_AUTH_KEY = "extensionAuth-v1"

const $ = (id) => document.getElementById(id)

const tabSignIn = $("tabSignIn")
const tabSignUp = $("tabSignUp")
const panelSignIn = $("panelSignIn")
const panelSignUp = $("panelSignUp")
const formError = $("formError")
const signedInPanel = $("signedInPanel")
const authPanel = $("authPanel")
const userEmailDisplay = $("userEmailDisplay")
const linkRating = $("linkRating")
const linkUpgrade = $("linkUpgrade")
const btnGoogle = $("btnGoogle")
const btnSignOut = $("btnSignOut")
const freeUsagePanel = $("freeUsagePanel")
const dailyAllowanceText = $("dailyAllowanceText")
const monthlyAllowanceText = $("monthlyAllowanceText")
const dailyAllowanceBar = $("dailyAllowanceBar")
const monthlyAllowanceBar = $("monthlyAllowanceBar")
const freeUsageHint = $("freeUsageHint")

/** @type {string | null} */
let activeEmail = null

linkRating.href = GOOGLE_WEBSTORE_REVIEW_URL

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function showFormError(message) {
  if (!message) {
    formError.classList.add("hidden")
    formError.textContent = ""
    return
  }
  formError.textContent = message
  formError.classList.remove("hidden")
}

function setFieldError(inputEl, errorEl, message) {
  if (!message) {
    inputEl.classList.remove("invalid")
    errorEl.classList.add("hidden")
    errorEl.textContent = ""
    return
  }
  inputEl.classList.add("invalid")
  errorEl.textContent = message
  errorEl.classList.remove("hidden")
}

function clearFieldErrors() {
  setFieldError($("signInEmail"), $("signInEmailError"), "")
  setFieldError($("signInPassword"), $("signInPasswordError"), "")
  setFieldError($("signUpEmail"), $("signUpEmailError"), "")
  setFieldError($("signUpPassword"), $("signUpPasswordError"), "")
  showFormError("")
}

function switchAuthTab(mode) {
  const isSignIn = mode === "signIn"
  tabSignIn.classList.toggle("active", isSignIn)
  tabSignUp.classList.toggle("active", !isSignIn)
  tabSignIn.setAttribute("aria-selected", String(isSignIn))
  tabSignUp.setAttribute("aria-selected", String(!isSignIn))
  panelSignIn.classList.toggle("active", isSignIn)
  panelSignUp.classList.toggle("active", !isSignIn)
  panelSignIn.hidden = !isSignIn
  panelSignUp.hidden = isSignIn
  clearFieldErrors()
}

async function storageGet(key) {
  const result = await chrome.storage.local.get(key)
  return result[key] ?? null
}

async function storageSet(key, value) {
  await chrome.storage.local.set({ [key]: value })
}

async function storageRemove(key) {
  await chrome.storage.local.remove(key)
}

async function getTrialMap() {
  return (await storageGet(TRIAL_START_KEY)) || {}
}

async function getTrialStartMs(email) {
  const map = await getTrialMap()
  const key = normalizeEmail(email)
  return typeof map[key] === "number" ? map[key] : null
}

async function setTrialStartMs(email, startMs) {
  const map = await getTrialMap()
  map[normalizeEmail(email)] = startMs
  await storageSet(TRIAL_START_KEY, map)
}

function trialStartForAccount() {
  return Date.now()
}

async function ensureTrialStart(email, isNewAccount) {
  const normalized = normalizeEmail(email)
  if (normalized === DEV_TEST_EMAIL) {
    const start = Date.now() - DEV_TRIAL_OFFSET_MS
    await setTrialStartMs(email, start)
    return start
  }
  const existing = await getTrialStartMs(email)
  if (existing != null && !isNewAccount) {
    return existing
  }
  const start = trialStartForAccount()
  await setTrialStartMs(email, start)
  return start
}

function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || `${singular}s`
}

function formatAllowanceValue(remaining, limit) {
  if (remaining <= 0) {
    return `None left (${limit} used)`
  }
  return `${remaining} of ${limit} ${pluralize(remaining, "translation")} left`
}

function setMeter(barEl, remaining, limit) {
  const pct = limit > 0 ? Math.min(100, (remaining / limit) * 100) : 0
  barEl.style.width = `${pct}%`
}

async function refreshFreeUsageDisplay(email = activeEmail) {
  if (!email || typeof FreeUsage === "undefined") {
    freeUsagePanel.classList.add("hidden")
    return
  }

  const extAuth = await storageGet(EXTENSION_AUTH_KEY)
  if (extAuth?.access?.entitlementActive === true) {
    freeUsagePanel.classList.add("hidden")
    return
  }

  const summary = await FreeUsage.getUsageSummary(email)
  if (!summary) {
    freeUsagePanel.classList.add("hidden")
    return
  }

  dailyAllowanceText.textContent = formatAllowanceValue(
    summary.dailyRemaining,
    summary.dailyLimit
  )
  monthlyAllowanceText.textContent = formatAllowanceValue(
    summary.monthlyRemaining,
    summary.monthlyLimit
  )
  setMeter(dailyAllowanceBar, summary.dailyRemaining, summary.dailyLimit)
  setMeter(monthlyAllowanceBar, summary.monthlyRemaining, summary.monthlyLimit)

  const exhausted = summary.dailyRemaining <= 0 || summary.monthlyRemaining <= 0
  freeUsagePanel.classList.toggle("is-exhausted", exhausted)

  if (summary.dailyRemaining <= 0 && summary.monthlyRemaining <= 0) {
    freeUsageHint.textContent =
      "Daily and monthly free translations are used. Upgrade to Pro for unlimited access."
    freeUsageHint.classList.remove("hidden")
  } else if (summary.dailyRemaining <= 0) {
    freeUsageHint.textContent = "Today's free translation is used. More available tomorrow."
    freeUsageHint.classList.remove("hidden")
  } else if (summary.monthlyRemaining <= 0) {
    freeUsageHint.textContent = "Monthly free translations are used. Resets next calendar month."
    freeUsageHint.classList.remove("hidden")
  } else {
    freeUsageHint.textContent = ""
    freeUsageHint.classList.add("hidden")
  }

  freeUsagePanel.classList.remove("hidden")
}

function setSignedInUI(email) {
  activeEmail = normalizeEmail(email)
  userEmailDisplay.textContent = email
  signedInPanel.classList.remove("hidden")
  authPanel.classList.add("collapsed")
  void refreshFreeUsageDisplay(activeEmail)
}

function setSignedOutUI() {
  activeEmail = null
  signedInPanel.classList.add("hidden")
  authPanel.classList.remove("collapsed")
  freeUsagePanel.classList.add("hidden")
  $("signInEmail").value = ""
  $("signInPassword").value = ""
  $("signUpEmail").value = ""
  $("signUpPassword").value = ""
  clearFieldErrors()
  switchAuthTab("signUp")
}

async function saveSession(email) {
  /** @type {PopupSession} */
  const session = { email: normalizeEmail(email), signedInAt: Date.now() }
  await storageSet(POPUP_SESSION_KEY, session)
}

async function loadSession() {
  return /** @type {PopupSession | null} */ (await storageGet(POPUP_SESSION_KEY))
}

async function clearSession() {
  await storageRemove(POPUP_SESSION_KEY)
}

async function tryExtensionAuthEmail() {
  const extAuth = await storageGet(EXTENSION_AUTH_KEY)
  if (extAuth?.status === "authenticated" && extAuth?.user?.email) {
    return normalizeEmail(extAuth.user.email)
  }
  return null
}

async function refreshExtensionAuth() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "REFRESH_EXTENSION_AUTH"
    })
    if (response?.ok && response.auth?.user?.email) {
      return normalizeEmail(response.auth.user.email)
    }
  } catch {
    /* background may be unavailable */
  }
  return null
}

function validateSignIn(email, password) {
  let valid = true
  if (!email) {
    setFieldError($("signInEmail"), $("signInEmailError"), "Email is required")
    valid = false
  } else if (!isValidEmail(email)) {
    setFieldError($("signInEmail"), $("signInEmailError"), "Enter a valid email address")
    valid = false
  }
  if (!password) {
    setFieldError($("signInPassword"), $("signInPasswordError"), "Password is required")
    valid = false
  }
  return valid
}

function validateSignUp(email, password) {
  let valid = true
  if (!email) {
    setFieldError($("signUpEmail"), $("signUpEmailError"), "Email is required")
    valid = false
  } else if (!isValidEmail(email)) {
    setFieldError($("signUpEmail"), $("signUpEmailError"), "Enter a valid email address")
    valid = false
  }
  if (!password) {
    setFieldError($("signUpPassword"), $("signUpPasswordError"), "Password is required")
    valid = false
  } else if (password.length < 6) {
    setFieldError(
      $("signUpPassword"),
      $("signUpPasswordError"),
      "Password must be at least 6 characters"
    )
    valid = false
  }
  return valid
}

async function authenticateLocal(email, password) {
  const normalized = normalizeEmail(email)

  if (normalized === DEV_TEST_EMAIL && password === DEV_TEST_PASSWORD) {
    await ensureTrialStart(normalized, false)
    await saveSession(normalized)
    return normalized
  }

  const response = await fetch(`${AUTH_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  })

  const data = await response.json()
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Sign in failed")
  }

  try {
    await chrome.runtime.sendMessage({ type: "REFRESH_EXTENSION_AUTH" })
  } catch (e) {
    /* background may be booting */
  }

  await ensureTrialStart(normalized, false)
  await saveSession(normalized)
  return normalized
}

async function registerLocal(email, password) {
  const normalized = normalizeEmail(email)
  
  const response = await fetch(`${AUTH_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  })

  const data = await response.json()
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Sign up failed")
  }

  throw new Error("Confirmation email sent! Please check your inbox and verify your email before logging in.")
}

async function completeSignIn(email) {
  if ((await getTrialStartMs(email)) == null) {
    await ensureTrialStart(email, false)
  }
  setSignedInUI(email)
}

async function bootstrap() {
  const extEmail =
    (await refreshExtensionAuth()) || (await tryExtensionAuthEmail())
  const session = await loadSession()
  const email = extEmail || session?.email || null

  if (email) {
    if (!session) {
      await saveSession(email)
    }
    await ensureTrialStart(email, false)
    await completeSignIn(email)
    return
  }

  setSignedOutUI()
}

tabSignIn.addEventListener("click", () => switchAuthTab("signIn"))
tabSignUp.addEventListener("click", () => switchAuthTab("signUp"))

panelSignIn.addEventListener("submit", async (event) => {
  event.preventDefault()
  clearFieldErrors()
  const email = $("signInEmail").value
  const password = $("signInPassword").value
  if (!validateSignIn(email, password)) return

  const submitBtn = $("btnSignInSubmit")
  submitBtn.disabled = true
  try {
    const signedInEmail = await authenticateLocal(email, password, false)
    await completeSignIn(signedInEmail)
  } catch (error) {
    showFormError(error instanceof Error ? error.message : "Sign in failed")
  } finally {
    submitBtn.disabled = false
  }
})

panelSignUp.addEventListener("submit", async (event) => {
  event.preventDefault()
  clearFieldErrors()
  const email = $("signUpEmail").value
  const password = $("signUpPassword").value
  if (!validateSignUp(email, password)) return

  const submitBtn = $("btnSignUpSubmit")
  submitBtn.disabled = true
  try {
    const signedInEmail = await registerLocal(email, password)
    await completeSignIn(signedInEmail)
  } catch (error) {
    showFormError(error instanceof Error ? error.message : "Sign up failed")
  } finally {
    submitBtn.disabled = false
  }
})

btnGoogle.addEventListener("click", async () => {
  showFormError("")
  try {
    await chrome.tabs.create({ url: AUTH_GOOGLE_URL })
    showFormError("Complete Google sign-in in the browser tab, then reopen this popup.")
    const refreshed = await refreshExtensionAuth()
    if (refreshed) {
      await saveSession(refreshed)
      await completeSignIn(refreshed)
    }
  } catch {
    showFormError("Could not open Google sign-in. Check extension permissions.")
  }
})

btnSignOut.addEventListener("click", async () => {
  await clearSession()
  try {
    await chrome.runtime.sendMessage({ type: "REFRESH_EXTENSION_AUTH" })
  } catch {
    /* ignore */
  }
  setSignedOutUI()
})

linkUpgrade.addEventListener("click", () => {
  chrome.tabs.create({ url: UPGRADE_URL })
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !activeEmail) return
  if (changes[FreeUsage.USAGE_STORAGE_KEY] || changes[POPUP_SESSION_KEY] || changes[EXTENSION_AUTH_KEY]) {
    void refreshFreeUsageDisplay(activeEmail)
  }
})

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && activeEmail) {
    void refreshFreeUsageDisplay(activeEmail)
  }
})

bootstrap()
