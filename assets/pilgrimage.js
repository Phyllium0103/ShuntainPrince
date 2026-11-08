// ==========================================
// 🚩 2. 進香管理邏輯 (含群組階層)
// ==========================================
function getAllCarsForCurrentEvent(){
  const removedDefs = customCarsMap[activePilgrimageEvent + '_removed_defs'] || [];
  const activeDefaults = DEFAULT_CARS.filter(c => !removedDefs.includes(c));
  const customList = customCarsMap[activePilgrimageEvent] || [];
  const set = new Set([...activeDefaults, ...customList]);
  return Array.from(set);
}

function renderCarPlatesConfig(){
  const box = document.getElementById('car-plates-config-box');
  if(!box) return;
  carPlatesMap[activePilgrimageEvent] = carPlatesMap[activePilgrimageEvent] || {};
  const currentMap = carPlatesMap[activePilgrimageEvent];
  const allCars = getAllCarsForCurrentEvent();

  box.innerHTML = allCars.map(car => {
    return `
      <div style="background:#fffdf7;border:1px solid var(--rule);padding:8px;border-radius:4px;display:flex;flex-direction:column;gap:4px;position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:bold;color:var(--seal-dark);font-size:0.8125rem;">🚌 ${escapeHtml(car)}</span>
          <button type="button" class="btn-danger btn-sm" style="padding:1px 4px;font-size:0.65rem;" onclick="deleteCarTier('${escapeAttr(car)}')">刪除車次</button>
        </div>
        <input type="text" value="${escapeAttr(currentMap[car] || '')}" placeholder="車牌號碼" oninput="updateCarPlateConfig('${escapeAttr(car)}', this.value)">
      </div>
    `;
  }).join('');
  updatePilgBusSelect();
  updatePlateDatalist();
}

async function deleteCarTier(car){
  if(!confirm(`確定要刪除車次「${car}」嗎？`)) return;
  if(DEFAULT_CARS.includes(car)){
    customCarsMap[activePilgrimageEvent + '_removed_defs'] = customCarsMap[activePilgrimageEvent + '_removed_defs'] || [];
    if(!customCarsMap[activePilgrimageEvent + '_removed_defs'].includes(car)){
      customCarsMap[activePilgrimageEvent + '_removed_defs'].push(car);
    }
  }
  if(customCarsMap[activePilgrimageEvent]){
    customCarsMap[activePilgrimageEvent] = customCarsMap[activePilgrimageEvent].filter(x => x !== car);
  }
  if(carPlatesMap[activePilgrimageEvent]){
    delete carPlatesMap[activePilgrimageEvent][car];
  }
  await saveDataAll();
  renderCarPlatesConfig();
  showToast(`已刪除車次「${car}」`);
}

document.getElementById('btn-add-car-tier').addEventListener('click', async ()=>{
  const nameInput = document.getElementById('new-car-name');
  const plateInput = document.getElementById('new-car-plate');
  const carName = nameInput.value.trim();
  const carPlate = plateInput.value.trim();

  if(!carName){ showToast('請輸入車次名稱'); return; }
  customCarsMap[activePilgrimageEvent] = customCarsMap[activePilgrimageEvent] || [];
  if(!customCarsMap[activePilgrimageEvent].includes(carName)){
    customCarsMap[activePilgrimageEvent].push(carName);
  }
  if(customCarsMap[activePilgrimageEvent + '_removed_defs']){
    customCarsMap[activePilgrimageEvent + '_removed_defs'] = customCarsMap[activePilgrimageEvent + '_removed_defs'].filter(x => x !== carName);
  }
  if(carPlate){
    carPlatesMap[activePilgrimageEvent] = carPlatesMap[activePilgrimageEvent] || {};
    carPlatesMap[activePilgrimageEvent][carName] = carPlate;
  }
  await saveDataAll();
  nameInput.value = ''; plateInput.value = '';
  renderCarPlatesConfig();
  showToast(`已新增／更新車次：${carName}`);
});

function updateCarPlateConfig(car, val){
  carPlatesMap[activePilgrimageEvent] = carPlatesMap[activePilgrimageEvent] || {};
  carPlatesMap[activePilgrimageEvent][car] = val.trim();
  saveDataAll();
  updatePlateDatalist();
}

function updatePilgBusSelect(){
  const sel = document.getElementById('pilg-bus');
  if(!sel) return;
  const currentVal = sel.value;
  const allCars = getAllCarsForCurrentEvent();
  sel.innerHTML = allCars.map(car => `<option value="${escapeAttr(car)}">${escapeHtml(car)}</option>`).join('');
  if(currentVal && allCars.includes(currentVal)) sel.value = currentVal;
}

function updatePlateDatalist(){
  const dl = document.getElementById('plate-datalist');
  if(!dl) return;
  const currentMap = carPlatesMap[activePilgrimageEvent] || {};
  const plates = new Set(Object.values(currentMap).filter(Boolean));
  pilgrimages.filter(p => (p.event || pilgrimageEvents[0]) === activePilgrimageEvent).forEach(p => { if(p.plate) plates.add(p.plate); });
  dl.innerHTML = Array.from(plates).map(plt => `<option value="${escapeAttr(plt)}">`).join('');
}

function updatePilgParentSelect(excludeId = null){
  const sel = document.getElementById('pilg-parent-select');
  if(!sel) return;
  const currentVal = sel.value;
  const activePilgs = pilgrimages.filter(p => (p.event || pilgrimageEvents[0]) === activePilgrimageEvent && p.id !== excludeId);
  let html = `<option value="">-- 獨立個人 (無上級群組) --</option>`;
  activePilgs.forEach(p => {
    html += `<option value="${p.id}">群組帶隊人：${escapeHtml(p.name)} (${escapeHtml(p.bus||'未分車')})</option>`;
  });
  sel.innerHTML = html;
  if(currentVal) sel.value = currentVal;
}

document.getElementById('pilg-bus').addEventListener('change', (e)=>{
  const bus = e.target.value;
  const currentMap = carPlatesMap[activePilgrimageEvent] || {};
  if(currentMap[bus]) document.getElementById('pilg-plate').value = currentMap[bus];
});

function updatePilgImportSelect(){
  const sel = document.getElementById('pilg-import-select');
  if(!sel) return;
  const activeRecords = records.filter(r => (r.event || dharmaEvents[0]) === activeDharmaEvent);
  let html = `<option value="">-- 請選擇既有名冊人員快速帶入 --</option>`;
  activeRecords.forEach(r => {
    if(r.mode === 'single') html += `<option value="single::${r.id}">${escapeHtml(r.name)} (個人)</option>`;
    else if(r.members) r.members.forEach(m => html += `<option value="member::${r.id}::${escapeAttr(m.name)}">${escapeHtml(m.name)} (來自戶頭：${escapeHtml(r.name)})</option>`);
  });
  sel.innerHTML = html;
}

document.getElementById('pilg-import-select').addEventListener('change', (e)=>{
  const val = e.target.value;
  if(!val) return;
  const parts = val.split('::');
  if(parts[0] === 'single'){
    const rec = records.find(r => r.id === parts[1]);
    if(rec){
      document.getElementById('pilg-name').value = rec.name;
      document.getElementById('pilg-id-number').value = rec.idNumber || '';
      document.getElementById('pilg-phone').value = rec.phone || '';
      document.getElementById('pilg-roc-birth').value = rec.rocBirth || rec.solarBirth || '';
      showToast(`已帶入「${rec.name}」`);
    }
  } else if(parts[0] === 'member'){
    const rec = records.find(r => r.id === parts[1]);
    if(rec && rec.members){
      const m = rec.members.find(x => x.name === parts[2]);
      if(m){
        document.getElementById('pilg-name').value = m.name;
        document.getElementById('pilg-id-number').value = m.idNumber || '';
        document.getElementById('pilg-phone').value = m.phone || '';
        document.getElementById('pilg-roc-birth').value = m.rocBirth || m.solarBirth || '';
        showToast(`已帶入成員「${m.name}」`);
      }
    }
  }
  e.target.value = '';
});

// 儲存進香人員，智慧同名合併至法會登記 (支援個人或家庭成員)
document.getElementById('btn-pilg-save').addEventListener('click', async ()=>{
  const name = document.getElementById('pilg-name').value.trim();
  const phone = document.getElementById('pilg-phone').value.trim();
  if(!name){ showToast('請輸入姓名'); return; }

  const idNumber = document.getElementById('pilg-id-number').value.trim();
  const birth = formatRocBirth(document.getElementById('pilg-roc-birth').value);
  const parentId = document.getElementById('pilg-parent-select').value;
  const bus = document.getElementById('pilg-bus').value;
  const plate = document.getElementById('pilg-plate').value.trim();
  const room = document.getElementById('pilg-room').value.trim();
  const note = document.getElementById('pilg-note').value.trim();

  if(editingPilgId){
    if(editingPilgId === parentId){ showToast('不能將自己設為自己的群組上級'); return; }
    const p = pilgrimages.find(x => x.id === editingPilgId);
    if(p){ p.event = activePilgrimageEvent; p.name = name; p.phone = phone; p.idNumber = idNumber; p.birth = birth; p.parentId = parentId; p.bus = bus; p.plate = plate; p.room = room; p.note = note; }
    showToast('已更新進香資料');
  } else {
    pilgrimages.push({ id: uid(), event: activePilgrimageEvent, name, phone, idNumber, birth, parentId, bus, plate, room, note, createdAt: Date.now() });
    showToast('已新增進香人員');
  }

  // 智慧同名合併邏輯：檢查法會登記是否有同名個人或家庭成員
  const activeDharmaRecords = records.filter(r => (r.event || dharmaEvents[0]) === activeDharmaEvent);
  let matched = false;

  for(let rec of activeDharmaRecords){
    if(rec.mode === 'single' && rec.name === name){
      if(phone && !rec.phone) rec.phone = phone;
      if(idNumber && !rec.idNumber) rec.idNumber = idNumber;
      if(birth && !rec.rocBirth) rec.rocBirth = birth;
      matched = true;
      break;
    } else if(rec.mode === 'family' && rec.members){
      let mem = rec.members.find(m => m.name === name);
      if(mem){
        if(phone && !mem.phone) mem.phone = phone;
        if(idNumber && !mem.idNumber) mem.idNumber = idNumber;
        if(birth && !mem.rocBirth) mem.rocBirth = birth;
        matched = true;
        break;
      }
    }
  }

  // 若完全沒有同名者，新增一筆個人登記
  if(!matched){
    records.push({
      id: uid(), event: activeDharmaEvent, mode: 'single', name, phone, idNumber,
      zodiac: '', solarBirth: '', rocBirth: birth, lunarBirth: '', address: '',
      companyName: '', companyAddress: '', yinDebt: 0, repays: [], tag: '進香同步',
      members: [], entries: {}, createdAt: Date.now()
    });
  }

  await saveDataAll();
  resetPilgForm();
  renderPilgTable();
  renderRecordTable();
});

document.getElementById('btn-pilg-clear').addEventListener('click', resetPilgForm);
document.getElementById('btn-pilg-cancel-edit').addEventListener('click', resetPilgForm);

function resetPilgForm(){
  editingPilgId = null;
  document.getElementById('pilg-name').value = '';
  document.getElementById('pilg-phone').value = '';
  document.getElementById('pilg-id-number').value = '';
  document.getElementById('pilg-roc-birth').value = '';
  document.getElementById('pilg-parent-select').value = '';
  document.getElementById('pilg-plate').value = '';
  document.getElementById('pilg-room').value = '';
  document.getElementById('pilg-note').value = '';
  document.getElementById('pilg-form-heading').textContent = '新增進香人員';
  document.getElementById('btn-pilg-cancel-edit').style.display = 'none';
  document.getElementById('btn-pilg-save').textContent = '儲存進香人員';
  updatePilgBusSelect();
  updatePilgParentSelect();
}

function startEditPilgrimage(id){
  const p = pilgrimages.find(x => x.id === id);
  if(!p) return;
  editingPilgId = id;
  document.getElementById('pilg-name').value = p.name;
  document.getElementById('pilg-phone').value = p.phone || '';
  document.getElementById('pilg-id-number').value = p.idNumber || '';
  document.getElementById('pilg-roc-birth').value = p.birth || '';
  updatePilgParentSelect(id);
  document.getElementById('pilg-parent-select').value = p.parentId || '';
  document.getElementById('pilg-bus').value = p.bus || '第1車';
  document.getElementById('pilg-plate').value = p.plate || '';
  document.getElementById('pilg-room').value = p.room || '';
  document.getElementById('pilg-note').value = p.note || '';
  document.getElementById('pilg-form-heading').textContent = '編輯進香人員：' + p.name;
  document.getElementById('btn-pilg-cancel-edit').style.display = 'inline-block';
  document.getElementById('btn-pilg-save').textContent = '更新進香人員';
  window.scrollTo({top:0, behavior:'smooth'});
}

async function deletePilgrimage(id){
  if(!confirm('確定要刪除嗎？若有下屬成員，將一併解除群組歸屬。')) return;
  pilgrimages.forEach(p => { if(p.parentId === id) p.parentId = ''; });
  pilgrimages = pilgrimages.filter(x => x.id !== id);
  await saveDataAll();
  renderPilgTable();
  showToast('已刪除');
}

function renderPilgTable(){
  const tbody = document.getElementById('pilg-table-body');
  const empty = document.getElementById('pilg-table-empty');
  const q = document.getElementById('pilg-search-input').value.trim();

  updatePilgImportSelect();
  updatePilgPrintScopeSelect();
  updatePilgBusSelect();
  updatePilgParentSelect(editingPilgId);

  let matches = pilgrimages.filter(p => (p.event || pilgrimageEvents[0]) === activePilgrimageEvent);
  if(q) matches = matches.filter(p => p.name.includes(q) || (p.phone && p.phone.includes(q)) || (p.bus && p.bus.includes(q)));

  document.getElementById('pilg-total-count').textContent = matches.length;
  tbody.innerHTML = '';
  if(matches.length === 0){ empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  const roots = matches.filter(p => !p.parentId || !matches.some(x => x.id === p.parentId));
  const sortedList = [];
  roots.forEach(root => {
    sortedList.push(root);
    const children = matches.filter(p => p.parentId === root.id);
    sortedList.push(...children);
  });
  matches.forEach(p => { if(!sortedList.includes(p)) sortedList.push(p); });

  sortedList.forEach((p, idx) => {
    const tr = document.createElement('tr');
    const isSub = p.parentId && matches.some(x => x.id === p.parentId);
    const parentObj = isSub ? matches.find(x => x.id === p.parentId) : null;
    const nameIndent = isSub ? `<span style="color:var(--gold);margin-left:12px;">└ </span><b>${escapeHtml(p.name)}</b> <small style="color:#777;">(群組: ${escapeHtml(parentObj?.name||'')})</small>` : `<b>${escapeHtml(p.name)}</b>`;

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${nameIndent}</td>
      <td>${escapeHtml(p.phone || '—')}</td>
      <td>${escapeHtml(p.birth || '—')}</td>
      <td>${escapeHtml(p.idNumber || '—')}</td>
      <td><span class="stamp">${escapeHtml(p.bus || '未分車')}</span><br><small style="color:var(--gold);">${escapeHtml(p.plate || '')}</small></td>
      <td><b>${escapeHtml(p.room || '—')}</b></td>
      <td><small>${escapeHtml(p.note || '—')}</small></td>
      <td style="text-align:center;">
        <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:0.71875rem;" onclick="startEditPilgrimage('${p.id}')">編輯</button>
        <button class="btn btn-danger btn-sm" style="padding:2px 6px;font-size:0.71875rem;" onclick="deletePilgrimage('${p.id}')">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('pilg-search-input').addEventListener('input', renderPilgTable);

function updatePilgPrintScopeSelect(){
  const sel = document.getElementById('pilg-print-scope-select');
  if(!sel) return;
  const allCars = getAllCarsForCurrentEvent();
  let html = `<option value="__ALL__">全部進香人員</option>`;
  allCars.forEach(car => html += `<option value="BUS::${escapeAttr(car)}">車次：${escapeHtml(car)}</option>`);
  sel.innerHTML = html;
}

function generatePilgPrintContent(){
  const isTwoCol = document.getElementById('ppo-two-col').checked;
  const isCompact = document.getElementById('ppo-compact').checked;
  document.body.classList.toggle('two-column-print', isTwoCol);
  document.body.classList.toggle('compact-print', isCompact);

  const showPhone = document.getElementById('ppo-phone').checked;
  const showBirth = document.getElementById('ppo-birth').checked;
  const showId = document.getElementById('ppo-id').checked;
  const showBus = document.getElementById('ppo-bus').checked;
  const showRoom = document.getElementById('ppo-room').checked;
  const showNote = document.getElementById('ppo-note').checked;

  const scopeVal = document.getElementById('pilg-print-scope-select').value;
  let matches = pilgrimages.filter(p => (p.event || pilgrimageEvents[0]) === activePilgrimageEvent);
  let subTitle = `【${activePilgrimageEvent}】進香人員名冊`;

  if(scopeVal.startsWith('BUS::')){
    const targetBus = scopeVal.replace('BUS::', '');
    matches = matches.filter(p => p.bus === targetBus);
    subTitle = `【${activePilgrimageEvent}】${targetBus} 人員名冊`;
  }

  if(matches.length === 0){ showToast('無資料可列印'); return null; }

  const roots = matches.filter(p => !p.parentId || !matches.some(x => x.id === p.parentId));
  const sortedList = [];
  roots.forEach(root => {
    sortedList.push(root);
    const children = matches.filter(p => p.parentId === root.id);
    sortedList.push(...children);
  });
  matches.forEach(p => { if(!sortedList.includes(p)) sortedList.push(p); });

  let html = `
    <div class="print-title-wrap">
      <p class="print-title">順天太子會 - ${escapeHtml(subTitle)}</p>
      <p class="print-sub">列印日期：${new Date().toLocaleString('zh-TW')} (共 ${matches.length} 人)</p>
    </div>
    <div class="print-content-container"><div class="print-section">
      <table>
        <thead><tr>
          <th>序號</th><th>姓名</th>
          ${showPhone?'<th>聯絡電話</th>':''}
          ${showBirth?'<th>民國生日</th>':''}
          ${showId?'<th>身分證字號</th>':''}
          ${showBus?'<th>車次 / 車牌</th>':''}
          ${showRoom?'<th>房間號</th>':''}
          ${showNote?'<th>備註</th>':''}
        </tr></thead>
        <tbody>
  `;
  sortedList.forEach((p, idx) => {
    const cp = carPlatesMap[activePilgrimageEvent]?.[p.bus] || p.plate || '';
    const isSub = p.parentId && matches.some(x => x.id === p.parentId);
    const parentObj = isSub ? matches.find(x => x.id === p.parentId) : null;
    const nameTxt = isSub ? `&nbsp;&nbsp;└ <b>${escapeHtml(p.name)}</b> <small>(${escapeHtml(parentObj?.name||'')})</small>` : `<b>${escapeHtml(p.name)}</b>`;

    html += `<tr>
      <td>${idx + 1}</td>
      <td>${nameTxt}</td>
      ${showPhone?`<td>${escapeHtml(p.phone||'—')}</td>`:''}
      ${showBirth?`<td>${escapeHtml(p.birth||'—')}</td>`:''}
      ${showId?`<td>${escapeHtml(p.idNumber||'—')}</td>`:''}
      ${showBus?`<td>${escapeHtml(p.bus||'未分車')} ${cp?`(${escapeHtml(cp)})`:''}</td>`:''}
      ${showRoom?`<td><b>${escapeHtml(p.room||'—')}</b></td>`:''}
      ${showNote?`<td><small>${escapeHtml(p.note||'—')}</small></td>`:''}
    </tr>`;
  });
  html += `</tbody></table></div></div><div class="print-grand-total">進香總人數：<b>${matches.length}</b> 人</div>`;
  return html;
}

document.getElementById('btn-pilg-gen-preview').addEventListener('click', ()=>{
  const html = generatePilgPrintContent();
  if(!html) return;
  document.getElementById('pilg-print-preview-area').innerHTML = `<div class="detail-card">${html}</div>`;
  document.getElementById('print-area').innerHTML = html;
  showToast('已產生預覽');
});

document.getElementById('btn-pilg-print-action').addEventListener('click', ()=>{
  const html = generatePilgPrintContent();
  if(!html) return;
  document.getElementById('print-area').innerHTML = html;
  window.print();
});

