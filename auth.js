/* auth.js — login / signup / reset / new password screens */
'use strict';

(function () {
  const Icon = window.Icon;
  const e = React.createElement;

  // Shown after user clicks the reset link in their email
  function SetNewPasswordScreen({ onDone }) {
    const [password, setPassword]   = React.useState('');
    const [confirm,  setConfirm]    = React.useState('');
    const [loading,  setLoading]    = React.useState(false);
    const [error,    setError]      = React.useState('');
    const [done,     setDone]       = React.useState(false);

    const submit = async (ev) => {
      ev.preventDefault();
      setError('');
      if (password.length < 6)       { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirm)      { setError('Passwords do not match.'); return; }
      setLoading(true);
      try {
        const { error } = await window.sb.auth.updateUser({ password });
        if (error) throw error;
        setDone(true);
        setTimeout(onDone, 1800);
      } catch (err) {
        setError(err.message || 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    };

    return e('div', { className: 'auth-screen' },
      e('div', { className: 'auth-card' },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 } },
          e('div', { className: 'brand-mark' }, e(Icon, { name: 'pocket', size: 20, sw: 2 })),
          e('span', { className: 'brand-name' }, 'Pocket')
        ),
        done
          ? e('div', { style: { textAlign: 'center', padding: '20px 0' } },
              e('div', { style: { fontSize: 36, marginBottom: 10 } }, '✓'),
              e('div', { style: { fontSize: 17, fontWeight: 640 } }, 'Password updated!'),
              e('div', { style: { fontSize: 14, color: 'var(--ink-3)', marginTop: 6 } }, 'Signing you in…')
            )
          : e(React.Fragment, null,
              e('h2', { style: { margin: '0 0 6px', fontSize: 22, fontWeight: 720, letterSpacing: '-0.02em' } }, 'Set new password'),
              e('p', { style: { margin: '0 0 22px', fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 } }, 'Choose a new password for your account.'),
              e('form', { onSubmit: submit },
                e('div', { className: 'field-label' }, 'New password'),
                e('input', {
                  className: 'text-input', type: 'password',
                  placeholder: 'At least 6 characters',
                  value: password, onChange: ev => setPassword(ev.target.value),
                  autoComplete: 'new-password', required: true, minLength: 6,
                  style: { marginBottom: 12 },
                }),
                e('div', { className: 'field-label' }, 'Confirm password'),
                e('input', {
                  className: 'text-input', type: 'password',
                  placeholder: '••••••••',
                  value: confirm, onChange: ev => setConfirm(ev.target.value),
                  autoComplete: 'new-password', required: true,
                  style: { marginBottom: 20 },
                }),
                error && e('div', { className: 'auth-msg auth-msg-err' }, error),
                e('button', {
                  type: 'submit', className: 'btn btn-primary',
                  style: { width: '100%', padding: 14, marginTop: error ? 12 : 0 },
                  disabled: loading,
                }, loading ? 'Saving…' : 'Set new password')
              )
            )
      )
    );
  }

  const GoogleIcon = () => e('svg', { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', style: { flexShrink: 0 } },
    e('path', { d: 'M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z', fill: '#4285F4' }),
    e('path', { d: 'M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z', fill: '#34A853' }),
    e('path', { d: 'M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z', fill: '#FBBC05' }),
    e('path', { d: 'M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z', fill: '#EA4335' }),
  );

  function AuthScreen() {
    const [mode, setMode]       = React.useState('signin'); // 'signin' | 'signup' | 'reset'
    const [email, setEmail]     = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [gLoading, setGLoading] = React.useState(false);
    const [error, setError]     = React.useState('');
    const [info, setInfo]       = React.useState('');

    const signInWithGoogle = async () => {
      setError(''); setInfo('');
      setGLoading(true);
      try {
        const redirectTo = window.location.origin + window.location.pathname;
        const { error } = await window.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
        if (error) throw error;
      } catch (err) {
        setError(err.message || 'Something went wrong.');
        setGLoading(false);
      }
    };

    const submit = async (ev) => {
      ev.preventDefault();
      setError(''); setInfo('');
      setLoading(true);
      try {
        if (mode === 'reset') {
          const redirectTo = window.location.origin + window.location.pathname;
          const { error } = await window.sb.auth.resetPasswordForEmail(email, { redirectTo });
          if (error) throw error;
          setInfo('Check your email for a reset link.');
        } else if (mode === 'signup') {
          const { error } = await window.sb.auth.signUp({ email, password });
          if (error) throw error;
          setInfo('Account created! You can now sign in.');
          setMode('signin');
        } else {
          const { error } = await window.sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
      } catch (err) {
        setError(err.message || 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    };

    const title    = mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Sign in';
    const btnLabel = mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in';
    const googleLabel = mode === 'signup' ? 'Sign up with Google' : 'Continue with Google';

    return e('div', { className: 'auth-screen' },
      e('div', { className: 'auth-card' },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 } },
          e('div', { className: 'brand-mark' }, e(Icon, { name: 'pocket', size: 20, sw: 2 })),
          e('span', { className: 'brand-name' }, 'Pocket')
        ),

        e('h2', { style: { margin: '0 0 6px', fontSize: 22, fontWeight: 720, letterSpacing: '-0.02em' } }, title),
        e('p', { style: { margin: '0 0 22px', fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 } },
          mode === 'signin' ? 'Welcome back.' : mode === 'signup' ? 'Your budget, in your pocket.' : "We'll email you a link."
        ),

        mode !== 'reset' && e(React.Fragment, null,
          e('button', {
            type: 'button',
            className: 'btn-google',
            onClick: signInWithGoogle,
            disabled: gLoading || loading,
          },
            e(GoogleIcon),
            gLoading ? 'Redirecting…' : googleLabel
          ),
          e('div', { className: 'auth-divider' },
            e('span', null, 'or')
          ),
        ),

        e('form', { onSubmit: submit },
          e('div', { className: 'field-label' }, 'Email'),
          e('input', {
            className: 'text-input', type: 'email', placeholder: 'you@example.com',
            value: email, onChange: ev => setEmail(ev.target.value),
            autoComplete: 'email', required: true,
            style: { marginBottom: 12 },
          }),

          mode !== 'reset' && e(React.Fragment, null,
            e('div', { className: 'field-label' }, 'Password'),
            e('input', {
              className: 'text-input', type: 'password',
              placeholder: mode === 'signup' ? 'At least 6 characters' : '••••••••',
              value: password, onChange: ev => setPassword(ev.target.value),
              autoComplete: mode === 'signup' ? 'new-password' : 'current-password',
              required: true, minLength: 6,
              style: { marginBottom: 20 },
            })
          ),

          mode === 'reset' && e('div', { style: { height: 20 } }),

          error && e('div', { className: 'auth-msg auth-msg-err' }, error),
          info  && e('div', { className: 'auth-msg auth-msg-ok'  }, info),

          e('button', {
            type: 'submit', className: 'btn btn-primary',
            style: { width: '100%', padding: 14, marginTop: error || info ? 12 : 0 },
            disabled: loading || gLoading,
          }, loading ? 'Please wait…' : btnLabel)
        ),

        e('div', { style: { marginTop: 18, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' } },
          mode === 'signin' && e(React.Fragment, null,
            e('button', { className: 'auth-link', onClick: () => { setMode('signup'); setError(''); setInfo(''); } }, 'Create account'),
            e('button', { className: 'auth-link', onClick: () => { setMode('reset'); setError(''); setInfo(''); } }, 'Forgot password?'),
          ),
          mode !== 'signin' && e('button', { className: 'auth-link', onClick: () => { setMode('signin'); setError(''); setInfo(''); } }, '← Back to sign in'),
        )
      )
    );
  }

  window.AuthScreen = AuthScreen;
  window.SetNewPasswordScreen = SetNewPasswordScreen;
})();
