const STORAGE_KEY = 'moda-control-store-v1';

const fallbackProducts = [
  {
    id: 'fallback-campera',
    category: 'Abrigos',
    name: 'Campera Roma',
    size: 'M',
    price: 79000,
    stock: 2,
    image_url: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'fallback-jean',
    category: 'Pantalones',
    name: 'Jean Oslo',
    size: '38',
    price: 52000,
    stock: 7,
    image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'fallback-remera',
    category: 'Básicos',
    name: 'Remera Nube',
    size: 'S',
    price: 25000,
    stock: 1,
    image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
  },
];

const root = document.querySelector('#catalog-root');
const money = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function readProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const store = saved ? JSON.parse(saved) : null;
    const products = Array.isArray(store?.products) ? store.products : fallbackProducts;
    return products.filter((product) => Number(product.stock) > 0);
  } catch {
    return fallbackProducts.filter((product) => product.stock > 0);
  }
}

function productCard(product) {
  const imageUrl = safeImageUrl(product.image_url);
  const image = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover" loading="lazy" onerror="this.remove(); this.nextElementSibling.classList.remove('hidden')" />`
    : '';
  const message = `Hola, quiero consultar por la prenda ${product.name} en talle ${product.size}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return `
    <article class="overflow-hidden rounded-3xl border border-[#ded8cf] bg-[#fffdfa] shadow-[0_14px_35px_rgba(37,41,56,.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(37,41,56,.1)]">
      <div class="product-image image-fallback relative grid place-items-center text-[#773e31]">
        ${image}
        <div class="${imageUrl ? 'hidden' : ''} absolute inset-0 grid place-items-center text-sm font-semibold">Moda Control</div>
      </div>
      <div class="p-5">
        <p class="text-[11px] font-bold uppercase tracking-[.12em] text-[#a1a0a5]">${escapeHtml(product.category)}</p>
        <h2 class="mt-1 text-lg font-bold">${escapeHtml(product.name)}</h2>
        <div class="mt-4 flex items-end justify-between gap-3">
          <div><p class="text-xs text-[#73747b]">Talle</p><p class="font-semibold">${escapeHtml(product.size || 'Único')}</p></div>
          <p class="text-xl font-bold text-[#c95d40]">${money(product.price)}</p>
        </div>
        <a href="${whatsappUrl}" target="_blank" rel="noreferrer" class="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2e9d68] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95">
          <span aria-hidden="true">◌</span> Consultar por WhatsApp
        </a>
      </div>
    </article>
  `;
}

function render() {
  const products = readProducts();
  root.innerHTML = `
    <header class="border-b border-[#ded8cf] bg-[#252938] px-5 py-4 text-[#f8f3ec] sm:px-10">
      <div class="mx-auto max-w-6xl">
        <div class="flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-[#d86343] text-lg font-bold">M</span>
          <div><p class="serif text-2xl leading-none">Moda Control</p><p class="mt-1 text-[10px] uppercase tracking-[.18em] text-white/55">Tienda</p></div>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-10 sm:py-14">
      <div class="mb-9 max-w-2xl">
        <p class="text-xs font-bold uppercase tracking-[.14em] text-[#c95d40]">Prendas disponibles</p>
        <h1 class="serif mt-2 text-4xl leading-tight sm:text-5xl">Elegí tu próximo favorito.</h1>
        <p class="mt-3 text-sm leading-6 text-[#73747b]">Consultá por WhatsApp y te ayudamos con disponibilidad, medios de pago y entrega.</p>
      </div>
      ${
        products.length
          ? `<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${products.map(productCard).join('')}</div>`
          : `<div class="rounded-3xl border border-dashed border-[#c9c3ba] bg-white/50 px-5 py-16 text-center"><h2 class="font-bold">Estamos preparando la nueva colección</h2><p class="mx-auto mt-2 max-w-sm text-sm text-[#73747b]">No hay prendas disponibles en este momento. Volvé a consultar pronto.</p></div>`
      }
    </main>
  `;
}

render();
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) render();
});