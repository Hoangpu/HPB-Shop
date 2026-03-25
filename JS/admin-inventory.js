const INV_API = "http://localhost:8080/api/admin/inventory";
const PRODUCT_IMAGE_BASE_PATH = '/Du_an/HPB_FE/assets/image/';
let inventoryData = []; 

document.addEventListener('DOMContentLoaded', () => {
    const user = window.AdminAuth?.requireAdmin();
    if (!user) return;
    window.AdminAuth.applyAdminName(user);
    window.AdminAuth.bindLogoutLinks();

    loadAllInventory();

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    // Hàm thực hiện tìm kiếm chung
    const doSearch = () => {
        const keyword = searchInput.value.toLowerCase().trim();
        const filtered = inventoryData.filter(p => 
            getProductName(p).toLowerCase().includes(keyword) || 
            (p.brand && p.brand.toLowerCase().includes(keyword))
        );
        renderInventoryTable(filtered);
    };

    // 1. TÌM KIẾM KHI BẤM KÍNH LÚP
    if (searchBtn) {
        searchBtn.addEventListener('click', doSearch);
    }

    // 2. TÌM KIẾM KHI ĐANG GÕ (Hoặc nhấn Enter)
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') doSearch();
            else doSearch(); // Gõ đến đâu tìm đến đó
        });
    }

    // --- XỬ LÝ NHẬP HÀNG ---
    document.getElementById('importForm').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            productId: parseInt(document.getElementById('importProductId').value),
            amount: parseInt(document.getElementById('importAmount').value),
            reason: document.getElementById('importReason').value
        };

        try {
            const res = await fetch(`${INV_API}/import`, {
                method: 'POST',
                headers: getAuthHeaders(true),
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Nhập kho thành công!");
                bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
                loadAllInventory(); 
            }
        } catch (err) {
            alert("Lỗi kết nối Backend rồi!");
        }
    };
});

function getAuthHeaders(withJson = false) {
    return window.AdminAuth.authHeaders(withJson);
}

function getProductName(product) {
    return product?.name || product?.productName || 'Sản phẩm';
}

function resolveProductImageUrl(rawImageUrl) {
    const fallback = 'https://via.placeholder.com/120x120?text=No+Image';
    if (!rawImageUrl) return fallback;

    const normalized = String(rawImageUrl).trim().replace(/^['\"]+|['\"]+$/g, '');
    if (!normalized) return fallback;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (normalized.startsWith('/')) return normalized;

    return `${PRODUCT_IMAGE_BASE_PATH}${normalized}`;
}

async function loadAllInventory() {
    try {
        // Tải KPI
        const statsRes = await fetch(`${INV_API}/stats`, { headers: getAuthHeaders() });
        if (!statsRes.ok) throw new Error(`HTTP_${statsRes.status}`);
        const stats = await statsRes.json();
        document.getElementById('total-products-kpi').innerText = stats.totalProducts;
        document.getElementById('low-stock-kpi').innerText = stats.lowStockCount;
        document.getElementById('total-stock-kpi').innerText = stats.totalStock;

        // Tải Sản phẩm
        const prodRes = await fetch(`${INV_API}/products`, { headers: getAuthHeaders() });
        if (!prodRes.ok) throw new Error(`HTTP_${prodRes.status}`);
        inventoryData = await prodRes.json();
        renderInventoryTable(inventoryData);
        fillProductSelect(inventoryData);

        // Tải Lịch sử
        const logRes = await fetch(`${INV_API}/logs`, { headers: getAuthHeaders() });
        if (!logRes.ok) throw new Error(`HTTP_${logRes.status}`);
        const logs = await logRes.json();
        renderLogTable(logs);
    } catch (e) {
        console.error("Lỗi load dữ liệu:", e);
        if (e.message === 'HTTP_401' || e.message === 'HTTP_403') {
            alert('Phiên đăng nhập đã hết hạn hoặc không đủ quyền. Vui lòng đăng nhập lại.');
            window.location.href = 'Dang-nhap.html';
            return;
        }
        alert('Không tải được dữ liệu kho. Kiểm tra backend đã chạy chưa.');
    }
}

function renderInventoryTable(data) {
    const html = data.map(p => `
        <tr>
            <td class="ps-4">#${p.productId}</td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${resolveProductImageUrl(p.imageUrl)}" width="40" class="rounded border me-2">
                    <span class="fw-bold">${getProductName(p)}</span>
                </div>
            </td>
            <td>${p.brand}</td>
            <td class="fw-bold">${p.stock}</td>
            <td>
                <span class="badge ${p.stock < 5 ? 'bg-danger-light text-danger' : 'bg-success-light text-success'} fs-6">
                    ${p.stock < 5 ? 'Sắp hết' : 'Ổn định'}
                </span>
            </td>
            <td class="text-end pe-4">
                <button class="btn btn-primary btn-xs fs-6" onclick="openImportModal(${p.productId})">Nhập hàng</button>
            </td>
        </tr>
    `).join('');
    document.getElementById('inventoryTableBody').innerHTML = html;
}

function renderLogTable(logs) {
    if (!Array.isArray(logs) || logs.length === 0) {
        document.getElementById('logTableBody').innerHTML = '<tr><td colspan="5" class="text-center py-4 text-secondary">Chưa có lịch sử biến động kho.</td></tr>';
        return;
    }

    const html = logs.map(l => `
        <tr>
            <td class="ps-4 text-secondary x-small">${new Date(l.createdAt).toLocaleString()}</td>
            <td class="fw-bold">${l.product ? getProductName(l.product) : 'N/A'}</td>
            <td class="${l.changeAmount > 0 ? 'text-success' : 'text-danger'} fw-bold">
                ${l.changeAmount > 0 ? '+' : ''}${l.changeAmount}
            </td>
            <td>
                <span class="badge ${l.changeAmount > 0 ? 'bg-success-light text-success' : 'bg-danger-light text-danger'} x-small">
                    <i class="fa-solid ${l.changeAmount > 0 ? 'fa-arrow-right-to-bracket' : 'fa-cart-shopping'} me-1"></i>
                    ${l.changeAmount > 0 ? 'Nhập kho' : 'Bán hàng'}
                </span>
            </td>
            <td class="text-secondary x-small pe-4">${l.reason || 'N/A'}</td>
        </tr>
    `).join('');
    document.getElementById('logTableBody').innerHTML = html;
}

function fillProductSelect(data) {
    const select = document.getElementById('importProductId');
    select.innerHTML = data.map(p => `<option value="${p.productId}">${getProductName(p)}</option>`).join('');
}

// Hàm bổ trợ để mở modal nhập hàng cho 1 sản phẩm cụ thể
function openImportModal(id) {
    document.getElementById('importProductId').value = id;
    new bootstrap.Modal(document.getElementById('importModal')).show();
}