// --- إعدادات الـ API ---
const API_URL = 'https://script.google.com/macros/s/AKfycbzJUpJDA1VE6ATuyiQagNRDp1zq9Ylat1uEbvLkTeoVs7q54-YC6jzhzXngOlj7joxDTQ/exec'; // ضع رابط جوجل هنا


let allData = { wallets: [], transactions: [], deposits: [] };
let currentPage = [];

// --- دالة جلب البيانات من API جوجل ---
async function fetchData() {
  try {
    const response = await fetch(`${API_URL}?action=getReport`);
    const data = await response.json();
    allData = data;
    initUI();
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    document.getElementById('loader').innerHTML = `<p class="text-danger">فشل الاتصال بالسيرفر. تأكد من إعدادات CORS ونشر السكريبت.</p>`;
  }
}

// --- معالجة التواريخ لترتيب السجل ---
function parseDate(str) {
  if (!str) return 0;
  try {
    let cleanStr = str.toString().replace(/-/g, '/');
    let d = new Date(cleanStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch(e) { return 0; }
}

// --- حساب حجم الصفحة ديناميكياً ---
function calculatePageSize() {
  const reservedHeight = 330;
  const availableHeight = window.innerHeight - reservedHeight;
  const rowHeight = 65;
  const calculated = Math.floor(availableHeight / rowHeight);
  return calculated > 3 ? calculated : 3;
}

// --- استخراج العمليات لكل شخص ---
function getActivities(name) {
  let acts = [];
  const brothers = ["محمد", "سماح", "نصر", "عبدالله", "محمود", "عبود", "مياس"];
  const nameIndex = brothers.indexOf(name);

  if (allData.transactions) {
    allData.transactions.forEach(t => {
      let personAmount = parseFloat(t[3 + nameIndex]);
      if (!isNaN(personAmount) && personAmount > 0) {
        acts.push({ date: t[0], type: 'med', title: t[1], amount: -personAmount });
      }
    });
  }

  if (allData.deposits) {
    allData.deposits.forEach(d => {
      if (d[1] === name) {
        acts.push({ date: d[0], type: 'dep', title: 'إيداع / تحويل', amount: parseFloat(d[2]) });
      }
    });
  }
  return acts.sort((a, b) => parseDate(b.date) - parseDate(a.date));
}

// --- بناء الواجهة بعد استلام البيانات ---
function initUI() {
  let tabsHtml = '';
  let contentHtml = '';
  document.getElementById('loader').style.display = 'none';

  allData.wallets.forEach((person, index) => {
    let name = person[0];
    const acts = getActivities(name);
    let balance = acts.reduce((sum, act) => sum + act.amount, 0);

    currentPage[index] = 0;
    let balClass = balance >= 0 ? 'text-pos' : 'text-neg';

    tabsHtml += `
      <li class="nav-item">
        <button class="nav-link ${index===0?'active':''}" id="tab-${index}" data-bs-toggle="pill" data-bs-target="#content-${index}" type="button">
          <span class="tab-name">${name}</span>
          <span class="tab-balance ${balClass}">${Math.abs(balance).toFixed(2)} د.أ</span>
        </button>
      </li>`;

    contentHtml += `
      <div class="tab-pane fade ${index===0?'show active':''}" id="content-${index}">
        <div class="account-card text-end">
          <div class="summary-box ${balance >= 0 ? 'status-pos' : 'status-neg'}">
            <span class="small fw-bold d-block mb-1 opacity-75">${balance >= 0 ? 'رصيد متوفر' : 'مديونية مطلوبة'}</span>
            <span class="balance-val">${Math.abs(balance).toFixed(2)} <small style="font-size: 0.9rem">د.أ</small></span>
          </div>
          <div class="px-3 pb-2">
            <button class="btn btn-sm btn-outline-secondary w-100" onclick="downloadPDF(${index}, '${name}')">
              <i class="bi bi-file-earmark-pdf me-1"></i> تحميل الكشف PDF
            </button>
          </div>
          <div id="items-container-${index}" class="items-scroll-area"></div>
          <div class="pagination-bar d-flex justify-content-between align-items-center">
            <button class="btn btn-sm btn-outline-primary px-3" onclick="changePage(${index}, -1)" id="prev-${index}">السابق</button>
            <span class="small fw-bold text-muted" id="page-info-${index}"></span>
            <button class="btn btn-sm btn-outline-primary px-3" onclick="changePage(${index}, 1)" id="next-${index}">التالي</button>
          </div>
        </div>
      </div>`;
  });

  document.getElementById('pills-tab').innerHTML = tabsHtml;
  document.getElementById('pills-tabContent').innerHTML = contentHtml;
  allData.wallets.forEach((_, index) => renderPage(index));
}

// --- رندر صفحات السجل لكل شخص ---
function renderPage(idx) {
  const name = allData.wallets[idx][0];
  const acts = getActivities(name);
  const pageSize = calculatePageSize();
  const start = currentPage[idx] * pageSize;
  const pageItems = acts.slice(start, start + pageSize);
  const totalPages = Math.ceil(acts.length / pageSize);

  let html = '<div class="bg-light p-1 small fw-bold text-muted border-bottom text-center">سجل الحركات</div>';
  
  if (acts.length === 0) {
    html += '<div class="p-5 text-center text-muted small">لا يوجد سجل عمليات</div>';
  } else {
    pageItems.forEach(act => {
      let isDep = act.type === 'dep';
      html += `
        <div class="transaction-item">
          <div class="icon-box ${isDep ? 'icon-dep' : 'icon-med'}"><i class="bi ${isDep ? 'bi-plus-circle-fill' : 'bi-capsule'}"></i></div>
          <div class="flex-grow-1 text-end">
            <span class="item-title">${act.title}</span>
            <span class="item-date">${act.date}</span>
          </div>
          <div class="amount-tag ${isDep ? 'text-success' : 'text-danger'}">${isDep ? '+' : '-'}${Math.abs(act.amount).toFixed(2)}</div>
        </div>`;
    });
    document.getElementById(`page-info-${idx}`).innerText = `صفحة ${currentPage[idx] + 1} من ${totalPages || 1}`;
    document.getElementById(`prev-${idx}`).disabled = currentPage[idx] === 0;
    document.getElementById(`next-${idx}`).disabled = start + pageSize >= acts.length;
  }
  document.getElementById(`items-container-${idx}`).innerHTML = html;
}

function changePage(idx, dir) {
  currentPage[idx] += dir;
  renderPage(idx);
}

// --- تشغيل التطبيق ---
window.onload = fetchData;
window.onresize = () => { if(allData.wallets.length) allData.wallets.forEach((_, i) => renderPage(i)); };

// --- وظيفة الـ PDF (تبقى كما هي في كودك الأصلي مع تغيير مصدر البيانات) ---
 function downloadPDF(index, name) {
    const btn = document.getElementById(`pdf-btn-${index}`);
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = 'جاري التحضير...'; btn.disabled = true;

    const acts = getActivities(name);
    const dateStr = new Date().toLocaleDateString('en-GB');

    const printElement = document.createElement('div');
    printElement.style.padding = '20px'; printElement.style.direction = 'rtl';
    printElement.innerHTML = `
      <div style="text-align:center; border-bottom:3px solid #1a73e8; padding-bottom:15px; margin-bottom:25px;">
        <h2 style="color:#1a73e8;">كشف حساب  ${name}</h2><p>تاريخ الاستخراج: ${dateStr}</p>
      </div>
      <table style="width:100%; border-collapse:collapse; font-family: sans-serif;">
        <thead><tr style="background:#f1f5f9;"><th style="padding:12px; text-align:right;">التاريخ</th><th style="padding:12px; text-align:right;">الحركة</th><th style="padding:12px; text-align:left;">المبلغ</th></tr></thead>
        <tbody>${acts.map(act => `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px; font-size:12px;">${act.date}</td><td style="padding:10px;">${act.title}</td><td style="padding:10px; text-align:left; font-weight:bold; color:${act.type==='dep'?'#16a34a':'#b91c1c'}; direction:ltr;">${act.amount.toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:40px; text-align:center;"><p>الرصيد الإجمالي الحالي: <b>${acts.reduce((sum, act) => sum + act.amount, 0).toFixed(2)} د.أ</b></p></div>`;

    html2pdf().set({ margin:10, filename:`كشف_${name}.pdf`, html2canvas:{scale:2}, jsPDF:{unit:'mm', format:'a4', orientation:'portrait'} })
      .from(printElement).save().then(() => { btn.innerHTML = originalBtnText; btn.disabled = false; });
  }

