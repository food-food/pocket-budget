/* notifications.js — notifications panel (budget invites) */
'use strict';

(function () {
  const Icon = window.Icon;
  const e = React.createElement;

  const ROLE_DESC = {
    viewer: 'view your budget',
    editor: 'view and edit your budget',
    owner:  'full access to your budget',
  };

  function NotificationsPanel({ onClose, onInviteAccepted }) {
    const [invites, setInvites] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [busy, setBusy]       = React.useState({}); // shareId → true while processing

    React.useEffect(() => { load(); }, []);

    const load = async () => {
      setLoading(true);
      const data = await window.DB.getPendingInvites();
      setInvites(data);
      setLoading(false);
    };

    const accept = async (invite) => {
      setBusy(b => ({ ...b, [invite.id]: true }));
      try {
        await window.DB.acceptInvite(invite.id);
        setInvites(prev => prev.filter(i => i.id !== invite.id));
        onInviteAccepted(); // refresh budget list
      } catch (err) {
        alert(err.message);
      } finally {
        setBusy(b => ({ ...b, [invite.id]: false }));
      }
    };

    const decline = async (invite) => {
      setBusy(b => ({ ...b, [invite.id]: true }));
      try {
        await window.DB.declineInvite(invite.id);
        setInvites(prev => prev.filter(i => i.id !== invite.id));
      } catch (err) {
        alert(err.message);
      } finally {
        setBusy(b => ({ ...b, [invite.id]: false }));
      }
    };

    return e('div', { className: 'scrim', onMouseDown: ev => { if (ev.target === ev.currentTarget) onClose(); } },
      e('div', { className: 'sheet' },

        e('div', { className: 'sheet-head' },
          e('h3', null, 'Notifications'),
          e('button', { className: 'x-btn', onClick: onClose }, e(Icon, { name: 'close', size: 17 }))
        ),

        loading && e('div', { style: { color: 'var(--ink-3)', fontSize: 14, padding: '16px 0', textAlign: 'center' } }, 'Loading…'),

        !loading && invites.length === 0 && e('div', { style: {
          textAlign: 'center', padding: '36px 0',
          color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6,
        } },
          e('div', { style: { fontSize: 32, marginBottom: 10 } }, '🔔'),
          e('div', { style: { fontWeight: 580, marginBottom: 4, color: 'var(--ink-2)' } }, "You're all caught up"),
          e('div', null, 'No pending invites.')
        ),

        !loading && invites.length > 0 && e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          invites.map(invite =>
            e('div', { key: invite.id, style: {
              border: '1px solid var(--hairline)',
              borderRadius: 14, overflow: 'hidden',
            } },
              // invite info
              e('div', { style: { padding: '14px 16px' } },
                e('div', { style: { fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 } }, 'Budget invite'),
                e('div', { style: { fontSize: 15.5, fontWeight: 640, marginBottom: 4, letterSpacing: '-0.01em' } },
                  invite.budget_name || 'Shared Budget'
                ),
                e('div', { style: { fontSize: 13, color: 'var(--ink-3)' } },
                  `You've been invited to ${ROLE_DESC[invite.role] || invite.role}.`
                )
              ),
              // actions
              e('div', { style: {
                display: 'flex', gap: 8, padding: '10px 14px',
                borderTop: '1px solid var(--hairline)',
                background: 'var(--card-2)',
              } },
                e('button', {
                  className: 'btn btn-primary',
                  style: { flex: 1, padding: '8px 0', fontSize: 13.5 },
                  disabled: busy[invite.id],
                  onClick: () => accept(invite),
                }, busy[invite.id] ? '…' : 'Accept'),
                e('button', {
                  className: 'btn btn-ghost',
                  style: { padding: '8px 16px', fontSize: 13.5 },
                  disabled: busy[invite.id],
                  onClick: () => decline(invite),
                }, 'Decline')
              )
            )
          )
        )
      )
    );
  }

  window.NotificationsPanel = NotificationsPanel;
})();
