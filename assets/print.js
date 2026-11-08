// ==========================================
// 5. 列印清單分頁
// ==========================================
function renderPrintCatCheckboxes(){
  const container = document.getElementById('print-cat-checkboxes');
  if(!container) return;
  const previous = new Map(Array.from(container.querySelectorAll('input'), input => [input.value, input.checked]));
  container.innerHTML = categories.map(cat => `
    <label style="font-size:0.8125rem;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
      <input type="checkbox" name="print-cat-chk" value="${escapeAttr(cat)}" ${previous.get(cat) !== false ? 'checked' : ''} style="accent-color:var(--seal);"> ${escapeHtml(cat)}
    </label>
  `).join('');
}

function toggleAllPrintCats(status){
  document.querySelectorAll('input[name="print-cat-chk"]').forEach(chk => chk.checked = status);
}

function renderPrintNameSelect(){
  const sel = document.getElementById('p-name-target');
  if(!sel) return;
  const activeRecords = records.filter(r => (r.event || dharmaEvents[0]) === activeDharmaEvent);
  let html = `<option value="__ALL__">全部名冊 (所有個人與家庭)</option>`;
  activeRecords.slice().sort((a,b)=>a.name.localeCompare(b.name,'zh-Hant')).forEach(r => {
    if(r.mode === 'family'){
      html += `<option value="FAMILY::${r.id}">[整個家庭戶頭] ${escapeHtml(r.name)}</option>`;
      if(r.members && r.members.length > 0){
        r.members.forEach(m => {
          html += `<option value="MEMBER::${r.id}::${escapeAttr(m.name)}">&nbsp;&nbsp;└ [家庭單獨成員] ${escapeHtml(m.name)} (${m.relation||'成員'}) [戶主: ${escapeHtml(r.name)}]</option>`;
        });
      }
    } else {
      html += `<option value="SINGLE::${r.id}">[個人] ${escapeHtml(r.name)}</option>`;
    }
  });
  sel.innerHTML = html;
}

document.querySelectorAll('.print-toggle button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.print-toggle button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentPrintMode = btn.dataset.pmode;

    const selectorArea = document.getElementById('print-selector-area');
    const nameSelectorArea = document.getElementById('print-name-selector-area');
    const yinSelectorArea = document.getElementById('print-yin-selector-area');

    selectorArea.style.display = 'none';
    nameSelectorArea.style.display = 'none';
    yinSelectorArea.style.display = 'none';

    if(currentPrintMode === 'cat'){
      selectorArea.style.display = 'block';
      renderPrintCatCheckboxes();
    } else if(currentPrintMode === 'name'){
      nameSelectorArea.style.display = 'block';
      renderPrintNameSelect();
    } else if(currentPrintMode === 'yin-all' || currentPrintMode === 'yin-unpaid'){
      yinSelectorArea.style.display = 'block';
      document.getElementById('yin-scope-label').textContent = currentPrintMode === 'yin-unpaid' ? '目前模式：全部未償還陰債名單' : '全部陰債名單';
    }
    document.getElementById('p-preview').innerHTML = '';
  });
});

function renderPrintTab(){
  const activeRecords = records.filter(r => (r.event || dharmaEvents[0]) === activeDharmaEvent);
  const statRow = document.getElementById('stat-row');
  const totalAll = activeRecords.reduce((s,r)=> s + recordTotal(r.entries), 0);
  const totalCountAll = activeRecords.reduce((s,r)=> s + recordTotalCount(r.entries), 0);
  let totalPersons = 0;
  activeRecords.forEach(r => { totalPersons += (r.mode === 'family' && r.members ? r.members.length : 1); });

  statRow.innerHTML = `<div class="stat"><b>${activeRecords.length} 戶/筆</b>總登記</div>` +
    `<div class="stat"><b>${totalPersons} 人</b>總人次</div>` +
    `<div class="stat"><b>${totalCountAll}</b>總數量</div>` +
    `<div class="stat"><b>${formatMoney(totalAll)}</b>總金額</div>`;

  renderPrintCatCheckboxes();
  renderPrintNameSelect();
  document.getElementById('p-preview').innerHTML = '';
}

// 核心列印內容產生器
function generateDharmaPrintContent(modeOverride, targetOverride, source = 'print'){
  const activeRecords = records.filter(r => (r.event || dharmaEvents[0]) === activeDharmaEvent);
  const pMode = modeOverride || currentPrintMode;

  const isTwoCol = document.getElementById('po-two-col').checked;
  const isCompact = document.getElementById('po-compact-a4').checked;
  document.body.classList.toggle('two-column-print', isTwoCol);
  document.body.classList.toggle('compact-print', isCompact);

  const showStat = document.getElementById('po-stat').checked;
  const showCountStat = document.getElementById('po-count-stat')?.checked ?? true;
  const showPersonStat = document.getElementById('po-person-stat')?.checked ?? true;
  const showFamilyMembers = document.getElementById('po-family-members')?.checked ?? true;
  const showRelationGroup = document.getElementById('po-relation-group')?.checked ?? true;
  const showPhone = document.getElementById('po-phone')?.checked ?? true;
  const showZodiac = document.getElementById('po-zodiac')?.checked ?? true;
  
  const showBirthSolar = document.getElementById('po-birth-solar')?.checked ?? false;
  const showBirthRoc = document.getElementById('po-birth-roc')?.checked ?? true;
  const showBirthLunar = document.getElementById('po-birth-lunar')?.checked ?? false;

  const showId = document.getElementById('po-id')?.checked ?? true;
  const showAddress = document.getElementById('po-address')?.checked ?? true;
  const showCompany = document.getElementById('po-company')?.checked ?? true;
  const showYin = document.getElementById('po-yin')?.checked ?? true;
  const showCount = document.getElementById('po-count')?.checked ?? true;
  const showNote = document.getElementById('po-note')?.checked ?? true;
  const showPrice = document.getElementById('po-price')?.checked ?? true;

  function formatBirthStr(obj){
    let parts = [];
    if(showBirthSolar && obj.solarBirth) parts.push(`國:${obj.solarBirth}`);
    if(showBirthRoc && obj.rocBirth) parts.push(`民:${obj.rocBirth}`);
    if(showBirthLunar && obj.lunarBirth) parts.push(`農:${obj.lunarBirth}`);
    return parts.join(' / ') || '—';
  }

  let html = '';

  if(pMode === 'yin-all' || pMode === 'yin-unpaid'){
    const isUnpaidOnly = (pMode === 'yin-unpaid');
    let yinList = [];
    activeRecords.forEach(r => {
      if(r.mode === 'family' && r.members) r.members.forEach(m => { if(Number(m.yinDebt)>0) yinList.push({ name: m.name, groupName: `戶頭：${r.name}`, ...m }); });
      else if(Number(r.yinDebt)>0) yinList.push({ name: r.name, groupName: '個人', ...r });
    });
    if(isUnpaidOnly) yinList = yinList.filter(item => getYinSummary(item).remain > 0);
    yinList.sort((a,b) => a.name.localeCompare(b.name,'zh-Hant'));

    html = `<div class="print-title-wrap"><p class="print-title">順天太子會【${activeDharmaEvent}】 - ${isUnpaidOnly ? '未償還陰債名單' : '全部陰債名單'}</p></div>`;
    html += `<div class="print-content-container"><div class="print-section"><table><thead><tr><th>序號</th><th>姓名</th>${showRelationGroup?'<th>類別</th>':''}${showPhone?'<th>電話</th>':''}${showZodiac?'<th>生肖</th>':''}<th>生日</th>${showAddress?'<th>地址</th>':''}<th style="text-align:right;">欠債總額</th><th style="text-align:right;">已還</th><th style="text-align:right;">未還</th></tr></thead><tbody>`;
    yinList.forEach((r, i) => {
      const sum = getYinSummary(r);
      const bTxt = formatBirthStr(r);
      html += `<tr><td>${i+1}</td><td><b>${escapeHtml(r.name)}</b></td>${showRelationGroup?`<td><small>${escapeHtml(r.groupName)}</small></td>`:''}${showPhone?`<td>${escapeHtml(r.phone||'—')}</td>`:''}${showZodiac?`<td>${escapeHtml(r.zodiac||'—')}</td>`:''}<td>${escapeHtml(bTxt)}</td>${showAddress?`<td>${escapeHtml(r.address||'—')}</td>`:''}<td style="text-align:right;">${sum.debt}</td><td style="text-align:right;">${sum.repaid}</td><td style="text-align:right;font-weight:bold;color:var(--seal-dark);">${sum.remain <= 0 ? '已還清' : sum.remain}</td></tr>`;
    });
    html += `</tbody></table></div></div>`;

  } else if(pMode === 'cat'){
    const selectedCats = Array.from(document.querySelectorAll(`input[name="${source === 'search' ? 'search' : 'print'}-cat-chk"]:checked`)).map(chk => chk.value);
    if(selectedCats.length === 0){ showToast('請至少勾選一個項目'); return null; }

    html = `<div class="print-title-wrap"><p class="print-title">順天太子會【${activeDharmaEvent}】登記清單</p><p class="print-sub">列印日期：${new Date().toLocaleString('zh-TW')}</p></div><div class="print-content-container">`;

    let overallTotal = 0;
    let overallCount = 0;

    selectedCats.forEach(cat => {
      const catMatches = activeRecords.filter(r => Object.prototype.hasOwnProperty.call(r.entries||{}, cat));
      let catTotal = 0;
      let expandedRows = [];

      catMatches.forEach(rec => {
        const e = rec.entries[cat] || {};
        const isFam = rec.mode === 'family';
        const compTxt = (rec.companyName || rec.companyAddress) ? `${rec.companyName||''} ${rec.companyAddress?`(${rec.companyAddress})`:''}` : '—';

        if(isFam){
          let targetMembers = (e.members && e.members.length > 0) ? (rec.members || []).filter(m => e.members.includes(m.name)) : [];
          if(!targetMembers || targetMembers.length === 0) targetMembers = [{ name: rec.name, relation: '全戶代表', zodiac: '', solarBirth: '', rocBirth: '', lunarBirth: '', yinDebt: 0, repays: [] }];

          targetMembers.forEach(m => {
            const sum = getYinSummary(m);
            const bTxt = formatBirthStr(m);
            const yTxt = sum.debt > 0 ? formatYinStatus(m) : '—';
            const unitP = getMemberPrice(e, m.name);
            const memCnt = getMemberCount(e, m.name);
            const rowTot = unitP * memCnt;
            catTotal += rowTot;
            overallCount += memCnt;

            expandedRows.push({
              name: m.name,
              relationGroupTxt: `${m.relation?`[${m.relation}] `:''}戶頭：${rec.name}`,
              phone: m.phone || '—',
              zodiac: m.zodiac || '—',
              birthTxt: bTxt,
              idNumber: m.idNumber || '—',
              address: rec.address || '—',
              compTxt: compTxt,
              yinTxt: yTxt,
              count: memCnt,
              priceTxt: formatMoney(rowTot),
              note: e.note || ''
            });
          });
        } else {
          const sum = getYinSummary(rec);
          const bTxt = formatBirthStr(rec);
          const yTxt = sum.debt > 0 ? formatYinStatus(rec) : '—';
          const rowTot = e.price * e.count;
          catTotal += rowTot;
          overallCount += (Number(e.count)||1);

          expandedRows.push({
            name: rec.name,
            relationGroupTxt: '個人',
            phone: rec.phone || '—',
            zodiac: rec.zodiac || '—',
            birthTxt: bTxt,
            idNumber: rec.idNumber || '—',
            address: rec.address || '—',
            compTxt: compTxt,
            yinTxt: yTxt,
            count: e.count,
            priceTxt: formatMoney(rowTot),
            note: e.note || ''
          });
        }
      });

      overallTotal += catTotal;
      const catItemsCount = expandedRows.reduce((s, r) => s + (Number(r.count)||1), 0);

      const statPieces = [];
      if(showPersonStat) statPieces.push(`共 ${expandedRows.length} 人`);
      if(showCountStat) statPieces.push(`共 ${catItemsCount} 份`);

      html += `<div class="print-section"><h3>${escapeHtml(cat)} ${statPieces.length ? `（${statPieces.join(' ｜ ')}）` : ''}</h3>`;
      if(expandedRows.length > 0){
        html += `<table><thead><tr>
          <th style="width:35px;">序號</th><th>姓名</th>
          ${showRelationGroup?'<th>稱謂 / 戶頭</th>':''}
          ${showPhone?'<th>電話</th>':''}
          ${showZodiac?'<th>生肖</th>':''}
          <th>生日</th>
          ${showId?'<th>身分證</th>':''}
          ${showAddress?'<th>地址</th>':''}
          ${showCompany?'<th>公司</th>':''}
          ${showYin?'<th>陰債</th>':''}
          ${showCount?'<th style="width:45px;">數量</th>':''}
          ${showNote?'<th>備註</th>':''}
          ${showPrice?'<th style="text-align:right;">金額</th>':''}
        </tr></thead><tbody>`;

        expandedRows.forEach((r, i) => {
          html += `<tr>
            <td>${i+1}</td><td><b>${escapeHtml(r.name)}</b></td>
            ${showRelationGroup?`<td><small>${escapeHtml(r.relationGroupTxt)}</small></td>`:''}
            ${showPhone?`<td>${escapeHtml(r.phone)}</td>`:''}
            ${showZodiac?`<td>${escapeHtml(r.zodiac)}</td>`:''}
            <td>${escapeHtml(r.birthTxt)}</td>
            ${showId?`<td>${escapeHtml(r.idNumber)}</td>`:''}
            ${showAddress?`<td>${escapeHtml(r.address)}</td>`:''}
            ${showCompany?`<td><small>${escapeHtml(r.compTxt)}</small></td>`:''}
            ${showYin?`<td>${escapeHtml(r.yinTxt)}</td>`:''}
            ${showCount?`<td>${r.count}</td>`:''}
            ${showNote?`<td>${escapeHtml(r.note)}</td>`:''}
            ${showPrice?`<td style="text-align:right;">${r.priceTxt}</td>`:''}
          </tr>`;
        });
        html += `</tbody></table></div>`;
      } else {
        html += `<p style="color:#888;font-size:13px;">（無資料）</p></div>`;
      }
    });

    html += `</div>`;
    if(showStat){
      html += `<div class="print-grand-total">總數量：<b>${overallCount}</b> 份 ｜ 總金額：<b>${formatMoney(overallTotal)}</b></div>`;
    }

  } else if(pMode === 'name'){
    const targetVal = targetOverride || document.getElementById('p-name-target')?.value || '__ALL__';

    if(targetVal.startsWith('MEMBER::')){
      const parts = targetVal.split('::');
      const recId = parts[1];
      const memberName = parts[2];
      const rec = activeRecords.find(r => r.id === recId);
      if(rec){
        const m = rec.members.find(x => x.name === memberName);
        if(m){
          let subtotal = 0;
          let subtotalCount = 0;
          let memberEntries = [];
          const cats = Object.keys(rec.entries || {});

          cats.forEach(catName => {
            const item = rec.entries[catName];
            if(item && item.members && item.members.includes(memberName)){
              const unitP = getMemberPrice(item, memberName);
              const memCnt = getMemberCount(item, memberName);
              const itemTot = unitP * memCnt;
              subtotal += itemTot;
              subtotalCount += memCnt;
              memberEntries.push({ catName, count: memCnt, price: unitP, total: itemTot, note: item.note || '' });
            }
          });

          const sum = getYinSummary(m);
          const bTxt = formatBirthStr(m);
          const yinStatusText = sum.debt > 0 ? formatYinStatus(m) : '—';
          const phoneText = m.phone ? `電話：${m.phone}` : '';
          const compTxt = (rec.companyName || rec.companyAddress) ? `公司：${rec.companyName||''} ${rec.companyAddress?`(${rec.companyAddress})`:''}` : '';

          html = `<div class="print-title-wrap"><p class="print-title">順天太子會【${activeDharmaEvent}】 - ${escapeHtml(m.name)} (個人明細)</p><p class="print-sub">列印日期：${new Date().toLocaleString('zh-TW')}</p></div><div class="print-content-container">`;
          html += `<div class="print-section" style="margin-bottom:18px;">`;
          html += `<h3>姓名：${escapeHtml(m.name)} <small style="color:#555;">(戶名：${escapeHtml(rec.name)} ｜ 稱謂：${escapeHtml(m.relation||'成員')})</small></h3>`;
          
          const metaParts = [];
          if(showPhone && phoneText) metaParts.push(phoneText);
          if(showZodiac && m.zodiac) metaParts.push(`生肖：${m.zodiac}`);
          metaParts.push(`生日：${bTxt}`);
          if(showId && m.idNumber) metaParts.push(`身分證：${m.idNumber}`);
          if(showAddress && rec.address) metaParts.push(`地址：${rec.address}`);
          if(showCompany && compTxt) metaParts.push(compTxt);
          if(showYin && sum.debt > 0) metaParts.push(`陰債：${yinStatusText}`);
          html += `<div class="print-meta">${escapeHtml(metaParts.join(' | '))}</div>`;

          if(memberEntries.length > 0){
            html += `<div style="margin-bottom:4px;font-size:12px;font-weight:bold;color:var(--seal-dark);">📋 登記項目：</div>`;
            html += `<table><thead><tr><th style="width:35px;">序號</th><th>項目</th>${showCount?'<th style="width:45px;">數量</th>':''}${showNote?'<th>備註</th>':''}${showPrice?'<th style="text-align:right;">金額</th>':''}</tr></thead><tbody>`;
            memberEntries.forEach((ent, idx) => {
              html += `<tr><td>${idx+1}</td><td><b>${escapeHtml(ent.catName)}</b></td>${showCount?`<td>${ent.count}</td>`:''}${showNote?`<td>${escapeHtml(ent.note)}</td>`:''}${showPrice?`<td style="text-align:right;">${formatMoney(ent.total)}</td>`:''}</tr>`;
            });
            html += `</tbody></table>`;
          } else {
            html += `<p style="color:#888;font-size:13px;">（此成員未參與登記項目）</p>`;
          }
          html += `</div></div>`;
          if(showStat){
            html += `<div class="print-grand-total">總數量：<b>${subtotalCount}</b> 份 ｜ 總金額：<b>${formatMoney(subtotal)}</b></div>`;
          }
          return html;
        }
      }
    }

    let targetRecords = [];
    let titleStr = '';

    if(targetVal === '__ALL__'){
      targetRecords = activeRecords.slice().sort((a,b)=>a.name.localeCompare(b.name,'zh-Hant'));
      titleStr = '全部名冊明細';
    } else if(targetVal.startsWith('FAMILY::')){
      const recId = targetVal.replace('FAMILY::', '');
      targetRecords = activeRecords.filter(r => r.id === recId);
      titleStr = targetRecords[0] ? `${targetRecords[0].name} 家庭總明細` : '';
    } else if(targetVal.startsWith('SINGLE::')){
      const recId = targetVal.replace('SINGLE::', '');
      targetRecords = activeRecords.filter(r => r.id === recId);
      titleStr = targetRecords[0] ? `${targetRecords[0].name} 個人明細` : '';
    }

    if(targetRecords.length === 0){ showToast('無資料可列印'); return null; }

    html = `<div class="print-title-wrap"><p class="print-title">順天太子會【${activeDharmaEvent}】 - ${escapeHtml(titleStr)}</p><p class="print-sub">列印日期：${new Date().toLocaleString('zh-TW')}</p></div><div class="print-content-container">`;

    let grandTotal = 0;
    let grandTotalCount = 0;

    targetRecords.forEach(rec => {
      const cats = Object.keys(rec.entries || {});
      const subtotal = recordTotal(rec.entries);
      const subtotalCount = recordTotalCount(rec.entries);
      grandTotal += subtotal;
      grandTotalCount += subtotalCount;

      html += `<div class="print-section" style="margin-bottom:18px;">`;

      if(rec.mode === 'family'){
        html += `<h3>戶名：${escapeHtml(rec.name)}（家庭登記）</h3>`;
        const fMeta = [];
        if(showAddress && rec.address) fMeta.push(`住址：${rec.address}`);
        if(showCompany && (rec.companyName || rec.companyAddress)) fMeta.push(`公司：${rec.companyName||''} ${rec.companyAddress?`(${rec.companyAddress})`:''}`);
        if(fMeta.length) html += `<div class="print-meta">${escapeHtml(fMeta.join(' | '))}</div>`;

        if(showFamilyMembers && rec.members && rec.members.length > 0){
          html += `<div style="margin-bottom:4px;font-size:12px;font-weight:bold;color:var(--seal-dark);">👨‍👩‍👧‍👦 成員名冊：</div>`;
          html += `<table style="margin-bottom:10px;"><thead><tr>
            <th style="width:35px;">序號</th><th>姓名</th>
            ${showRelationGroup?'<th>稱謂</th>':''}
            ${showPhone?'<th>電話</th>':''}
            ${showZodiac?'<th>生肖</th>':''}
            <th>生日</th>
            ${showId?'<th>身分證</th>':''}
            ${showYin?'<th>陰債狀況</th>':''}
          </tr></thead><tbody>`;

          rec.members.forEach((m, mi) => {
            const sum = getYinSummary(m);
            const bTxt = formatBirthStr(m);
            const yTxt = sum.debt > 0 ? formatYinStatus(m) : '—';

            html += `<tr>
              <td>${mi+1}</td><td><b>${escapeHtml(m.name)}</b></td>
              ${showRelationGroup?`<td>${escapeHtml(m.relation||'成員')}</td>`:''}
              ${showPhone?`<td>${escapeHtml(m.phone||'—')}</td>`:''}
              ${showZodiac?`<td>${escapeHtml(m.zodiac||'—')}</td>`:''}
              <td>${escapeHtml(bTxt)}</td>
              ${showId?`<td>${escapeHtml(m.idNumber||'—')}</td>`:''}
              ${showYin?`<td>${yTxt}</td>`:''}
            </tr>`;
          });
          html += `</tbody></table>`;
        }
      } else {
        html += `<h3>姓名：${escapeHtml(rec.name)}</h3>`;
        const metaParts = [];
        if(showPhone && rec.phone) metaParts.push(`電話：${rec.phone}`);
        if(showZodiac && rec.zodiac) metaParts.push(`生肖：${rec.zodiac}`);
        metaParts.push(`生日：${formatBirthStr(rec)}`);
        if(showId && rec.idNumber) metaParts.push(`身分證：${rec.idNumber}`);
        if(showAddress && rec.address) metaParts.push(`地址：${rec.address}`);
        if(showYin && Number(rec.yinDebt)>0) metaParts.push(`陰債：${formatYinStatus(rec)}`);
        html += `<div class="print-meta">${escapeHtml(metaParts.join(' | '))}</div>`;
      }

      if(cats.length > 0){
        html += `<div style="margin-bottom:4px;font-size:12px;font-weight:bold;color:var(--seal-dark);">📋 登記項目：</div>`;
        html += `<table><thead><tr>
          <th style="width:35px;">序號</th><th style="width:130px;">項目</th>
          ${rec.mode==='family'?'<th style="width:160px;">參與成員</th>':''}
          ${showCount?'<th style="width:45px;">數量</th>':''}
          ${showNote?'<th>備註</th>':''}
          ${showPrice?'<th style="text-align:right;">金額</th>':''}
        </tr></thead><tbody>`;

        cats.forEach((catName, idx) => {
          const item = rec.entries[catName] || {};
          const itemTot = getItemEntryTotal(item);
          const itemCnt = getItemEntryCount(item);
          let memBadges = item.members && item.members.length ? item.members.map(name => `${name}（${getMemberCount(item, name)}）`).join('、') : '全戶共用';

          html += `<tr>
            <td>${idx+1}</td><td><b>${escapeHtml(catName)}</b></td>
            ${rec.mode==='family'?`<td><small>${escapeHtml(memBadges)}</small></td>`:''}
            ${showCount?`<td>${itemCnt}</td>`:''}
            ${showNote?`<td>${escapeHtml(item.note||'')}</td>`:''}
            ${showPrice?`<td style="text-align:right;">${formatMoney(itemTot)}</td>`:''}
          </tr>`;
        });
        html += `</tbody></table>`;
      }
      html += `</div>`;
    });

    html += `</div>`;
    if(showStat && targetVal === '__ALL__'){
      html += `<div class="print-grand-total">總數量：<b>${grandTotalCount}</b> 份 ｜ 總金額：<b>${formatMoney(grandTotal)}</b></div>`;
    }
  }

  return html;
}

// 列印按鈕綁定
document.getElementById('btn-gen').addEventListener('click', ()=>{
  const html = generateDharmaPrintContent('cat');
  if(!html) return;
  document.getElementById('p-preview').innerHTML = `<div class="detail-card">${html}</div>`;
  document.getElementById('print-area').innerHTML = html;
  showToast('已產生預覽');
});

document.getElementById('btn-print').addEventListener('click', ()=>{
  const html = generateDharmaPrintContent('cat');
  if(!html) return;
  document.getElementById('print-area').innerHTML = html;
  window.print();
});

document.getElementById('btn-gen-name').addEventListener('click', ()=>{
  const targetVal = document.getElementById('p-name-target').value;
  const html = generateDharmaPrintContent('name', targetVal);
  if(!html) return;
  document.getElementById('p-preview').innerHTML = `<div class="detail-card">${html}</div>`;
  document.getElementById('print-area').innerHTML = html;
  showToast('已產生預覽');
});

document.getElementById('btn-print-name').addEventListener('click', ()=>{
  const targetVal = document.getElementById('p-name-target').value;
  const html = generateDharmaPrintContent('name', targetVal);
  if(!html) return;
  document.getElementById('print-area').innerHTML = html;
  window.print();
});

document.getElementById('btn-gen-yin').addEventListener('click', ()=>{
  const html = generateDharmaPrintContent();
  if(!html) return;
  document.getElementById('p-preview').innerHTML = `<div class="detail-card">${html}</div>`;
  document.getElementById('print-area').innerHTML = html;
  showToast('已產生預覽');
});

document.getElementById('btn-print-yin').addEventListener('click', ()=>{
  const html = generateDharmaPrintContent();
  if(!html) return;
  document.getElementById('print-area').innerHTML = html;
  window.print();
});

function exportBackup(type){
  const payload = {
    exportType: type, dharmaEvents, activeDharmaEvent, pilgrimageEvents, activePilgrimageEvent,
    donationEvents, activeDonationEvent, categories, prices, zodiacYin, fontScale,
    records, pilgrimages, donations, customDonationItems, carPlatesMap, customCarsMap, exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `順天太子會_完整備份_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  showToast('已匯出備份');
}

function importBackup(file){
  const reader = new FileReader();
  reader.onload = async (e)=>{
    try{
      const data = JSON.parse(e.target.result);
      if(!data){ showToast('格式不正確'); return; }
      
      if(data.allEventsData){
        const evKeys = Object.keys(data.allEventsData);
        if(evKeys.length > 0){
          dharmaEvents = evKeys;
          activeDharmaEvent = evKeys[0];
          records = [];
          evKeys.forEach(ev => {
            const evData = data.allEventsData[ev];
            if(evData.records){
              evData.records.forEach(r => {
                records.push({ ...r, event: ev, phone: r.phone || '', rocBirth: formatRocBirth(r.rocBirth || r.birth || '') });
              });
            }
          });
        }
      } else if(Array.isArray(data.records)){
        records = data.records.map(r => ({ ...r, phone: r.phone || '', rocBirth: formatRocBirth(r.rocBirth || r.birth || '') }));
      }

      if(data.pilgrimageList && Array.isArray(data.pilgrimageList)){
        pilgrimages = data.pilgrimageList.map(p => ({
          ...p,
          event: pilgrimageEvents[0],
          birth: formatRocBirth(p.birth || p.rocBirth || '')
        }));
      } else if(data.pilgrimages && Array.isArray(data.pilgrimages)){
        pilgrimages = data.pilgrimages.map(p => ({ ...p, birth: formatRocBirth(p.birth || '') }));
      }

      if(data.donations) donations = data.donations;
      if(data.categories) categories = data.categories;
      if(data.prices) prices = data.prices;
      if(data.carPlatesMap) carPlatesMap = data.carPlatesMap;
      if(data.customCarsMap) customCarsMap = data.customCarsMap;

      await saveDataAll();
      loadData();
      renderCatGrid({});
      renderRecordTable();
      renderPilgTable();
      renderDonationTable();
      showToast('匯入成功並已自動轉換格式');
    }catch(err){ console.error(err); showToast('讀取失敗'); }
  };
  reader.readAsText(file);
}

document.getElementById('btn-export-full').addEventListener('click', ()=>exportBackup('full'));
document.getElementById('btn-export-base').addEventListener('click', ()=>exportBackup('base'));
document.getElementById('btn-import-trigger').addEventListener('click', ()=>document.getElementById('btn-import').click());
document.getElementById('btn-import').addEventListener('change', (e)=>{ if(e.target.files[0]) importBackup(e.target.files[0]); e.target.value=''; });

document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    ['input','pilgrimage','donation','search','print','cloud'].forEach(t=>{
      document.getElementById('tab-'+t).style.display = (t===btn.dataset.tab)?'block':'none';
    });
    if(btn.dataset.tab==='search') renderSearchTab();
    if(btn.dataset.tab==='print') renderPrintTab();
    if(btn.dataset.tab==='pilgrimage') renderPilgTable();
    if(btn.dataset.tab==='donation') renderDonationTable();
  });
});

(async function init(){
  await loadData();
  renderCatGrid({});
  renderRecordTable();
  renderPilgTable();
  renderDonationTable();
})();
