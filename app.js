/* app.js — root: auth, cloud state, nav, permissions, layout */
'use strict';

(function () {
  const B = window.Budget;
  const { fmt, ACCOUNTS, isoDate, monthRange, ytdRange, parseISO, deriveBalances, defaultSettings } = B;
  const Icon = window.Icon, Badge = window.Badge, DateFilter = window.DateFilter, rangeLabel = window.rangeLabel;
  const { filterTx } = window.Selectors;
  const { Overview, Transactions, Savings, AddSheet, SettingsSheet, ImportSheet, AuthScreen, SetNewPasswordScreen, SharePanel, AssistantPanel, ReportSheet, DeleteAccountSheet, NotificationsPanel } = window;
  const e = React.createElement;

  const NAV = [
    { id: 'overview',     label: 'Overview',     icon: 'home'    },
    { id: 'transactions', label: 'Transactions', icon: 'list'    },
    { id: 'savings',      label: 'Savings',      icon: 'savings' },
  ];

  // ---------- loading screen ----------

  function Spinner({ label }) {
    return e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 14, color: 'var(--ink-3)' } },
      e('div', { className: 'spin-ring' }),
      label && e('span', { style: { fontSize: 14, fontWeight: 520 } }, label)
    );
  }

  // ---------- main app ----------

  function App() {
    const [dark, setDark] = React.useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches);

    // Auth
    const [session, setSession] = React.useState(null);
    const [authLoading, setAuthLoading] = React.useState(true);
    const [passwordRecovery, setPasswordRecovery] = React.useState(false);

    // Budgets
    const [allBudgets, setAllBudgets] = React.useState([]);      // [{...budget, role}]
    const [activeBudget, setActiveBudget] = React.useState(null);
    const [budgetLoading, setBudgetLoading] = React.useState(false);
    const [budgetError, setBudgetError] = React.useState('');

    // Data
    const [transactions, setTransactions] = React.useState([]);
    const [settings, setSettings] = React.useState(defaultSettings());

    // UI
    const [nav, setNav] = React.useState('overview');
    const [add, setAdd] = React.useState(null);
    const [editing, setEditing] = React.useState(null);
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const [importOpen, setImportOpen] = React.useState(false);
    const [shareOpen, setShareOpen] = React.useState(false);
    const [catFilter, setCatFilter] = React.useState('all');
    const [budgetMenuOpen, setBudgetMenuOpen] = React.useState(false);
    const [assistantOpen, setAssistantOpen] = React.useState(false);
    const [reportOpen, setReportOpen] = React.useState(false);
    const [deleteAccountOpen, setDeleteAccountOpen] = React.useState(false);
    const [notifOpen, setNotifOpen] = React.useState(false);
    const [pendingInvites, setPendingInvites] = React.useState([]);

    const now = new Date();
    const [filter, setFilter] = React.useState(() => ({
      mode: 'month', year: now.getFullYear(), month: now.getMonth(),
      customStart: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      customEnd: isoDate(now),
    }));

    // Dark mode
    React.useEffect(() => {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }, [dark]);

    // Auth listener
    React.useEffect(() => {
      window.sb.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setAuthLoading(false);
      });
      const { data: { subscription } } = window.sb.auth.onAuthStateChange((_event, session) => {
        if (_event === 'PASSWORD_RECOVERY') {
          // User arrived via password-reset link — show "set new password" form
          setPasswordRecovery(true);
          setAuthLoading(false);
          return;
        }
        setSession(session);
        if (!session) {
          setPasswordRecovery(false);
          setAllBudgets([]); setActiveBudget(null);
          setTransactions([]); setSettings(defaultSettings());
        }
      });
      return () => subscription.unsubscribe();
    }, []);

    // Load budgets when session changes
    React.useEffect(() => {
      if (!session) return;
      loadBudgets();
    }, [session?.user?.id]);

    async function loadBudgets() {
      setBudgetLoading(true); setBudgetError('');
      try {
        const { own, shared } = await window.DB.init(session);
        const all = [own, ...shared];
        setAllBudgets(all);
        setActiveBudget(own);
        await loadBudgetData(own);
        // Load pending invites for notification badge
        const invites = await window.DB.getPendingInvites();
        setPendingInvites(invites);
      } catch (err) {
        setBudgetError(err.message || 'Failed to load budget.');
      } finally {
        setBudgetLoading(false);
      }
    }

    async function refreshAfterAccept() {
      // Re-run full budget load so newly accepted budget appears
      await loadBudgets();
      setNotifOpen(false);
    }

    async function loadBudgetData(budget) {
      const txs = await window.DB.loadTransactions(budget.id);
      const s = Object.assign(defaultSettings(), budget.settings || {});
      const canW = budget.role !== 'viewer';
      if (canW) {
        const synced = await window.DB.syncAllowance(budget.id, txs, s);
        const { reconcileSavings } = B;
        const { transactions: withSavings, changed } = reconcileSavings(synced);
        if (changed) await window.DB.syncAutoSavings(budget.id, withSavings);
        setTransactions(withSavings);
      } else {
        const { reconcileAllowance, reconcileSavings } = B;
        const r = reconcileAllowance(txs, s);
        const { transactions: withSavings } = reconcileSavings(r.transactions);
        setTransactions(withSavings);
      }
      setSettings(s);
    }

    async function switchBudget(budget) {
      setBudgetMenuOpen(false);
      setActiveBudget(budget);
      setBudgetLoading(true);
      try { await loadBudgetData(budget); } catch (e) { console.error(e); }
      finally { setBudgetLoading(false); }
    }

    // Permissions
    const canWrite = activeBudget && activeBudget.role !== 'viewer';
    const isOwner  = activeBudget && activeBudget.role === 'owner';

    // ---------- data mutators (optimistic + async persist) ----------

    const addTx = async (tx) => {
      if (!canWrite) return;
      const sorted = [...transactions, tx].sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(sorted);
      await window.DB.addTx(activeBudget.id, tx);
    };

    const editTx = async (tx) => {
      if (!canWrite) return;
      const updated = transactions.map(x => x.id === tx.id ? tx : x).sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(updated);
      await window.DB.editTx(tx);
    };

    const delTx = async (id) => {
      if (!canWrite) return;
      setTransactions(prev => prev.filter(x => x.id !== id));
      await window.DB.deleteTx(id);
    };

    const importTxs = async (txs) => {
      if (!canWrite) return;
      const existingIds = new Set(transactions.map(t => t.id));
      const fresh = txs.filter(t => !existingIds.has(t.id));
      const merged = [...transactions, ...fresh].sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(merged);
      await window.DB.importTxs(activeBudget.id, fresh);
    };

    const saveSettings = async (next) => {
      if (!canWrite) return;
      const merged = Object.assign({}, settings, next);
      setSettings(merged);
      const synced = await window.DB.syncAllowance(activeBudget.id, transactions, merged);
      setTransactions(synced);
      await window.DB.saveSettings(activeBudget.id, merged);
    };

    const clearAll = async () => {
      if (!canWrite) return;
      if (!confirm('Clear all transactions? Your recurring allowance will still post each month.')) return;
      const { reconcileAllowance } = B;
      const r = reconcileAllowance([], settings);
      // delete all non-auto, upsert auto
      await window.sb.from('transactions').delete().eq('budget_id', activeBudget.id).eq('auto', false);
      if (r.transactions.length) {
        await window.DB.importTxs(activeBudget.id, r.transactions);
      }
      setTransactions(r.transactions);
    };

    const signOut = async () => {
      await window.sb.auth.signOut();
    };

    const goto = (tab, cat) => {
      setNav(tab);
      if (cat) setCatFilter(cat);
      else if (tab === 'transactions') setCatFilter('all');
    };

    // ---------- derived ----------

    const allTx = transactions;
    const balances = React.useMemo(() => deriveBalances(allTx), [allTx]);
    const range = React.useMemo(() => {
      if (filter.mode === 'month') return monthRange(filter.year, filter.month);
      if (filter.mode === 'ytd')   return ytdRange(filter.year);
      return { start: parseISO(filter.customStart), end: parseISO(filter.customEnd) };
    }, [filter]);
    const filtered  = React.useMemo(() => filterTx(allTx, range), [allTx, range]);
    const minYear   = React.useMemo(() => allTx.length ? parseISO(allTx[allTx.length - 1].date).getFullYear() : now.getFullYear(), [allTx]);
    const accent    = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0A84FF';

    const titles = { overview: 'Overview', transactions: 'Transactions', savings: 'Savings' };
    const subs = {
      overview: 'Your money at a glance',
      transactions: `${filtered.length} ${filtered.length === 1 ? 'item' : 'items'} · ${rangeLabel(filter)}`,
      savings: 'Watch your total grow',
    };

    // ---------- render gates ----------

    if (authLoading) return e(Spinner, { label: 'Loading…' });
    if (passwordRecovery) return e(SetNewPasswordScreen, {
      onDone: () => { setPasswordRecovery(false); }
    });
    if (!session)    return e(AuthScreen, null);
    if (budgetLoading && !activeBudget) return e(Spinner, { label: 'Setting up your budget…' });
    if (budgetError) return e('div', { style: { padding: 40, color: 'var(--bad)', fontWeight: 600 } }, budgetError);

    // ---------- sidebar budget switcher ----------

    const sharedBudgets = allBudgets.filter(b => b.role !== 'owner');
    const showSwitcher  = allBudgets.length > 1;

    const budgetSwitcher = showSwitcher && e(React.Fragment, null,
      e('button', {
        className: 'nav-item',
        onClick: () => setBudgetMenuOpen(v => !v),
        style: { fontSize: 13.5, color: 'var(--ink-3)', justifyContent: 'space-between' },
      },
        e('span', null, activeBudget?.name || 'Budget'),
        e(Icon, { name: budgetMenuOpen ? 'chevDown' : 'chevR', size: 16 })
      ),
      budgetMenuOpen && allBudgets.map(b =>
        e('div', { key: b.id, style: { display: 'flex', alignItems: 'center' } },
          e('button', {
            className: 'nav-item' + (activeBudget?.id === b.id ? ' active' : ''),
            style: { paddingLeft: 28, fontSize: 14, flex: 1 },
            onClick: () => switchBudget(b),
          },
            e('span', { style: { flex: 1 } }, b.name),
            e('span', { style: { fontSize: 11, color: b.role === 'owner' ? 'var(--accent)' : 'var(--ink-3)', fontWeight: 620 } },
              b.role === 'owner' ? 'You' : b.role
            )
          ),
          b.role !== 'owner' && e('button', {
            title: 'Leave this budget',
            style: { padding: '6px 8px', color: 'var(--ink-3)', flexShrink: 0 },
            onClick: async (ev) => {
              ev.stopPropagation();
              if (!confirm(`Leave "${b.name}"? You'll lose access unless re-invited.`)) return;
              try {
                await window.DB.leaveSharedBudget(b.id);
                setAllBudgets(prev => prev.filter(x => x.id !== b.id));
                if (activeBudget?.id === b.id) {
                  const fallback = allBudgets.find(x => x.id !== b.id);
                  if (fallback) switchBudget(fallback);
                }
                setBudgetMenuOpen(false);
              } catch (err) {
                alert(err.message);
              }
            },
          }, e(Icon, { name: 'close', size: 13 }))
        )
      )
    );

    // ---------- main render ----------

    return e('div', { className: 'app' },
      // Sidebar
      e('aside', { className: 'sidebar' },
        e('div', { className: 'brand' },
          e('div', { className: 'brand-mark' }, e(Icon, { name: 'pocket', size: 20, sw: 2 })),
          e('span', { className: 'brand-name' }, 'Pocket')
        ),

        budgetSwitcher,

        // Notifications (top of nav, with red dot badge)
        e('button', {
          className: 'nav-item',
          onClick: () => setNotifOpen(true),
          style: { position: 'relative' },
        },
          e(Icon, { name: 'bell', size: 21 }), ' Notifications',
          pendingInvites.length > 0 && e('span', { style: {
            position: 'absolute', top: 8, left: 26,
            width: 9, height: 9, borderRadius: '50%',
            background: 'var(--bad)',
            border: '2px solid var(--sidebar-bg, var(--bg))',
          } })
        ),

        NAV.map(n =>
          e('button', { key: n.id, className: 'nav-item' + (nav === n.id ? ' active' : ''), onClick: () => goto(n.id) },
            e(Icon, { name: n.icon, size: 21 }), ' ', n.label
          )
        ),
        e('button', { className: 'nav-item', onClick: () => setSettingsOpen(true) },
          e(Icon, { name: 'gear', size: 21 }), ' Settings'
        ),
        canWrite && e('button', { className: 'nav-item', onClick: () => setImportOpen(true) },
          e(Icon, { name: 'arrowDown', size: 21 }), ' Import Apple Cash'
        ),
        isOwner && e('button', { className: 'nav-item', onClick: () => setShareOpen(true) },
          e(Icon, { name: 'spark', size: 21 }), ' Share budget'
        ),
        canWrite && e('button', { className: 'nav-item', onClick: () => setAssistantOpen(true) },
          e('span', { style: { fontSize: 19, lineHeight: 1, marginRight: 1 } }, '✦'), ' AI Assistant'
        ),
        e('button', { className: 'nav-item', onClick: () => setReportOpen(true) },
          e(Icon, { name: 'chart', size: 21 }), ' Monthly report'
        ),

        e('div', { className: 'sidebar-foot' },
          canWrite && e('button', { className: 'btn btn-primary', style: { width: '100%', marginBottom: 16 }, onClick: () => setAdd('expense') },
            e(Icon, { name: 'plus', size: 18 }), ' Add transaction'
          ),
          !canWrite && e('div', { style: { padding: '10px 0 16px', fontSize: 13, color: 'var(--ink-3)', fontWeight: 520 } },
            '👁 View only'
          ),
          ACCOUNTS.map(a =>
            e('div', { className: 'acct-mini', key: a.id },
              e('div', { className: 'acct-dot', style: { background: a.color } }, e(Icon, { name: a.icon, size: 16 })),
              e('span', { className: 'nm' }, a.label),
              e('span', { className: 'bal tnum' }, fmt(balances[a.id]))
            )
          ),
          e('div', { style: { marginTop: 12, borderTop: '1px solid var(--hairline)', paddingTop: 10 } },
            e('div', { style: { fontSize: 12, color: 'var(--ink-3)', padding: '4px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              session.user.email
            ),
            e('button', { className: 'theme-toggle btn btn-ghost', style: { width: '100%' }, onClick: () => setDark(v => !v) },
              e(Icon, { name: dark ? 'sun' : 'moon', size: 16 }), dark ? 'Light mode' : 'Dark mode'
            ),
            canWrite && allTx.length > 0 && e('button', {
              className: 'btn btn-ghost',
              style: { width: '100%', marginTop: 2, fontSize: 13, color: 'var(--ink-3)' },
              onClick: clearAll,
            }, 'Reset data'),
            e('button', { className: 'btn btn-ghost', style: { width: '100%', marginTop: 2, fontSize: 13, color: 'var(--ink-3)' }, onClick: signOut }, 'Sign out'),
          )
        )
      ),

      // Content
      e('main', { className: 'content' },
        e('div', { className: 'content-inner' },
          e('div', { className: 'page-head' },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
              e('div', { style: { display: 'flex', gap: 4 } },
                e('button', { className: 'settings-mobile x-btn', onClick: () => setSettingsOpen(true), 'aria-label': 'Settings' }, e(Icon, { name: 'gear', size: 18 })),
                canWrite && e('button', { className: 'settings-mobile x-btn', onClick: () => setAssistantOpen(true), 'aria-label': 'AI Assistant', style: { fontSize: 16 } }, '✦'),
                e('button', {
                  className: 'settings-mobile x-btn',
                  onClick: () => setNotifOpen(true),
                  'aria-label': 'Notifications',
                  style: { position: 'relative' },
                },
                  e(Icon, { name: 'bell', size: 18 }),
                  pendingInvites.length > 0 && e('span', { style: {
                    position: 'absolute', top: 4, right: 4,
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--bad)', border: '1.5px solid var(--bg)',
                  } })
                ),
              ),
                e('div', null,
                  e('h1', { className: 'page-title' }, titles[nav]),
                  e('div', { className: 'page-sub' }, subs[nav])
                )
              ),
            e(DateFilter, { filter, onChange: setFilter, minYear, maxDate: now })
          ),

          nav === 'overview'     && e(Overview,      { allTx, filtered, filter, range, balances, settings, onAdd: canWrite ? setAdd : null, onGoto: goto, onOpenReport: () => setReportOpen(true), accent }),
          nav === 'transactions' && e(Transactions,  { filtered, catFilter, setCatFilter, onDelete: canWrite ? delTx : null, onEdit: canWrite ? setEditing : null }),
          nav === 'savings'      && e(Savings,       { allTx, filtered, filter, settings, onAdd: canWrite ? setAdd : null, onOpenSettings: canWrite ? () => setSettingsOpen(true) : null })
        )
      ),

      // Mobile FAB (write only)
      canWrite && e('button', { className: 'fab', onClick: () => setAdd('expense'), 'aria-label': 'Add' }, e(Icon, { name: 'plus', size: 26, sw: 2.2 })),

      // Mobile tab bar
      e('nav', { className: 'tabbar' },
        NAV.map(n =>
          e('button', { key: n.id, className: 'tab' + (nav === n.id ? ' active' : ''), onClick: () => goto(n.id) },
            e(Icon, { name: n.icon, size: 23 }), ' ', n.label
          )
        ),
        canWrite && e('button', { className: 'tab', onClick: () => setAssistantOpen(true) },
          e('span', { style: { fontSize: 22, lineHeight: 1 } }, '✦'), ' Assistant'
        )
      ),

      // Sheets
      add        && e(AddSheet,     { defaultType: add, onClose: () => setAdd(null), onAdd: addTx }),
      editing    && e(AddSheet,     { existing: editing, onClose: () => setEditing(null), onEdit: editTx }),
      settingsOpen && e(SettingsSheet, { settings, onClose: () => setSettingsOpen(false), onSave: canWrite ? saveSettings : null, onSignOut: signOut, onDeleteAccount: () => { setSettingsOpen(false); setDeleteAccountOpen(true); } }),
      importOpen && canWrite && e(ImportSheet, { onClose: () => setImportOpen(false), onImport: importTxs, existingIds: new Set(allTx.map(t => t.id)) }),
      shareOpen  && isOwner  && e(SharePanel,  { budgetId: activeBudget.id, budgetName: activeBudget.name, onClose: () => setShareOpen(false) }),
      assistantOpen && canWrite && e(AssistantPanel, { onClose: () => setAssistantOpen(false), onImport: importTxs }),
      reportOpen && e(ReportSheet, { allTx, settings, onClose: () => setReportOpen(false) }),
      deleteAccountOpen && e(DeleteAccountSheet, { currentEmail: session.user.email, onClose: () => setDeleteAccountOpen(false), onDeleted: () => setDeleteAccountOpen(false) }),
      notifOpen && e(NotificationsPanel, { onClose: () => setNotifOpen(false), onInviteAccepted: refreshAfterAccept })
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(e(App, null));
})();
