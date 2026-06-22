/* =================== 自选股票配置（改这里就行） ===================
   code     - 6 位股票代码
   market   - 1 = 上海，0 = 深圳
   name     - 显示名称
   dividend - 每股年度分红（元），填 0 表示无
   undDist  - 未分配股息（元），计算股息率时先扣掉这个值
   etf      - true=价格保留3位小数，false=保留2位
   =============================================================== */
const STOCKS = [
  { code: '601919', market: 1, name: '中远海控',   dividend: 0.679,  undDist: 0.44, etf: false },
  { code: '600938', market: 1, name: '中国海油',   dividend: 1.5148, undDist: 0.486, etf: false },
  { code: '563020', market: 1, name: '红利低波ETF', dividend: 0.048,  undDist: 0,    etf: true },
  { code: '159307', market: 0, name: '红利低波100ETF',dividend:0.0506,undDist:0,    etf: true },
];

/* =================== 腾讯 API（script 标签，无跨域问题） =========== */
function fetchQuotes() {
  return new Promise((resolve, reject) => {
    const codes = STOCKS.map(s => (s.market ? 'sh' : 'sz') + s.code).join(',');
    const s = document.createElement('script');
    s.src = 'http://qt.gtimg.cn/q=' + codes;
    const timer = setTimeout(() => { s.onerror=null;s.onload=null;s.parentNode&&s.parentNode.removeChild(s);reject('请求超时'); }, 10000);
    s.onload = () => {
      clearTimeout(timer);
      s.parentNode.removeChild(s);
      const r = [];
      for (const x of STOCKS) {
        const raw = window['v_' + (x.market ? 'sh' : 'sz') + x.code];
        try { delete window['v_' + (x.market ? 'sh' : 'sz') + x.code]; } catch(e) {}
        if (raw) { const p = raw.split('~'); r.push({code:x.code, name:p[1]||x.name, price:+p[3]||0 }); }
        else r.push({code:x.code, name:x.name, price:0});
      }
      resolve(r);
    };
    s.onerror = () => { clearTimeout(timer);s.parentNode&&s.parentNode.removeChild(s);reject('网络请求失败'); };
    document.body.appendChild(s);
  });
}

/* =================== 渲染卡片 ==================================== */
function render(quotes) {
  const el = document.getElementById('list');
  el.innerHTML = '';
  for (const q of quotes) {
    const cfg = STOCKS.find(x => x.code === q.code);
    if (!cfg) continue;
    const price = q.price, div = cfg.dividend || 0, ded = cfg.undDist || 0;
    const base = price - ded, rate = base > 0 ? div / base * 100 : 0;
    const decimals = cfg.etf ? 3 : 2;
    const priceTxt = price > 0 ? price.toFixed(decimals) : '--';
    const rateTxt = div > 0 && base > 0 ? rate.toFixed(2) : '0.00';
    const cls = div > 0 && base > 0 ? (rate >= 5 ? 'high' : rate >= 3 ? 'mid' : 'low') : 'zero';
    const note = ded > 0 ? `<div class="note">（基准价已扣未分配股息 ${ded.toFixed(3)} 元）</div>` : '';
    el.innerHTML +=
      `<div class="card">
        <div class="hdr"><span class="nm">${cfg.name}</span><span class="cd">${q.code}</span></div>
        <div class="row">
          <div class="prc">¥${priceTxt}</div>
          <div class="divr ${cls}">${rateTxt}%<span class="lbl">分红 ${div>0?div.toFixed(3):'0'} 元/股</span></div>
        </div>
        ${note}
      </div>`;
  }
  document.getElementById('time').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

/* =================== 刷新 ======================================== */
async function refresh() {
  document.getElementById('list').innerHTML = '<div class="loading"><div class="spin"></div><div>加载中…</div></div>';
  document.getElementById('btn').disabled = true;
  try { render(await fetchQuotes()); } catch (e) {
    document.getElementById('list').innerHTML = `<div class="err">${e}<br><button class="retry" onclick="refresh()">重试</button></div>`;
  }
  document.getElementById('btn').disabled = false;
}

/* =================== 初始化 ====================================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
document.getElementById('btn').addEventListener('click', refresh);
refresh();
