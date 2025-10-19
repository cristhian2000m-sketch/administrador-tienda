// ==========================
// CONFIGURACIÓN DE FIREBASE
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6sJjzSOnKji7D0CNRSH2pRESn3p4NpJM",
  authDomain: "tienda-online-3d420.firebaseapp.com",
  projectId: "tienda-online-3d420",
  storageBucket: "tienda-online-3d420.appspot.com",
  messagingSenderId: "216625779843",
  appId: "1:216625779843:web:b75a9623dadba64af7f7b6",
  measurementId: "G-5TYC2RC333"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================
// SISTEMA DE AUTENTICACIÓN
// ==========================
const CREDENTIALS = {
  username: "admin",
  password: "sneaker2024"
};

const loginPage = document.getElementById("loginPage");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

// Verificar si ya está logueado al cargar la página
function checkAuth() {
  const isLoggedIn = sessionStorage.getItem("isAdminLoggedIn");
  if (isLoggedIn === "true") {
    showAdminPanel();
  } else {
    showLoginPage();
  }
}

function showLoginPage() {
  loginPage.style.display = "flex";
  adminPanel.classList.remove("active");
}

function showAdminPanel() {
  loginPage.style.display = "none";
  adminPanel.classList.add("active");
  // Inicializar el panel de administración
  initializeAdminPanel();
}

// Manejar el envío del formulario de login
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    // Login exitoso
    sessionStorage.setItem("isAdminLoggedIn", "true");
    loginError.classList.remove("show");
    showToast("✅ Bienvenido al panel de administración", "success");
    showAdminPanel();
    loginForm.reset();
  } else {
    // Login fallido
    loginError.classList.add("show");
    setTimeout(() => {
      loginError.classList.remove("show");
    }, 3000);
  }
});

// Manejar el cierre de sesión
logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("isAdminLoggedIn");
  showToast("👋 Sesión cerrada correctamente", "success");
  showLoginPage();
});

// ==========================
// VARIABLES GLOBALES
// ==========================
const form = document.getElementById("addProductForm");
const productsList = document.getElementById("productsList");
const modal = document.getElementById("deleteModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");

let productToDeleteId = null;
let allProducts = [];
let currentFilter = "todos";

// ==========================
// FUNCIÓN PARA MOSTRAR TOAST
// ==========================
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === "success" ? "#4BB543" : "#FF3333"};
    color: #fff;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    z-index: 10000;
    font-weight: bold;
    opacity: 0;
    transform: translateX(50px);
    transition: all 0.4s ease;
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => document.body.removeChild(toast), 400);
  }, 3000);
}

// ==========================
// INICIALIZACIÓN DEL PANEL
// ==========================
function initializeAdminPanel() {
  console.log("🚀 Inicializando panel de administración...");
  loadAllProducts();
}

// ==========================
// CAMBIO DE SECCIONES
// ==========================
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const section = btn.dataset.section;
    document.querySelectorAll(".admin-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById(section).classList.add("active");

    if (section === "gestionar") renderProducts();
    if (section === "estadisticas") updateStats();
  });
});

// ==========================
// AGREGAR PRODUCTO
// ==========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("productName").value.trim();
  const priceValue = document.getElementById("productPrice").value;
  const category = document.getElementById("productCategory").value;
  const description = document.getElementById("productDescription").value.trim();
  const image = document.getElementById("productImage").value.trim() || "https://via.placeholder.com/300x300?text=Producto";

  // Validaciones
  if (!name || !priceValue || !category || !description) {
    showToast("❌ Todos los campos obligatorios deben completarse", "error");
    return;
  }

  const price = parseFloat(priceValue);
  if (isNaN(price) || price <= 0) {
    showToast("❌ El precio debe ser un número válido mayor a 0", "error");
    return;
  }

  // Normalizar categoría
  const normalizedCategory = category.toLowerCase();

  try {
    await addDoc(collection(db, "productos"), {
      nombre: name,
      precio: price,
      categoria: normalizedCategory,
      descripcion: description,
      imagen: image,
      fecha: new Date().toISOString()
    });

    console.log("✅ Producto agregado:", name);
    showToast(`✅ Producto "${name}" agregado correctamente`, "success");
    form.reset();

    // Recargar productos y actualizar vistas
    await loadAllProducts();
    renderProducts();
    updateStats();
  } catch (error) {
    console.error("❌ Error al agregar producto:", error);
    showToast("❌ Error al agregar producto. Revisa la consola.", "error");
  }
});

// ==========================
// CARGAR TODOS LOS PRODUCTOS
// ==========================
async function loadAllProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, "productos"));
    allProducts = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      if (data.nombre && data.precio && data.categoria) {
        allProducts.push({
          id: docSnap.id,
          nombre: data.nombre,
          precio: Number(data.precio),
          categoria: data.categoria.toLowerCase(),
          descripcion: data.descripcion || "Sin descripción",
          imagen: data.imagen || "https://via.placeholder.com/300x300?text=Producto",
          fecha: data.fecha || new Date().toISOString()
        });
      }
    });

    console.log(`📦 ${allProducts.length} productos cargados desde Firebase`);
    renderProducts();
    updateStats();
  } catch (error) {
    console.error("❌ Error al cargar productos:", error);
    showToast("❌ Error al cargar productos desde Firebase", "error");
  }
}

// ==========================
// RENDERIZAR PRODUCTOS CON FILTRO
// ==========================
function renderProducts() {
  const filteredProducts = currentFilter === "todos"
    ? allProducts
    : allProducts.filter(p => p.categoria === currentFilter);

  productsList.innerHTML = "";

  if (!filteredProducts.length) {
    productsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p>No hay productos disponibles en esta categoría</p>
      </div>
    `;
    return;
  }

  filteredProducts.forEach(product => {
    const card = document.createElement("div");
    card.classList.add("product-item");
    
    const badgeClass = `badge-${product.categoria}`;
    const categoryDisplay = product.categoria.charAt(0).toUpperCase() + product.categoria.slice(1);

    card.innerHTML = `
      <div class="product-image-preview">
        <img src="${product.imagen}" alt="${product.nombre}" 
             style="width:100%;height:100%;object-fit:cover;border-radius:10px;"
             onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">
      </div>
      <div class="product-details">
        <div class="product-header">
          <span class="product-name">${product.nombre}</span>
          <span class="product-category-badge ${badgeClass}">${categoryDisplay}</span>
        </div>
        <p class="product-description">${product.descripcion}</p>
        <p class="product-price">S/ ${product.precio.toFixed(2)}</p>
      </div>
      <div class="product-actions">
        <button class="btn-delete-product" data-id="${product.id}" title="Eliminar producto">
          🗑️ Eliminar
        </button>
      </div>
    `;
    productsList.appendChild(card);
  });

  // Agregar event listeners a los botones de eliminar
  productsList.querySelectorAll(".btn-delete-product").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const product = allProducts.find(p => p.id === id);
      productToDeleteId = id;
      
      const deleteMessage = document.getElementById("deleteMessage");
      if (product) {
        deleteMessage.textContent = `¿Estás seguro de que deseas eliminar "${product.nombre}"? Esta acción no se puede deshacer.`;
      }
      
      openDeleteModal();
    });
  });

  updateCategoryCounts();
}

// ==========================
// FILTROS POR CATEGORÍA
// ==========================
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentFilter = btn.dataset.category.toLowerCase();
    renderProducts();
  });
});

// ==========================
// CONTADORES DE CATEGORÍA
// ==========================
function updateCategoryCounts() {
  const categories = ["todos", "hombres", "mujeres", "ninos", "ninas"];
  
  categories.forEach(cat => {
    const countSpan = document.getElementById(`count-${cat}`);
    if (countSpan) {
      const count = cat === "todos"
        ? allProducts.length
        : allProducts.filter(p => p.categoria === cat).length;
      countSpan.textContent = count;
    }
  });
}

// ==========================
// MODAL DE ELIMINACIÓN
// ==========================
function openDeleteModal() {
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeDeleteModal() {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  productToDeleteId = null;
  
  const deleteMessage = document.getElementById("deleteMessage");
  deleteMessage.textContent = "¿Estás seguro de que deseas eliminar este producto?";
}

cancelDelete.addEventListener("click", closeDeleteModal);

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeDeleteModal();
  }
});

// ==========================
// ELIMINAR PRODUCTO
// ==========================
confirmDelete.addEventListener("click", async () => {
  if (!productToDeleteId) return;

  try {
    await deleteDoc(doc(db, "productos", productToDeleteId));
    
    console.log(`🗑️ Producto eliminado: ${productToDeleteId}`);
    showToast("🗑️ Producto eliminado correctamente", "success");
    
    await loadAllProducts();
    renderProducts();
    updateStats();
    closeDeleteModal();
  } catch (error) {
    console.error("❌ Error al eliminar producto:", error);
    showToast("❌ Error al eliminar producto. Revisa la consola.", "error");
  }
});

// ==========================
// ESTADÍSTICAS
// ==========================
function updateStats() {
  const totalProducts = document.getElementById("totalProducts");
  const totalHombres = document.getElementById("totalHombres");
  const totalMujeres = document.getElementById("totalMujeres");
  const totalNinos = document.getElementById("totalNinos");
  const totalNinas = document.getElementById("totalNinas");
  const avgPrice = document.getElementById("avgPrice");

  totalProducts.textContent = allProducts.length;
  totalHombres.textContent = allProducts.filter(p => p.categoria === "hombres").length;
  totalMujeres.textContent = allProducts.filter(p => p.categoria === "mujeres").length;
  totalNinos.textContent = allProducts.filter(p => p.categoria === "ninos").length;
  totalNinas.textContent = allProducts.filter(p => p.categoria === "ninas").length;

  const promedio = allProducts.length
    ? allProducts.reduce((acc, p) => acc + p.precio, 0) / allProducts.length
    : 0;

  avgPrice.textContent = `S/ ${promedio.toFixed(2)}`;
}

// ==========================
// INICIALIZACIÓN AL CARGAR
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Verificando autenticación...");
  checkAuth();
});