const API_ORDER_URL = "http://localhost:8080/api/customer/orders";
const PRODUCT_IMAGE_BASE_PATH = "/Du_an/HPB_FE/assets/image/";
const SHIPPING_FEE = 50000;

function getCurrentUser() {
    try {
        const rawUser = localStorage.getItem("user");
        return rawUser ? JSON.parse(rawUser) : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function getAuthData() {
    const user = getCurrentUser();
    const token = localStorage.getItem("token");
    return { user, token };
}

function formatPrice(price) {
    const value = Number(price || 0);
    return `${value.toLocaleString("vi-VN")} ₫`;
}

function resolveImage(rawImageUrl) {
    const fallback = "https://via.placeholder.com/80x80?text=No+Image";
    if (!rawImageUrl) return fallback;
    const normalized = String(rawImageUrl).trim().replace(/^['\"]+|['\"]+$/g, "");
    if (!normalized) return fallback;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (normalized.startsWith("/")) return normalized;
    return `${PRODUCT_IMAGE_BASE_PATH}${normalized}`;
}

async function fetchCartItems() {
    const { user, token } = getAuthData();
    if (!user || !user.userId || !token) {
        throw new Error("Bạn cần đăng nhập trước khi thanh toán.");
    }

    const response = await fetch(`${API_ORDER_URL}/cart/${user.userId}`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Không tải được giỏ hàng");
    }

    return response.json();
}

function renderCheckoutItems(items) {
    const container = document.getElementById("checkout-items");
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = `<div class="text-secondary small">Giỏ hàng của bạn đang trống.</div>`;
        return;
    }

    container.innerHTML = items.map((item) => {
        const product = item.product || {};
        const quantity = Number(item.quantity || 0);
        const total = Number(product.price || 0) * quantity;
        return `
            <div class="checkout-item d-flex align-items-center py-3 border-bottom">
                <div class="item-img-circle me-3">
                    <img src="${resolveImage(product.imageUrl)}" alt="${product.name || "Sản phẩm"}">
                </div>
                <div class="flex-grow-1">
                    <h6 class="small fw-bold mb-1">${product.name || "Sản phẩm"}</h6>
                    <div class="small text-secondary">Số lượng: ${quantity}</div>
                </div>
                <div class="text-end">
                    <span class="fw-bold small">${formatPrice(total)}</span>
                </div>
            </div>
        `;
    }).join("");
}

function updateSummary(items) {
    const subtotal = items.reduce((sum, item) => {
        const price = Number(item.product?.price || 0);
        const quantity = Number(item.quantity || 0);
        return sum + (price * quantity);
    }, 0);

    const total = subtotal + (items.length > 0 ? SHIPPING_FEE : 0);

    const subtotalEl = document.getElementById("checkout-subtotal");
    const shippingEl = document.getElementById("checkout-shipping");
    const totalEl = document.getElementById("checkout-total");

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (shippingEl) shippingEl.textContent = items.length > 0 ? formatPrice(SHIPPING_FEE) : formatPrice(0);
    if (totalEl) totalEl.textContent = formatPrice(total);
}

function getSelectedPaymentMethod() {
    const selected = document.querySelector('input[name="pay"]:checked');
    return selected ? selected.value : "COD";
}

function setupCheckoutSubmit() {
    const submitBtn = document.getElementById("checkout-submit");
    if (!submitBtn) return;

    submitBtn.addEventListener("click", async () => {
        const { user, token } = getAuthData();
        if (!user || !user.userId || !token) {
            alert("Bạn cần đăng nhập trước khi thanh toán.");
            window.location.href = "Dang-nhap.html";
            return;
        }

        const addressInput = document.getElementById("checkout-address");
        const phoneInput = document.getElementById("checkout-phone");

        const address = (addressInput?.value || "").trim();
        const phone = (phoneInput?.value || "").trim();

        if (!address || !phone) {
            alert("Vui lòng nhập đầy đủ địa chỉ và số điện thoại.");
            return;
        }

        const payload = {
            userId: user.userId,
            paymentMethod: getSelectedPaymentMethod(),
            address,
            phone
        };

        try {
            const response = await fetch(`${API_ORDER_URL}/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Không thể thanh toán");
            }

            alert("Đặt hàng thành công!");
            window.location.href = "Don-mua.html";
        } catch (error) {
            console.error(error);
            alert(error.message || "Có lỗi khi thanh toán.");
        }
    });
}

async function initializeCheckout() {
    try {
        const items = await fetchCartItems();
        renderCheckoutItems(items);
        updateSummary(items);

        const submitBtn = document.getElementById("checkout-submit");
        if (submitBtn && (!Array.isArray(items) || items.length === 0)) {
            submitBtn.disabled = true;
        }
    } catch (error) {
        console.error(error);
        const container = document.getElementById("checkout-items");
        if (container) {
            container.innerHTML = `<div class="text-danger small">${error.message}</div>`;
        }

        const submitBtn = document.getElementById("checkout-submit");
        if (submitBtn) submitBtn.disabled = true;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    setupCheckoutSubmit();
    await initializeCheckout();
});
