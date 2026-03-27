/**
 * auth.js — Authentication module
 * Handles signup, signin, signout using localStorage.
 * No server required — all data lives in the browser.
 */

"use strict";

const Auth = (() => {

  const USERS_KEY   = 'ca_users';
  const SESSION_KEY = 'ca_user';

  /* ── Helpers ──────────────────────────────────────────────── */

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  /** Very basic hash — NOT for production. For a real app use bcrypt on server. */
  function hashPassword(pw) {
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
      hash = ((hash << 5) - hash) + pw.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36) + '_' + pw.length;
  }

  /* ── Public API ───────────────────────────────────────────── */

  /**
   * Sign up a new user.
   * @returns {{ ok: boolean, error?: string }}
   */
  function signup(name, email, password) {
    if (!name || name.trim().length < 2)
      return { ok: false, error: 'Name must be at least 2 characters.' };
    if (!email || !email.includes('@'))
      return { ok: false, error: 'Please enter a valid email address.' };
    if (!password || password.length < 6)
      return { ok: false, error: 'Password must be at least 6 characters.' };

    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, error: 'An account with this email already exists.' };

    const user = {
      id:        'u_' + Date.now(),
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      password:  hashPassword(password),
      createdAt: new Date().toISOString(),
      settings:  { theme: 'light', codeLang: 'python' },
    };

    users.push(user);
    saveUsers(users);

    // Save session (without password)
    const session = { id: user.id, name: user.name, email: user.email, settings: user.settings };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { ok: true, user: session };
  }

  /**
   * Sign in an existing user.
   * @returns {{ ok: boolean, error?: string }}
   */
  function signin(email, password) {
    const users = getUsers();
    const user  = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user)
      return { ok: false, error: 'No account found with this email address.' };
    if (user.password !== hashPassword(password))
      return { ok: false, error: 'Incorrect password. Please try again.' };

    const session = { id: user.id, name: user.name, email: user.email, settings: user.settings };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { ok: true, user: session };
  }

  /** Sign out the current user and redirect to login. */
  function signout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  }

  /**
   * Get the current logged-in user from the session.
   * @returns {object|null}
   */
  function current() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }

  /**
   * Update settings for the current user.
   * @param {object} settings  e.g. { theme, codeLang }
   */
  function updateSettings(newSettings) {
    const session = current();
    if (!session) return;

    // Update session
    session.settings = { ...session.settings, ...newSettings };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Update persistent user record
    const users = getUsers();
    const idx   = users.findIndex(u => u.id === session.id);
    if (idx !== -1) {
      users[idx].settings = session.settings;
      saveUsers(users);
    }
  }

  /**
   * Update the display name for the current user.
   */
  function updateName(newName) {
    if (!newName || newName.trim().length < 2) return;
    const session = current();
    if (!session) return;

    session.name = newName.trim();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    const users = getUsers();
    const idx   = users.findIndex(u => u.id === session.id);
    if (idx !== -1) {
      users[idx].name = session.name;
      saveUsers(users);
    }
  }

  return { signup, signin, signout, current, updateSettings, updateName };

})();
