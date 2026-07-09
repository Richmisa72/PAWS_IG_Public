const numberFormat = new Intl.NumberFormat("zh-Hant-TW");
const percentFormat = new Intl.NumberFormat("zh-Hant-TW", {
  style: "percent",
  maximumFractionDigits: 1,
});

const grainCopy = {
  daily: {
    title: "每日發布內容表現",
    note: "只顯示有發布內容的日期，用來看單篇或同日多篇內容的即時表現",
    label: "每天",
  },
  weekly: {
    title: "每週發布內容表現",
    note: "用週作為經營節奏，適合檢查下週要不要調整格式與主題",
    label: "每週",
  },
  monthly: {
    title: "每月觀看趨勢",
    note: "4 月由奧托 Reel 明顯拉高，其餘月份是日常基準",
    label: "每月",
  },
  total: {
    title: "總累積表現",
    note: "把 2026-01-01 到 2026-06-30 的自有帳號內容全部合併",
    label: "總累積",
  },
};

let posts = [];
let timeGrain = "monthly";

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(value) {
  return numberFormat.format(Math.round(num(value)));
}

function isOwnPost(post) {
  return !post.is_collab_or_other_account || post.is_collab_or_other_account === "False";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((item) => item.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, ""));
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function setKpis(summary) {
  const totals = summary.core_totals;
  document.querySelector('[data-kpi="heroViews"]').textContent = fmt(totals["瀏覽次數"]);
  document.querySelector('[data-kpi="views"]').textContent = fmt(totals["瀏覽次數"]);
  document.querySelector('[data-kpi="reach"]').textContent = fmt(totals["觸及人數"]);
  document.querySelector('[data-kpi="engagements"]').textContent = fmt(totals.engagements);
  document.querySelector('[data-kpi="follows"]').textContent = fmt(totals["追蹤人數"]);
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function barColors() {
  return {
    accent: cssVar("--accent") || "#fc5000",
    accent2: cssVar("--accent-2") || "#524ae9",
    tag: cssVar("--tag") || "#f5f28e",
    muted: cssVar("--muted") || "#817b71",
    text: cssVar("--text") || "#070607",
  };
}

function makeBars(data, options = {}) {
  const width = 900;
  const height = options.height ?? 320;
  const pad = { top: 28, right: 22, bottom: 64, left: 22 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const maxValue = Math.max(...data.map((item) => num(item.value)), 1);
  const gap = options.gap ?? Math.max(8, Math.min(26, 220 / Math.max(data.length, 1)));
  const barWidth = Math.max(8, (innerWidth - gap * (data.length - 1)) / Math.max(data.length, 1));
  const dense = data.length > 12;
  const labelEvery = dense ? Math.ceil(data.length / 9) : 1;

  const barParts = data.map((item, index) => {
    const barHeight = Math.max(2, (num(item.value) / maxValue) * innerHeight);
    const x = pad.left + index * (barWidth + gap);
    const y = pad.top + innerHeight - barHeight;
    const radius = Math.min(16, Math.max(4, barWidth / 2));
    const labelY = data.length > 18 ? height - 38 : height - 30;
    const rotate = data.length > 18 ? ` transform="rotate(-42 ${x + barWidth / 2} ${labelY})"` : "";
    const anchor = data.length > 18 ? "end" : "middle";
    const showLabel = !dense || index % labelEvery === 0 || index === data.length - 1;
    const hitWidth = Math.max(18, barWidth + gap * 0.7);
    const hitX = x - (hitWidth - barWidth) / 2;
    const valueText = fmt(item.value);
    const valueWidth = Math.max(74, valueText.length * 14 + 24);
    const valueX = Math.min(width - pad.right - valueWidth / 2, Math.max(pad.left + valueWidth / 2, x + barWidth / 2));
    const valueY = Math.max(28, y - 28);
    return {
      bars: `
      <g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="${radius}" fill="${item.color ?? "url(#barGradient)"}"></rect>
        ${showLabel ? `<text class="axis-label" x="${x + barWidth / 2}" y="${labelY}" text-anchor="${anchor}"${rotate}>${item.label}</text>` : ""}
      </g>
      `,
      hover: `
      <g class="bar-item" tabindex="0" aria-label="${item.label} ${fmt(item.value)}">
        <rect class="hit-area" x="${hitX}" y="${pad.top}" width="${hitWidth}" height="${innerHeight + 28}" fill="transparent"></rect>
        <text class="value-label" x="${valueX}" y="${valueY - 2}" text-anchor="middle">${valueText}</text>
      </g>
      `,
    };
  });
  const bars = barParts.map((part) => part.bars).join("");
  const hoverLayer = barParts.map((part) => part.hover).join("");

  const colors = barColors();
  return `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <defs>
        <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${colors.tag}"></stop>
          <stop offset="100%" stop-color="${colors.accent}"></stop>
        </linearGradient>
      </defs>
      <line x1="${pad.left}" y1="${pad.top + innerHeight}" x2="${width - pad.right}" y2="${pad.top + innerHeight}" stroke="currentColor" opacity=".16"></line>
      ${bars}
      ${hoverLayer}
    </svg>
  `;
}

function makeHorizontalBars(data) {
  const maxValue = Math.max(...data.map((item) => num(item.value)), 1);

  const rows = data.map((item) => {
    const width = Math.max(3, (num(item.value) / maxValue) * 100);
    return `
      <div class="bar-row">
        <div class="bar-row-top">
          <span>${item.label}</span>
          <strong>${fmt(item.value)}</strong>
        </div>
        <div class="bar-track">
          <span style="width: ${width}%; background: ${item.color};"></span>
        </div>
      </div>
    `;
  }).join("");

  return `<div class="bar-list">${rows}</div>`;
}

function addMetrics(target, post) {
  target.posts += 1;
  target.views += num(post["瀏覽次數"]);
  target.reach += num(post["觸及人數"]);
  target.engagements += num(post.engagements);
  target.saves += num(post["儲存次數"]);
  target.shares += num(post["分享"]);
  target.follows += num(post["追蹤人數"]);
}

function aggregateBy(field, labeler) {
  const buckets = new Map();
  posts.filter(isOwnPost).forEach((post) => {
    const key = post[field];
    if (!key) return;
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: labeler(key),
        posts: 0,
        views: 0,
        reach: 0,
        engagements: 0,
        saves: 0,
        shares: 0,
        follows: 0,
      });
    }
    addMetrics(buckets.get(key), post);
  });
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function monthLabel(value) {
  return value.replace("2026-", "") + " 月";
}

function shortDate(value) {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function buildTimeData(grain) {
  if (grain === "daily") return aggregateBy("publish_date", shortDate);
  if (grain === "weekly") return aggregateBy("week_start", (value) => `${shortDate(value)} 週`);
  if (grain === "monthly") return aggregateBy("month", monthLabel);

  const total = {
    key: "total",
    label: "1/1-6/30",
    posts: 0,
    views: 0,
    reach: 0,
    engagements: 0,
    saves: 0,
    shares: 0,
    follows: 0,
  };
  posts.filter(isOwnPost).forEach((post) => addMetrics(total, post));
  return [total];
}

function renderTimeSummary(rows) {
  const total = rows.reduce((acc, row) => {
    acc.views += row.views;
    acc.reach += row.reach;
    acc.engagements += row.engagements;
    acc.saves += row.saves;
    acc.shares += row.shares;
    acc.follows += row.follows;
    acc.posts += row.posts;
    return acc;
  }, { posts: 0, views: 0, reach: 0, engagements: 0, saves: 0, shares: 0, follows: 0 });

  const engagementRate = total.reach ? total.engagements / total.reach : 0;
  document.querySelector("#timeSummary").innerHTML = `
    <div class="mini-kpi"><span>內容數</span><strong>${fmt(total.posts)}</strong></div>
    <div class="mini-kpi"><span>觀看</span><strong>${fmt(total.views)}</strong></div>
    <div class="mini-kpi"><span>互動率</span><strong>${percentFormat.format(engagementRate)}</strong></div>
    <div class="mini-kpi"><span>追蹤</span><strong>${fmt(total.follows)}</strong></div>
  `;
}

function renderTimeView() {
  const copy = grainCopy[timeGrain];
  const rows = buildTimeData(timeGrain);
  const colors = barColors();
  document.querySelector("[data-time-title]").textContent = copy.title;
  document.querySelector("[data-time-note]").textContent = copy.note;
  document.querySelectorAll(".time-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.grain === timeGrain);
  });

  renderTimeSummary(rows);
  if (timeGrain === "total") {
    document.querySelector("#timeChart").innerHTML = `
      <div class="total-note">
        <strong>總累積不用看趨勢圖</strong>
        <p>這裡代表 2026-01-01 到 2026-06-30 的完整加總，要判斷起伏請切到「每月」或「每週」，總累積只用來確認整段期間的結果</p>
      </div>
    `;
    return;
  }
  const isNarrowViewport = window.innerWidth <= 720;
  document.querySelector("#timeChart").innerHTML = makeBars(
    rows.map((row) => ({
      label: row.label,
      value: row.views,
      color: row.views > 50000 ? colors.accent : undefined,
    })),
    { height: isNarrowViewport ? (timeGrain === "daily" ? 720 : 640) : (timeGrain === "daily" ? 380 : 340) }
  );
}

function renderCharts(summary) {
  const colors = barColors();
  const format = summary.by_format
    .slice()
    .sort((a, b) => b.views - a.views)
    .map((item, index) => ({
      label: item.content_format.replace("IG ", ""),
      value: item.views,
      color: [colors.accent, colors.accent2, colors.muted][index] ?? colors.muted,
    }));
  document.querySelector("#formatChart").innerHTML = makeHorizontalBars(format);

  const theme = summary.by_theme
    .slice()
    .sort((a, b) => b.views - a.views)
    .map((item, index) => ({
      label: item.content_theme.replace("與", " / "),
      value: item.views,
      color: [colors.accent, colors.accent2, colors.text, colors.muted, "#a15b2d"][index] ?? colors.muted,
    }));
  document.querySelector("#themeChart").innerHTML = makeHorizontalBars(theme);
}

function uniqueValues(field) {
  return [...new Set(posts.filter(isOwnPost).map((post) => post[field]).filter(Boolean))].sort();
}

function fillSelect(select, values, label) {
  select.innerHTML = [`<option value="">全部${label}</option>`, ...values.map((value) => `<option value="${value}">${value}</option>`)].join("");
}

function renderFilters() {
  fillSelect(document.querySelector("#monthFilter"), uniqueValues("month"), "月份");
  fillSelect(document.querySelector("#formatFilter"), uniqueValues("content_format"), "格式");
  fillSelect(document.querySelector("#themeFilter"), uniqueValues("content_theme"), "主題");

  ["#monthFilter", "#formatFilter", "#themeFilter"].forEach((selector) => {
    document.querySelector(selector).addEventListener("change", renderRows);
  });
}

function renderRows() {
  const month = document.querySelector("#monthFilter").value;
  const format = document.querySelector("#formatFilter").value;
  const theme = document.querySelector("#themeFilter").value;
  const filtered = posts
    .filter(isOwnPost)
    .filter((post) => !month || post.month === month)
    .filter((post) => !format || post.content_format === format)
    .filter((post) => !theme || post.content_theme === theme)
    .sort((a, b) => num(b["瀏覽次數"]) - num(a["瀏覽次數"]));

  document.querySelector("#postRows").innerHTML = filtered.map((post) => `
    <tr>
      <td data-label="日期">${post.publish_date}</td>
      <td data-label="格式">${post.content_format}</td>
      <td data-label="主題">${post.content_theme}</td>
      <td data-label="觀看">${fmt(post["瀏覽次數"])}</td>
      <td data-label="觸及">${fmt(post["觸及人數"])}</td>
      <td data-label="互動率">${percentFormat.format(num(post.engagement_rate_reach))}</td>
      <td data-label="收藏">${fmt(post["儲存次數"])}</td>
      <td data-label="分享">${fmt(post["分享"])}</td>
      <td data-label="追蹤">${fmt(post["追蹤人數"])}</td>
    </tr>
  `).join("");
}

function setupTimeTabs() {
  document.querySelectorAll(".time-tab").forEach((button) => {
    button.addEventListener("click", () => {
      timeGrain = button.dataset.grain;
      renderTimeView();
    });
  });
}

function setupTheme(summary) {
  const storageKey = "paws-dashboard-theme-v2";
  const getSavedTheme = () => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };
  const saveTheme = (theme) => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Some local file previews block storage; the toggle still works for the current page.
    }
  };
  const savedTheme = getSavedTheme();
  const saved = ["caldera", "obsidian"].includes(savedTheme) ? savedTheme : "caldera";
  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.themeChoice === theme);
    });
    renderTimeView();
    renderCharts(summary);
  };

  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  });
  setTheme(saved);
}

async function boot() {
  if (!window.PAWS_DASHBOARD_DATA) {
    throw new Error("找不到 Dashboard 內嵌資料");
  }

  const summary = window.PAWS_DASHBOARD_DATA.summary;
  posts = window.PAWS_DASHBOARD_DATA.posts;

  setKpis(summary);
  setupTimeTabs();
  renderTimeView();
  renderFilters();
  renderRows();
  setupTheme(summary);
}

boot().catch((error) => {
  document.body.insertAdjacentHTML("afterbegin", `<div class="load-error">Dashboard 載入失敗：${error.message}</div>`);
});
