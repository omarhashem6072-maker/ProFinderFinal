/**
 * Admin auth: uses server session (cookie). Session is set by POST /api/auth/login.
 */

function getApiBase() {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin;
  }
  return "";
}

function isAdminLoggedIn() {
  try {
    return sessionStorage.getItem("profinder_admin_session") === "true";
  } catch (e) {
    return false;
  }
}

function setAdminSession() {
  try {
    sessionStorage.setItem("profinder_admin_session", "true");
  } catch (e) {}
}

function clearAdminSession() {
  try {
    sessionStorage.removeItem("profinder_admin_session");
    sessionStorage.removeItem("profinder_admin_first_name");
    sessionStorage.removeItem("profinder_is_super_admin");
  } catch (e) {}
}

/** Keep admin.html welcome line in sync after /me or login (initWelcome may have run too early). */
function refreshProfinderWelcomeBanner() {
  try {
    const el = document.getElementById("welcome-name");
    if (!el) return;
    const first = sessionStorage.getItem("profinder_admin_first_name");
    el.textContent = first ? `, ${first}` : "";
  } catch (e) {}
}
if (typeof window !== "undefined") {
  window.refreshProfinderWelcomeBanner = refreshProfinderWelcomeBanner;
}

function checkAdminSession(callback) {
  return fetch(getApiBase() + "/api/auth/me", { method: "GET", credentials: "include" })
    .then(function (res) {
      if (res.ok) {
        return res
          .json()
          .then(function (data) {
            setAdminSession();
            try {
              if (data && data.firstName) sessionStorage.setItem("profinder_admin_first_name", data.firstName);
              else sessionStorage.removeItem("profinder_admin_first_name");
              if (data && data.isSuperAdmin === true) sessionStorage.setItem("profinder_is_super_admin", "true");
              else sessionStorage.removeItem("profinder_is_super_admin");
            } catch (e) {}
            refreshProfinderWelcomeBanner();
            if (callback) callback(true);
            return true;
          })
          .catch(function () {
            setAdminSession();
            refreshProfinderWelcomeBanner();
            if (callback) callback(true);
            return true;
          });
      } else {
        clearAdminSession();
        if (callback) callback(false);
        return false;
      }
    })
    .catch(function () {
      clearAdminSession();
      if (callback) callback(false);
      return false;
    });
}

function loginWithApi(username, password, onSuccess, onError) {
  fetch(getApiBase() + "/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username, password: password })
  })
    .then(function (res) {
      if (res.ok) {
        return res
          .json()
          .then(function (data) {
            setAdminSession();
            try {
              if (data && data.firstName) sessionStorage.setItem("profinder_admin_first_name", data.firstName);
              else sessionStorage.removeItem("profinder_admin_first_name");
              if (data && data.isSuperAdmin === true) sessionStorage.setItem("profinder_is_super_admin", "true");
              else sessionStorage.removeItem("profinder_is_super_admin");
            } catch (e) {}
            refreshProfinderWelcomeBanner();
            if (onSuccess) onSuccess();
          })
          .catch(function () {
            setAdminSession();
            refreshProfinderWelcomeBanner();
            if (onSuccess) onSuccess();
          });
      } else {
        if (onError) onError(res.status, "Invalid username or password");
      }
    })
    .catch(function () {
      if (onError) onError(0, "Network error");
    });
}

function logoutFromApi(callback) {
  fetch(getApiBase() + "/api/auth/logout", { method: "POST", credentials: "include" })
    .then(function () {
      clearAdminSession();
      if (callback) callback();
    })
    .catch(function () {
      clearAdminSession();
      if (callback) callback();
    });
}
