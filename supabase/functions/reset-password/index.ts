/// <reference lib="deno.ns" />
import { serve } from "std/http/server.ts";

/**
 * Supabase Edge Function: reset-password
 *
 * Serves a simple HTML page where users can set a new password.
 * Flow: email link → this page (with token_hash + type in URL) → user enters new password → Supabase updates it.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req: Request) => {
  // This function only serves GET requests (the browser opens the link)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  // Extract query params from the URL that Supabase appends
  const url = new URL(req.url);

  // Build the HTML page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="referrer" content="no-referrer" />
  <title>Reset Password — Caloric</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
    }
    .logo { font-size: 32px; margin-bottom: 8px; }
    h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
    .subtitle { color: #999; font-size: 14px; margin-bottom: 28px; }
    .field { text-align: left; margin-bottom: 16px; }
    label { display: block; font-size: 13px; color: #aaa; margin-bottom: 6px; }
    input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      background: #111;
      border: 1px solid #333;
      border-radius: 10px;
      color: #f5f5f5;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="password"]:focus { border-color: #4CAF50; }
    .btn {
      width: 100%;
      padding: 14px;
      background: #4CAF50;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { color: #ef4444; font-size: 14px; margin-top: 12px; display: none; }
    .success { display: none; }
    .success h2 { color: #4CAF50; margin-bottom: 8px; }
    .success p { color: #999; font-size: 14px; line-height: 1.5; }
    .check { font-size: 48px; margin-bottom: 12px; }
    .requirements { color: #777; font-size: 12px; margin-top: 4px; text-align: left; }
  </style>
</head>
<body>
  <div class="card">
    <!-- Form State -->
    <div id="form-state">
      <div class="logo">🔥</div>
      <h1>Reset Your Password</h1>
      <p class="subtitle">Enter your new password below</p>
      <form id="reset-form">
        <div class="field">
          <label for="password">New Password</label>
          <input type="password" id="password" placeholder="Enter new password" required minlength="8" autocomplete="new-password" />
          <p class="requirements">At least 8 characters</p>
        </div>
        <div class="field">
          <label for="confirm">Confirm Password</label>
          <input type="password" id="confirm" placeholder="Confirm new password" required minlength="8" autocomplete="new-password" />
        </div>
        <button type="submit" class="btn" id="submit-btn">Update Password</button>
        <p class="error" id="error-msg"></p>
      </form>
    </div>

    <!-- Success State -->
    <div class="success" id="success-state">
      <div class="check">✅</div>
      <h2>Password Updated!</h2>
      <p>Your password has been changed successfully.<br />You can now go back to the Caloric app and sign in with your new password.</p>
    </div>

    <!-- Token Error State -->
    <div class="success" id="error-state" style="display:none;">
      <div class="check">❌</div>
      <h2>Link Expired</h2>
      <p>This password reset link is invalid or has expired.<br />Please request a new one from the app.</p>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script>
    const SUPABASE_URL = "${SUPABASE_URL}";
    const SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}";

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const formState = document.getElementById('form-state');
    const successState = document.getElementById('success-state');
    const errorState = document.getElementById('error-state');
    const errorMsg = document.getElementById('error-msg');
    const submitBtn = document.getElementById('submit-btn');

    // Check for error in URL hash (Supabase redirects with error in hash for implicit flow)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    // For PKCE flow, Supabase sends ?code=...
    const code = queryParams.get('code');
    const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
    const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

    // If there's an error from Supabase, show error state
    if (errorCode || errorDescription) {
      formState.style.display = 'none';
      errorState.style.display = 'block';
      console.error('Auth error:', errorCode, errorDescription);
    } else if (code) {
      // Exchange the PKCE code for a session
      (async () => {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          formState.style.display = 'none';
          errorState.style.display = 'block';
          console.error('Code exchange error:', error.message);
        }
        // Session is now active, user can update password
      })();
    } else {
      // Check for token_hash + type (implicit/magic link flow)
      const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
      const type = queryParams.get('type') || hashParams.get('type');
      if (!tokenHash && !code) {
        // Check if there's an access_token in the hash (implicit flow)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken) {
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        } else {
          // No token at all
          formState.style.display = 'none';
          errorState.style.display = 'block';
        }
      } else if (tokenHash && type) {
        // Verify OTP with token_hash
        (async () => {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type });
          if (error) {
            formState.style.display = 'none';
            errorState.style.display = 'block';
            console.error('OTP verify error:', error.message);
          }
        })();
      }
    }

    document.getElementById('reset-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.style.display = 'none';

      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirm').value;

      if (password !== confirm) {
        errorMsg.textContent = 'Passwords do not match';
        errorMsg.style.display = 'block';
        return;
      }

      if (password.length < 8) {
        errorMsg.textContent = 'Password must be at least 8 characters';
        errorMsg.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        errorMsg.textContent = error.message;
        errorMsg.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password';
        return;
      }

      formState.style.display = 'none';
      successState.style.display = 'block';
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      Expires: "0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
    },
  });
});
