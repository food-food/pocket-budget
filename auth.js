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
          e('div', { className: 'brand-mark' }, e(Icon, { name: 'wallet', size: 20, sw: 2 })),
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

  function AuthScreen() {
    const [mode, setMode]       = React.useState('signin'); // 'signin' | 'signup' | 'reset'
    const [email, setEmail]     = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError]     = React.useState('');
    const [info, setInfo]       = React.useState('');

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

    return e('div', { className: 'auth-screen' },
      e('div', { className: 'auth-card' },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 } },
          e('div', { className: 'brand-mark' }, e(Icon, { name: 'wallet', size: 20, sw: 2 })),
          e('span', { className: 'brand-name' }, 'Pocket')
        ),

        e('h2', { style: { margin: '0 0 6px', fontSize: 22, fontWeight: 720, letterSpacing: '-0.02em' } }, title),
        e('p', { style: { margin: '0 0 22px', fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 } },
          mode === 'signin' ? 'Welcome back.' : mode === 'signup' ? 'Your budget, in your pocket.' : "We'll email you a link."
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
            disabled: loading,
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
