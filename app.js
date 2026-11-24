const $ = (id) => document.getElementById(id);
let hospitals = [];
let lastResults = [];

async function init() {
  try {
    const response = await fetch("./data.json");
    if (!response.ok) throw new Error("데이터 파일을 불러오지 못했습니다.");
    hospitals = await response.json();
    populateProvinces();
  } catch (error) {
    $("formMessage").textContent = "데이터를 불러오지 못했습니다. 파일을 안내된 방법으로 실행했는지 확인해 주세요.";
    $("searchForm").querySelectorAll("select,button").forEach(el => el.disabled = true);
    console.error(error);
  }
}

function populateProvinces() {
  const provinces = [...new Set(hospitals.map(h => h.province).filter(Boolean))].sort();
  provinces.forEach(province => $("province").add(new Option(province, province)));
}

$("province").addEventListener("change", () => {
  const province = $("province").value;
  const citySelect = $("city");
  citySelect.innerHTML = '<option value="">시·군·구를 선택하세요</option>';
  citySelect.disabled = !province;
  if (!province) return;
  const cities = [...new Set(hospitals.filter(h => h.province === province).map(h => h.city))].sort((a,b)=>a.localeCompare(b,"ko"));
  cities.forEach(city => citySelect.add(new Option(city, city)));
  $("formMessage").textContent = "";
});

$("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const province = $("province").value;
  const city = $("city").value;
  const device = $("device").value;
  if (!province || !city || !device) {
    $("formMessage").textContent = "시·도, 시·군·구, 의료기기 종류를 모두 선택해 주세요.";
    return;
  }
  $("formMessage").textContent = "";
  lastResults = hospitals.filter(h =>
    h.province === province &&
    h.city === city &&
    h.devices.some(d => d.type === device)
  );
  renderResults(lastResults, province, city, device);
});

$("resetBtn").addEventListener("click", () => {
  $("searchForm").reset();
  $("city").innerHTML = '<option value="">시·군·구를 선택하세요</option>';
  $("city").disabled = true;
  $("formMessage").textContent = "";
  $("resultSummary").textContent = "지역과 의료기기를 선택한 뒤 검색해 주세요.";
  $("countBadge").textContent = "0개 기관";
  $("results").innerHTML = emptyState("검색 조건을 선택해 주세요", "선택한 지역과 의료기기에 맞는 의료기관을 찾아드립니다.");
});

function emptyState(title, description) {
  return `<div class="empty-state"><div class="empty-icon">⌕</div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>`;
}

function renderResults(list, province, city, device) {
  $("resultSummary").textContent = `${province} ${city} · ${device} 보유 의료기관`;
  $("countBadge").textContent = `${list.length}개 기관`;
  if (!list.length) {
    $("results").innerHTML = emptyState("검색 결과가 없습니다", "선택한 지역에서 해당 의료기기를 보유한 운영 중 의료기관을 찾지 못했습니다.");
    return;
  }
  $("results").innerHTML = list.map((h, index) => {
    const matched = h.devices.filter(d => d.type === device);
    const deviceNames = matched.map(d => d.deviceName || d.type).filter(Boolean);
    return `<article class="hospital-card">
      <div class="card-top"><div class="hospital-name">${escapeHtml(h.name)}</div><span class="device-tag">${device}</span></div>
      <p class="address">${escapeHtml(h.address || "주소 정보 없음")}</p>
      <div class="device-line">${escapeHtml([...new Set(deviceNames)].join(" · ") || device)} 보유</div>
      <div class="card-bottom"><span class="device-count">${matched.length}대 등록</span><button class="detail-btn" data-index="${index}">상세정보 확인 →</button></div>
    </article>`;
  }).join("");
  $("results").querySelectorAll(".detail-btn").forEach(button => {
    button.addEventListener("click", () => openDetails(list[Number(button.dataset.index)]));
  });
}

function openDetails(hospital) {
  $("detailName").textContent = hospital.name;
  const deviceHtml = hospital.devices.map((d, i) => `
    <section class="device-detail">
      <h3>${escapeHtml(d.type)} · ${escapeHtml(d.deviceName || "장치명 정보 없음")}</h3>
      <div class="detail-meta">
        <span>모델명</span><span>${escapeHtml(d.model || "정보 없음")}</span>
        <span>장치 형식</span><span>${escapeHtml(d.spec || "정보 없음")}</span>
        <span>장치 상태</span><span>${escapeHtml(d.status || "정보 없음")}</span>
        <span>공동 이용</span><span>${d.shared === "Y" ? "공동 이용" : d.shared === "N" ? "공동 이용 아님" : "정보 없음"}</span>
      </div>
    </section>`).join("");
  const map = Number.isFinite(hospital.lat) && Number.isFinite(hospital.lng)
    ? `<a class="map-link" href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(hospital.lat)}&mlon=${encodeURIComponent(hospital.lng)}#map=16/${encodeURIComponent(hospital.lat)}/${encodeURIComponent(hospital.lng)}" target="_blank" rel="noopener noreferrer">지도에서 위치 확인 ↗</a>`
    : `<p class="no-map">위치 좌표가 등록되어 있지 않아 지도를 표시할 수 없습니다.</p>`;
  $("detailContent").innerHTML = `<p class="detail-address">${escapeHtml(hospital.address || "주소 정보 없음")}</p>${deviceHtml}${map}`;
  $("detailDialog").showModal();
}

$("closeDialog").addEventListener("click", () => $("detailDialog").close());
$("detailDialog").addEventListener("click", (event) => {
  if (event.target === $("detailDialog")) $("detailDialog").close();
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}

init();
