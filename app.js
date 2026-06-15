const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:1337"
    : "https://tscms.onrender.com";
const API_URL = `${API_BASE}/api/salons?populate=*`;

let profiles = [];

let cityFilter = "all";
let maxPrice = 999;
let sortMode = null;
let renderedCount = 0;
const STEP = 5;

let favorites = JSON.parse(localStorage.getItem("fav") || "[]");
let isLoading = false;

/* ---------------- STRAPI DATA ---------------- */
function mapStrapiData(items){
    return items.map(item => {
        return {
            nom: item.Nom,
            ville: item.Ville,
            adresse: item.Adresse,
            numero: item.Telephone,
            site: item.Site || "",

            horaires: {
                lundi: item.Horaires?.Lundi || "-",
                mardi: item.Horaires?.Mardi || "-",
                mercredi: item.Horaires?.Mercredi || "-",
                jeudi: item.Horaires?.Jeudi || "-",
                vendredi: item.Horaires?.Vendredi || "-",
                samedi: item.Horaires?.Samedi || "-",
                dimanche: item.Horaires?.Dimanche || "-"
            },

            services: Array.isArray(item.services)
            ? item.services.map(s => ({
                titre: s.Titre,
                prix: s.Prix,
                temps: s.Temps
            }))
            : [],

            photos: Array.isArray(item.Photos) ? item.Photos : []
        };
    });
}

/* ---------------- FILTER ---------------- */
function getFiltered() {
    return profiles
        .filter(p => {

            const matchCity = cityFilter === "all" || p.ville === cityFilter;

            const matchPrice =
                !Array.isArray(p.services) ||
                p.services.length === 0 ||
                p.services.some(s => (s.prix || 0) <= maxPrice);

            const searchText = [
                p.nom,
                p.ville,
                p.adresse,
                p.numero || "",
                p.site || "",
                ...p.services.map(s => s.titre),
            ].join(" ").toLowerCase();

            const searchValue = document.getElementById("search").value.toLowerCase();
            const matchSearch = searchText.includes(searchValue);

            return matchCity && matchPrice && matchSearch;
        })
        .sort((a, b) => {

            if (!sortMode) return 0;

            const pa = a.services.length
                ? Math.min(...a.services.map(s => s.prix || 999999))
                : 999999;

            const pb = b.services.length
                ? Math.min(...b.services.map(s => s.prix || 999999))
                : 999999;

            return sortMode === "asc" ? pa - pb : pb - pa;
        });
}

/* ---------------- RENDER ---------------- */
function render(reset = true) {
    const container = document.getElementById("results");

    if (reset) {
        container.innerHTML = "";
        renderedCount = 0;
    }

    let list = getFiltered();

    const favSet = new Set(favorites);
    const favProfiles = [];
    const normalProfiles = [];

    for (const p of list) {
        if (favSet.has(p.nom)) favProfiles.push(p);
        else normalProfiles.push(p);
    }

    list = [...favProfiles, ...normalProfiles];

    if (reset && favProfiles.length) {
        container.innerHTML += `
            <div class="favorites-section">
                <div class="favorites-title">
                    ❤️ Mes favoris (${favProfiles.length})
                </div>
                <div class="favorites-list">
                    ${favProfiles.map(p => `
                        <span class="favorite-chip">${p.nom}</span>
                    `).join("")}
                </div>
            </div>
        `;
    }

    const slice = list.slice(renderedCount, renderedCount + STEP);

    slice.forEach((p, i) => {

        const globalIndex = renderedCount + i;
        const h = p.horaires || {
            lundi: "-",
            mardi: "-",
            mercredi: "-",
            jeudi: "-",
            vendredi: "-",
            samedi: "-",
            dimanche: "-"
        };

        const servicesHtml = p.services.map(s => `
            <div class="service-row">
                <div class="service-title">${s.titre || "-"}</div>
                <div class="service-price">${s.prix ? s.prix + "€" : "-"}</div>
                <div class="service-time">${s.temps || "-"}</div>
            </div>
        `).join("");

        const photosHtml = (p.photos || []).map(img =>
            `<img src="${img}" loading="lazy" decoding="async">`
        ).join("");

        const isFav = favorites.includes(p.nom);

        container.innerHTML += `
        <div class="card ${isFav ? 'favorite-card' : ''}">

            <div class="card-header">
                <div>
                    <div class="card-title">
                        ${isFav ? '❤️ ' : ''}${p.nom}
                    </div>
                    <div class="card-sub">
                        ${p.ville} • ${p.adresse}
                    </div>
                </div>

                <button class="fav-btn" onclick="toggleFav('${escapeJsString(p.nom)}')">
                    ${isFav ? "❤️" : "🤍"}
                </button>
            </div>

            <div class="card-actions">
                <button onclick="toggleServices(${globalIndex})">🧾 Services</button>
                <button onclick="togglePhotos(${globalIndex})">📸 Photos</button>
                <button onclick="toggleHours(${globalIndex})">🕒 Horaires</button>
            </div>

            <div class="services" id="services-${globalIndex}">
                ${servicesHtml}
            </div>

            <div class="photos" id="photos-${globalIndex}">
                ${photosHtml}
            </div>

            <div class="hours" id="hours-${globalIndex}">
                <div>Lun : ${h.lundi || "-"}</div>
                <div>Mar : ${h.mardi || "-"}</div>
                <div>Mer : ${h.mercredi || "-"}</div>
                <div>Jeu : ${h.jeudi || "-"}</div>
                <div>Ven : ${h.vendredi || "-"}</div>
                <div>Sam : ${h.samedi || "-"}</div>
                <div>Dim : ${h.dimanche || "-"}</div>
            </div>

        </div>`;
    });

    renderedCount += slice.length;

    setTimeout(() => {
        const list = getFiltered();

        const nearBottom =
            window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;

        if (renderedCount < list.length && nearBottom) {
            render(false);
            return;
        }

        isLoading = false;
    }, 100);
}

/* ---------------- FAVORITES ---------------- */
function toggleFav(name) {
    if (favorites.includes(name)) {
        favorites = favorites.filter(f => f !== name);
    } else {
        favorites.push(name);
    }

    localStorage.setItem("fav", JSON.stringify(favorites));
    render(true);
}

function escapeJsString(str){
    return String(str)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\u2019/g, "\\'");
}

/* ---------------- TOGGLES ---------------- */
function toggleServices(i) {
    const el = document.getElementById("services-" + i);
    el.style.display = el.style.display === "block" ? "none" : "block";
}

function togglePhotos(i) {
    document.getElementById("photos-" + i).classList.toggle("open");
}

function toggleHours(i) {
    const el = document.getElementById("hours-" + i);
    el.style.display = el.style.display === "block" ? "none" : "block";
}

/* ---------------- FILTERS ---------------- */
function setPrice(price) {
    maxPrice = price;
    render(true);
}

function setSort(mode) {
    sortMode = mode;
    render(true);
}

/* ---------------- CITY ---------------- */
function initCities() {
    const cities = ["all", ...new Set(profiles.map(p => p.ville))];

    const container = document.getElementById("cityFilters");

    container.innerHTML = `
        <strong>Ville :</strong>
        ${cities.map(c => `
            <button onclick="setCity('${c}', this)" class="${c==='all'?'active':''}">
                ${c === 'all' ? 'Toutes' : c}
            </button>
        `).join("")}
    `;
}

function setCity(city, btn) {
    cityFilter = city;

    document.querySelectorAll(".city button")
        .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    render(true);
}

/* ---------------- SEARCH ---------------- */
document.getElementById("search").addEventListener("input", () => render(true));

/* ---------------- INIT ---------------- */
async function init() {
    const res = await fetch(API_URL);
    const json = await res.json();

    console.log("RAW STRAPI DATA:", json);
    profiles = mapStrapiData(json.data);
    console.log("MAPPED PROFILES:", profiles);

    initCities();
    render();
}

init();

/* ---------------- SCROLL ---------------- */
window.addEventListener("scroll", () => {
    if (isLoading) return;

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    const nearBottom = scrollTop + windowHeight >= docHeight - 200;

    if (!nearBottom) return;

    const list = getFiltered();

    if (renderedCount < list.length) {
        isLoading = true;
        render(false);
    }
});