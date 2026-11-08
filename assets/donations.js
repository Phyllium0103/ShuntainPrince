// ==========================================
// 💰 3. 獨立捐款管理邏輯
// ==========================================
function updateDonationImportSelect(){
  const sel = document.getElementById('don-import-select');
  if(!sel) return;
  const activeRecords = records.filter(r => (r.event || dharmaEvents[0]) === activeDharmaEvent);
  let html = `<option value="">-- 請選擇既有名冊人員帶入 --</option>`;
  activeRecords.forEach(r => {
    if(r.mode === 'single') html += `<option value="single::${r.id}">${escapeHtml(r.name)} (個人)</option>`;
    else if(r.members) r.members.forEach(m => html += `<option value="member::${r.id}::${escapeAttr(m.name)}">${escapeHtml(m.name)} (來自戶頭：${escapeHtml(r.name)})</option>`);
  });
  sel.innerHTML = html;
}

document.getElementById('don-import-select').addEventListener('change', (e)=>{
  const val = e.target.value;
  if(!val) return;
  const parts = val.split('::');
  if(parts[0] === 'single'){
    const rec = records.find(r => r.id === parts[1]);
    if(rec){
      document.getElementById('don-name').value = rec.name;
      document.getElementById('don-phone').value = rec.phone || '';
      document.getElementById('don-address').value = rec.address || '';
      showToast(`已帶入「${rec.name}」捐款人資料`);
    }
  } else if(parts[0] === 'member'){
    const rec = records.find(r => r.id === parts[1]);
    if(rec && rec.members){
      const m = rec.members.find(x => x.name === parts[2]);
      if(m){
        document.getElementById('don-name').value = m.name;
        document.getElementById('don-phone').value = m.phone || '';
        document.getElementById('don-address').value = rec.address || '';
        showToast(`已帶入成員「${m.name}」捐款人資料`);
      }
    }
  }
  e.target.value = '';
});

function updateDonationPrintScopeSelect(){
  const sel = document.getElementById('don-print-scope-select');
  if(!sel) return;
  let html = `<option value="__ALL__">全部捐款紀錄（${activeDonationEvent}）</option>`;
  donations.filter(d => (d.event || donationEvents[0]) === activeDonationEvent).forEach(d => {
    html += `<option value="ID::${escapeAttr(d.id)}">${escapeHtml(d.date||'—')} ｜ ${escapeHtml(d.name)} (${formatMoney(d.amount)})</option>`;
  });
  sel.innerHTML = html;
}

document.getElementById('btn-don-save').addEventListener('click', async ()=>{
  const name = document.getElementById('don-name').value.trim();
  if(!name){ showToast('請輸入捐款人'); return; }
  const amount = parseFloat(document.getElementById('don-amount').value);
  if(isNaN(amount) || amount <= 0){ showToast('請輸入有效金額'); return; }

  const date = document.getElementById('don-date').value || new Date().toISOString().slice(0, 10);
  const phone = document.getElementById('don-phone').value.trim();
  let item = document.getElementById('don-item-input').value.trim() || '隨喜功德金';
  const address = document.getElementById('don-address').value.trim();
  const payMethod = document.getElementById('don-pay-method').value;
  const note = document.getElementById('don-note').value.trim();

  if(!customDonationItems.includes(item)){ customDonationItems.push(item); await saveDataAll(); updateDonationItemsDatalist(); }

  if(editingDonId){
    const d = donations.find(x => x.id === editingDonId);
    if(d) Object.assign(d, { event: activeDonationEvent, name, phone, date, item, amount, address, payMethod, note });
    showToast('已更新捐款紀錄');
  } else {
    donations.push({ id: uid(), event: activeDonationEvent, name, phone, date, item, amount, address, payMethod, note, createdAt: Date.now() });
    showToast('已新增捐款紀錄');
  }

  await saveDataAll();
  resetDonationForm();
  renderDonationTable();
});

document.getElementById('btn-don-clear').addEventListener('click', resetDonationForm);
document.getElementById('btn-don-cancel-edit').addEventListener('click', resetDonationForm);

function resetDonationForm(){
  editingDonId = null;
  document.getElementById('don-name').value = '';
  document.getElementById('don-phone').value = '';
  document.getElementById('don-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('don-item-input').value = '';
  document.getElementById('don-amount').value = '';
  document.getElementById('don-address').value = '';
  document.getElementById('don-note').value = '';
  document.getElementById('don-form-heading').textContent = '新增捐款紀錄';
  document.getElementById('btn-don-cancel-edit').style.display = 'none';
  document.getElementById('btn-don-save').textContent = '儲存捐款';
  updateDonationImportSelect();
}

function startEditDonation(id){
  const d = donations.find(x => x.id === id);
  if(!d) return;
  editingDonId = id;
  document.getElementById('don-name').value = d.name;
  document.getElementById('don-phone').value = d.phone || '';
  document.getElementById('don-date').value = d.date || '';
  document.getElementById('don-item-input').value = d.item || '';
  document.getElementById('don-amount').value = d.amount;
  document.getElementById('don-address').value = d.address || '';
  document.getElementById('don-pay-method').value = d.payMethod || '現金';
  document.getElementById('don-note').value = d.note || '';
  document.getElementById('don-form-heading').textContent = '編輯捐款：' + d.name;
  document.getElementById('btn-don-cancel-edit').style.display = 'inline-block';
  document.getElementById('btn-don-save').textContent = '更新捐款';
  window.scrollTo({top:0, behavior:'smooth'});
}

async function deleteDonation(id){
  if(!confirm('確定要刪除嗎？')) return;
  donations = donations.filter(x => x.id !== id);
  await saveDataAll();
  renderDonationTable();
  showToast('已刪除');
}

function renderDonationTable(){
  const tbody = document.getElementById('don-table-body');
  const empty = document.getElementById('don-table-empty');
  const q = document.getElementById('don-search-input').value.trim();
  updateDonationPrintScopeSelect();
  updateDonationImportSelect();

  let matches = donations.filter(d => (d.event || donationEvents[0]) === activeDonationEvent);
  if(q) matches = matches.filter(d => d.name.includes(q) || (d.phone && d.phone.includes(q)));

  document.getElementById('don-total-count').textContent = matches.length;
  const totalMoney = matches.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  document.getElementById('don-total-amount').textContent = formatMoney(totalMoney);

  tbody.innerHTML = '';
  if(matches.length === 0){ empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  matches.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(d.date || '—')}</td>
      <td><b>${escapeHtml(d.name)}</b></td>
      <td>${escapeHtml(d.phone || '—')}</td>
      <td><span class="stamp">${escapeHtml(d.item || '隨喜功德金')}</span></td>
      <td style="text-align:right;font-weight:bold;color:var(--seal-dark);">${formatMoney(d.amount)}</td>
      <td><small>${escapeHtml(d.address||'—')} ${escapeHtml(d.note||'')}</small></td>
      <td style="text-align:center;">
        <button class="btn btn-primary btn-sm" style="padding:2px 6px;font-size:0.71875rem;" onclick="generateCertificate('${d.id}')">📜 感謝狀</button>
        <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:0.71875rem;" onclick="startEditDonation('${d.id}')">編輯</button>
        <button class="btn btn-danger btn-sm" style="padding:2px 6px;font-size:0.71875rem;" onclick="deleteDonation('${d.id}')">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('don-search-input').addEventListener('input', renderDonationTable);

function updateDonationItemsDatalist(){
  const dl = document.getElementById('don-item-datalist');
  if(dl) dl.innerHTML = customDonationItems.map(item => `<option value="${escapeAttr(item)}">`).join('');
}

document.getElementById('btn-manage-don-items').addEventListener('click', async ()=>{
  const item = prompt('請輸入自訂捐款項目名稱（如已有則可直接刪除）：')?.trim();
  if(!item) return;
  if(customDonationItems.includes(item)){
    if(confirm(`刪除「${item}」？`)){ customDonationItems = customDonationItems.filter(x => x !== item); await saveDataAll(); updateDonationItemsDatalist(); }
  } else {
    customDonationItems.push(item); await saveDataAll(); updateDonationItemsDatalist();
    document.getElementById('don-item-input').value = item;
  }
});

function generateCertificate(donId){
  currentViewingDonId = donId;
  const d = donations.find(x => x.id === donId);
  if(!d) return;

  const chineseAmount = numberToChineseAmount(d.amount);
  const donDate = d.date ? new Date(d.date) : new Date();
  const rocYear = donDate.getFullYear() - 1911;
  const month = donDate.getMonth() + 1;
  const day = donDate.getDate();

  const officialSealHtml = `
    <div class="temple-official-seal">
      <div class="temple-seal-mid">
        <div class="temple-seal-in">
          <div class="temple-seal-top">順天</div>
          <div class="temple-seal-bot">太子會</div>
        </div>
      </div>
    </div>
  `;

  const certHtml = `
    <div class="cert-container">
      <div class="cert-header">
        <p class="cert-title">順天太子會</p>
        <p class="cert-sub">${escapeHtml(d.event || activeDonationEvent)} 感謝狀</p>
      </div>
      <div class="cert-body">
        茲承蒙 善信大德 <b style="font-size:22px;color:var(--seal-dark);text-decoration:underline;"> ${escapeHtml(d.name)} </b> 虔誠向道、鼎力相助，熱心捐助本會【<b>${escapeHtml(d.item||'隨喜功德')}</b>】。<br><br>
        捐助金額計新台幣：<span class="cert-amount"> ${chineseAmount} </span>（NT$ ${Number(d.amount).toLocaleString()} 元整）。
        ${d.note ? `<br><br>祈願事由：<b>${escapeHtml(d.note)}</b>` : ''}
        <br><br>本會全體同仁銘感同深，特頒此狀以昭謝忱。<br>並祈 中壇元帥 暨 列位聖尊 庇佑 闔家平安、萬事順遂、福壽康寧。
      </div>
      <div class="cert-footer">
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:16px;">
          <p style="font-family:'Noto Serif TC',serif;font-size:18px;font-weight:900;color:var(--seal-dark);margin:0;letter-spacing:1px;">順天太子會 管理委員會 敬啟</p>
          ${officialSealHtml}
        </div>
        <div style="text-align:center;width:100%;margin-top:8px;"><p class="cert-date">中華民國 ${rocYear} 年 ${month} 月 ${day} 日</p></div>
      </div>
    </div>
  `;

  document.getElementById('cert-render-area').innerHTML = certHtml;
  document.getElementById('cert-preview-card').style.display = 'block';
  document.getElementById('cert-preview-card').scrollIntoView({ behavior: 'smooth' });
}

function numberToChineseAmount(num){
  const digits = ['零','壹','貳','參','肆','伍','陸','柒','捌','玖'];
  const units = ['','拾','佰','仟'];
  const bigUnits = ['','萬','億','兆'];
  num = Math.floor(Math.abs(Number(num) || 0));
  if(num === 0) return '零元整';
  let str = '', strNum = num.toString(), len = strNum.length, zeroCount = 0;
  for(let i = 0; i < len; i++){
    let n = parseInt(strNum[i]), pos = len - i - 1, unitPos = pos % 4, bigUnitPos = Math.floor(pos / 4);
    if(n === 0){ zeroCount++; } else {
      if(zeroCount > 0){ str += '零'; zeroCount = 0; }
      str += digits[n] + units[unitPos];
    }
    if(unitPos === 0 && zeroCount < 4){ str += bigUnits[bigUnitPos]; zeroCount = 0; }
  }
  return str + '元整';
}

document.getElementById('btn-print-single-cert').addEventListener('click', ()=>{
  const content = document.getElementById('cert-render-area').innerHTML;
  document.body.classList.remove('compact-print', 'two-column-print');
  document.body.classList.add('cert-print-mode');
  document.getElementById('print-area').innerHTML = content;
  window.print();
  document.body.classList.remove('cert-print-mode');
});

function generateDonationPrintContent(){
  const isTwoCol = document.getElementById('dpo-two-col').checked;
  const isCompact = document.getElementById('dpo-compact').checked;
  document.body.classList.toggle('two-column-print', isTwoCol);
  document.body.classList.toggle('compact-print', isCompact);

  const showPhone = document.getElementById('dpo-phone')?.checked ?? true;
  const showItem = document.getElementById('dpo-item')?.checked ?? true;
  const showPay = document.getElementById('dpo-pay')?.checked ?? true;
  const showAddress = document.getElementById('dpo-address')?.checked ?? true;
  const showNote = document.getElementById('dpo-note')?.checked ?? true;

  const scopeVal = document.getElementById('don-print-scope-select').value;
  let matches = donations.filter(d => (d.event || donationEvents[0]) === activeDonationEvent);
  let subTitle = `【${activeDonationEvent}】捐款明細`;

  if(scopeVal.startsWith('ID::')){
    const targetId = scopeVal.replace('ID::', '');
    matches = matches.filter(d => d.id === targetId);
    subTitle = matches[0] ? `【${matches[0].name}】單筆捐款明細` : '單筆捐款明細';
  }

  if(matches.length === 0){ showToast('無資料'); return null; }
  const totalMoney = matches.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  let html = `
    <div class="print-title-wrap">
      <p class="print-title">順天太子會 - ${escapeHtml(subTitle)}</p>
      <p class="print-sub">列印日期：${new Date().toLocaleString('zh-TW')} (共 ${matches.length} 筆)</p>
    </div>
    <div class="print-content-container"><div class="print-section">
      <table>
        <thead><tr>
          <th>序號</th><th>捐款日期</th><th>捐款人 / 寶號</th>
          ${showPhone?'<th>電話</th>':''}
          ${showItem?'<th>項目</th>':''}
          ${showPay?'<th>付款方式</th>':''}
          <th style="text-align:right;">金額</th>
          ${(showAddress || showNote)?'<th>地址 / 備註</th>':''}
        </tr></thead>
        <tbody>
  `;
  matches.forEach((d, idx) => {
    let addrNote = [showAddress ? d.address : '', showNote ? d.note : ''].filter(Boolean).join(' ');
    html += `<tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(d.date||'—')}</td>
      <td><b>${escapeHtml(d.name)}</b></td>
      ${showPhone?`<td>${escapeHtml(d.phone||'—')}</td>`:''}
      ${showItem?`<td>${escapeHtml(d.item||'隨喜')}</td>`:''}
      ${showPay?`<td>${escapeHtml(d.payMethod||'現金')}</td>`:''}
      <td style="text-align:right;font-weight:bold;">${formatMoney(d.amount)}</td>
      ${(showAddress || showNote)?`<td><small>${escapeHtml(addrNote||'—')}</small></td>`:''}
    </tr>`;
  });
  let colSpanVal = 3 + (showPhone?1:0) + (showItem?1:0) + (showPay?1:0);
  html += `</tbody><tfoot><tr><td colspan="${colSpanVal}" style="text-align:right;font-weight:bold;">總計：</td><td style="text-align:right;font-weight:bold;color:var(--seal-dark);">${formatMoney(totalMoney)}</td>${(showAddress || showNote)?'<td></td>':''}</tr></tfoot></table></div></div><div class="print-grand-total">累積總筆數：<b>${matches.length}</b> 筆 ｜ 總計：<b>${formatMoney(totalMoney)}</b></div>`;
  return html;
}

document.getElementById('btn-don-gen-preview').addEventListener('click', ()=>{
  const html = generateDonationPrintContent();
  if(!html) return;
  document.getElementById('don-print-preview-area').innerHTML = `<div class="detail-card">${html}</div>`;
  document.getElementById('print-area').innerHTML = html;
  showToast('已產生預覽');
});

document.getElementById('btn-don-print-action').addEventListener('click', ()=>{
  const html = generateDonationPrintContent();
  if(!html) return;
  document.getElementById('print-area').innerHTML = html;
  window.print();
});

