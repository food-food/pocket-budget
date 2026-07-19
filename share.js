/* share.js — share / invite panel */
'use strict';

(function () {
  const Icon = window.Icon;
  const e = React.createElement;

  const ROLE_LABELS = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
  const ROLE_COLORS = { owner: 'var(--accent)', editor: 'var(--good)', viewer: 'var(--ink-3)' };

  function RoleBadge({ role }) {
    return e('span', {
      style: {
        fontSize: 11, fontWeight: 680, padding: '3px 8px', borderRadius: 99,
        background: 'var(--card-2)', color: ROLE_COLORS[role] || 'var(--ink-3)',
        letterSpacing: '0.02em',
      }
    }, ROLE_LABELS[role] || role);
  }

  function SharePanel({ budgetId, budgetName, onClose }) {
    const [shares, setShares] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [inviteEmail, setInviteEmail] = React.useState('');
    const [inviteRole, setInviteRole] = React.useState('viewer');
    const [inviting, setInviting] = React.useState(false);
    const [error, setError] = React.useState('');
    const [info, setInfo] = React.useState('');

    React.useEffect(() => { loadShares(); }, []);

    const loadShares = async () => {
      setLoading(true);
      try {
        const data = await window.DB.getShares(budgetId);
        setShares(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const invite = async (ev) => {
      ev.preventDefault();
      if (!inviteEmail.trim()) return;
      setError(''); setInfo('');
      setInviting(true);
      try {
        await window.DB.inviteByEmail(budgetId, inviteEmail, inviteRole, budgetName);
        setInfo(`Invited ${inviteEmail}. They'll see this budget after signing in.`);
        setInviteEmail('');
        loadShares();
      } catch (err) {
        setError(err.message);
      } finally {
        setInviting(false);
      }
    };

    const revoke = async (shareId) => {
      if (!confirm("Remove this person's access?")) return;
      try {
        await window.DB.revokeShare(shareId);
        setShares(s => s.filter(x => x.id !== shareId));
      } catch (err) {
        setError(err.message);
      }
    };

    return e('div', { className: 'scrim', onMouseDown: (ev) => { if (ev.target === ev.currentTarget) onClose(); } },
      e('div', { className: 'sheet' },
        e('div', { className: 'sheet-head' },
          e('h3', null, 'Share budget'),
          e('button', { className: 'x-btn', onClick: onClose, 'aria-label': 'Close' }, e(Icon, { name: 'close', size: 17 }))
        ),

        // Budget name
        e('div', { style: { fontSize: 13, color: 'var(--ink-3)', marginBottom: 18, fontWeight: 520 } },
          'Sharing "', e('strong', { style: { color: 'var(--ink-2)' } }, budgetName), '"'
        ),

        // Current access list
        e('div', { className: 'field-label' }, 'People with access'),
        loading
          ? e('div', { style: { color: 'var(--ink-3)', fontSize: 14, padding: '12px 0' } }, 'Loading…')
          : e('div', { style: { borderRadius: 13, overflow: 'hidden', border: '1px solid var(--hairline)' } },
              shares.length === 0
                ? e('div', { style: { padding: '14px 16px', fontSize: 14, color: 'var(--ink-3)' } }, 'Only you have access.')
                : shares.map((s, i) =>
                    e('div', {
                      key: s.id,
                      style: {
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderTop: i > 0 ? '1px solid var(--hairline)' : 'none',
                      }
                    },
                      e('div', { style: { flex: 1, minWidth: 0 } },
                        e('div', { style: { fontSize: 14, fontWeight: 580, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, s.invited_email),
                        e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 } },
                          s.accepted_at ? 'Active' : 'Invite pending'
                        )
                      ),
                      e(RoleBadge, { role: s.role }),
                      e('button', {
                        style: { width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', flexShrink: 0 },
                        onClick: () => revoke(s.id), title: 'Remove access',
                      }, e(Icon, { name: 'close', size: 14 }))
                    )
                  )
            ),

        // Invite form
        e('div', { className: 'field-label', style: { marginTop: 20 } }, 'Invite someone'),
        error && e('div', { className: 'auth-msg auth-msg-err', style: { marginBottom: 10 } }, error),
        info  && e('div', { className: 'auth-msg auth-msg-ok',  style: { marginBottom: 10 } }, info),

        e('form', { onSubmit: invite },
          e('input', {
            className: 'text-input', type: 'email', placeholder: 'friend@example.com',
            value: inviteEmail, onChange: ev => setInviteEmail(ev.target.value),
            style: { marginBottom: 10 },
          }),

          // Role picker
          e('div', { className: 'field-label' }, 'Permission'),
          e('div', { className: 'chips', style: { marginBottom: 16 } },
            [['viewer','Viewer — can see everything'],['editor','Editor — can add & edit']].map(([role, label]) =>
              e('button', {
                key: role, type: 'button',
                className: 'chip' + (inviteRole === role ? ' on' : ''),
                style: inviteRole === role ? { color: 'var(--accent)' } : null,
                onClick: () => setInviteRole(role),
              }, label)
            )
          ),

          e('button', {
            type: 'submit', className: 'btn btn-primary',
            style: { width: '100%', padding: 13 },
            disabled: inviting || !inviteEmail.trim(),
          }, inviting ? 'Sending…' : e(React.Fragment, null, e(Icon, { name: 'plus', size: 16 }), ' Send invite'))
        ),

        // Hint
        e('p', { style: { fontSize: 12.5, color: 'var(--ink-3)', marginTop: 14, lineHeight: 1.5 } },
          "They'll need to create a Pocket account with that email address. Once signed in, this budget will appear in their budget switcher."
        )
      )
    );
  }

  window.SharePanel = SharePanel;
})();
