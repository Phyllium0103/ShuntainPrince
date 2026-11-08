const DEFAULT_CATS = ['贊普','冤親貴人','歷代祖先','個人祖先','庫錢','嬰靈','動物靈','開天庫','還陰債'];
const DEFAULT_PRICES = {
  '贊普':1000, '冤親貴人':600, '歷代祖先':300, '個人祖先':300,
  '庫錢':300, '嬰靈':300, '動物靈':300,
  '開天庫':1980, '還陰債':1980
};
const DEFAULT_ZODIAC_YIN = {
  '鼠': 13000, '牛': 280000, '虎': 80000, '兔': 80000,
  '龍': 50000, '蛇': 70000, '馬': 260000, '羊': 100000,
  '猴': 40000, '雞': 50000, '狗': 25000, '豬': 9000
};
const DEFAULT_CARS = ['第1車', '第2車', '第3車', '第4車', '第5車', '第6車'];
const ZODIAC_LIST = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];

let categories = [...DEFAULT_CATS];
let prices = {...DEFAULT_PRICES};
let zodiacYin = {...DEFAULT_ZODIAC_YIN};

let dharmaEvents = ['115年中元普渡'];
let activeDharmaEvent = '115年中元普渡';
let pilgrimageEvents = ['115年進香大典'];
let activePilgrimageEvent = '115年進香大典';
let donationEvents = ['115年中元普渡', '順天太子聖誕'];
let activeDonationEvent = '115年中元普渡';

let records = [];
let pilgrimages = [];
let donations = [];
let customDonationItems = [];
let carPlatesMap = {};
let customCarsMap = {};

let editingId = null;
let editingPilgId = null;
let editingDonId = null;
let currentViewingDonId = null;
let currentPrintMode = 'cat';
let currentSearchMode = 'cat';
let currentFormMode = 'single';
let tempSingleRepays = [];
let tempFamilyMembers = [];
let fontScale = 1;

// 內建 Supabase 專案設定
const SB_URL = 'https://ayjzsqysvlulhwwucpxb.supabase.co';
const SB_KEY = 'sb_publishable_zS_cX8pAy6_iLeHEmn-XJg_BLaSJYoK';
let sbClient = null;

const LS_CATS = 'faliao_categories_v47';
const LS_RECORDS = 'faliao_records_v47';
const LS_PRICES = 'faliao_prices_v47';
const LS_ZODIAC_YIN = 'faliao_zodiac_yin_v47';
const LS_FONT_SCALE = 'faliao_font_scale_v47';
const LS_DHARMA_EVENTS = 'faliao_dharma_events_v47';
const LS_PILG_EVENTS = 'faliao_pilg_events_v47';
const LS_DON_EVENTS = 'faliao_don_events_v47';
const LS_PILG_RECORDS = 'faliao_pilg_records_v47';
const LS_DONATIONS = 'faliao_donations_v47';
const LS_DON_ITEMS = 'faliao_don_items_v47';
const LS_CAR_PLATES = 'faliao_car_plates_v47';
const LS_CUSTOM_CARS = 'faliao_custom_cars_v47';

// 智慧生日轉換與精準生肖計算核心邏輯
function parseDateAny(str) {
  if(!str) return null;
  str = String(str).trim();
  let cleaned = str.replace(/[/\-年月日\s]/g, '/').replace(/\/+/g, '/');
  let parts = cleaned.split('/');
  if(parts.length !== 3) return null;
  let p1 = parseInt(parts[0], 10);
  let p2 = parseInt(parts[1], 10);
  let p3 = parseInt(parts[2], 10);
  if(isNaN(p1) || isNaN(p2) || isNaN(p3)) return null;
  return { year: p1, month: p2, day: p3 };
}

function getZodiacByLunarYear(lunarYear) {
  let idx = (Number(lunarYear) - 4) % 12;
  if (idx < 0) idx += 12;
  return ZODIAC_LIST[idx] || '';
}

function syncDateFields(type, val, solarInput, rocInput, lunarInput, zodiacSelect, callback) {
  if(!val) return;
  let parsed = parseDateAny(val);
  if(!parsed) return;
  let { year, month, day } = parsed;

  const SolarCls = window.Solar || window.lunar?.Solar;
  const LunarCls = window.Lunar || window.lunar?.Lunar;

  if (!SolarCls || !LunarCls) {
    showToast('曆法轉換套件載入中或載入失敗，請檢查網路連線');
    return;
  }

  try {
    let solar, lunar;
    let gy, gm, gd, rocY, ly, lm, ld;

    if (type === 'solar') {
      let gYear = year < 1900 ? year + 1911 : year;
      solar = SolarCls.fromYmd(gYear, month, day);
      lunar = solar.getLunar();
    } else if (type === 'roc') {
      let gYear = year < 1900 ? year + 1911 : year;
      solar = SolarCls.fromYmd(gYear, month, day);
      lunar = solar.getLunar();
    } else if (type === 'lunar') {
      let lYear = year < 1900 ? year + 1911 : year;
      lunar = LunarCls.fromYmd(lYear, month, day);
      solar = lunar.getSolar();
    }

    gy = solar.getYear();
    gm = solar.getMonth();
    gd = solar.getDay();
    rocY = gy - 1911;

    ly = lunar.getYear();
    lm = Math.abs(lunar.getMonth());
    ld = lunar.getDay();
    let lunarRocY = ly - 1911;

    let f2 = n => String(n).padStart(2, '0');
    let solarStr = `${gy}/${f2(gm)}/${f2(gd)}`;         // 國曆: xxxx/xx/xx
    let rocStr = `${f2(rocY)}/${f2(gm)}/${f2(gd)}`;       // 民國: xx/xx/xx
    let lunarStr = `${f2(lunarRocY)}/${f2(lm)}/${f2(ld)}`; // 農曆: xx/xx/xx

    if(solarInput) solarInput.value = solarStr;
    if(rocInput) rocInput.value = rocStr;
    if(lunarInput) lunarInput.value = lunarStr;

    let zodiacName = getZodiacByLunarYear(ly) || lunar.getYearShengXiao();
    if(zodiacSelect && zodiacName){
      zodiacSelect.value = zodiacName;
      const eventObj = new Event('change');
      zodiacSelect.dispatchEvent(eventObj);
    }
    if(typeof callback === 'function') callback(zodiacName);
  } catch(e) {
    console.error("Date conversion error:", e);
    showToast('日期格式或數值超出有效範圍（如該農曆日期不存在）');
  }
}

function handleDateInput(type, el) {
  let parent = el.closest('.card') || document;
  let solar = parent.querySelector('#f-solar-birth');
  let roc = parent.querySelector('#f-roc-birth');
  let lunar = parent.querySelector('#f-lunar-birth');
  let zodiac = parent.querySelector('#f-zodiac');
  syncDateFields(type, el.value, solar, roc, lunar, zodiac);
}

function formatRocBirth(str) {
  let parsed = parseDateAny(str);
  if(!parsed) return str || '';
  let gYear = parsed.year < 1900 ? parsed.year + 1911 : parsed.year;
  let rocY = gYear - 1911;
  return `${String(rocY).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${String(parsed.day).padStart(2, '0')}`;
}

async function initSupabase(){
  try {
    sbClient = window.supabase.createClient(SB_URL, SB_KEY);
    checkAuthStatus();
  } catch(err){ console.error(err); }
}

async function checkAuthStatus(){
  if(!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  if(session && session.user){
    document.getElementById('auth-logged-out-box').style.display = 'none';
    document.getElementById('auth-logged-in-box').style.display = 'block';
    document.getElementById('lbl-user-email').textContent = session.user.email;
    await pullFromCloud(session.user.id);
  } else {
    document.getElementById('auth-logged-out-box').style.display = 'block';
    document.getElementById('auth-logged-in-box').style.display = 'none';
  }
}

document.getElementById('btn-supabase-login').addEventListener('click', async ()=>{
  if(!sbClient) return;
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  if(!email || !password){ showToast('請輸入帳號與密碼'); return; }
  const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
  if(error){ showToast('登入失敗: ' + error.message); }
  else { showToast('登入成功！'); checkAuthStatus(); }
});

document.getElementById('btn-supabase-register').addEventListener('click', async ()=>{
  if(!sbClient) return;
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  if(!email || !password){ showToast('請輸入帳號與密碼'); return; }
  const { data, error } = await sbClient.auth.signUp({ email, password });
  if(error){ showToast('註冊失敗: ' + error.message); }
  else { showToast('註冊成功！請檢查信箱或直接登入'); }
});

document.getElementById('btn-supabase-logout').addEventListener('click', async ()=>{
  if(!sbClient) return;
  await sbClient.auth.signOut();
  showToast('已登出');
  checkAuthStatus();
});

async function pushToCloud(){
  if(!sbClient) return;
  const { data: { session } } = await sbClient.auth.getSession();
  if(!session || !session.user) return;
  const userId = session.user.id;

  const payload = {
    dharmaEvents, activeDharmaEvent, pilgrimageEvents, activePilgrimageEvent,
    donationEvents, activeDonationEvent, categories, prices, zodiacYin, fontScale,
    records, pilgrimages, donations, customDonationItems, carPlatesMap, customCarsMap
  };

  const { error } = await sbClient.from('app_state').upsert({
    user_id: userId,
    data: payload,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  if(error){ console.error('Cloud push error:', error); }
}

async function pullFromCloud(userId){
  if(!sbClient) return;
  const { data, error } = await sbClient.from('app_state').select('data').eq('user_id', userId).single();
  if(data && data.data){
    const d = data.data;
    if(d.dharmaEvents) dharmaEvents = d.dharmaEvents;
    if(d.activeDharmaEvent) activeDharmaEvent = d.activeDharmaEvent;
    if(d.pilgrimageEvents) pilgrimageEvents = d.pilgrimageEvents;
    if(d.activePilgrimageEvent) activePilgrimageEvent = d.activePilgrimageEvent;
    if(d.donationEvents) donationEvents = d.donationEvents;
    if(d.activeDonationEvent) activeDonationEvent = d.activeDonationEvent;
    if(d.categories) categories = d.categories;
    if(d.prices) prices = d.prices;
    if(d.zodiacYin) zodiacYin = d.zodiacYin;
    if(d.fontScale) fontScale = d.fontScale;
    if(d.records) records = d.records;
    if(d.pilgrimages) pilgrimages = d.pilgrimages;
    if(d.donations) donations = d.donations;
    if(d.customDonationItems) customDonationItems = d.customDonationItems;
    if(d.carPlatesMap) carPlatesMap = d.carPlatesMap;
    if(d.customCarsMap) customCarsMap = d.customCarsMap;

    applyFontScale(fontScale);
    updateDonationItemsDatalist();
    renderEventPills();
    renderPilgrimageEventPills();
    renderDonationEventPills();
    renderCarPlatesConfig();
    renderCatGrid({});
    renderRecordTable();
    renderPilgTable();
    renderDonationTable();
    showToast('已從雲端同步最新資料');
  }
}

document.getElementById('btn-supabase-sync').addEventListener('click', async ()=>{
  await pushToCloud();
  showToast('已手動同步至雲端');
});

async function loadData(){
  try{ const c = localStorage.getItem(LS_CATS); categories = c ? JSON.parse(c) : [...DEFAULT_CATS]; }catch(e){ categories = [...DEFAULT_CATS]; }
  try{ const p = localStorage.getItem(LS_PRICES); prices = p ? {...DEFAULT_PRICES, ...JSON.parse(p)} : {...DEFAULT_PRICES}; }catch(e){ prices = {...DEFAULT_PRICES}; }
  try{ const zy = localStorage.getItem(LS_ZODIAC_YIN); zodiacYin = zy ? {...DEFAULT_ZODIAC_YIN, ...JSON.parse(zy)} : {...DEFAULT_ZODIAC_YIN}; }catch(e){ zodiacYin = {...DEFAULT_ZODIAC_YIN}; }
  try{ const fs = localStorage.getItem(LS_FONT_SCALE); if(fs) fontScale = parseFloat(fs) || 1; }catch(e){}

  try{ const de = localStorage.getItem(LS_DHARMA_EVENTS); dharmaEvents = de ? JSON.parse(de) : ['115年中元普渡']; }catch(e){ dharmaEvents = ['115年中元普渡']; }
  activeDharmaEvent = dharmaEvents[0] || '115年中元普渡';

  try{ const pe = localStorage.getItem(LS_PILG_EVENTS); pilgrimageEvents = pe ? JSON.parse(pe) : ['115年進香大典']; }catch(e){ pilgrimageEvents = ['115年進香大典']; }
  activePilgrimageEvent = pilgrimageEvents[0] || '115年進香大典';

  try{ const doe = localStorage.getItem(LS_DON_EVENTS); donationEvents = doe ? JSON.parse(doe) : ['115年中元普渡', '順天太子聖誕']; }catch(e){ donationEvents = ['115年中元普渡', '順天太子聖誕']; }
  activeDonationEvent = donationEvents[0] || '115年中元普渡';

  try{ const r = localStorage.getItem(LS_RECORDS); records = r ? JSON.parse(r) : []; }catch(e){ records = []; }
  try{ const pr = localStorage.getItem(LS_PILG_RECORDS); pilgrimages = pr ? JSON.parse(pr) : []; }catch(e){ pilgrimages = []; }
  try{ const d = localStorage.getItem(LS_DONATIONS); donations = d ? JSON.parse(d) : []; }catch(e){ donations = []; }
  try{ const di = localStorage.getItem(LS_DON_ITEMS); if(di) customDonationItems = JSON.parse(di); }catch(e){ customDonationItems = []; }
  try{ const cp = localStorage.getItem(LS_CAR_PLATES); carPlatesMap = cp ? JSON.parse(cp) : {}; }catch(e){ carPlatesMap = {}; }
  try{ const cc = localStorage.getItem(LS_CUSTOM_CARS); customCarsMap = cc ? JSON.parse(cc) : {}; }catch(e){ customCarsMap = {}; }

  applyFontScale(fontScale);
  updateDonationItemsDatalist();
  renderEventPills();
  renderPilgrimageEventPills();
  renderDonationEventPills();
  renderCarPlatesConfig();
  document.getElementById('don-date').value = new Date().toISOString().slice(0, 10);
  await initSupabase();
}

async function saveDataAll(){
  localStorage.setItem(LS_CATS, JSON.stringify(categories));
  localStorage.setItem(LS_PRICES, JSON.stringify(prices));
  localStorage.setItem(LS_ZODIAC_YIN, JSON.stringify(zodiacYin));
  localStorage.setItem(LS_DHARMA_EVENTS, JSON.stringify(dharmaEvents));
  localStorage.setItem(LS_PILG_EVENTS, JSON.stringify(pilgrimageEvents));
  localStorage.setItem(LS_DON_EVENTS, JSON.stringify(donationEvents));
  localStorage.setItem(LS_RECORDS, JSON.stringify(records));
  localStorage.setItem(LS_PILG_RECORDS, JSON.stringify(pilgrimages));
  localStorage.setItem(LS_DONATIONS, JSON.stringify(donations));
  localStorage.setItem(LS_DON_ITEMS, JSON.stringify(customDonationItems));
  localStorage.setItem(LS_CAR_PLATES, JSON.stringify(carPlatesMap));
  localStorage.setItem(LS_CUSTOM_CARS, JSON.stringify(customCarsMap));

  await pushToCloud();
}

async function renameDharmaEvent(oldEv){
  const newEv = prompt(`請輸入法會活動「${oldEv}」的新名稱：`, oldEv);
  if(!newEv) return;
  const name = newEv.trim();
  if(!name || name === oldEv) return;
  if(dharmaEvents.includes(name)){ showToast('此活動名稱已存在'); return; }

  dharmaEvents = dharmaEvents.map(e => e === oldEv ? name : e);
  records.forEach(r => {
    if((r.event || dharmaEvents[0]) === oldEv) r.event = name;
  });
  if(activeDharmaEvent === oldEv) activeDharmaEvent = name;

  await saveDataAll();
  renderEventPills();
  resetForm();
  renderRecordTable();
  showToast(`已將法會活動重新命名為：${name}`);
}

async function deleteDharmaEvent(ev){
  if(dharmaEvents.length <= 1){ showToast('至少需保留一個法會活動'); return; }
  if(!confirm(`確定要刪除法會活動「${ev}」及其相關登記資料嗎？`)) return;
  dharmaEvents = dharmaEvents.filter(x => x !== ev);
  records = records.filter(r => (r.event || dharmaEvents[0]) !== ev);
  activeDharmaEvent = dharmaEvents[0];
  await saveDataAll();
  renderEventPills();
  resetForm();
  renderRecordTable();
  showToast(`已刪除活動「${ev}」`);
}

function renderEventPills(){
  const container = document.getElementById('dharma-pills');
  container.innerHTML = dharmaEvents.map(ev => `
    <span style="display:inline-flex;align-items:center;background:${ev === activeDharmaEvent ? 'var(--seal)' : '#fffdf7'};color:${ev === activeDharmaEvent ? '#fdf6ea' : 'var(--ink)'};border:1px solid var(--rule);border-radius:20px;padding:4px 10px;font-size:0.8125rem;font-family:'Noto Serif TC',serif;gap:6px;">
      <span style="cursor:pointer;font-weight:${ev === activeDharmaEvent ? 'bold' : 'normal'};" onclick="switchDharmaEvent('${escapeAttr(ev)}')">${escapeHtml(ev)}</span>
      <span style="cursor:pointer;font-size:0.7rem;color:${ev === activeDharmaEvent ? '#fdf6ea' : 'var(--gold)'};font-weight:bold;" onclick="renameDharmaEvent('${escapeAttr(ev)}')">✏️</span>
      ${dharmaEvents.length > 1 ? `<span style="cursor:pointer;font-size:0.7rem;color:${ev === activeDharmaEvent ? '#fdf6ea' : '#b35256'};font-weight:bold;" onclick="deleteDharmaEvent('${escapeAttr(ev)}')">✕</span>` : ''}
    </span>
  `).join('') + `<button type="button" class="event-pill event-pill-add" onclick="addNewDharmaEvent()">＋ 新增法會活動</button>`;
  document.getElementById('display-event-title').textContent = `順天太子會【${activeDharmaEvent}】資料管理系統`;
}

async function switchDharmaEvent(ev){
  activeDharmaEvent = ev;
  renderEventPills();
  resetForm();
  renderRecordTable();
}

async function addNewDharmaEvent(){
  const newEv = prompt('請輸入新法會活動名稱：');
  if(!newEv) return;
  const evName = newEv.trim();
  if(!evName) return;
  if(dharmaEvents.includes(evName)){ showToast('此活動名稱已存在'); return; }

  if(confirm(`是否要從舊活動匯入基本名冊（不含登記項目）？\n\n[確定] = 選擇匯入舊名冊\n[取消] = 建立空白新活動`)){
    const oldEv = prompt(`請輸入要匯入基本名冊的舊活動名稱：\n現有活動: ${dharmaEvents.join(', ')}`, dharmaEvents[0]);
    if(oldEv && dharmaEvents.includes(oldEv.trim())){
      const targetOldEv = oldEv.trim();
      const oldRecords = records.filter(r => (r.event || dharmaEvents[0]) === targetOldEv);
      oldRecords.forEach(r => { records.push({ ...r, id: uid(), event: evName, entries: {} }); });
      showToast(`已從「${targetOldEv}」匯入 ${oldRecords.length} 筆基本名冊`);
    }
  }

  dharmaEvents.push(evName);
  activeDharmaEvent = evName;
  await saveDataAll();
  renderEventPills();
  resetForm();
  renderRecordTable();
  showToast(`已切換至新法會活動：${evName}`);
}

async function renamePilgrimageEvent(oldEv){
  const newEv = prompt(`請輸入進香活動「${oldEv}」的新名稱：`, oldEv);
  if(!newEv) return;
  const name = newEv.trim();
  if(!name || name === oldEv) return;
  if(pilgrimageEvents.includes(name)){ showToast('此活動名稱已存在'); return; }

  pilgrimageEvents = pilgrimageEvents.map(e => e === oldEv ? name : e);
  pilgrimages.forEach(p => {
    if((p.event || pilgrimageEvents[0]) === oldEv) p.event = name;
  });
  if(carPlatesMap[oldEv]){
    carPlatesMap[name] = carPlatesMap[oldEv];
    delete carPlatesMap[oldEv];
  }
  if(customCarsMap[oldEv]){
    customCarsMap[name] = customCarsMap[oldEv];
    delete customCarsMap[oldEv];
  }
  if(customCarsMap[oldEv + '_removed_defs']){
    customCarsMap[name + '_removed_defs'] = customCarsMap[oldEv + '_removed_defs'];
    delete customCarsMap[oldEv + '_removed_defs'];
  }
  if(activePilgrimageEvent === oldEv) activePilgrimageEvent = name;

  await saveDataAll();
  renderPilgrimageEventPills();
  renderCarPlatesConfig();
  renderPilgTable();
  showToast(`已將進香活動重新命名為：${name}`);
}

async function deletePilgrimageEvent(ev){
  if(pilgrimageEvents.length <= 1){ showToast('至少需保留一個進香活動'); return; }
  if(!confirm(`確定要刪除進香活動「${ev}」及其相關名單嗎？`)) return;
  pilgrimageEvents = pilgrimageEvents.filter(x => x !== ev);
  pilgrimages = pilgrimages.filter(p => (p.event || pilgrimageEvents[0]) !== ev);
  activePilgrimageEvent = pilgrimageEvents[0];
  await saveDataAll();
  renderPilgrimageEventPills();
  renderCarPlatesConfig();
  renderPilgTable();
  showToast(`已刪除進香活動「${ev}」`);
}

function renderPilgrimageEventPills(){
  const container = document.getElementById('pilgrimage-pills');
  container.innerHTML = pilgrimageEvents.map(ev => `
    <span style="display:inline-flex;align-items:center;background:${ev === activePilgrimageEvent ? 'var(--seal)' : '#fffdf7'};color:${ev === activePilgrimageEvent ? '#fdf6ea' : 'var(--ink)'};border:1px solid var(--rule);border-radius:20px;padding:4px 10px;font-size:0.8125rem;font-family:'Noto Serif TC',serif;gap:6px;">
      <span style="cursor:pointer;font-weight:${ev === activePilgrimageEvent ? 'bold' : 'normal'};" onclick="switchPilgrimageEvent('${escapeAttr(ev)}')">${escapeHtml(ev)}</span>
      <span style="cursor:pointer;font-size:0.7rem;color:${ev === activePilgrimageEvent ? '#fdf6ea' : 'var(--gold)'};font-weight:bold;" onclick="renamePilgrimageEvent('${escapeAttr(ev)}')">✏️</span>
      ${pilgrimageEvents.length > 1 ? `<span style="cursor:pointer;font-size:0.7rem;color:${ev === activePilgrimageEvent ? '#fdf6ea' : '#b35256'};font-weight:bold;" onclick="deletePilgrimageEvent('${escapeAttr(ev)}')">✕</span>` : ''}
    </span>
  `).join('') + `<button type="button" class="event-pill event-pill-add" onclick="addNewPilgrimageEvent()">＋ 新增進香活動</button>`;
}

async function switchPilgrimageEvent(ev){
  activePilgrimageEvent = ev;
  renderPilgrimageEventPills();
  renderCarPlatesConfig();
  renderPilgTable();
}

async function addNewPilgrimageEvent(){
  const newEv = prompt('請輸入新進香活動名稱：');
  if(!newEv) return;
  const evName = newEv.trim();
  if(!evName) return;
  if(pilgrimageEvents.includes(evName)){ showToast('此活動名稱已存在'); return; }

  if(confirm(`是否要從舊進香活動匯入名冊（車次、車牌、房間號將留空）？\n\n[確定] = 選擇匯入舊名冊\n[取消] = 建立空白新活動`)){
    const oldEv = prompt(`請輸入要匯入名冊的舊進香活動名稱：\n現有活動: ${pilgrimageEvents.join(', ')}`, pilgrimageEvents[0]);
    if(oldEv && pilgrimageEvents.includes(oldEv.trim())){
      const targetOldEv = oldEv.trim();
      const oldPilgs = pilgrimages.filter(p => (p.event || pilgrimageEvents[0]) === targetOldEv);
      oldPilgs.forEach(p => {
        pilgrimages.push({
          ...p,
          id: uid(),
          event: evName,
          bus: '',
          plate: '',
          room: '',
          parentId: '',
          note: ''
        });
      });
      showToast(`已從「${targetOldEv}」匯入 ${oldPilgs.length} 筆進香名冊`);
    }
  }

  pilgrimageEvents.push(evName);
  activePilgrimageEvent = evName;
  await saveDataAll();
  renderPilgrimageEventPills();
  renderCarPlatesConfig();
  renderPilgTable();
  showToast(`已切換至進香活動：${evName}`);
}

async function renameDonationEvent(oldEv){
  const newEv = prompt(`請輸入捐款活動「${oldEv}」的新名稱：`, oldEv);
  if(!newEv) return;
  const name = newEv.trim();
  if(!name || name === oldEv) return;
  if(donationEvents.includes(name)){ showToast('此活動名稱已存在'); return; }

  donationEvents = donationEvents.map(e => e === oldEv ? name : e);
  donations.forEach(d => {
    if((d.event || donationEvents[0]) === oldEv) d.event = name;
  });
  if(activeDonationEvent === oldEv) activeDonationEvent = name;

  await saveDataAll();
  renderDonationEventPills();
  renderDonationTable();
  showToast(`已將捐款活動重新命名為：${name}`);
}

async function deleteDonationEvent(ev){
  if(donationEvents.length <= 1){ showToast('至少需保留一個捐款活動'); return; }
  if(!confirm(`確定要刪除捐款活動「${ev}」及其相關捐款紀錄嗎？`)) return;
  donationEvents = donationEvents.filter(x => x !== ev);
  donations = donations.filter(d => (d.event || donationEvents[0]) !== ev);
  activeDonationEvent = donationEvents[0];
  await saveDataAll();
  renderDonationEventPills();
  renderDonationTable();
  showToast(`已刪除捐款活動「${ev}」`);
}

function renderDonationEventPills(){
  const container = document.getElementById('donation-pills');
  container.innerHTML = donationEvents.map(ev => `
    <span style="display:inline-flex;align-items:center;background:${ev === activeDonationEvent ? 'var(--seal)' : '#fffdf7'};color:${ev === activeDonationEvent ? '#fdf6ea' : 'var(--ink)'};border:1px solid var(--rule);border-radius:20px;padding:4px 10px;font-size:0.8125rem;font-family:'Noto Serif TC',serif;gap:6px;">
      <span style="cursor:pointer;font-weight:${ev === activeDonationEvent ? 'bold' : 'normal'};" onclick="switchDonationEvent('${escapeAttr(ev)}')">${escapeHtml(ev)}</span>
      <span style="cursor:pointer;font-size:0.7rem;color:${ev === activeDonationEvent ? '#fdf6ea' : 'var(--gold)'};font-weight:bold;" onclick="renameDonationEvent('${escapeAttr(ev)}')">✏️</span>
      ${donationEvents.length > 1 ? `<span style="cursor:pointer;font-size:0.7rem;color:${ev === activeDonationEvent ? '#fdf6ea' : '#b35256'};font-weight:bold;" onclick="deleteDonationEvent('${escapeAttr(ev)}')">✕</span>` : ''}
    </span>
  `).join('') + `<button type="button" class="event-pill event-pill-add" onclick="addNewDonationEvent()">＋ 新增捐款活動</button>`;
}

async function switchDonationEvent(ev){
  activeDonationEvent = ev;
  renderDonationEventPills();
  renderDonationTable();
}

async function addNewDonationEvent(){
  const newEv = prompt('請輸入新捐款活動名稱：');
  if(!newEv) return;
  const evName = newEv.trim();
  if(!evName) return;
  if(donationEvents.includes(evName)){ showToast('此活動名稱已存在'); return; }
  donationEvents.push(evName);
  activeDonationEvent = evName;
  await saveDataAll();
  renderDonationEventPills();
  renderDonationTable();
  showToast(`已切換至捐款活動：${evName}`);
}

function applyFontScale(val){
  fontScale = Math.min(Math.max(val, 0.8), 1.8);
  document.documentElement.style.setProperty('--base-scale', fontScale);
  document.getElementById('font-scale-range').value = fontScale;
  document.getElementById('font-scale-val').textContent = Math.round(fontScale * 100) + '%';
  localStorage.setItem(LS_FONT_SCALE, fontScale);
}

document.getElementById('font-scale-range').addEventListener('input', (e)=>{ applyFontScale(parseFloat(e.target.value)); });
document.getElementById('btn-font-dec').addEventListener('click', ()=>{ applyFontScale(fontScale - 0.05); });
document.getElementById('btn-font-inc').addEventListener('click', ()=>{ applyFontScale(fontScale + 0.05); });

function getYinSummary(item){
  const debt = Number(item.yinDebt) || 0;
  const repaid = (item.repays || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const remain = debt - repaid;
  return { debt, repaid, remain };
}

function formatYinStatus(item){
  const sum = getYinSummary(item);
  if(sum.debt === 0) return '—';
  if(sum.remain < 0) return `欠:${sum.debt} | 已還:${sum.repaid} | 已還清 (溢還 ${Math.abs(sum.remain)})`;
  if(sum.remain === 0) return `欠:${sum.debt} | 已還:${sum.repaid} | 已還清`;
  return `欠:${sum.debt} | 已還:${sum.repaid} | 未還:${sum.remain}`;
}

function getPastEventsForItemAndNames(catName, namesArr){
  if(!namesArr || namesArr.length === 0) return [];
  const pastEvents = new Set();
  records.forEach(r => {
    const ev = r.event || dharmaEvents[0];
    if(ev !== activeDharmaEvent && r.entries && r.entries[catName]){
      const entry = r.entries[catName];
      let matched = false;
      if(namesArr.includes(r.name)) matched = true;
      if(r.members && r.members.some(m => namesArr.includes(m.name))) matched = true;
      if(entry.members && entry.members.some(m => namesArr.includes(m))) matched = true;
      if(matched) pastEvents.add(ev);
    }
  });
  return Array.from(pastEvents);
}

document.getElementById('f-name').addEventListener('input', (e)=>{
  const n = e.target.value.trim();
  const tip = document.getElementById('past-participation-tip');
  const pasts = [];
  records.forEach(r => {
    const ev = r.event || dharmaEvents[0];
    if(ev !== activeDharmaEvent && (r.name === n || (r.members && r.members.some(m => m.name === n)))) pasts.push(ev);
  });
  if(pasts.length > 0){
    tip.style.display = 'block';
    tip.textContent = `💡 歷史參與紀錄：曾參加過 【${Array.from(new Set(pasts)).join('、')}】`;
  } else {
    tip.style.display = 'none';
  }
  renderCatGrid(collectCurrentEntries());
});

document.getElementById('f-zodiac').addEventListener('change', (e)=>{
  const z = e.target.value;
  if(z && zodiacYin[z] != null){
    document.getElementById('f-yin-debt').value = zodiacYin[z];
    showToast(`已帶入生肖【${z}】陰債：${zodiacYin[z]}`);
  }
});

document.getElementById('btn-manage-zodiac-yin').addEventListener('click', async ()=>{
  let listStr = Object.keys(DEFAULT_ZODIAC_YIN).map(z => `${z}: ${zodiacYin[z] || 0} 貫`).join('\n');
  const targetZodiac = prompt(`請輸入欲修改對照金額的生肖：\n\n${listStr}`);
  if(!targetZodiac) return;
  const z = targetZodiac.trim();
  if(!DEFAULT_ZODIAC_YIN.hasOwnProperty(z)){ showToast('生肖名稱不正確'); return; }
  const newVal = parseFloat(prompt(`請輸入生肖【${z}】的欠陰債金額：`, zodiacYin[z]));
  if(isNaN(newVal) || newVal < 0){ showToast('請輸入有效金額'); return; }
  zodiacYin[z] = newVal;
  await saveDataAll();
  showToast(`已更新生肖【${z}】對照金額`);
});

async function editDefaultPrice(catName){
  const currentPrice = prices[catName] ?? 0;
  const newPrice = parseFloat(prompt(`請輸入項目「${catName}」的新預設單價：`, currentPrice));
  if(isNaN(newPrice) || newPrice < 0) return;
  prices[catName] = newPrice;
  await saveDataAll();
  renderCatGrid(collectCurrentEntries());
  showToast(`已更新「${catName}」預設單價`);
}

document.querySelectorAll('#mode-switch-bar button').forEach(btn => {
  btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

function switchMode(mode){
  currentFormMode = mode;
  document.querySelectorAll('#mode-switch-bar button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  if(mode === 'single'){
    document.getElementById('section-single-mode').style.display = 'block';
    document.getElementById('section-family-mode').style.display = 'none';
    document.getElementById('lbl-cat-section').textContent = '個人登記項目（勾選後設定數量與備註）';
  } else {
    document.getElementById('section-single-mode').style.display = 'none';
    document.getElementById('section-family-mode').style.display = 'block';
    document.getElementById('lbl-cat-section').textContent = '家庭登記項目（全戶勾選，可指定家庭成員）';
    if(tempFamilyMembers.length === 0) addFamilyMember();
  }
  renderCatGrid(collectCurrentEntries());
}

function renderSingleRepayInputs(){
  const container = document.getElementById('yin-repay-list');
  container.innerHTML = tempSingleRepays.map((r, i) => `
    <div class="cat-note-row" style="margin-bottom:6px;">
      <input type="date" value="${r.date||''}" onchange="tempSingleRepays[${i}].date=this.value" style="width:130px;">
      <input type="number" placeholder="還款金額" value="${r.amount||''}" onchange="tempSingleRepays[${i}].amount=Number(this.value)" style="width:110px;">
      <input type="text" placeholder="備註" value="${escapeAttr(r.note||'')}" onchange="tempSingleRepays[${i}].note=this.value" style="flex:1;">
      <button type="button" class="btn btn-danger btn-sm" onclick="tempSingleRepays.splice(${i},1);renderSingleRepayInputs();">✕</button>
    </div>
  `).join('');
}

document.getElementById('btn-add-repay').addEventListener('click', ()=>{
  tempSingleRepays.push({ date: new Date().toISOString().slice(0,10), amount: 0, note: '' });
  renderSingleRepayInputs();
});

function addFamilyMember(data){
  const m = data || { id: uid(), name: '', phone: '', idNumber: '', relation: '', zodiac: '', solarBirth: '', rocBirth: '', lunarBirth: '', yinDebt: 0, repays: [] };
  tempFamilyMembers.push(m);
  renderFamilyMembers();
  renderCatGrid(collectCurrentEntries());
}

document.getElementById('btn-add-member').addEventListener('click', ()=> addFamilyMember());

function renameFamilyMember(idx, value){
  const entries = collectCurrentEntries();
  const oldName = tempFamilyMembers[idx].name.trim();
  const newName = value.trim();
  tempFamilyMembers[idx].name = value;
  for (const entry of Object.values(entries)) {
    if (oldName && entry.members.includes(oldName)) {
      entry.members = entry.members.map(name => name === oldName ? newName : name).filter(Boolean);
      for (const key of ['memberCounts', 'memberPrices']) {
        if (entry[key] && Object.hasOwn(entry[key], oldName)) {
          if (newName) entry[key][newName] = entry[key][oldName];
          delete entry[key][oldName];
        }
      }
    }
  }
  renderCatGrid(entries);
}
function removeFamilyMember(idx){
  const entries = collectCurrentEntries();
  const name = tempFamilyMembers[idx].name.trim();
  tempFamilyMembers.splice(idx, 1);
  for (const entry of Object.values(entries)) {
    entry.members = entry.members.filter(member => member !== name);
    if(entry.memberCounts) delete entry.memberCounts[name];
    if(entry.memberPrices) delete entry.memberPrices[name];
  }
  renderFamilyMembers();
  renderCatGrid(entries);
}

function renderFamilyMembers(){
  const container = document.getElementById('family-members-container');
  container.innerHTML = tempFamilyMembers.map((m, idx) => {
    const zodiacOpts = ['', '鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬'].map(z => 
      `<option value="${z}" ${m.zodiac===z?'selected':''}>${z ? z + (zodiacYin[z]?` (${zodiacYin[z]}貫)`:'') : '-- 請選擇生肖 --'}</option>`
    ).join('');

    const repaysHtml = (m.repays || []).map((r, ri) => `
      <div class="cat-note-row" style="margin-top:4px;">
        <input type="date" value="${r.date||''}" onchange="tempFamilyMembers[${idx}].repays[${ri}].date=this.value" style="width:125px;">
        <input type="number" placeholder="金額" value="${r.amount||''}" onchange="tempFamilyMembers[${idx}].repays[${ri}].amount=Number(this.value)" style="width:90px;">
        <input type="text" placeholder="備註" value="${escapeAttr(r.note||'')}" onchange="tempFamilyMembers[${idx}].repays[${ri}].note=this.value" style="flex:1;">
        <button type="button" class="btn btn-danger btn-sm" onclick="tempFamilyMembers[${idx}].repays.splice(${ri},1);renderFamilyMembers();">✕</button>
      </div>
    `).join('');

    return `
      <div class="member-card">
        <div class="member-card-head">
          <span class="member-title">成員 #${idx + 1}</span>
          <button type="button" class="btn btn-danger btn-sm" onclick="removeFamilyMember(${idx})">刪除成員</button>
        </div>
        <div class="grid-4">
          <label class="field" style="margin-bottom:8px;"><span class="lbl">成員姓名 *</span><input type="text" value="${escapeAttr(m.name)}" oninput="renameFamilyMember(${idx}, this.value)" placeholder="姓名"></label>
          <label class="field" style="margin-bottom:8px;"><span class="lbl">連絡電話</span><input type="text" value="${escapeAttr(m.phone||'')}" oninput="tempFamilyMembers[${idx}].phone=this.value" placeholder="0912345678"></label>
          <label class="field" style="margin-bottom:8px;"><span class="lbl">身分證字號</span><input type="text" value="${escapeAttr(m.idNumber||'')}" oninput="tempFamilyMembers[${idx}].idNumber=this.value" placeholder="身分證"></label>
          <label class="field" style="margin-bottom:8px;"><span class="lbl">稱謂/關係</span><input type="text" value="${escapeAttr(m.relation||'')}" oninput="tempFamilyMembers[${idx}].relation=this.value" placeholder="如：長子"></label>
        </div>
        <div class="grid-3" style="margin-top:4px;">
          <label class="field" style="margin-bottom:8px;"><span class="lbl">生肖 / 陰債</span><select onchange="onMemberZodiacChange(${idx}, this.value)">${zodiacOpts}</select></label>
          <label class="field" style="margin-bottom:8px;"><span class="lbl">欠陰債貫數</span><input type="number" value="${m.yinDebt||''}" oninput="tempFamilyMembers[${idx}].yinDebt=Number(this.value)" placeholder="0"></label>
        </div>
        <div class="grid-3" style="margin-top:4px;">
          <label class="field" style="margin-bottom:8px;"><span class="lbl">國曆生日 (自動同步)</span><input type="text" value="${m.solarBirth||''}" onblur="updateFamilyMemberDate(${idx}, 'solar', this.value)" placeholder="1966/10/06"></label>
          <label class="field" style="margin-bottom:8px;"><span class="lbl">民國生日 (自動同步)</span><input type="text" value="${escapeAttr(m.rocBirth||'')}" onblur="updateFamilyMemberDate(${idx}, 'roc', this.value)" placeholder="55/10/06"></label>
          <label class="field" style="margin-bottom:8px;"><span class="lbl">農曆生日 (自動同步)</span><input type="text" value="${escapeAttr(m.lunarBirth||'')}" onblur="updateFamilyMemberDate(${idx}, 'lunar', this.value)" placeholder="55/09/03"></label>
        </div>
        <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:6px;">還款紀錄：<button type="button" class="btn btn-ghost btn-sm" style="padding:1px 6px;margin-left:6px;" onclick="addMemberRepay(${idx})">＋ 還款</button></div>
        ${repaysHtml}
      </div>
    `;
  }).join('');
}

function updateFamilyMemberDate(idx, type, val){
  let parsed = parseDateAny(val);
  if(!parsed) return;
  const SolarCls = window.Solar || window.lunar?.Solar;
  const LunarCls = window.Lunar || window.lunar?.Lunar;
  if (!SolarCls || !LunarCls) return;
  try {
    let solar, lunar;
    let gy, gm, gd, rocY, ly, lm, ld;
    let year = parsed.year;
    let month = parsed.month;
    let day = parsed.day;

    if (type === 'solar' || type === 'roc') {
      let gYear = year < 1900 ? year + 1911 : year;
      solar = SolarCls.fromYmd(gYear, month, day);
      lunar = solar.getLunar();
    } else if (type === 'lunar') {
      let lYear = year < 1900 ? year + 1911 : year;
      lunar = LunarCls.fromYmd(lYear, month, day);
      solar = lunar.getSolar();
    }
    gy = solar.getYear(); gm = solar.getMonth(); gd = solar.getDay();
    rocY = gy - 1911;
    ly = lunar.getYear(); lm = Math.abs(lunar.getMonth()); ld = lunar.getDay();

    let f2 = n => String(n).padStart(2, '0');
    tempFamilyMembers[idx].solarBirth = `${gy}/${f2(gm)}/${f2(gd)}`;
    tempFamilyMembers[idx].rocBirth = `${f2(rocY)}/${f2(gm)}/${f2(gd)}`;
    tempFamilyMembers[idx].lunarBirth = `${f2(ly - 1911)}/${f2(lm)}/${f2(ld)}`;
    
    let zodiacName = getZodiacByLunarYear(ly) || lunar.getYearShengXiao();
    if(zodiacName){
      tempFamilyMembers[idx].zodiac = zodiacName;
      if(zodiacYin[zodiacName] != null){
        tempFamilyMembers[idx].yinDebt = zodiacYin[zodiacName];
      }
    }

    renderFamilyMembers();
  } catch(e) {
    console.error(e);
  }
}

function onMemberZodiacChange(idx, z){
  tempFamilyMembers[idx].zodiac = z;
  if(z && zodiacYin[z] != null){
    tempFamilyMembers[idx].yinDebt = zodiacYin[z];
    renderFamilyMembers();
  }
}

function addMemberRepay(idx){
  tempFamilyMembers[idx].repays.push({ date: new Date().toISOString().slice(0,10), amount: 0, note: '' });
  renderFamilyMembers();
}

function renderCatGrid(existingEntries){
  existingEntries = existingEntries || {};
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';
  const activeMembers = tempFamilyMembers.map(m => m.name.trim()).filter(Boolean);
  const currentNames = currentFormMode === 'single' 
    ? [document.getElementById('f-name')?.value?.trim()].filter(Boolean)
    : activeMembers;

  categories.forEach(cat=>{
    const has = Object.prototype.hasOwnProperty.call(existingEntries, cat);
    const existing = has ? existingEntries[cat] : null;
    const noteVal = existing ? (existing.note || '') : '';
    const countVal = existing && existing.count ? existing.count : 1;
    const priceVal = existing && existing.price != null ? existing.price : (prices[cat] ?? 0);
    const selectedMembers = existing && Array.isArray(existing.members) ? existing.members : [];
    const memberCounts = existing?.memberCounts || {};
    const isCustom = !DEFAULT_CATS.includes(cat);

    const pastEvs = getPastEventsForItemAndNames(cat, currentNames);
    const pastTipHtml = pastEvs.length > 0 
      ? `<div style="font-size:0.7rem;color:var(--gold);margin-top:4px;font-weight:bold;background:#fff8e6;padding:3px 6px;border-radius:4px;border:1px dashed var(--gold);">💡 曾於 [${pastEvs.join('、')}] 參加過此項目</div>` 
      : '';

    let memberPickerHtml = '';
    if(currentFormMode === 'family'){
      const chipsHtml = activeMembers.length > 0 
        ? activeMembers.map(mName => `<span style="display:inline-flex;align-items:center;gap:4px;"><span class="member-chip ${selectedMembers.includes(mName)?'selected':''}" data-cat="${escapeAttr(cat)}" data-member="${escapeAttr(mName)}">${escapeHtml(mName)}</span><input type="number" min="1" step="1" aria-label="${escapeAttr(mName)} 數量" data-member-count="${escapeAttr(mName)}" value="${escapeAttr(memberCounts[mName] ?? countVal)}" style="width:60px;"></span>`).join('')
        : '<span style="font-size:0.6875rem;color:#888;">(請先於上方填寫家庭成員姓名)</span>';

      memberPickerHtml = `
        <div class="member-select-wrap">
          <span class="member-select-lbl">👥 點選參與成員：</span>
          <div class="member-chip-group">${chipsHtml}</div>
        </div>
      `;
    }

    const wrap = document.createElement('div');
    wrap.className = 'cat-item' + (has ? ' checked' : '');
    wrap._memberPrices = existing?.memberPrices || {};
    wrap.innerHTML = `
      ${isCustom ? `<button type="button" class="btn-del-cat" data-del-cat="${escapeAttr(cat)}">✕</button>` : ''}
      <label class="cat-head">
        <input type="checkbox" data-cat="${escapeAttr(cat)}" ${has?'checked':''}>
        <span class="cat-title">${escapeHtml(cat)}</span>
        <div class="cat-price-wrap">
          <span class="cat-price-tag">${formatMoney(prices[cat]||0)}</span>
          <button type="button" class="btn-edit-price" data-edit-price="${escapeAttr(cat)}" title="修改預設單價">✏️</button>
        </div>
      </label>
      ${pastTipHtml}
      <div class="cat-note">
        ${memberPickerHtml}
        <div class="cat-note-row" style="margin-top:4px;">
          <span style="font-size:12px;color:var(--ink-soft);">${currentFormMode === 'family' ? '全戶共用數量（未指定成員時）' : '數量'}:</span>
          <input type="number" min="1" data-count="${escapeAttr(cat)}" value="${countVal}" style="width:65px;">
          <span style="font-size:12px;color:var(--ink-soft);">單價:</span>
          <input type="number" data-price="${escapeAttr(cat)}" value="${priceVal}" style="width:80px;">
        </div>
        <div class="cat-note-row">
          <input type="text" data-note="${escapeAttr(cat)}" placeholder="備註（選填）" value="${escapeAttr(noteVal)}" style="flex:1;">
        </div>
      </div>`;

    wrap.querySelector('input[type=checkbox]').addEventListener('change', (e)=>{ wrap.classList.toggle('checked', e.target.checked); });
    wrap.querySelector('[data-edit-price]').addEventListener('click', (e)=>{ e.stopPropagation(); editDefaultPrice(cat); });
    if(isCustom) wrap.querySelector('[data-del-cat]').addEventListener('click', (e)=>{ e.stopPropagation(); deleteCustomCategory(cat); });

    wrap.querySelectorAll('.member-chip').forEach(chip => {
      chip.addEventListener('click', (e)=>{
        e.preventDefault(); e.stopPropagation();
        chip.classList.toggle('selected');
      });
    });

    grid.appendChild(wrap);
  });
}

async function deleteCustomCategory(catName){
  if(!confirm(`確定要刪除「${catName}」嗎？`)) return;
  categories = categories.filter(c => c !== catName);
  delete prices[catName];
  records.forEach(r => { if(r.entries) delete r.entries[catName]; });
  await saveDataAll();
  renderCatGrid(collectCurrentEntries()); renderRecordTable();
}

document.getElementById('btn-addcat').addEventListener('click', async ()=>{
  const input = document.getElementById('f-newcat');
  const priceInput = document.getElementById('f-newcat-price');
  const name = input.value.trim();
  const priceNum = parseFloat(priceInput.value);
  if(!name){ showToast('請輸入項目名稱'); return; }
  if(categories.includes(name)){ showToast('此項目已存在'); return; }
  categories.push(name);
  prices[name] = isNaN(priceNum) ? 0 : priceNum;
  await saveDataAll();
  input.value = ''; priceInput.value = '';
  renderCatGrid(collectCurrentEntries());
  showToast(`已新增項目「${name}」`);
});

function collectCurrentEntries(){
  const entries = {};
  document.querySelectorAll('#cat-grid .cat-item').forEach(item=>{
    const cb = item.querySelector('input[type=checkbox]');
    if(cb && cb.checked){
      const cat = cb.dataset.cat;
      const countInput = item.querySelector('input[data-count]');
      const priceInput = item.querySelector('input[data-price]');
      const noteInput = item.querySelector('input[data-note]');
      const selMembers = [];
      item.querySelectorAll('.member-chip.selected').forEach(chip => selMembers.push(chip.dataset.member));
      const memberCounts = {};
      item.querySelectorAll('input[data-member-count]').forEach(input => { if(selMembers.includes(input.dataset.memberCount)) memberCounts[input.dataset.memberCount] = Math.max(1, parseInt(input.value, 10) || 1); });
      const memberPrices = item._memberPrices || {};

      entries[cat] = {
        count: Math.max(1, parseInt(countInput.value) || 1),
        price: parseFloat(priceInput.value) || 0,
        note: noteInput.value.trim(),
        members: selMembers, memberCounts, memberPrices
      };
    }
  });
  return entries;
}

function getMemberCount(entry, name){ return Math.max(1, Number(entry.memberCounts?.[name] ?? entry.count) || 1); }
function getMemberPrice(entry, name){ return Number(entry.memberPrices?.[name] ?? entry.price) || 0; }
function getItemEntryTotal(entry){
  if(!entry) return 0;
  const members = entry.members || [];
  return members.length ? members.reduce((sum, name) => sum + getMemberCount(entry, name) * getMemberPrice(entry, name), 0) : (Number(entry.count) || 1) * (Number(entry.price) || 0);
}
function getItemEntryCount(entry){
  if(!entry) return 0;
  const members = entry.members || [];
  return members.length ? members.reduce((sum, name) => sum + getMemberCount(entry, name), 0) : (Number(entry.count) || 1);
}

function recordTotal(entries){
  return Object.values(entries||{}).reduce((sum, e) => sum + getItemEntryTotal(e), 0);
}

function recordTotalCount(entries){
  return Object.values(entries||{}).reduce((sum, e) => sum + getItemEntryCount(e), 0);
}

function formatMoney(n){ return 'NT$ ' + Number(n||0).toLocaleString(); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }
function uid(){ return 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 2200);
}

document.getElementById('btn-save').addEventListener('click', async ()=>{
  const entries = collectCurrentEntries();

  if(currentFormMode === 'single'){
    const name = document.getElementById('f-name').value.trim();
    if(!name){ showToast('請輸入姓名'); return; }

    const phone = document.getElementById('f-phone').value.trim();
    const idNumber = document.getElementById('f-id-number').value.trim();
    const zodiac = document.getElementById('f-zodiac').value;
    const tag = document.getElementById('f-single-tag').value.trim();
    const solarBirth = document.getElementById('f-solar-birth').value.trim();
    const rocBirth = formatRocBirth(document.getElementById('f-roc-birth').value);
    const lunarBirth = document.getElementById('f-lunar-birth').value.trim();
    const address = document.getElementById('f-address').value.trim();
    const companyName = document.getElementById('f-company-name').value.trim();
    const companyAddress = document.getElementById('f-company-address').value.trim();
    const yinDebt = Number(document.getElementById('f-yin-debt').value) || 0;

    if(editingId){
      const rec = records.find(r=>r.id===editingId);
      if(rec){
        rec.event = activeDharmaEvent; rec.mode = 'single'; rec.name = name; rec.phone = phone; rec.idNumber = idNumber;
        rec.zodiac = zodiac; rec.tag = tag; rec.solarBirth = solarBirth; rec.rocBirth = rocBirth;
        rec.lunarBirth = lunarBirth; rec.address = address; rec.companyName = companyName;
        rec.companyAddress = companyAddress; rec.yinDebt = yinDebt; rec.repays = [...tempSingleRepays];
        rec.members = []; rec.entries = entries;
      }
      showToast('已更新個人資料');
    } else {
      records.push({
        id: uid(), event: activeDharmaEvent, mode: 'single', name, phone, idNumber, zodiac, tag,
        solarBirth, rocBirth, lunarBirth, address, companyName, companyAddress,
        yinDebt, repays: [...tempSingleRepays], members: [], entries, createdAt: Date.now()
      });
      showToast('已儲存個人登記');
    }
  } else {
    const famHead = document.getElementById('f-fam-head').value.trim();
    if(!famHead){ showToast('請輸入戶名或戶長姓名'); return; }
    const famAddress = document.getElementById('f-fam-address').value.trim();
    const famCompanyName = document.getElementById('f-fam-company-name').value.trim();
    const famCompanyAddress = document.getElementById('f-fam-company-address').value.trim();

    if(tempFamilyMembers.length === 0 || tempFamilyMembers.some(m => !m.name.trim())){ showToast('請填寫每位家庭成員的姓名'); return; }
    if(new Set(tempFamilyMembers.map(m => m.name.trim())).size !== tempFamilyMembers.length){ showToast('同一家庭的成員姓名不可重複'); return; }
    tempFamilyMembers.forEach(m => { m.name = m.name.trim(); });

    if(editingId){
      const rec = records.find(r=>r.id===editingId);
      if(rec){
        rec.event = activeDharmaEvent; rec.mode = 'family'; rec.name = famHead; rec.phone = '';
        rec.address = famAddress; rec.companyName = famCompanyName; rec.companyAddress = famCompanyAddress;
        rec.members = JSON.parse(JSON.stringify(tempFamilyMembers));
        rec.entries = entries; rec.yinDebt = 0; rec.repays = [];
      }
      showToast('已更新家庭戶頭資料');
    } else {
      records.push({
        id: uid(), event: activeDharmaEvent, mode: 'family', name: famHead, phone: '', address: famAddress,
        companyName: famCompanyName, companyAddress: famCompanyAddress,
        members: JSON.parse(JSON.stringify(tempFamilyMembers)), entries, createdAt: Date.now()
      });
      showToast('已儲存家庭登記');
    }
  }

  await saveDataAll();
  resetForm();
  renderRecordTable();
});

document.getElementById('btn-clear').addEventListener('click', resetForm);
document.getElementById('btn-cancel-edit').addEventListener('click', resetForm);

function resetForm(){
  editingId = null;
  document.getElementById('f-name').value = '';
  document.getElementById('f-phone').value = '';
  document.getElementById('f-id-number').value = '';
  document.getElementById('f-zodiac').value = '';
  document.getElementById('f-single-tag').value = '';
  document.getElementById('f-solar-birth').value = '';
  document.getElementById('f-roc-birth').value = '';
  document.getElementById('f-lunar-birth').value = '';
  document.getElementById('f-address').value = '';
  document.getElementById('f-company-name').value = '';
  document.getElementById('f-company-address').value = '';
  document.getElementById('f-yin-debt').value = '';
  document.getElementById('past-participation-tip').style.display = 'none';
  tempSingleRepays = [];
  renderSingleRepayInputs();

  document.getElementById('f-fam-head').value = '';
  document.getElementById('f-fam-address').value = '';
  document.getElementById('f-fam-company-name').value = '';
  document.getElementById('f-fam-company-address').value = '';
  tempFamilyMembers = [];
  renderFamilyMembers();

  switchMode('single');
  document.getElementById('form-heading').textContent = '新增登記';
  document.getElementById('btn-cancel-edit').style.display = 'none';
  document.getElementById('btn-save').textContent = '儲存';
  renderCatGrid({});
}

function startEdit(id){
  const rec = records.find(r=>r.id===id);
  if(!rec) return;
  editingId = id;

  if(rec.mode === 'family'){
    switchMode('family');
    document.getElementById('f-fam-head').value = rec.name;
    document.getElementById('f-fam-address').value = rec.address || '';
    document.getElementById('f-fam-company-name').value = rec.companyName || '';
    document.getElementById('f-fam-company-address').value = rec.companyAddress || '';
    tempFamilyMembers = JSON.parse(JSON.stringify(rec.members || []));
    renderFamilyMembers();
  } else {
    switchMode('single');
    document.getElementById('f-name').value = rec.name;
    document.getElementById('f-phone').value = rec.phone || '';
    document.getElementById('f-id-number').value = rec.idNumber || '';
    document.getElementById('f-zodiac').value = rec.zodiac || '';
    document.getElementById('f-single-tag').value = rec.tag || '';
    document.getElementById('f-solar-birth').value = rec.solarBirth || '';
    document.getElementById('f-roc-birth').value = rec.rocBirth || '';
    document.getElementById('f-lunar-birth').value = rec.lunarBirth || '';
    document.getElementById('f-address').value = rec.address || '';
    document.getElementById('f-company-name').value = rec.companyName || '';
    document.getElementById('f-company-address').value = rec.companyAddress || '';
    document.getElementById('f-yin-debt').value = rec.yinDebt || '';
    tempSingleRepays = JSON.parse(JSON.stringify(rec.repays || []));
    renderSingleRepayInputs();
  }

  document.getElementById('form-heading').textContent = '編輯登記：' + rec.name;
  document.getElementById('btn-cancel-edit').style.display = 'inline-block';
  document.getElementById('btn-save').textContent = '更新';
  renderCatGrid(rec.entries);
  document.querySelector('[data-tab="input"]').click();
  window.scrollTo({top:0, behavior:'smooth'});
}

async function deleteRecord(id){
  const rec = records.find(r=>r.id===id);
  if(!rec) return;
  if(!confirm(`確定要刪除「${rec.name}」的資料嗎？`)) return;
  records = records.filter(r=>r.id!==id);
  await saveDataAll();
  renderRecordTable();
  showToast('已刪除');
}

function renderRecordTable(){
  const tbody = document.getElementById('record-table');
  const empty = document.getElementById('record-empty');
  const activeRecords = records.filter(r => (r.event || dharmaEvents[0]) === activeDharmaEvent);

  document.getElementById('record-count').textContent = activeRecords.length;
  tbody.innerHTML = '';

  if(activeRecords.length === 0){
    empty.style.display = 'block';
    document.getElementById('grand-total').textContent = formatMoney(0);
    return;
  }
  empty.style.display = 'none';
  let grandTotal = 0;

  activeRecords.slice().sort((a,b)=>a.name.localeCompare(b.name,'zh-Hant')).forEach(rec=>{
    const tr = document.createElement('tr');
    const cats = Object.keys(rec.entries || {});
    const subtotal = recordTotal(rec.entries);
    grandTotal += subtotal;

    const stamps = cats.length
      ? cats.map(c=>{
          const e = rec.entries[c] || {};
          const itemTot = getItemEntryTotal(e);
          const totalCnt = getItemEntryCount(e);
          const cntTxt = totalCnt > 1 ? ` ×${totalCnt}` : '';
          const memTxt = e.members && e.members.length ? `<br><span style="color:#7d7562;font-size:10px;">[${e.members.join(', ')}]</span>` : '';
          const noteTxt = e.note ? (`<small>(${escapeHtml(e.note)})</small>`) : '';
          return `<span class="stamp">${escapeHtml(c)}${cntTxt} · ${formatMoney(itemTot)}${noteTxt}${memTxt}</span>`;
        }).join('')
      : '<span style="color:var(--ink-soft);font-size:12px;">（無登記項目）</span>';

    let nameCol = '', metaCol = '', yinCol = '';
    const compTxt = (rec.companyName || rec.companyAddress) ? `<br><small style="color:var(--gold);">🏢 ${escapeHtml(rec.companyName||'')} ${escapeHtml(rec.companyAddress?`(${rec.companyAddress})`:'' )}</small>` : '';

    if(rec.mode === 'family'){
      const memList = (rec.members || []).map(m => `• <b>${escapeHtml(m.name)}</b> ${m.phone?`[📞 ${escapeHtml(m.phone)}]`:''} ${m.idNumber?`(${escapeHtml(m.idNumber)})`:''} ${m.relation?`[${m.relation}]`:''}`).join('<br>');
      nameCol = `<span class="type-tag">家庭</span><b>${escapeHtml(rec.name)}</b><div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">${memList}</div>`;
      metaCol = `<span style="font-size:12px;color:var(--ink-soft);">住址：${escapeHtml(rec.address || '—')}${compTxt}</span>`;
      const yinPieces = (rec.members || []).filter(m => Number(m.yinDebt) > 0).map(m => `${escapeHtml(m.name)}: ${formatYinStatus(m)}`);
      yinCol = yinPieces.length ? `<span style="font-size:11px;">${yinPieces.join('<br>')}</span>` : '—';
    } else {
      const tagTxt = rec.tag ? `<small style="color:var(--gold);"> [${escapeHtml(rec.tag)}]</small>` : '';
      const zodiacTxt = rec.zodiac ? `<small style="color:var(--ink-soft);"> (屬${escapeHtml(rec.zodiac)})</small>` : '';
      nameCol = `<span class="type-tag" style="background:#555;">個人</span><b>${escapeHtml(rec.name)}</b>${zodiacTxt}${tagTxt}`;
      const phoneTxt = rec.phone ? `📞 ${escapeHtml(rec.phone)}<br>` : '';
      const idTxt = rec.idNumber ? `身分證: ${escapeHtml(rec.idNumber)}<br>` : '';
      const birthTxt = [rec.solarBirth?`國:${rec.solarBirth}`:'', rec.rocBirth?`民:${rec.rocBirth}`:'', rec.lunarBirth?`農:${rec.lunarBirth}`:''].filter(Boolean).join('<br>') || '—';
      metaCol = `<span style="font-size:12px;color:var(--ink-soft);">${phoneTxt}${idTxt}${birthTxt}<br><small>${escapeHtml(rec.address||'')}</small>${compTxt}</span>`;
      yinCol = Number(rec.yinDebt) > 0 ? `<span style="font-size:12px;">${formatYinStatus(rec)}</span>` : '—';
    }

    tr.innerHTML = `
      <td>${nameCol}</td>
      <td>${metaCol}</td>
      <td>${yinCol}</td>
      <td>${stamps}</td>
      <td style="white-space:nowrap;"><b>${formatMoney(subtotal)}</b></td>
      <td>
        <button class="btn btn-ghost btn-sm" data-edit="${rec.id}">編輯</button>
        <button class="btn btn-danger btn-sm" data-del="${rec.id}" style="margin-top:4px;">刪除</button>
      </td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('grand-total').textContent = formatMoney(grandTotal);
  tbody.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click', ()=>startEdit(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>deleteRecord(b.dataset.del)));
}

