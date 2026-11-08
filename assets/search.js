// ==========================================
// 4. 查詢分頁
// ==========================================
function renderSearchCatCheckboxes(){
  const container = document.getElementById('search-cat-checkboxes');
  if(!container) return;
  const previous = new Map(Array.from(container.querySelectorAll('input'), input => [input.value, input.checked]));
  container.innerHTML = categories.map(cat => `
    <label style="font-size:0.8125rem;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
      <input type="checkbox" name="search-cat-chk" value="${escapeAttr(cat)}" ${previous.get(cat) !== false ? 'checked' : ''} style="accent-color:var(--seal);"> ${escapeHtml(cat)}
    </label>
  `).join('');
}

function toggleAllSearchCats(status){
  document.querySelectorAll('input[name="search-cat-chk"]').forEach(chk => chk.checked = status);
}

function renderSearchNameSelect(){
  const sel = document.getElementById('s-name-target');
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

document.querySelectorAll('.search-toggle button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.search-toggle button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentSearchMode = btn.dataset.smode;

    document.getElementById('search-cat-panel').style.display = 'none';
    document.getElementById('search-name-panel').style.display = 'none';
    document.getElementById('search-yin-panel').style.display = 'none';

    if(currentSearchMode === 'cat'){
      document.getElementById('search-cat-panel').style.display = 'block';
      renderSearchCatCheckboxes();
    } else if(currentSearchMode === 'name'){
      document.getElementById('search-name-panel').style.display = 'block';
      renderSearchNameSelect();
    } else if(currentSearchMode === 'yin-all' || currentSearchMode === 'yin-unpaid'){
      document.getElementById('search-yin-panel').style.display = 'block';
      document.getElementById('search-yin-title').textContent = currentSearchMode === 'yin-unpaid' ? '未償還陰債名單查詢' : '全部陰債名單查詢';
    }
    document.getElementById('search-result-area').innerHTML = '';
  });
});

function renderSearchTab(){
  renderSearchCatCheckboxes();
  renderSearchNameSelect();
  document.getElementById('search-result-area').innerHTML = '';
}

function wrapSearchResultWithEdit(htmlContent, recordId){
  if(!recordId) return htmlContent;
  return `
    <div style="position:relative; margin-bottom:14px;">
      <div style="position:absolute; top:12px; right:12px; z-index:10;">
        <button class="btn btn-primary btn-sm" onclick="startEdit('${recordId}')">✏️ 編輯此筆資料</button>
      </div>
      ${htmlContent}
    </div>
  `;
}

document.getElementById('btn-do-search-cat').addEventListener('click', ()=>{
  const html = generateDharmaPrintContent('cat', undefined, 'search');
  if(!html) return;
  document.getElementById('search-result-area').innerHTML = `<div class="detail-card">${html}</div>`;
  showToast('已顯示查詢結果');
});

document.getElementById('btn-do-search-name').addEventListener('click', ()=>{
  const targetVal = document.getElementById('s-name-target').value;
  const html = generateDharmaPrintContent('name', targetVal);
  if(!html) return;

  let recId = null;
  if(targetVal.startsWith('FAMILY::') || targetVal.startsWith('SINGLE::') || targetVal.startsWith('MEMBER::')){
    recId = targetVal.split('::')[1];
  }

  const finalCardHtml = recId ? wrapSearchResultWithEdit(html, recId) : `<div class="detail-card">${html}</div>`;
  document.getElementById('search-result-area').innerHTML = finalCardHtml;
  showToast('已顯示查詢結果');
});

document.getElementById('btn-do-search-yin').addEventListener('click', ()=>{
  const html = generateDharmaPrintContent(currentSearchMode);
  if(!html) return;
  document.getElementById('search-result-area').innerHTML = `<div class="detail-card">${html}</div>`;
  showToast('已顯示查詢結果');
});


