const API_PRODUCTS_URL = "http://localhost:8080/api/products";
const PRODUCT_IMAGE_BASE_PATH = "/Du_an/HPB_FE/assets/image/";
const SUPPORTED_BRANDS = ["all", "Yonex", "Lining", "Victor", "Kumpoo", "VNB"];
let currentBrand = "all";

function getCurrentUser() {
    try {
        const rawUser = localStorage.getItem("user");
        return rawUser ? JSON.parse(rawUser) : null;
    } catch (error) {
        console.error("Không đọc được user trong localStorage:", error);
        return null;
    }
}

function setupAuthMenu() {
    const userMenu = document.querySelector(".header__navbar-user-menu");
    if (!userMenu) {
        return;
    }

    const currentUser = getCurrentUser();

    if (!currentUser || !currentUser.userId) {
        userMenu.innerHTML = `
            <li class="header__navbar-user-item">
                <a href="Dang-nhap.html">Đăng nhập</a>
            </li>
            <li class="header__navbar-user-item header__navbar-user-item--separate">
                <a href="Dang-ky.html">Đăng ký</a>
            </li>
        `;
        return;
    }

    userMenu.innerHTML = `
        <li class="header__navbar-user-item">
            <a href="Ho-so.html">Hồ sơ</a>
        </li>
        <li class="header__navbar-user-item">
            <a href="Don-mua.html">Đơn mua</a>
        </li>
        <li class="header__navbar-user-item header__navbar-user-item--separate">
            <a href="Dang-nhap.html" data-action="logout">Đăng xuất</a>
        </li>
    `;

    const logoutLink = userMenu.querySelector('[data-action="logout"]');
    if (logoutLink) {
        logoutLink.addEventListener("click", () => {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
        });
    }
}

function formatPrice(price) {
    const numericPrice = Number(price || 0);
    return `${numericPrice.toLocaleString("vi-VN")} ₫`;
}

function resolveProductImageUrl(rawImageUrl) {
    const fallback = "https://via.placeholder.com/400x400?text=No+Image";
    if (!rawImageUrl) {
        return fallback;
    }

    const normalized = String(rawImageUrl).trim().replace(/^['\"]+|['\"]+$/g, "");
    if (!normalized) {
        return fallback;
    }

    if (/^https?:\/\//i.test(normalized)) {
        return normalized;
    }

    if (normalized.startsWith("/")) {
        return normalized;
    }

    return `${PRODUCT_IMAGE_BASE_PATH}${normalized}`;
}

function getInitialBrandFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const queryBrand = (params.get("brand") || "all").trim();
    const matchedBrand = SUPPORTED_BRANDS.find((brand) =>
        brand.toLowerCase() === queryBrand.toLowerCase()
    );
    return matchedBrand || "all";
}

function setActiveBrandButton(selectedBrand) {
    const filterContainer = document.getElementById("brand-filters");
    if (!filterContainer) {
        return;
    }

    const buttons = filterContainer.querySelectorAll("button[data-brand]");
    buttons.forEach((button) => {
        const buttonBrand = button.getAttribute("data-brand") || "all";
        if (buttonBrand.toLowerCase() === selectedBrand.toLowerCase()) {
            button.classList.remove("btn-outline-secondary");
            button.classList.add("btn-primary");
        } else {
            button.classList.remove("btn-primary");
            button.classList.add("btn-outline-secondary");
        }
    });
}

function updateBrandQuery(selectedBrand) {
    const url = new URL(window.location.href);
    if (selectedBrand.toLowerCase() === "all") {
        url.searchParams.delete("brand");
    } else {
        url.searchParams.set("brand", selectedBrand);
    }
    window.history.replaceState({}, "", url);
}

function scrollToProductSection() {
    const productList = document.getElementById("product-list");
    if (!productList) {
        return;
    }

    const productSection = productList.closest("section") || productList;
    productSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function renderProducts(data) {
    const productList = document.getElementById("product-list");
    productList.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
        productList.innerHTML = `
            <div class="col-12">
                <p class="text-center text-secondary mb-0">Không có sản phẩm phù hợp.</p>
            </div>
        `;
        return;
    }

    data.forEach((product) => {
        const productId = product.productId;
        const productHTML = `
            <div class="col">
                <div class="card h-100 shadow-sm border-0 product-card">
                    <img src="${resolveProductImageUrl(product.imageUrl)}" class="card-img-top p-3" alt="${product.name}">
                    <div class="card-body text-center">
                        <h6 class="card-title text-truncate">${product.name}</h6>
                        <p class="text-danger fw-bold">${formatPrice(product.price)}</p>
                        <a href="Chi-tiet-san-pham.html?id=${productId}" class="btn btn-sm btn-outline-primary w-100">Xem chi tiết</a>
                    </div>
                </div>
            </div>
        `;
        productList.innerHTML += productHTML;
    });
}

async function fetchProducts(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Không tải được dữ liệu sản phẩm");
    }
    return response.json();
}

async function loadProductsByBrand(brand) {
    currentBrand = brand;
    const endpoint = brand === "all"
        ? API_PRODUCTS_URL
        : `${API_PRODUCTS_URL}/brand/${encodeURIComponent(brand)}`;

    try {
        const products = await fetchProducts(endpoint);
        renderProducts(products);
    } catch (error) {
        console.error(error);
        renderProducts([]);
    }
}

async function searchProducts(keyword) {
    const normalizedKeyword = (keyword || "").trim();

    if (!normalizedKeyword) {
        await loadProductsByBrand(currentBrand);
        return;
    }

    try {
        const results = await fetchProducts(`${API_PRODUCTS_URL}/search?keyword=${encodeURIComponent(normalizedKeyword)}`);
        if (currentBrand === "all") {
            renderProducts(results);
            return;
        }

        const filtered = results.filter((item) =>
            (item.brand || "").toLowerCase() === currentBrand.toLowerCase()
        );
        renderProducts(filtered);
    } catch (error) {
        console.error(error);
        renderProducts([]);
    }
}

function setupBrandFilters() {
    const filterContainer = document.getElementById("brand-filters");
    if (!filterContainer) {
        return;
    }

    const buttons = filterContainer.querySelectorAll("button[data-brand]");
    buttons.forEach((button) => {
        button.addEventListener("click", async () => {
            const selectedBrand = button.getAttribute("data-brand") || "all";
            setActiveBrandButton(selectedBrand);
            updateBrandQuery(selectedBrand);

            const searchInput = document.getElementById("search-input");
            const keyword = searchInput ? searchInput.value.trim() : "";

            currentBrand = selectedBrand;
            if (keyword) {
                await searchProducts(keyword);
            } else {
                await loadProductsByBrand(selectedBrand);
            }
        });
    });
}

function setupSearchForm() {
    const searchForm = document.getElementById("search-form");
    const searchInput = document.getElementById("search-input");
    if (!searchForm || !searchInput) {
        return;
    }

    searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await searchProducts(searchInput.value);
        scrollToProductSection();
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    setupAuthMenu();
    setupBrandFilters();
    setupSearchForm();

    const initialBrand = getInitialBrandFromQuery();
    setActiveBrandButton(initialBrand);
    await loadProductsByBrand(initialBrand);
});