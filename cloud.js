/* VendaMais — sincronização online via Supabase.
 * O navegador mantém uma cópia de trabalho para uso rápido, mas as vendas
 * são registadas num livro central antes de serem dadas como concluídas.
 */
window.VendaMaisCloud = (() => {
  const CONFIG_KEY = 'vendamais_cloud_config_v1';
  const PENDING_SALES_KEY = 'vendamais_pending_sales_v1';
  const PENDING_SALE_UPDATES_KEY = 'vendamais_pending_sale_updates_v1';
  let config = readConfig();
  let client = null;
  let companyId = '';
  let revision = null;
  let channel = null;
  let saveTimer = null;
  let saving = false;
  let flushing = false;
  let hooks = {};
  let currentStatus = { kind: config ? 'configured' : 'offline', message: config ? 'Base online configurada — inicie sessão.' : 'Só neste dispositivo' };

  function readConfig() {
    try {
      const value = JSON.parse(localStorage.getItem(CONFIG_KEY));
      if (value?.url && value?.anonKey) return value;
    } catch { /* tenta a configuração publicada abaixo */ }
    const published = window.VENDAMAIS_SUPABASE_CONFIG;
    return published?.url && published?.anonKey ? { url: String(published.url).trim().replace(/\/$/, ''), anonKey: String(published.anonKey).trim() } : null;
  }
  function persistConfig() {
    if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    else localStorage.removeItem(CONFIG_KEY);
  }
  function emitStatus(kind, message) {
    currentStatus = { kind, message };
    hooks.onStatus?.(currentStatus);
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function pendingSales() { try { const value = JSON.parse(localStorage.getItem(PENDING_SALES_KEY)); return Array.isArray(value) ? value : []; } catch { return []; } }
  function savePendingSales(sales) { localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(sales)); hooks.onPending?.(sales.length); }
  function pendingSaleUpdates() { try { const value = JSON.parse(localStorage.getItem(PENDING_SALE_UPDATES_KEY)); return Array.isArray(value) ? value : []; } catch { return []; } }
  function savePendingSaleUpdates(sales) { localStorage.setItem(PENDING_SALE_UPDATES_KEY, JSON.stringify(sales)); }
  function queueSale(sale) {
    const queued = pendingSales();
    if (!queued.some(item => item.id === sale.id)) queued.push({ ...clone(sale), syncStatus: 'Pendente de sincronização', queuedAt: new Date().toISOString() });
    savePendingSales(queued);
    emitStatus('pending', `${queued.length} venda${queued.length === 1 ? '' : 's'} pendente${queued.length === 1 ? '' : 's'} de sincronização`);
    return queued.find(item => item.id === sale.id) || sale;
  }
  function serialisableState(data) {
    const state = clone(data);
    // As vendas têm livro próprio para evitar que duas lojas percam uma venda
    // ao gravar ao mesmo tempo. PINs nunca são enviados para a nuvem.
    state.sales = [];
    // O local seleccionado é uma preferência deste navegador, não uma
    // configuração global que outro gerente deve ver alterada.
    if (state.settings) delete state.settings.activeLocationId;
    state.users = (state.users || []).map(({ pin, ...user }) => user);
    return state;
  }
  function initialSales(data) { return clone(data?.sales || []); }
  function blankCompanyState(source = {}) {
    const state = clone(source || {});
    const zeroCosts = { Renda: 0, Energia: 0, Água: 0, Internet: 0, Salários: 0, Segurança: 0, Outros: 0 };
    for (const key of ['products','customers','suppliers','sales','purchases','movements','receipts','supplierPayments','transfers','cashSessions','cashMovements','expenses','returns','auditLog']) state[key] = [];
    state.locations = (state.locations || []).map(location => ({ ...location, fixedCosts: { ...zeroCosts } }));
    if (!state.locations.length) state.locations = [{ id: 'loc_main', name: 'Loja principal', type: 'Loja', active: true, fixedCosts: { ...zeroCosts } }];
    state.settings = { ...(state.settings || {}), activeLocationId: state.locations[0].id };
    return state;
  }
  function library() {
    if (!window.supabase?.createClient) throw new Error('Não foi possível carregar a biblioteca de dados online. Verifique a ligação à internet.');
    return window.supabase;
  }
  function createClient() {
    if (!config?.url || !config?.anonKey) throw new Error('Indique o endereço e a chave pública do projecto Supabase.');
    client = library().createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return client;
  }
  function connected() { return Boolean(client && companyId && revision !== null); }
  function configured() { return Boolean(config?.url && config?.anonKey); }
  function getErrorMessage(error, fallback = 'Não foi possível comunicar com a base online.') {
    return error?.message || fallback;
  }
  async function configure(url, anonKey) {
    const cleanUrl = String(url || '').trim().replace(/\/$/, '');
    const cleanKey = String(anonKey || '').trim();
    if (!/^https:\/\/.+\.supabase\.co$/i.test(cleanUrl)) throw new Error('O endereço deve terminar em .supabase.co e começar por https://.');
    if (!cleanKey) throw new Error('Cole a chave pública (anon) do projecto.');
    config = { url: cleanUrl, anonKey: cleanKey };
    persistConfig();
    createClient();
    emitStatus('configured', 'Base online configurada — inicie sessão.');
    return true;
  }
  async function prepare() {
    if (!configured()) return { configured: false };
    if (!client) createClient();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (!session) return { configured: true, signedIn: false };
    return loadForSession(session);
  }
  async function signIn(email, password, createAccount = false) {
    if (!client) createClient();
    const credentials = { email: String(email || '').trim(), password: String(password || '') };
    if (!credentials.email || !credentials.password) throw new Error('Introduza o e-mail e a palavra-passe.');
    emitStatus('syncing', createAccount ? 'A criar conta segura…' : 'A iniciar sessão…');
    const response = createAccount
      ? await client.auth.signUp(credentials)
      : await client.auth.signInWithPassword(credentials);
    if (response.error) { emitStatus('error', getErrorMessage(response.error)); throw response.error; }
    if (!response.data.session) {
      emitStatus('configured', 'Confirme o e-mail recebido e depois inicie sessão.');
      return { emailConfirmationRequired: true };
    }
    return loadForSession(response.data.session);
  }
  async function loadForSession(session) {
    const { data: profile, error } = await client.from('profiles').select('id, company_id, full_name, role, location_id, active').eq('id', session.user.id).maybeSingle();
    if (error) { emitStatus('error', getErrorMessage(error)); throw error; }
    if (!profile) {
      const invitedProfile = await claimInvitation();
      if (invitedProfile?.company_id) {
        companyId = invitedProfile.company_id;
        await refresh(invitedProfile, session.user);
        return { connected: true, profile: invitedProfile, session, invitationAccepted: true };
      }
      emitStatus('configured', 'Conta autenticada. Aguarde um convite do administrador ou registe a sua própria empresa.');
      return { needsBootstrap: true, session };
    }
    if (!profile.active) throw new Error('A sua conta foi desactivada pelo administrador.');
    companyId = profile.company_id;
    await refresh(profile, session.user);
    return { connected: true, profile, session };
  }
  async function claimInvitation() {
    if (!client) createClient();
    const { data, error } = await client.rpc('claim_vendamais_invitation');
    if (error) {
      // Em instalações ainda sem a actualização v1.9, a conta continua a
      // poder usar o fluxo antigo; a mensagem de interface explica a acção.
      if (/claim_vendamais_invitation|function.*does not exist/i.test(getErrorMessage(error))) return null;
      throw error;
    }
    return Array.isArray(data) ? data[0] : data;
  }
  async function bootstrap(companyName, nif) {
    if (!client) createClient();
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('Inicie sessão antes de criar a empresa.');
    const source = hooks.getData?.();
    if (!source) throw new Error('Os dados locais ainda não estão disponíveis.');
    emitStatus('syncing', 'A criar empresa e a enviar os dados…');
    const { data: result, error } = await client.rpc('bootstrap_vendamais_company', {
      p_company_name: String(companyName || '').trim(),
      p_nif: String(nif || '').trim(),
      p_initial_state: serialisableState(blankCompanyState(source)),
      p_initial_sales: []
    });
    if (error) { emitStatus('error', getErrorMessage(error)); throw error; }
    const profile = Array.isArray(result) ? result[0] : result;
    if (!profile?.company_id) throw new Error('A base de dados não devolveu a empresa criada.');
    companyId = profile.company_id;
    await refresh(profile, session.user);
    return { connected: true, profile };
  }
  async function fetchSnapshot() {
    const { data, error } = await client.from('business_snapshots').select('state, revision').eq('company_id', companyId).single();
    if (error) throw error;
    return data;
  }
  async function fetchSales() {
    const { data, error } = await client.from('sales_ledger').select('sale_id, sale_data').eq('company_id', companyId).order('occurred_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => row.sale_data).filter(Boolean);
  }
  async function refresh(profile, authUser) {
    emitStatus('syncing', 'A actualizar os dados da empresa…');
    const [snapshot, sales] = await Promise.all([fetchSnapshot(), fetchSales()]);
    revision = Number(snapshot.revision);
    const remote = snapshot.state || {};
    remote.sales = sales;
    hooks.replaceData?.(remote, profile, authUser);
    subscribe();
    emitStatus(pendingSales().length ? 'pending' : 'online', pendingSales().length ? `${pendingSales().length} venda(s) pendente(s) de sincronização` : 'Dados online sincronizados');
    if (!flushing) flushPendingSales().catch(error => emitStatus('pending', `Venda pendente: ${getErrorMessage(error)}`));
    return remote;
  }
  function subscribe() {
    if (!client || !companyId) return;
    if (channel) client.removeChannel(channel);
    channel = client.channel(`vendamais:${companyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales_ledger', filter: `company_id=eq.${companyId}` }, message => hooks.mergeSale?.(message.new?.sale_data))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sales_ledger', filter: `company_id=eq.${companyId}` }, message => hooks.mergeSale?.(message.new?.sale_data))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'business_snapshots', filter: `company_id=eq.${companyId}` }, message => {
        const remoteRevision = Number(message.new?.revision);
        if (!saving && Number.isFinite(remoteRevision) && remoteRevision > Number(revision)) refresh().catch(error => emitStatus('error', getErrorMessage(error)));
      })
      .subscribe();
  }
  async function saveNow() {
    if (!connected() || saving) return false;
    if (navigator.onLine === false) { emitStatus('pending', 'Sem internet: alterações aguardam sincronização'); return false; }
    const source = hooks.getData?.();
    if (!source) return false;
    saving = true;
    emitStatus('syncing', 'A guardar alterações online…');
    try {
      const { data: result, error } = await client.rpc('save_vendamais_state', { p_state: serialisableState(source), p_expected_revision: revision });
      if (error) throw error;
      const nextRevision = Array.isArray(result) ? result[0]?.revision : result?.revision;
      if (nextRevision === undefined || nextRevision === null) {
        await refresh();
        throw new Error('Os dados foram alterados por outra loja. A página foi actualizada com a versão mais recente.');
      }
      revision = Number(nextRevision);
      emitStatus('online', 'Dados online sincronizados');
      return true;
    } catch (error) {
      emitStatus('error', getErrorMessage(error));
      return false;
    } finally { saving = false; }
  }
  function scheduleSave() {
    if (!connected()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(), 700);
  }
  async function sendSale(sale) {
    const { data, error } = await client.rpc('record_vendamais_sale', { p_sale: clone(sale), p_expected_revision: revision });
    if (error) throw error;
    if (!data?.sale || data?.revision === undefined) throw new Error('A base central não confirmou a venda. Execute a actualização profissional do Supabase.');
    revision = Number(data.revision);
    return { ok: true, sale: data.sale, duplicate: Boolean(data.duplicate) };
  }
  async function recordSale(sale) {
    if (!connected()) return { ok: false, requiresLogin: true };
    if (navigator.onLine === false) return { ok: true, queued: true, sale: queueSale(sale) };
    try { return await sendSale(sale); }
    catch (error) {
      const message = getErrorMessage(error);
      if (/network|fetch|internet|failed to fetch/i.test(message)) return { ok: true, queued: true, sale: queueSale(sale) };
      emitStatus('error', message);
      return { ok: false, error: message };
    }
  }
  async function flushPendingSaleUpdates() {
    if (!connected() || navigator.onLine === false) return false;
    const queued = pendingSaleUpdates();
    const mine = queued.filter(item => item.companyId === companyId);
    if (!mine.length) return true;
    const remaining = queued.filter(item => item.companyId !== companyId);
    for (let index = 0; index < mine.length; index += 1) {
      const sale = mine[index].sale;
      try {
        const { error } = await client.from('sales_ledger').update({ sale_data: clone(sale), status: sale.status || 'Concluída', total: Number(sale.total || 0) }).eq('company_id', companyId).eq('sale_id', sale.id);
        if (error) throw error;
      } catch (error) { remaining.push(...mine.slice(index)); emitStatus('pending', `Actualização financeira pendente: ${getErrorMessage(error)}`); break; }
    }
    savePendingSaleUpdates(remaining);
    return remaining.length === 0;
  }
  async function flushPendingSales() {
    if (!connected() || navigator.onLine === false || flushing) return false;
    const queued = pendingSales();
    if (!queued.length) return flushPendingSaleUpdates();
    flushing = true;
    const remaining = [];
    try {
      for (let index = 0; index < queued.length; index += 1) {
        const pending = queued[index];
        try { await sendSale({ ...pending, syncStatus: 'Sincronizada' }); }
        catch (error) { remaining.push(...queued.slice(index)); break; }
      }
      savePendingSales(remaining);
      if (!remaining.length) { await refresh(); await flushPendingSaleUpdates(); }
      emitStatus(remaining.length ? 'pending' : 'online', remaining.length ? `${remaining.length} venda(s) pendente(s) de sincronização` : 'Dados online sincronizados');
      return remaining.length === 0;
    } finally { flushing = false; }
  }
  async function updateSale(sale) {
    if (!connected()) return { ok: true, localOnly: true };
    if (navigator.onLine === false) {
      const queued = pendingSaleUpdates().filter(item => item.companyId !== companyId || item.sale?.id !== sale.id);
      queued.push({ companyId, sale: clone(sale) }); savePendingSaleUpdates(queued);
      emitStatus('pending', 'Actualização financeira guardada para sincronização.');
      return { ok: true, queued: true };
    }
    try {
      const { error } = await client.from('sales_ledger').update({ sale_data: clone(sale), status: sale.status || 'Concluída', total: Number(sale.total || 0) }).eq('company_id', companyId).eq('sale_id', sale.id);
      if (error) throw error;
      savePendingSaleUpdates(pendingSaleUpdates().filter(item => item.companyId !== companyId || item.sale?.id !== sale.id));
      return { ok: true, queued: false };
    } catch (error) {
      const queued = pendingSaleUpdates().filter(item => item.companyId !== companyId || item.sale?.id !== sale.id);
      queued.push({ companyId, sale: clone(sale) }); savePendingSaleUpdates(queued);
      emitStatus('pending', `Actualização financeira guardada para sincronização: ${getErrorMessage(error)}`);
      return { ok: true, queued: true };
    }
  }
  async function clearBusinessData() {
    if (!connected()) throw new Error('Inicie a sessão online como administrador para limpar os dados centrais.');
    if (saving) throw new Error('Aguarde a sincronização em curso antes de limpar os dados.');
    clearTimeout(saveTimer); saveTimer = null;
    emitStatus('syncing', 'A eliminar os dados comerciais da empresa…');
    const { data, error } = await client.rpc('reset_vendamais_business_data');
    if (error) { emitStatus('error', getErrorMessage(error)); throw error; }
    if (!data?.ok) throw new Error('O servidor não confirmou a limpeza dos dados.');
    savePendingSales([]);
    savePendingSaleUpdates([]);
    await refresh();
    emitStatus('online', 'Dados comerciais eliminados e sincronizados');
    return true;
  }
  async function resetPassword(email) {
    if (!client) createClient();
    const { error } = await client.auth.resetPasswordForEmail(String(email || '').trim(), { redirectTo: window.location.href });
    if (error) throw error;
    return true;
  }
  async function requestAccess(companyNif, fullName) {
    if (!client) createClient();
    const { data, error } = await client.rpc('request_vendamais_access', { p_company_nif: String(companyNif || '').trim(), p_full_name: String(fullName || '').trim() });
    if (error) throw error;
    return data;
  }
  async function inviteStaff(email, fullName, role, locationId) {
    if (!connected()) throw new Error('Inicie a sessão online como administrador.');
    const { data, error } = await client.rpc('invite_vendamais_staff', {
      p_email: String(email || '').trim(),
      p_full_name: String(fullName || '').trim(),
      p_role: String(role || 'Vendedor'),
      p_location_id: String(locationId || '')
    });
    if (error) throw error;
    return data;
  }
  async function invitations() {
    if (!connected()) return [];
    const { data, error } = await client.from('staff_invitations').select('id, email, full_name, role, location_id, status, created_at, expires_at, accepted_at').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  }
  async function accessRequests() {
    if (!connected()) return [];
    const { data, error } = await client.from('access_requests').select('id, full_name, status, requested_at, user_id').eq('status', 'Pendente').order('requested_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function reviewAccess(requestId, role, locationId, approve) {
    if (!connected()) throw new Error('Inicie a sessão online.');
    const { data, error } = await client.rpc('review_vendamais_access', { p_request_id: requestId, p_role: role, p_location_id: locationId || '', p_approve: Boolean(approve) });
    if (error) throw error;
    return data;
  }
  async function auditEvents() {
    if (!connected()) return [];
    const { data, error } = await client.from('audit_events').select('action, detail, created_at').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  }
  async function backups() {
    if (!connected()) return [];
    const { data, error } = await client.from('business_backups').select('id, created_at').order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    return data || [];
  }
  async function signOut() {
    if (client) await client.auth.signOut();
    if (channel && client) client.removeChannel(channel);
    channel = null; companyId = ''; revision = null;
    emitStatus(config ? 'configured' : 'offline', config ? 'Base online configurada — inicie sessão.' : 'Só neste dispositivo');
  }
  function clearConfig() {
    signOut();
    config = null; client = null; persistConfig();
    emitStatus('offline', 'Só neste dispositivo');
  }
  return {
    setHooks(nextHooks) { hooks = { ...hooks, ...nextHooks }; hooks.onStatus?.(currentStatus); },
    configure, prepare, signIn, bootstrap, signOut, clearConfig, scheduleSave, saveNow, recordSale, updateSale, flushPendingSales,
    resetPassword, clearBusinessData, requestAccess, inviteStaff, invitations, accessRequests, reviewAccess, auditEvents, backups,
    configured, connected, pendingCount: () => pendingSales().length, status: () => currentStatus, config: () => config
  };
})();
