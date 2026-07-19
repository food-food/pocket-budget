/* deleteaccount.js — account deletion with password + OTP email verification */
'use strict';

(function () {
  const Icon = window.Icon;
  const e = React.createElement;

  const STEP = { CONFIRM: 'confirm', OTP: 'otp', DONE: 'done' };

  function DeleteAccountSheet({ currentEmail, onClose, onDeleted }) {
    const [step, setStep]       = React.useState(STEP.CONFIRM);
    const [email, setEmail]     = React.useState('');
    const [password, setPassword] = React.useState('');
    const [otp, setOtp]         = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError]     = React.useState('');

    // Step 1: verify email + password, then send OTP
    const submitConfirm = async (ev) => {
      ev.preventDefault();
      setError('');
      if (email.toLowerCase().trim() !== currentEmail.toLowerCase()) {
        setError('Email does not match your account.');
        return;
      }
      setLoading(true);
      try {
        // Re-authenticate to verify password
        const { error: authErr } = await window.sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authErr) throw authErr;

        // Send OTP to their email as a second factor
        const { error: otpErr } = await window.sb.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false },
        });
        if (otpErr) throw otpErr;

        setStep(STEP.OTP);
      } catch (err) {
        setError(err.message || 'Incorrect email or password.');
      } finally {
        setLoading(false);
      }
    };

    // Step 2: verify OTP, then delete account
    const submitOtp = async (ev) => {
      ev.preventDefault();
      setError('');
      if (otp.trim().length < 6) { setError('Enter the 6-digit code from your email.'); return; }
      setLoading(true);
      try {
        // Verify the OTP
        const { error: verifyErr } = await window.sb.auth.verifyOtp({
          email: email.trim(),
          token: otp.trim(),
          type: 'email',
        });
        if (verifyErr) throw verifyErr;

        // Delete all data + auth account
        const { error: deleteErr } = await window.sb.rpc('delete_my_account');
        if (deleteErr) throw deleteErr;

        setStep(STEP.DONE);
        setTimeout(() => {
          window.sb.auth.signOut();
          onDeleted?.();
        }, 2000);
      } catch (err) {
        setError(err.message || 'Invalid code. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const resendOtp = async () => {
      setError('');
      await window.sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
      setError('New code sent — check your email.');
    };

    return e('div', { className: 'scrim', onMouseDown: ev => { if (ev.target === ev.currentTarget && step !== STEP.DONE) onClose(); } },
      e('div', { className: 'sheet' },

        e('div', { className: 'sheet-head' },
          e('h3', { style: { color: 'var(--bad)' } }, 'Delete account'),
          step !== STEP.DONE && e('button', { className: 'x-btn', onClick: onClose }, e(Icon, { name: 'close', size: 17 }))
        ),

        // ── Step 1: confirm identity ──
        step === STEP.CONFIRM && e('form', { onSubmit: submitConfirm },
          e('div', { style: {
            background: 'rgba(255,59,48,0.08)', borderRadius: 12,
            padding: '12px 14px', marginBottom: 18,
            fontSize: 13.5, color: 'var(--bad)', lineHeight: 1.55,
          } },
            '⚠️ This permanently deletes your account, all transactions, and budget data. This cannot be undone.'
          ),

          e('div', { className: 'field-label' }, 'Confirm your email'),
          e('input', {
            className: 'text-input', type: 'email',
            placeholder: currentEmail,
            value: email,
            onChange: ev => setEmail(ev.target.value),
            required: true,
            autoComplete: 'email',
            style: { marginBottom: 10 },
          }),

          e('div', { className: 'field-label' }, 'Confirm your password'),
          e('input', {
            className: 'text-input', type: 'password',
            placeholder: '••••••••',
            value: password,
            onChange: ev => setPassword(ev.target.value),
            required: true,
            autoComplete: 'current-password',
            style: { marginBottom: 16 },
          }),

          error && e('div', { className: 'auth-msg auth-msg-err', style: { marginBottom: 12 } }, error),

          e('button', {
            type: 'submit',
            className: 'btn',
            style: { width: '100%', padding: 14, background: 'var(--bad)', color: '#fff', borderRadius: 12, fontWeight: 640, fontSize: 15 },
            disabled: loading || !email || !password,
          }, loading ? 'Verifying…' : 'Send confirmation email')
        ),

        // ── Step 2: enter OTP ──
        step === STEP.OTP && e('form', { onSubmit: submitOtp },
          e('div', { style: {
            background: 'var(--card-2)', borderRadius: 12,
            padding: '14px 16px', marginBottom: 18,
            fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, textAlign: 'center',
          } },
            e('div', { style: { fontSize: 28, marginBottom: 6 } }, '📧'),
            e('div', { style: { fontWeight: 640, marginBottom: 4 } }, 'Check your email'),
            e('div', { style: { fontSize: 13, color: 'var(--ink-3)' } },
              'We sent a 6-digit code to ',
              e('strong', { style: { color: 'var(--ink-2)' } }, email),
              '. Enter it below to confirm deletion.'
            )
          ),

          e('div', { className: 'field-label' }, 'Verification code'),
          e('input', {
            className: 'text-input tnum',
            type: 'text', inputMode: 'numeric',
            placeholder: '000000',
            maxLength: 6,
            value: otp,
            onChange: ev => setOtp(ev.target.value.replace(/\D/g, '')),
            autoComplete: 'one-time-code',
            style: { marginBottom: 16, fontSize: 22, letterSpacing: '0.3em', textAlign: 'center' },
          }),

          error && e('div', {
            className: 'auth-msg ' + (error.includes('sent') ? 'auth-msg-ok' : 'auth-msg-err'),
            style: { marginBottom: 12 }
          }, error),

          e('button', {
            type: 'submit',
            className: 'btn',
            style: { width: '100%', padding: 14, background: 'var(--bad)', color: '#fff', borderRadius: 12, fontWeight: 640, fontSize: 15, marginBottom: 10 },
            disabled: loading || otp.length < 6,
          }, loading ? 'Deleting…' : 'Permanently delete my account'),

          e('button', {
            type: 'button',
            className: 'btn btn-ghost',
            style: { width: '100%', fontSize: 13.5 },
            onClick: resendOtp,
          }, "Didn't get the email? Resend")
        ),

        // ── Done ──
        step === STEP.DONE && e('div', { style: { textAlign: 'center', padding: '24px 0' } },
          e('div', { style: { fontSize: 40, marginBottom: 12 } }, '✓'),
          e('div', { style: { fontSize: 16, fontWeight: 640, marginBottom: 8 } }, 'Account deleted'),
          e('div', { style: { fontSize: 14, color: 'var(--ink-3)' } }, 'All your data has been removed. Signing you out…')
        )
      )
    );
  }

  window.DeleteAccountSheet = DeleteAccountSheet;
})();
