import { service } from '../service.js';
import { esc } from '../components/ui.js';
import { icon } from '../icons.js';

export function safeNext(value) {
  return typeof value === 'string' && /^\/(?:profile|report(?:\/[a-zA-Z0-9-]+)?|my-reports|claims|messages(?:\/[a-zA-Z0-9-]+)?|item\/[a-zA-Z0-9-]+)(?:\?[^#]*)?$/.test(value) ? value : '/profile';
}
export function loginLink(next) { return '#/login?next=' + encodeURIComponent(next); }
export function auth(page, params) {
  const signup = page === 'signup', recover = page === 'recover';
  const next = safeNext(params.get('next'));
  const suffix = '?next=' + encodeURIComponent(next);
  return `<section class="wrap page-section auth-page"><div class="auth-intro"><div class="eyebrow">A LITTLE MORE CONNECTED</div><h1>${signup ? 'Your next<br>happy reunion<br>starts here' : recover ? 'Let’s get<br>you back in' : 'Good to<br>have you<br>back'}<span class="lime-period">.</span></h1><p>${signup ? 'Found something? Lost a favorite? Make an account to report it, connect, and bring it home.' : recover ? 'Use your saved recovery code to choose a new password.' : 'Log in to pick up your conversations, check your claims, and find your way back to the things that matter.'}</p><a class="btn secondary" href="#/demo">Try the demo — no account needed ${icon('arrow')}</a><div class="safety-note">${icon('shield')} Your email is private. Your display name helps people recognize you.</div><a class="text-link" href="#/browse">Keep browsing ${icon('arrow')}</a></div><div class="auth-card"><div class="auth-card-mark">✳</div><h2>${signup ? 'Create your account' : recover ? 'Reset your password' : 'Welcome back'}</h2><p class="muted">${signup ? 'A few details. A lot more connected.' : recover ? 'Your recovery code was shown at sign-up.' : 'Your campus connection is right here.'}</p><form id="auth-form">${signup ? '<label for="account-name">Display name</label><input id="account-name" name="name" autocomplete="name" minlength="2" maxlength="80" placeholder="Your name" required>' : ''}<label for="account-email">Email address</label><input type="email" id="account-email" name="email" autocomplete="username" inputmode="email" maxlength="254" placeholder="you@example.com" required>${recover ? '<label for="recovery-code">Recovery code</label><input id="recovery-code" name="recoveryCode" autocomplete="off" autocapitalize="none" spellcheck="false" minlength="64" maxlength="64" required>' : ''}<div class="password-label"><label for="account-password">${recover ? 'New password' : 'Password'}</label><button type="button" class="inline-button" id="toggle-password" aria-controls="account-password" aria-pressed="false">Show</button></div><input type="password" id="account-password" name="password" autocomplete="${signup || recover ? 'new-password' : 'current-password'}" minlength="${signup || recover ? 8 : 1}" maxlength="128" required>${signup || recover ? '<p class="form-hint" id="password-hint">Use at least 8 characters. A few memorable words work well.</p>' : `<a class="auth-recover" href="#/recover${suffix}">Forgot your password?</a>`}<p class="form-error" id="auth-error" role="alert"></p><button class="btn primary full" id="auth-submit">${signup ? 'Create account' : recover ? 'Reset password' : 'Log in'} ${icon('arrow')}</button></form><p class="auth-switch">${signup ? `Already connected? <a href="#/login${suffix}">Log in</a>` : recover ? `<a href="#/login${suffix}">Back to login</a>` : `New around here? <a href="#/signup${suffix}">Create an account</a>`}</p>${recover ? '<p class="form-hint">Without your recovery code, this account cannot be reset. Reclaim does not send reset emails.</p>' : ''}</div></section>`;
}
export function mountAuth(page, params) {
  const form = document.querySelector('#auth-form'), password = document.querySelector('#account-password');
  const next = safeNext(params.get('next'));
  document.querySelector('#toggle-password').onclick = e => {
    const showing = password.type === 'password'; password.type = showing ? 'text' : 'password';
    e.currentTarget.textContent = showing ? 'Hide' : 'Show'; e.currentTarget.setAttribute('aria-pressed',String(showing));
  };
  let submitting = false;
  form.onsubmit = async event => {
    event.preventDefault(); if (submitting) return; submitting = true;
    const button = document.querySelector('#auth-submit'), error = document.querySelector('#auth-error');
    const label = button.innerHTML; button.disabled = true; button.textContent = 'One moment…'; error.textContent = '';
    try {
      const result = await service.authenticate(page === 'signup' ? 'signup' : page === 'recover' ? 'recover' : 'login',Object.fromEntries(new FormData(form)));
      password.value = '';
      if (!document.contains(form)) return;
      if (result.recoveryCode) {
        document.querySelector('.auth-card').innerHTML = `<div class="auth-card-mark">${icon('shield')}</div><h2>Keep this somewhere safe.</h2><p>This is your ${page === 'recover' ? 'new ' : ''}recovery code. It’s shown once and lets you reset your password.</p><code class="recovery-code">${esc(result.recoveryCode)}</code><p class="form-hint">Save it in a password manager or another private place.${page === 'recover' ? ' Your previous code no longer works.' : ''}</p><button class="btn primary full" id="continue-account">I saved my code ${icon('arrow')}</button>`;
        document.querySelector('#continue-account').onclick = () => { location.hash = next; };
      } else location.hash = next;
    } catch (failure) { error.textContent = failure.message; button.disabled = false; button.innerHTML = label; submitting = false; }
  };
}
