/* VendaMais — sincronização online via Supabase.
 * O navegador mantém uma cópia de trabalho para uso rápido, mas as vendas
 * são registadas num livro central antes de serem dadas como concluídas.
 */
window.VendaMaisCloud = (() => {
  const CONFIG_KEY = 'vendamais_cloud_config_v1';
  let config = readConfig();
  let client = null;
  let companyId = '';
  let revision = null;
  let channel = null;
  let saveTimer = null;
  let saving = false;
  let hooks = {};
  let currentStatus = { kind: config ? 'configured' : 'offline', message: config ? 'Base online configurada — inicie sessão.' : 'Só neste dispositivo' };

  function readConfig() {
    try {
      const value = JSON.parse(localStorage.getItem(CONFIG_KEY));
      return value?.url && value?.anonKey ? value : null;
    } catch { return null; }
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
  function serialisableState(data) {
    const state = clone(data);
    // As vendas têm livro próprio para evitar que duas lojas percam uma venda
    // ao gravar ao mesmo tempo. PINs nunca são enviados para a nuvem.
    state.sales = [];
    state.users = (state.users || []).map(({ pin, ...user }) => user);
    return state;
  }
  function initialSales(data) { return clone(data?.sales || []); }
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
      emitStatus('configured', 'Conta autenticada. Falta criar a empresa ou ser convidado por um administrador.');
      return { needsBootstrap: true, session };
    }
    if (!profile.active) throw new Error('A sua conta foi desactivada pelo administrador.');
    companyId = profile.company_id;
    await refresh(profile, session.user);
    return { connected: true, profile, session };
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
      p_initial_state: serialisableState(source),
      p_initial_sales: initialSales(source)
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
    emitStatus('online', 'Dados online sincronizados');
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
  async function recordSale(sale) {
    if (!connected()) return true;
    const row = { company_id: companyId, sale_id: sale.id, location_id: sale.locationId, occurred_at: sale.date, total: Number(sale.total || 0), status: sale.status || 'Concluída', sale_data: clone(sale) };
    const { error } = await client.from('sales_ledger').insert(row);
    if (error) { emitStatus('error', getErrorMessage(error, 'A venda não foi registada online.')); return false; }
    return true;
  }
  async function updateSale(sale) {
    if (!connected()) return true;
    const { error } = await client.from('sales_ledger').update({ sale_data: clone(sale), status: sale.status || 'Concluída', total: Number(sale.total || 0) }).eq('company_id', companyId).eq('sale_id', sale.id);
    if (error) { emitStatus('error', getErrorMessage(error)); return false; }
    return true;
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
    configure, prepare, signIn, bootstrap, signOut, clearConfig, scheduleSave, saveNow, recordSale, updateSale,
    configured, connected, status: () => currentStatus, config: () => config
  };
})();
