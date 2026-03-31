const API_URL = 'https://script.google.com/macros/s/AKfycbzJUpJDA1VE6ATuyiQagNRDp1zq9Ylat1uEbvLkTeoVs7q54-YC6jzhzXngOlj7joxDTQ/exec'; // ضع رابط جوجل هنا
let allData = [];
let currentPage = [];

async function fetchData() {
    try {
        const response = await fetch(`${API_URL}?action=getReport`);
        const data = await response.json();
        allData = data;
        renderTabs();
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('loader').innerHTML = '<p class="text-danger">فشل الاتصال بالـ API</p>';
    }
}

function getActivities(name) {
    let acts = [];
    // الترتيب يجب أن يطابق أعمدة الشيت تماماً
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
    return acts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTabs() {
    document.getElementById('loader').style.display = 'none';
    let tabsHtml = '';
    let contentHtml = '';

    allData.wallets.forEach((person, index) => {
        let name = person[0];
        let acts = getActivities(name);
        let balance = acts.reduce((sum, act) => sum + act.amount, 0);
        currentPage[index] = 0;

        let balClass = balance >= 0 ? 'text-success' : 'text-danger';

        tabsHtml += `
            <li class="nav-item">
                <button class="nav-link ${index===0?'active':''}" id="tab-${index}" data-bs-toggle="pill" data-bs-target="#content-${index}">
                    <span class="tab-name">${name}</span>
                    <span class="tab-balance ${balClass}">${Math.abs(balance).toFixed(2)}</span>
                </button>
            </li>`;

        contentHtml += `
            <div class="tab-pane fade ${index===0?'show active':''}" id="content-${index}">
                <div class="account-card text-end">
                    <div class="summary-box ${balance >= 0 ? 'status-pos' : 'status-neg'}">
                        <span class="small fw-bold d-block mb-1 opacity-75">${balance >= 0 ? 'رصيد متوفر' : 'مديونية مطلوبة'}</span>
                        <span class="balance-val">${Math.abs(balance).toFixed(2)} <small>د.أ</small></span>
                    </div>
                    <div id="items-container-${index}" class="items-scroll-area"></div>
                    </div>
            </div>`;
    });

    document.getElementById('pills-tab').innerHTML = tabsHtml;
    document.getElementById('pills-tabContent').innerHTML = contentHtml;
    allData.wallets.forEach((_, i) => renderPage(i));
}

// استدعاء البيانات عند الفتح
window.onload = fetchData;
