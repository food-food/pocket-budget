/* db.js — cloud data layer (replaces localStorage) */
'use strict';

(function () {
  // ---------- row mappers ----------

  function txFromDB(row) {
    return {
      id: row.id,
      type: row.type,
      amount: parseFloat(row.amount),
      account: row.account,
      date: row.date,           // 'YYYY-MM-DD' from postgres date type
      note: row.note || '',
      ...(row.category ? { category: row.category } : {}),
      ...(row.auto      ? { auto: true }             : {}),
    };
  }

  function txToDB(budgetId, tx) {
    return {
      id: tx.id,
      budget_id: budgetId,
      type: tx.type,
      amount: tx.amount,
      account: tx.account,
      date: tx.date,
      note: tx.note || '',
      category: tx.category || null,
      auto: tx.auto || false,
    };
  }

  // ---------- notifications / invites ----------

  async function getPendingInvites() {
    const { data: { user } } = await window.sb.auth.getUser();
    if (!user?.email) return [];
    const { data, error } = await window.sb
      .from('budget_shares')
      .select('id, role, invited_email, budget_id, budget_name')
      .eq('invited_email', user.email.toLowerCase())
      .is('accepted_at', null);
    if (error) { console.warn('getPendingInvites:', error.message); return []; }
    return data || [];
  }

  async function acceptInvite(shareId) {
    const { data: { user } } = await window.sb.auth.getUser();
    const { error } = await window.sb
      .from('budget_shares')
      .update({ user_id: user.id, accepted_at: new Date().toISOString() })
      .eq('id', shareId)
      .eq('invited_email', user.email.toLowerCase());
    if (error) throw error;
  }

  async function declineInvite(shareId) {
    const { data: { user } } = await window.sb.auth.getUser();
    const { error } = await window.sb
      .from('budget_shares')
      .delete()
      .eq('id', shareId)
      .eq('invited_email', user.email.toLowerCase());
    if (error) throw error;
  }

  // ---------- budget init ----------

  async function init(session) {
    const userId = session.user.id;

    // Own budget
    const { data: ownBudgets, error: ownErr } = await window.sb
      .from('budgets')
      .select('*')
      .eq('owner_id', userId);

    if (ownErr) throw ownErr;

    let own;
    if (!ownBudgets || ownBudgets.length === 0) {
      const name = (session.user.email || 'My').split('@')[0] + "'s Budget";
      const blankSettings = window.Budget.defaultSettings();
      const { data, error } = await window.sb
        .from('budgets')
        .insert({ owner_id: userId, name, settings: blankSettings })
        .select()
        .single();
      if (error) throw error;
      own = data;
    } else {
      own = ownBudgets[0];
    }

    // Shared budgets — load separately to avoid nested join RLS issues
    const { data: shares } = await window.sb
      .from('budget_shares')
      .select('budget_id, role')
      .eq('user_id', userId)
      .not('accepted_at', 'is', null);

    const shared = [];
    for (const s of (shares || [])) {
      const { data: budget } = await window.sb
        .from('budgets')
        .select('*')
        .eq('id', s.budget_id)
        .single();
      if (budget) shared.push({ ...budget, role: s.role });
    }

    return {
      own: { ...own, role: 'owner' },
      shared,
    };
  }

  // ---------- transactions ----------

  async function loadTransactions(budgetId) {
    const { data, error } = await window.sb
      .from('transactions')
      .select('*')
      .eq('budget_id', budgetId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(txFromDB);
  }

  async function addTx(budgetId, tx) {
    const { error } = await window.sb
      .from('transactions')
      .insert(txToDB(budgetId, tx));
    if (error) console.error('addTx:', error.message);
  }

  async function editTx(tx) {
    // update all mutable fields; budget_id and id stay the same
    const { error } = await window.sb
      .from('transactions')
      .update({
        type: tx.type, amount: tx.amount, account: tx.account,
        date: tx.date, note: tx.note || '', category: tx.category || null,
      })
      .eq('id', tx.id);
    if (error) console.error('editTx:', error.message);
  }

  async function deleteTx(id) {
    const { error } = await window.sb
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) console.error('deleteTx:', error.message);
  }

  async function importTxs(budgetId, txs) {
    if (!txs.length) return;
    const { error } = await window.sb
      .from('transactions')
      .upsert(txs.map(t => txToDB(budgetId, t)), { onConflict: 'id' });
    if (error) console.error('importTxs:', error.message);
  }

  // ---------- sync auto-allowance to DB ----------

  async function syncAllowance(budgetId, transactions, settings) {
    const { reconcileAllowance } = window.Budget;
    const result = reconcileAllowance(transactions, settings);
    if (!result.changed) return transactions;

    const existingIds = new Set(transactions.map(t => t.id));
    const resultIds   = new Set(result.transactions.map(t => t.id));

    const toInsert = result.transactions.filter(t => t.auto && !existingIds.has(t.id));
    const toDelete = transactions.filter(t => t.auto && !resultIds.has(t.id));

    if (toInsert.length) {
      // Diagnostic: check what auth.uid() returns in the DB and if budget is readable
      const { data: budgetCheck } = await window.sb.from('budgets').select('id, owner_id').eq('id', budgetId).single();
      console.log('Budget readable?', budgetCheck, '| budgetId:', budgetId);
      const { data: { user } } = await window.sb.auth.getUser();
      console.log('JS user id:', user?.id);

      const { error: insErr } = await window.sb.from('transactions')
        .upsert(toInsert.map(t => txToDB(budgetId, t)), { onConflict: 'id' });
      if (insErr) console.error('syncAllowance INSERT failed:', insErr.message, insErr.details, insErr.hint);
      else console.log('syncAllowance: inserted', toInsert.length, 'allowance tx(s) to DB');
    }
    if (toDelete.length) {
      await window.sb.from('transactions')
        .delete().in('id', toDelete.map(t => t.id));
    }

    return result.transactions;
  }

  // ---------- settings ----------

  async function saveSettings(budgetId, settings) {
    const { error } = await window.sb
      .from('budgets')
      .update({ settings })
      .eq('id', budgetId);
    if (error) console.error('saveSettings:', error.message);
  }

  // ---------- sharing ----------

  async function getShares(budgetId) {
    const { data, error } = await window.sb
      .from('budget_shares')
      .select('*')
      .eq('budget_id', budgetId)
      .order('invited_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function inviteByEmail(budgetId, email, role, budgetName) {
    // Get budget owner_id to store denormalized (needed for RLS policies)
    const { data: budget } = await window.sb
      .from('budgets').select('owner_id').eq('id', budgetId).single();
    const { data, error } = await window.sb
      .from('budget_shares')
      .upsert({
        budget_id: budgetId,
        invited_email: email.toLowerCase().trim(),
        role,
        budget_name: budgetName || null,
        budget_owner_id: budget?.owner_id || null,
      }, { onConflict: 'budget_id,invited_email' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function revokeShare(shareId) {
    const { error } = await window.sb
      .from('budget_shares')
      .delete()
      .eq('id', shareId);
    if (error) throw error;
  }

  async function syncAutoSavings(budgetId, transactions) {
    const autoTx = transactions.filter(t => (t.id || '').startsWith('auto-savings-'));
    const autoIds = autoTx.map(t => t.id);

    // Only delete known stale auto-savings IDs — never touch non-auto-savings rows
    if (autoIds.length > 0) {
      // Fetch existing auto-savings rows by their explicit IDs (safe — no wildcard)
      const { data: existing } = await window.sb
        .from('transactions')
        .select('id')
        .eq('budget_id', budgetId)
        .in('id', autoIds);
      // Nothing to delete — only upsert
      void existing;
    }

    // Delete auto-savings rows that are no longer in the computed set
    // We fetch only by explicit known-safe IDs pattern to avoid mass deletes
    const { data: allAuto } = await window.sb
      .from('transactions')
      .select('id')
      .eq('budget_id', budgetId)
      .eq('auto', true)
      .like('id', 'auto-savings-%');
    const staleIds = (allAuto || [])
      .map(r => r.id)
      .filter(id => id.startsWith('auto-savings-') && !autoIds.includes(id)); // double-check prefix
    if (staleIds.length > 0) {
      await window.sb.from('transactions').delete().in('id', staleIds);
    }

    if (autoTx.length === 0) return;
    const rows = autoTx.map(t => ({
      id: t.id, budget_id: budgetId, type: t.type, amount: t.amount,
      account: t.account, note: t.note, date: t.date,
      category: null, auto: true,
    }));
    const { error } = await window.sb.from('transactions').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }

  async function leaveSharedBudget(budgetId) {
    const { data: { user } } = await window.sb.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await window.sb
      .from('budget_shares')
      .delete()
      .eq('budget_id', budgetId)
      .eq('invited_email', user.email.toLowerCase());
    if (error) throw error;
  }

  window.DB = {
    init, loadTransactions, addTx, editTx, deleteTx, importTxs,
    syncAllowance, syncAutoSavings, saveSettings, getShares, inviteByEmail, revokeShare, leaveSharedBudget,
    getPendingInvites, acceptInvite, declineInvite,
  };
})();
