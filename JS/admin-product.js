const API_URL = "http://localhost:8080/api/admin/products";
const PRODUCT_IMAGE_BASE_PATH = "/Du_an/HPB_FE/assets/image/";

document.addEventListener('DOMContentLoaded', () => {
    const user = window.AdminAuth?.requireAdmin();
    if (!user) return;
    window.AdminAuth.applyAdminName(user);
    window.AdminAuth.bindLogoutLinks();

    loadProducts();
});

function getAuthHeaders(withJson = false) {
    return window.AdminAuth.authHeaders(withJson);
}

function getProductName(product) {
    return product.name || product.productName || 'Sản phẩm';
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

// 2. Load danh sách sản phẩm & Thống kê
async function loadProducts() {
    try {
        const res = await fetch(API_URL, { headers: getAuthHeaders() });
        if (!res.ok) {
            throw new Error(`HTTP_${res.status}`);
        }
        const products = await res.json();
        
        renderTable(products);
        renderStats(products);
    } catch (err) {
        console.error("Lỗi kết nối BE:", err);
        if (err.message === 'HTTP_401' || err.message === 'HTTP_403') {
            alert('Phiên đăng nhập đã hết hạn hoặc không đủ quyền. Vui lòng đăng nhập lại.');
            window.location.href = 'Dang-nhap.html';
        }
    }
}

function renderTable(data) {
    const html = data.map(p => `
        <tr>
            <td class="text-secondary">#${p.productId}</td>
            <td><img src="${resolveProductImageUrl(p.imageUrl)}" class="product-img-td border"></td>
            <td class="fw-bold">${getProductName(p)}</td>
            <td><span class="badge badge-brand">${p.brand}</span></td>
            <td class="fw-bold">${Number(p.price || 0).toLocaleString('vi-VN')}đ</td>
            <td><span class="fw-bold ${p.stock < 5 ? 'text-danger' : ''}">${p.stock}</span></td>
            <td class="text-end">
                <button class="btn btn-light btn-sm me-1" onclick="prepareEdit(${p.productId})"><i class="fa-solid fa-pen-to-square text-primary"></i></button>
                <button class="btn btn-light btn-sm" onclick="deleteProduct(${p.productId})"><i class="fa-solid fa-trash text-danger"></i></button>
            </td>
        </tr>
    `).join('');
    document.getElementById('productTableBody').innerHTML = html;
}

function renderStats(data) {
    document.getElementById('stat-total-products').innerText = data.length;
    const totalValue = data.reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.stock || 0)), 0);
    document.getElementById('stat-total-value').innerText = totalValue.toLocaleString('vi-VN') + 'đ';
    const brands = new Set(data.map(p => p.brand)).size;
    document.getElementById('stat-total-brands').innerText = brands;
}

// 3. Xử lý Thêm/Sửa/Xóa
async function deleteProduct(id) {
    if(confirm("Xóa cây vợt này khỏi hệ thống?")) {
        await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        loadProducts();
    }
}

// Hàm chuẩn bị dữ liệu cho Modal
function prepareAdd() {
    document.getElementById('modalTitle').innerText = "Thêm sản phẩm mới";
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = "";
}

async function prepareEdit(id) {
    const res = await fetch(`${API_URL}/${id}`, { headers: getAuthHeaders() });
    const p = await res.json();
    document.getElementById('modalTitle').innerText = "Chỉnh sửa sản phẩm";
    document.getElementById('productId').value = p.productId;
    document.getElementById('productName').value = getProductName(p);
    document.getElementById('brand').value = p.brand;
    document.getElementById('price').value = p.price;
    document.getElementById('stock').value = p.stock;
    document.getElementById('imageUrl').value = p.imageUrl;
    
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

// Gửi form (POST hoặc PUT)
document.getElementById('productForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const product = {
        name: document.getElementById('productName').value,
        brand: document.getElementById('brand').value,
        price: Number(document.getElementById('price').value),
        stock: Number(document.getElementById('stock').value),
        imageUrl: document.getElementById('imageUrl').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    await fetch(url, {
        method: method,
        headers: getAuthHeaders(true),
        body: JSON.stringify(product)
    });

    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    loadProducts();
};