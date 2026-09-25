import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Banknote, Bell, Boxes, Check, CircleDollarSign, Clock3,
  LayoutDashboard, Menu, Package, Plus, Receipt, Search, Shirt, ShoppingBag, Trash2,
  TrendingUp, UserRound, UsersRound, X, type LucideIcon,
} from 'lucide-react';

type View = 'dashboard' | 'sales' | 'customers' | 'inventory' | 'expenses';
type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Mercado Pago';
type SaleStatus = 'Cobrado' | 'Pendiente' | 'Seña / Pago Parcial';
type Customer = { id: string; name: string; phone: string; notes: string; createdAt: string };
type Product = { id: string; category: string; name: string; size: string; cost: number; price: number; stock: number; image_url?: string };
type SaleItem = { productId: string; productName: string; size: string; detail?: string; quantity: number; unitPrice: number };
type SaleFormItem = { productId: string; productName: string; size: string; detail: string; quantity: string; unitPrice: string; productSearch: string };
type Sale = {
  id: string; date: string; customerId: string; customerName: string; productId: string;
  productName: string; size: string; quantity: number; unitPrice: number; method: PaymentMethod;
  status: SaleStatus; paidAmount: number; items?: SaleItem[]; total?: number; saldoPendiente?: number;
};
type Expense = { id: string; date: string; concept: string; category: string; amount: number };
type Store = { customers: Customer[]; products: Product[]; sales: Sale[]; expenses: Expense[] };

const STORAGE_KEY = 'moda-control-store-v1';
const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
const dateLabel = (value: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`)).replace('.', '');
const fullDate = (value: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const todayLabel = () => new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const saleItems = (sale: Sale): SaleItem[] => sale.items?.length ? sale.items : [{ productId: sale.productId, productName: sale.productName, size: sale.size, quantity: sale.quantity, unitPrice: sale.unitPrice }];
const saleTotal = (sale: Sale) => sale.total ?? saleItems(sale).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
const saleBalance = (sale: Sale) => Math.max(0, saleTotal(sale) - sale.paidAmount);

const demoStore: Store = {
  customers: [
    { id: 'c-1', name: 'Lucía Benítez', phone: '11 5840 2291', notes: 'Prefiere avisos por WhatsApp.', createdAt: '2024-05-08' },
    { id: 'c-2', name: 'Micaela Ríos', phone: '11 4021 7718', notes: 'Talle M · Retira por el showroom.', createdAt: '2024-05-12' },
    { id: 'c-3', name: 'Sofía Acosta', phone: '11 6190 3428', notes: '', createdAt: '2024-05-17' },
    { id: 'c-4', name: 'Carla Duarte', phone: '11 5522 0684', notes: 'Cliente frecuente.', createdAt: '2024-05-19' },
  ],
  products: [
    { id: 'p-1', category: 'Abrigos', name: 'Campera Roma', size: 'M', cost: 42000, price: 79000, stock: 2, image_url: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=800&q=80' },
    { id: 'p-2', category: 'Pantalones', name: 'Jean Oslo', size: '38', cost: 26000, price: 52000, stock: 7, image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80' },
    { id: 'p-3', category: 'Básicos', name: 'Remera Nube', size: 'S', cost: 11500, price: 25000, stock: 1, image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80' },
    { id: 'p-4', category: 'Tejidos', name: 'Sweater Roma', size: 'Único', cost: 29000, price: 59000, stock: 4, image_url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80' },
    { id: 'p-5', category: 'Accesorios', name: 'Cartera Mini', size: 'Único', cost: 18000, price: 41000, stock: 0, image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80' },
  ],
  sales: [
    { id: 's-1', date: '2024-05-24', customerId: 'c-1', customerName: 'Lucía Benítez', productId: 'p-1', productName: 'Campera Roma', size: 'M', quantity: 1, unitPrice: 79000, method: 'Transferencia', status: 'Cobrado', paidAmount: 79000 },
    { id: 's-2', date: '2024-05-23', customerId: 'c-2', customerName: 'Micaela Ríos', productId: 'p-2', productName: 'Jean Oslo', size: '38', quantity: 1, unitPrice: 52000, method: 'Efectivo', status: 'Pendiente', paidAmount: 20000 },
    { id: 's-3', date: '2024-05-22', customerId: 'c-3', customerName: 'Sofía Acosta', productId: 'p-3', productName: 'Remera Nube', size: 'S', quantity: 2, unitPrice: 25000, method: 'Mercado Pago', status: 'Cobrado', paidAmount: 50000 },
    { id: 's-4', date: '2024-05-20', customerId: 'c-4', customerName: 'Carla Duarte', productId: 'p-4', productName: 'Sweater Roma', size: 'Único', quantity: 1, unitPrice: 59000, method: 'Efectivo', status: 'Pendiente', paidAmount: 0 },
    { id: 's-5', date: '2024-05-18', customerId: 'c-1', customerName: 'Lucía Benítez', productId: 'p-2', productName: 'Jean Oslo', size: '38', quantity: 1, unitPrice: 52000, method: 'Transferencia', status: 'Cobrado', paidAmount: 52000 },
  ],
  expenses: [
    { id: 'e-1', date: '2024-05-23', concept: 'Compra mayorista · Nueva temporada', category: 'Mercadería', amount: 88000 },
    { id: 'e-2', date: '2024-05-21', concept: 'Envíos y cadetería', category: 'Logística', amount: 7200 },
    { id: 'e-3', date: '2024-05-18', concept: 'Packaging', category: 'Insumos', amount: 12900 },
  ],
};

function useStore() {
  const [store, setStore] = useState<Store>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return demoStore;
    const parsed = JSON.parse(saved) as Store;
    return {
      ...parsed,
      products: parsed.products.map((product) => ({
        ...product,
        image_url: product.image_url || demoStore.products.find((demoProduct) => demoProduct.id === product.id)?.image_url || '',
      })),
    };
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store]);
  return [store, setStore] as const;
}

function Button({ children, variant = 'primary', className = '', onClick, type = 'button', disabled = false, title }: {
  children: ReactNode; variant?: 'primary' | 'outline' | 'ghost' | 'soft' | 'danger'; className?: string; onClick?: () => void;
  type?: 'button' | 'submit'; disabled?: boolean; title?: string;
}) {
  const styles = {
    primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-95 shadow-sm',
    outline: 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
    ghost: 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
    soft: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:brightness-95',
    danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };
  return <button data-testid={`button-${title?.toLowerCase().replaceAll(' ', '-') || 'action'}`} title={title} type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]">{label}</span>{children}{hint && <span className="block text-xs text-[hsl(var(--muted-foreground))]">{hint}</span>}</label>;
}
function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] transition focus:border-[hsl(var(--primary))] ${className}`} />;
}
function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] ${className}`}>{children}</select>;
}
function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full resize-none rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] ${className}`} />;
}
function Modal({ open, title, onClose, children, width = 'max-w-xl' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; width?: string }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(224_28%_19%/.42)] p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`fade-in max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.5rem] bg-[hsl(var(--card))] p-5 shadow-2xl sm:rounded-[1.5rem] sm:p-7 ${width}`} role="dialog" aria-modal="true">
      <div className="mb-6 flex items-start justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.13em] text-[hsl(var(--primary))]">KINSH1P</p><h2 className="serif text-3xl text-[hsl(var(--foreground))]">{title}</h2></div><button data-testid="button-close-modal" onClick={onClose} className="rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" aria-label="Cerrar"><X size={20} /></button></div>
      {children}
    </div>
  </div>;
}
function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'green' | 'orange' | 'neutral' | 'red' }) {
  const tones = { green: 'bg-emerald-100 text-emerald-800', orange: 'bg-orange-100 text-orange-800', neutral: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]', red: 'bg-red-100 text-red-800' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}
function EmptyState({ icon: Icon, title, detail, action }: { icon: LucideIcon; title: string; detail: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] px-5 py-12 text-center"><div className="mb-3 rounded-2xl bg-[hsl(var(--muted))] p-3 text-[hsl(var(--primary))]"><Icon size={24} /></div><h3 className="font-bold">{title}</h3><p className="mt-1 max-w-xs text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function ProductPhoto({ product, className = 'h-12 w-12' }: { product: Product; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f5dfd1] text-[#773e31] ${className}`}>
    {product.image_url && !failed ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" onError={() => setFailed(true)} /> : <Shirt size={20} />}
  </div>;
}

const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'sales', label: 'Ventas y cobros', icon: ShoppingBag },
  { id: 'customers', label: 'Clientes y deudas', icon: UsersRound },
  { id: 'inventory', label: 'Inventario', icon: Boxes },
  { id: 'expenses', label: 'Gastos y compras', icon: Receipt },
];

function Sidebar({ view, setView, open, onClose }: { view: View; setView: (v: View) => void; open: boolean; onClose: () => void }) {
  return <aside className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col px-4 py-5 transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="mb-9 flex items-center justify-between px-3"><div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-lg font-bold text-[hsl(var(--sidebar-primary-foreground))]">K</span><span className="serif text-[25px]">KINSH1P</span></div><p className="mt-2 pl-11 text-[10px] uppercase tracking-[.19em] text-[hsl(var(--sidebar-foreground)/.55)]">Tu negocio, a mano</p></div><button data-testid="button-close-sidebar" onClick={onClose} className="rounded-lg p-1 text-[hsl(var(--sidebar-foreground)/.65)] hover:bg-white/10 lg:hidden"><X size={18} /></button></div>
    <nav className="space-y-1">{navItems.map(({ id, label, icon: Icon }) => <button data-testid={`nav-${id}`} key={id} onClick={() => { setView(id); onClose(); }} className={`nav-pill flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${view === id ? 'bg-white/13 text-[hsl(var(--sidebar-foreground))] shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-white/7 hover:text-[hsl(var(--sidebar-foreground))]'}`}><Icon size={18} strokeWidth={view === id ? 2.5 : 1.8} /><span>{label}</span>{id === 'customers' && <span className="ml-auto h-2 w-2 rounded-full bg-[hsl(var(--sidebar-primary))]" />}</button>)}</nav>
    <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.06] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--sidebar-foreground)/.55)]">Esta semana</span><TrendingUp size={15} className="text-[hsl(var(--sidebar-primary))]" /></div><p className="text-2xl font-bold">$ 186.400</p><p className="mt-1 text-xs text-[hsl(var(--sidebar-foreground)/.52)]">+12,4% vs. semana anterior</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-[hsl(var(--sidebar-primary))]" /></div></div>
    <a href="./tienda.html" target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-[hsl(var(--sidebar-foreground)/.78)] transition hover:bg-white/10 hover:text-white">Ver catálogo en vivo</a><p className="mt-5 px-3 text-[11px] text-[hsl(var(--sidebar-foreground)/.38)]">Hecho para vender con calma.</p>
  </aside>;
}

function Header({ view, onMenu, onAdd }: { view: View; onMenu: () => void; onAdd: () => void }) {
  const title = navItems.find((item) => item.id === view)?.label || 'Resumen';
  const subtitles: Record<View, string> = { dashboard: 'Una mirada clara a tu negocio.', sales: 'Registrá cada venta sin perder ritmo.', customers: 'Personas, cuentas y confianza.', inventory: 'Lo que hay, lo que falta, lo que se mueve.', expenses: 'Cada peso en su lugar.' };
  return <header className="mb-7 flex items-start justify-between gap-3"><div className="flex items-start gap-3"><button data-testid="button-open-sidebar" onClick={onMenu} className="mt-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5 lg:hidden"><Menu size={19} /></button><div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-[hsl(var(--primary))]"><span className="hidden sm:inline">{todayLabel()}</span><span className="h-1 w-1 rounded-full bg-[hsl(var(--primary))]" /><span>Mi negocio</span></div><h1 className="serif text-[2.15rem] leading-none tracking-[-.02em] sm:text-[2.75rem]">{title}</h1><p className="mt-2 text-sm text-white/65">{subtitles[view]}</p></div></div><div className="flex items-center gap-2"><button data-testid="button-notifications" className="relative hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] sm:block" aria-label="Notificaciones"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" /></button><Button title="nuevo registro" onClick={onAdd} className="hidden sm:inline-flex"><Plus size={17} /> Nuevo registro</Button></div></header>;
}

function StatCard({ label, value, detail, icon: Icon, color, trend }: { label: string; value: string; detail: string; icon: LucideIcon; color: string; trend?: 'up' | 'down' }) {
  return <div className={`paper-card rise-in rounded-2xl p-5 ${color}`}><div className="mb-5 flex items-start justify-between"><span className="rounded-xl bg-white/55 p-2.5"><Icon size={19} /></span>{trend && <span className={`flex items-center gap-1 text-xs font-bold ${trend === 'up' ? 'text-emerald-700' : 'text-red-700'}`}>{trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{trend === 'up' ? 'saludable' : 'a revisar'}</span>}</div><p className="text-xs font-bold uppercase tracking-[.1em] opacity-65">{label}</p><p className="mt-1 text-[1.7rem] font-bold tracking-tight">{value}</p><p className="mt-1 text-xs opacity-65">{detail}</p></div>;
}

function Dashboard({ store, setView }: { store: Store; setView: (v: View) => void }) {
  const collected = store.sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
  const expenses = store.expenses.reduce((sum, item) => sum + item.amount, 0);
  const receivable = store.sales.reduce((sum, sale) => sum + saleBalance(sale), 0);
  const profit = collected - expenses;
  const byDay = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => ({ day, income: [38, 56, 32, 72, 48, 89, 62][index], expense: [24, 31, 28, 42, 35, 25, 30][index] }));
  const recent = [...store.sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  return <div className="space-y-6 fade-in"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total cobrado" value={money(collected)} detail="Ventas efectivamente cobradas" icon={Banknote} color="bg-[#dbece0] text-[#244d3b]" trend="up" /><StatCard label="Total gastos" value={money(expenses)} detail={`${store.expenses.length} movimientos registrados`} icon={Receipt} color="bg-[#f5dfd1] text-[#773e31]" trend="down" /><StatCard label="Deudas por cobrar" value={money(receivable)} detail={`${store.sales.filter((s) => saleBalance(s) > 0).length} ventas pendientes`} icon={Clock3} color="bg-[#e9e0f0] text-[#574064]" /><StatCard label="Ganancia neta" value={money(profit)} detail="Cobrado menos gastos" icon={TrendingUp} color="bg-[#f1e5ad] text-[#64551b]" trend={profit > 0 ? 'up' : 'down'} /></div>
     <div className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]"><section className="paper-card rounded-2xl p-5 sm:p-6"><div className="mb-7 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Movimiento de caja</p><h2 className="serif mt-1 text-2xl">Ingresos vs. gastos</h2></div><Select aria-label="Período" className="w-auto py-2 text-xs"><option>Últimos 7 días</option><option>Este mes</option></Select></div><div className="flex h-[190px] items-end justify-between gap-2 border-b border-[hsl(var(--border))] px-1 sm:px-3">{byDay.map((item) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={item.day}><div className="flex h-[150px] w-full max-w-[45px] items-end justify-center gap-1"><div className="w-[43%] rounded-t-md bg-[hsl(var(--primary))]" style={{ height: `${item.income}%` }} title={`Ingresos ${item.income}`} /><div className="w-[43%] rounded-t-md bg-[#9ebbb2]" style={{ height: `${item.expense}%` }} title={`Gastos ${item.expense}`} /></div><span className="mb-[-24px] text-[11px] text-[hsl(var(--muted-foreground))]">{item.day}</span></div>)}</div><div className="mt-8 flex gap-5 text-xs font-medium text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />Ingresos</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#9ebbb2]" />Gastos</span></div></section>
       <section className="paper-card rounded-2xl p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Últimos movimientos</p><h2 className="serif mt-1 text-2xl">Actividad reciente</h2></div><button data-testid="link-see-sales" onClick={() => setView('sales')} className="text-xs font-bold text-[hsl(var(--primary))] hover:underline">Ver todo</button></div><div className="space-y-1">{recent.length ? recent.map((sale) => <div className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-[hsl(var(--muted))]" key={sale.id}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1e5ad] text-[#64551b]"><ShoppingBag size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{sale.productName}</p><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{sale.customerName} · {dateLabel(sale.date)}</p></div><div className="text-right"><p className="text-sm font-bold">{money(sale.paidAmount)}</p><Badge tone={sale.status === 'Cobrado' ? 'green' : 'orange'}>{sale.status}</Badge></div></div>) : <EmptyState icon={CircleDollarSign} title="Todavía no hay movimientos" detail="Tus ventas recientes van a aparecer acá." />}</div></section></div>
    <div className="grid gap-5 md:grid-cols-3"><button data-testid="quick-new-sale" onClick={() => setView('sales')} className="group flex items-center gap-4 rounded-2xl bg-[hsl(var(--primary))] p-5 text-left text-[hsl(var(--primary-foreground))] transition hover:-translate-y-0.5"><span className="rounded-xl bg-white/20 p-3"><Plus size={20} /></span><span><b className="block">Registrar una venta</b><small className="mt-1 block opacity-75">Anotá una prenda y su cobro</small></span><ArrowUpRight className="ml-auto transition group-hover:translate-x-1 group-hover:-translate-y-1" size={18} /></button><button data-testid="quick-new-expense" onClick={() => setView('expenses')} className="group flex items-center gap-4 rounded-2xl bg-[#dbece0] p-5 text-left text-[#244d3b] transition hover:-translate-y-0.5"><span className="rounded-xl bg-white/55 p-3"><Receipt size={20} /></span><span><b className="block">Cargar un gasto</b><small className="mt-1 block opacity-75">Ordená tus egresos del día</small></span><ArrowUpRight className="ml-auto transition group-hover:translate-x-1 group-hover:-translate-y-1" size={18} /></button><button data-testid="quick-new-product" onClick={() => setView('inventory')} className="group flex items-center gap-4 rounded-2xl bg-[#e9e0f0] p-5 text-left text-[#574064] transition hover:-translate-y-0.5"><span className="rounded-xl bg-white/55 p-3"><Package size={20} /></span><span><b className="block">Sumar una prenda</b><small className="mt-1 block opacity-75">Mantené el stock al día</small></span><ArrowUpRight className="ml-auto transition group-hover:translate-x-1 group-hover:-translate-y-1" size={18} /></button></div>
  </div>;
}
function LegacySales({ store, setStore, openForm, setOpenForm }: { store: Store; setStore: React.Dispatch<React.SetStateAction<Store>>; openForm: boolean; setOpenForm: (v: boolean) => void }) {
  const [statusFilter, setStatusFilter] = useState<'Todos' | SaleStatus>('Todos');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [saleForm, setSaleForm] = useState({ date: today(), customerName: '', customerPhone: '', productId: '', productName: '', size: '', quantity: '1', unitPrice: '', method: 'Efectivo' as PaymentMethod, status: 'Cobrado' as SaleStatus });
  const filtered = store.sales.filter((sale) => (statusFilter === 'Todos' || sale.status === statusFilter) && (!dateFilter || sale.date === dateFilter) && (!query || `${sale.productName} ${sale.customerName}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => b.date.localeCompare(a.date));
  const chosenProduct = store.products.find((p) => p.id === saleForm.productId);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const customerName = saleForm.customerName.trim();
    const customerPhone = saleForm.customerPhone.trim();
    const quantity = Number(saleForm.quantity); const unitPrice = Number(saleForm.unitPrice);
    if (!customerName || !saleForm.productName || !quantity || !unitPrice) return;
    const total = quantity * unitPrice;
    setStore((prev) => {
      const existingCustomer = prev.customers.find((customer) => customer.name.trim().toLowerCase() === customerName.toLowerCase());
      const customerId = existingCustomer?.id || uid('c');
      const customers = existingCustomer
        ? prev.customers.map((customer) => customer.id === existingCustomer.id && customerPhone ? { ...customer, phone: customerPhone } : customer)
        : [{ id: customerId, name: customerName, phone: customerPhone, notes: '', createdAt: today() }, ...prev.customers];
      return {
        ...prev,
        customers,
        sales: [{ id: uid('s'), date: saleForm.date, customerId, customerName: existingCustomer?.name || customerName, productId: saleForm.productId, productName: saleForm.productName, size: saleForm.size, quantity, unitPrice, method: saleForm.method, status: saleForm.status, paidAmount: saleForm.status === 'Cobrado' ? total : 0 }, ...prev.sales],
        products: saleForm.productId ? prev.products.map((p) => p.id === saleForm.productId ? { ...p, stock: Math.max(0, p.stock - quantity) } : p) : prev.products,
      };
    });
    setSaleForm({ date: today(), customerName: '', customerPhone: '', productId: '', productName: '', size: '', quantity: '1', unitPrice: '', method: 'Efectivo', status: 'Cobrado' }); setOpenForm(false);
  };
  const selectProduct = (id: string) => { const p = store.products.find((item) => item.id === id); setSaleForm((f) => ({ ...f, productId: id, productName: p?.name || '', size: p?.size || '', unitPrice: p ? String(p.price) : '' })); };
  return <div className="space-y-5 fade-in"><div className="paper-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center"><div className="relative flex-1"><Search size={17} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" /><Input data-testid="input-search-sales" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente o prenda..." className="pl-10" /></div><div className="flex gap-2 overflow-x-auto"><Select data-testid="select-sales-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="min-w-[136px]"><option>Todos</option><option>Cobrado</option><option>Pendiente</option></Select><Input data-testid="input-sales-date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="min-w-[145px]" /></div></div><section className="paper-card overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><div><h2 className="font-bold">Historial de ventas</h2><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{filtered.length} registros encontrados</p></div><Button title="nueva venta" onClick={() => setOpenForm(true)}><Plus size={16} /> Nueva venta</Button></div>{filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[hsl(var(--muted)/.55)] text-xs uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]"><tr><th className="px-5 py-3 font-bold">Fecha</th><th className="px-5 py-3 font-bold">Cliente</th><th className="px-5 py-3 font-bold">Prenda</th><th className="px-5 py-3 font-bold">Pago</th><th className="px-5 py-3 text-right font-bold">Total</th><th className="px-5 py-3 text-right font-bold">Estado</th></tr></thead><tbody className="divide-y divide-[hsl(var(--border))]">{filtered.map((sale) => <tr className="transition hover:bg-[hsl(var(--muted)/.38)]" key={sale.id}><td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{dateLabel(sale.date)}</td><td className="px-5 py-4 font-semibold">{sale.customerName}</td><td className="px-5 py-4"><span className="font-semibold">{sale.productName}</span><span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">{sale.size} · x{sale.quantity}</span></td><td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{sale.method}</td><td className="px-5 py-4 text-right font-bold">{money(sale.quantity * sale.unitPrice)}</td><td className="px-5 py-4 text-right"><Badge tone={sale.status === 'Cobrado' ? 'green' : 'orange'}>{sale.status}{sale.status === 'Pendiente' && ` · ${money(sale.quantity * sale.unitPrice - sale.paidAmount)}`}</Badge></td></tr>)}</tbody></table></div> : <div className="p-5"><EmptyState icon={ShoppingBag} title="No encontramos ventas" detail="Probá cambiar los filtros o registrá una venta nueva." action={<Button title="nueva venta" onClick={() => setOpenForm(true)}><Plus size={16} /> Registrar venta</Button>} /></div>}</section>
     <Modal open={openForm} onClose={() => setOpenForm(false)} title="Registrar una venta"><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha"><Input data-testid="input-sale-date" type="date" required value={saleForm.date} onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })} /></Field><Field label="Nombre del Cliente"><Input data-testid="input-sale-customer-name" name="customer_name" required list="sale-customer-suggestions" value={saleForm.customerName} onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })} placeholder="Ej. Lucía Benítez" /><datalist id="sale-customer-suggestions">{store.customers.map((customer) => <option key={customer.id} value={customer.name} />)}</datalist></Field></div><Field label="Teléfono" hint="Opcional; se guarda si el cliente es nuevo o si actualizás su contacto."><Input data-testid="input-sale-customer-phone" name="customer_phone" type="tel" value={saleForm.customerPhone} onChange={(e) => setSaleForm({ ...saleForm, customerPhone: e.target.value })} placeholder="Ej. 11 5555 1234" /></Field><div className="grid gap-4 sm:grid-cols-[1.2fr_.8fr]"><Field label="Prenda del inventario"><Select data-testid="select-sale-product" value={saleForm.productId} onChange={(e) => selectProduct(e.target.value)}><option value="">Elegir o escribir abajo</option>{store.products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.size} · {p.stock} u.</option>)}</Select></Field><Field label="Talle"><Input data-testid="input-sale-size" value={saleForm.size} onChange={(e) => setSaleForm({ ...saleForm, size: e.target.value })} placeholder="Ej. M" /></Field></div><Field label="Producto / prenda" hint={chosenProduct ? `Precio sugerido: ${money(chosenProduct.price)}` : undefined}><Input data-testid="input-sale-product-name" required value={saleForm.productName} onChange={(e) => setSaleForm({ ...saleForm, productName: e.target.value })} placeholder="Ej. Campera Roma" /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Cantidad"><Input data-testid="input-sale-quantity" type="number" min="1" required value={saleForm.quantity} onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })} /></Field><Field label="Precio unitario"><Input data-testid="input-sale-price" type="number" min="0" required value={saleForm.unitPrice} onChange={(e) => setSaleForm({ ...saleForm, unitPrice: e.target.value })} placeholder="$" /></Field><Field label="Estado"><Select data-testid="select-sale-state" value={saleForm.status} onChange={(e) => setSaleForm({ ...saleForm, status: e.target.value as SaleStatus })}><option>Cobrado</option><option>Pendiente</option></Select></Field></div><Field label="Método de pago"><Select data-testid="select-sale-method" value={saleForm.method} onChange={(e) => setSaleForm({ ...saleForm, method: e.target.value as PaymentMethod })}><option>Efectivo</option><option>Transferencia</option><option>Mercado Pago</option></Select></Field><div className="flex justify-end gap-2 pt-2"><Button variant="outline" title="cancelar" onClick={() => setOpenForm(false)}>Cancelar</Button><Button title="guardar venta" type="submit"><Check size={16} /> Guardar venta</Button></div></form></Modal></div>;
}

function Sales({ store, setStore, openForm, setOpenForm }: { store: Store; setStore: React.Dispatch<React.SetStateAction<Store>>; openForm: boolean; setOpenForm: (v: boolean) => void }) {
  const emptyItem = (): SaleFormItem => ({ productId: '', productName: '', size: '', detail: '', quantity: '1', unitPrice: '', productSearch: '' });
  const initialForm = () => ({ date: today(), customerName: '', customerPhone: '', items: [emptyItem()], method: 'Efectivo' as PaymentMethod, status: 'Cobrado' as SaleStatus, paidAmount: '0' });
  const [statusFilter, setStatusFilter] = useState<'Todos' | SaleStatus>('Todos');
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeProductSearch, setActiveProductSearch] = useState<number | null>(null);
  const [saleForm, setSaleForm] = useState(initialForm);
  const total = saleForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const paidAmount = saleForm.status === 'Cobrado' ? total : Math.min(total, Math.max(0, Number(saleForm.paidAmount) || 0));
  const saldoPendiente = Math.max(0, total - paidAmount);
  const filtered = store.sales.filter((sale) => {
    const itemNames = saleItems(sale).map((item) => item.productName).join(' ');
    return (statusFilter === 'Todos' || sale.status === statusFilter) &&
      (!dateFilter || sale.date === dateFilter) &&
      (!query || `${itemNames} ${sale.customerName}`.toLowerCase().includes(query.toLowerCase()));
  }).sort((a, b) => b.date.localeCompare(a.date));

  const updateItem = (index: number, changes: Partial<SaleFormItem>) => {
    setSaleForm((form) => ({ ...form, items: form.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }));
  };
  const selectProduct = (index: number, productId: string) => {
    const product = store.products.find((item) => item.id === productId);
    updateItem(index, { productId, productName: product?.name || '', productSearch: product?.name || '', size: product?.size || '', unitPrice: product ? String(product.price) : '' });
    setActiveProductSearch(null);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const customerName = saleForm.customerName.trim();
    const customerPhone = saleForm.customerPhone.trim();
     const items: SaleItem[] = saleForm.items.map((item) => ({ productId: item.productId, productName: item.productName.trim(), size: item.size.trim(), detail: item.detail.trim(), quantity: 1, unitPrice: Number(item.unitPrice) }));
    if (!customerName || !items.length || items.some((item) => !item.productId || !item.productName || !item.quantity || item.quantity < 1 || !item.unitPrice || item.unitPrice < 0) || total <= 0) return;
    const storedPaidAmount = saleForm.status === 'Cobrado' ? total : Math.min(total, Math.max(0, Number(saleForm.paidAmount) || 0));
    const storedSaldoPendiente = Math.max(0, total - storedPaidAmount);
    setStore((prev) => {
      const existingCustomer = prev.customers.find((customer) => customer.name.trim().toLowerCase() === customerName.toLowerCase());
      const customerId = existingCustomer?.id || uid('c');
      const customers = existingCustomer
        ? prev.customers.map((customer) => customer.id === existingCustomer.id && customerPhone ? { ...customer, phone: customerPhone } : customer)
        : [{ id: customerId, name: customerName, phone: customerPhone, notes: '', createdAt: today() }, ...prev.customers];
      const quantitiesByProduct = items.reduce<Record<string, number>>((quantities, item) => ({ ...quantities, [item.productId]: (quantities[item.productId] || 0) + item.quantity }), {});
      const firstItem = items[0];
      const productSummary = items.length === 1 ? firstItem.productName : `${firstItem.productName} + ${items.length - 1} ${items.length === 2 ? 'prenda' : 'prendas'}`;
      return {
        ...prev,
        customers,
        sales: [{
          id: uid('s'), date: saleForm.date, customerId, customerName: existingCustomer?.name || customerName,
          productId: firstItem.productId, productName: productSummary, size: items.length === 1 ? firstItem.size : 'Varios',
          quantity: firstItem.quantity, unitPrice: firstItem.unitPrice, method: saleForm.method, status: saleForm.status,
          paidAmount: storedPaidAmount, total, saldoPendiente: storedSaldoPendiente, items,
        }, ...prev.sales],
        products: prev.products.map((product) => quantitiesByProduct[product.id] ? { ...product, stock: Math.max(0, product.stock - quantitiesByProduct[product.id]) } : product),
      };
    });
     setSaleForm(initialForm());
     setActiveProductSearch(null);
    setOpenForm(false);
  };

  return <div className="space-y-5 fade-in">
    <div className="paper-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1"><Search size={17} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" /><Input data-testid="input-search-sales" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente o prenda..." className="pl-10" /></div>
      <div className="flex gap-2 overflow-x-auto"><Select data-testid="select-sales-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="min-w-[180px]"><option>Todos</option><option>Cobrado</option><option>Pendiente</option><option>Seña / Pago Parcial</option></Select><Input data-testid="input-sales-date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="min-w-[145px]" /></div>
    </div>
    <section className="paper-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><div><h2 className="font-bold">Historial de ventas</h2><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{filtered.length} registros encontrados</p></div><Button title="nueva venta" onClick={() => setOpenForm(true)}><Plus size={16} /> Nueva venta</Button></div>
      {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[hsl(var(--muted)/.55)] text-xs uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]"><tr><th className="px-5 py-3 font-bold">Fecha</th><th className="px-5 py-3 font-bold">Cliente</th><th className="px-5 py-3 font-bold">Prendas</th><th className="px-5 py-3 font-bold">Pago</th><th className="px-5 py-3 text-right font-bold">Total</th><th className="px-5 py-3 text-right font-bold">Estado</th></tr></thead><tbody className="divide-y divide-[hsl(var(--border))]">{filtered.map((sale) => <tr className="transition hover:bg-[hsl(var(--muted)/.38)]" key={sale.id}><td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{dateLabel(sale.date)}</td><td className="px-5 py-4 font-semibold">{sale.customerName}</td><td className="px-5 py-4"><div className="space-y-1">{saleItems(sale).map((item, index) => <div key={`${sale.id}-${index}`}><span className="font-semibold">{item.productName}</span><span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">{item.size} · x{item.quantity}</span></div>)}</div></td><td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{sale.method}</td><td className="px-5 py-4 text-right font-bold">{money(saleTotal(sale))}</td><td className="px-5 py-4 text-right"><Badge tone={sale.status === 'Cobrado' ? 'green' : 'orange'}>{sale.status}{saleBalance(sale) > 0 && ` · ${money(saleBalance(sale))}`}</Badge></td></tr>)}</tbody></table></div> : <div className="p-5"><EmptyState icon={ShoppingBag} title="No encontramos ventas" detail="Probá cambiar los filtros o registrá una venta nueva." action={<Button title="nueva venta" onClick={() => setOpenForm(true)}><Plus size={16} /> Registrar venta</Button>} /></div>}
    </section>
    <Modal open={openForm} onClose={() => setOpenForm(false)} title="Registrar una venta">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha"><Input data-testid="input-sale-date" type="date" required value={saleForm.date} onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })} /></Field><Field label="Nombre del Cliente"><Input data-testid="input-sale-customer-name" name="customer_name" required list="sale-customer-suggestions" value={saleForm.customerName} onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })} placeholder="Ej. Lucía Benítez" /><datalist id="sale-customer-suggestions">{store.customers.map((customer) => <option key={customer.id} value={customer.name} />)}</datalist></Field></div>
        <Field label="Teléfono" hint="Opcional; se guarda si el cliente es nuevo o si actualizás su contacto."><Input data-testid="input-sale-customer-phone" name="customer_phone" type="tel" value={saleForm.customerPhone} onChange={(e) => setSaleForm({ ...saleForm, customerPhone: e.target.value })} placeholder="Ej. 11 5555 1234" /></Field>
        <div className="space-y-3">
          {saleForm.items.map((item, index) => <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.28)] p-4" key={index}>
            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold">Prenda {index + 1}</p>{saleForm.items.length > 1 && <button type="button" data-testid={`button-remove-sale-item-${index}`} onClick={() => setSaleForm((form) => ({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) }))} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 size={14} /> Quitar</button>}</div>
            <div className="grid gap-3 sm:grid-cols-[1.7fr_.7fr_.95fr_.8fr]">
              <Field label="Elegir prenda">
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" />
                  <Input
                    data-testid={`input-search-sale-product-${index}`}
                    required
                    value={item.productSearch}
                    onFocus={() => setActiveProductSearch(index)}
                    onChange={(e) => {
                      const value = e.target.value;
                      const match = store.products.find((product) => `${product.name} ${product.size}`.toLowerCase() === value.trim().toLowerCase());
                      updateItem(index, match
                        ? { productId: match.id, productName: match.name, productSearch: value, size: match.size, unitPrice: String(match.price) }
                        : { productId: '', productName: '', productSearch: value });
                      setActiveProductSearch(index);
                    }}
                    onBlur={() => window.setTimeout(() => setActiveProductSearch((active) => active === index ? null : active), 120)}
                    placeholder="Buscar prenda..."
                    className="pl-9"
                    aria-label={`Buscar prenda ${index + 1}`}
                  />
                  {activeProductSearch === index && <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 text-[hsl(var(--card-foreground))] shadow-xl">
                    {store.products.filter((product) => `${product.name} ${product.size}`.toLowerCase().includes(item.productSearch.toLowerCase())).length ? store.products.filter((product) => `${product.name} ${product.size}`.toLowerCase().includes(item.productSearch.toLowerCase())).map((product) => <button
                      type="button"
                      key={product.id}
                      data-testid={`option-sale-product-${index}-${product.id}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectProduct(index, product.id)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[hsl(var(--muted))]"
                    ><span><b>{product.name}</b><span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">{product.size}</span></span><span className="text-xs text-[hsl(var(--muted-foreground))]">{product.stock} u.</span></button>) : <p className="px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">No encontramos prendas.</p>}
                  </div>}
                </div>
              </Field>
              <Field label="Talle"><Input data-testid={`input-sale-size-${index}`} required value={item.size} onChange={(e) => updateItem(index, { size: e.target.value })} placeholder="Ej. M" /></Field>
              <Field label="Detalle"><Input data-testid={`input-sale-detail-${index}`} value={item.detail} onChange={(e) => updateItem(index, { detail: e.target.value })} placeholder="Ej. Color beige" /></Field>
              <Field label="Precio unitario"><Input data-testid={`input-sale-price-${index}`} type="number" min="0" required value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: e.target.value })} placeholder="$" /></Field>
            </div>
          </div>)}
          <Button variant="outline" title="agregar otra prenda" onClick={() => setSaleForm((form) => ({ ...form, items: [...form.items, emptyItem()] }))}><Plus size={16} /> Agregar otra prenda</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Estado del pago"><Select data-testid="select-sale-state" value={saleForm.status} onChange={(e) => setSaleForm({ ...saleForm, status: e.target.value as SaleStatus })}><option>Cobrado</option><option>Seña / Pago Parcial</option><option>Pendiente</option></Select></Field><Field label="Método de pago"><Select data-testid="select-sale-method" value={saleForm.method} onChange={(e) => setSaleForm({ ...saleForm, method: e.target.value as PaymentMethod })}><option>Efectivo</option><option>Transferencia</option><option>Mercado Pago</option></Select></Field></div>
        {saleForm.status !== 'Cobrado' && <Field label="Monto Señado / Cobrado ($)" hint="Para una venta pendiente, el valor por defecto es 0."><Input data-testid="input-sale-paid-amount" type="number" min="0" max={total} value={saleForm.paidAmount} onChange={(e) => setSaleForm({ ...saleForm, paidAmount: e.target.value })} placeholder="0" /></Field>}
        <div className="grid gap-3 rounded-2xl bg-[#f1e5ad] p-4 text-[#64551b] sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-wider opacity-70">Total de la venta</p><p className="mt-1 text-xl font-bold">{money(total)}</p></div><div><p className="text-xs font-bold uppercase tracking-wider opacity-70">Monto cobrado</p><p className="mt-1 text-xl font-bold">{money(paidAmount)}</p></div><div><p className="text-xs font-bold uppercase tracking-wider opacity-70">Saldo pendiente</p><p className="mt-1 text-xl font-bold">{money(saldoPendiente)}</p></div></div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="outline" title="cancelar" onClick={() => setOpenForm(false)}>Cancelar</Button><Button title="guardar venta" type="submit"><Check size={16} /> Guardar venta</Button></div>
      </form>
    </Modal>
  </div>;
}

function Customers({ store, setStore, openForm, setOpenForm }: { store: Store; setStore: React.Dispatch<React.SetStateAction<Store>>; openForm: boolean; setOpenForm: (v: boolean) => void }) {
  const [search, setSearch] = useState(''); const [paying, setPaying] = useState<Customer | null>(null); const [payment, setPayment] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const balances = (customerId: string) => store.sales.filter((s) => s.customerId === customerId).reduce((sum, s) => sum + saleBalance(s), 0);
  const customers = store.customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const debts = store.customers.map((c) => ({ customer: c, amount: balances(c.id), sales: store.sales.filter((s) => s.customerId === c.id && saleBalance(s) > 0) })).filter((d) => d.amount > 0);
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.name.trim()) return; setStore((s) => ({ ...s, customers: [{ id: uid('c'), ...form, createdAt: today() }, ...s.customers] })); setForm({ name: '', phone: '', notes: '' }); setOpenForm(false); };
  const collect = (e: FormEvent) => { e.preventDefault(); if (!paying) return; const amount = Number(payment); if (!amount || amount <= 0) return; let remaining = amount; setStore((s) => ({ ...s, sales: s.sales.map((sale) => { if (sale.customerId !== paying.id || remaining <= 0) return sale; const total = saleTotal(sale); const due = saleBalance(sale); const applied = Math.min(due, remaining); remaining -= applied; const paid = sale.paidAmount + applied; return { ...sale, paidAmount: paid, saldoPendiente: Math.max(0, total - paid), status: paid >= total ? 'Cobrado' : 'Seña / Pago Parcial' }; }) })); setPaying(null); setPayment(''); };
  const remove = (id: string) => { if (window.confirm('¿Eliminar este cliente?')) setStore((s) => ({ ...s, customers: s.customers.filter((c) => c.id !== id) })); };
  return <div className="space-y-5 fade-in"><div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]"><section className="paper-card rounded-2xl p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-[hsl(var(--primary))]">Por cobrar</p><h2 className="serif mt-1 text-2xl">Cuentas pendientes</h2></div><div className="rounded-xl bg-[#e9e0f0] px-3 py-2 text-right text-[#574064]"><p className="mono text-lg font-bold">{money(debts.reduce((sum, d) => sum + d.amount, 0))}</p><p className="text-[10px] font-bold uppercase tracking-wider">total fiado</p></div></div>{debts.length ? <div className="space-y-2">{debts.map(({ customer, amount, sales }) => <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3" key={customer.id}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e9e0f0] font-bold text-[#574064]">{customer.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{customer.name}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{sales.length} {sales.length === 1 ? 'venta pendiente' : 'ventas pendientes'}</p></div><div className="text-right"><p className="font-bold text-[#773e31]">{money(amount)}</p><button data-testid={`button-collect-${customer.id}`} onClick={() => setPaying(customer)} className="mt-1 text-xs font-bold text-[hsl(var(--primary))] hover:underline">Registrar cobro</button></div></div>)}</div> : <EmptyState icon={Check} title="Todo al día" detail="No hay deudas pendientes para cobrar." />}</section><section className="paper-card rounded-2xl p-5 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Tu agenda</p><h2 className="serif mt-1 text-2xl">Clientes</h2></div><Button title="nuevo cliente" onClick={() => setOpenForm(true)}><Plus size={16} /> Nuevo cliente</Button></div><div className="relative mb-4"><Search size={16} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" /><Input data-testid="input-search-customers" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." className="pl-9" /></div>{customers.length ? <div className="space-y-1">{customers.map((customer) => <div className="group flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-[hsl(var(--muted))]" key={customer.id}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dbece0] text-xs font-bold text-[#244d3b]">{customer.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{customer.name}</p><p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{customer.phone || 'Sin teléfono'}{customer.notes ? ` · ${customer.notes}` : ''}</p></div>{balances(customer.id) > 0 && <Badge tone="orange">{money(balances(customer.id))}</Badge>}<button data-testid={`button-delete-customer-${customer.id}`} onClick={() => remove(customer.id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] opacity-0 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100" aria-label={`Eliminar ${customer.name}`}><Trash2 size={15} /></button></div>)}</div> : <EmptyState icon={UserRound} title="No encontramos clientes" detail="Probá con otro nombre." />}</section></div><Modal open={openForm} onClose={() => setOpenForm(false)} title="Sumar un cliente"><form onSubmit={submit} className="space-y-5"><Field label="Nombre y apellido"><Input data-testid="input-customer-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Valentina Gómez" /></Field><Field label="Teléfono"><Input data-testid="input-customer-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ej. 11 5555 1234" /></Field><Field label="Notas" hint="Un talle, una preferencia o algo para recordar."><Textarea data-testid="input-customer-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej. Le gusta recibir novedades..." /></Field><div className="flex justify-end gap-2"><Button variant="outline" title="cancelar" onClick={() => setOpenForm(false)}>Cancelar</Button><Button title="guardar cliente" type="submit"><Check size={16} /> Guardar cliente</Button></div></form></Modal><Modal open={!!paying} onClose={() => setPaying(null)} title="Registrar un cobro"><form onSubmit={collect} className="space-y-5"><div className="rounded-xl bg-[#e9e0f0] p-4 text-[#574064]"><p className="text-xs uppercase tracking-wider">Cliente</p><p className="mt-1 font-bold">{paying?.name}</p><p className="mt-2 text-sm">Saldo pendiente: <b>{paying ? money(balances(paying.id)) : '$ 0'}</b></p></div><Field label="Monto recibido"><Input data-testid="input-payment-amount" required min="1" type="number" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="$" /></Field><p className="text-xs text-[hsl(var(--muted-foreground))]">El monto se aplica a las ventas más antiguas primero.</p><div className="flex justify-end gap-2"><Button variant="outline" title="cancelar" onClick={() => setPaying(null)}>Cancelar</Button><Button title="confirmar cobro" type="submit"><Check size={16} /> Confirmar cobro</Button></div></form></Modal></div>;
}

function Inventory({ store, setStore, openForm, setOpenForm }: { store: Store; setStore: React.Dispatch<React.SetStateAction<Store>>; openForm: boolean; setOpenForm: (v: boolean) => void }) {
  const [search, setSearch] = useState(''); const [stockFilter, setStockFilter] = useState('Todos'); const [form, setForm] = useState({ category: 'Básicos', name: '', size: '', cost: '', price: '', stock: '', image_url: '' });
  const products = store.products.filter((p) => (stockFilter === 'Todos' || (stockFilter === 'Bajo stock' ? p.stock > 0 && p.stock <= 2 : p.stock === 0)) && `${p.name} ${p.category} ${p.size}`.toLowerCase().includes(search.toLowerCase()));
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.name || !form.price) return; setStore((s) => ({ ...s, products: [{ id: uid('p'), category: form.category, name: form.name, size: form.size || 'Único', cost: Number(form.cost) || 0, price: Number(form.price), stock: Number(form.stock) || 0, image_url: form.image_url.trim() }, ...s.products] })); setForm({ category: 'Básicos', name: '', size: '', cost: '', price: '', stock: '', image_url: '' }); setOpenForm(false); };
  const remove = (id: string) => { if (window.confirm('¿Eliminar esta prenda del inventario?')) setStore((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) })); };
  return <div className="space-y-5 fade-in"><div className="paper-card grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_auto]"><div className="relative"><Search size={17} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" /><Input data-testid="input-search-inventory" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar prenda, categoría o talle..." className="pl-10" /></div><Select data-testid="select-stock-filter" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="sm:w-40"><option>Todos</option><option>Bajo stock</option><option>Sin stock</option></Select></div><section className="paper-card overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4"><div><h2 className="font-bold">Prendas y stock</h2><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{store.products.length} productos en catálogo</p></div><Button title="nueva prenda" onClick={() => setOpenForm(true)}><Plus size={16} /> Nueva prenda</Button></div>{products.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[hsl(var(--muted)/.55)] text-xs uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]"><tr><th className="px-5 py-3 font-bold">Producto</th><th className="px-5 py-3 font-bold">Categoría</th><th className="px-5 py-3 font-bold">Talle</th><th className="px-5 py-3 text-right font-bold">Costo</th><th className="px-5 py-3 text-right font-bold">Venta</th><th className="px-5 py-3 text-right font-bold">Stock</th><th /></tr></thead><tbody className="divide-y divide-[hsl(var(--border))]">{products.map((p) => <tr className="group transition hover:bg-[hsl(var(--muted)/.38)]" key={p.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><ProductPhoto product={p} className="h-10 w-10" /><b>{p.name}</b></div></td><td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{p.category}</td><td className="px-5 py-4">{p.size}</td><td className="px-5 py-4 text-right text-[hsl(var(--muted-foreground))]">{money(p.cost)}</td><td className="px-5 py-4 text-right font-bold">{money(p.price)}</td><td className="px-5 py-4 text-right">{p.stock === 0 ? <Badge tone="red">Sin stock</Badge> : p.stock <= 2 ? <Badge tone="orange">{p.stock} u. · Bajo</Badge> : <span className="font-bold">{p.stock} u.</span>}</td><td className="px-5 py-4 text-right"><button data-testid={`button-delete-product-${p.id}`} onClick={() => remove(p.id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] opacity-0 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100" aria-label={`Eliminar ${p.name}`}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div> : <div className="p-5"><EmptyState icon={Package} title="No hay prendas con estos filtros" detail="Sumá tu primera prenda para empezar a controlar el stock." action={<Button title="nueva prenda" onClick={() => setOpenForm(true)}><Plus size={16} /> Nueva prenda</Button>} /></div>}</section><Modal open={openForm} onClose={() => setOpenForm(false)} title="Sumar una prenda"><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Categoría"><Select data-testid="select-product-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Básicos</option><option>Abrigos</option><option>Pantalones</option><option>Tejidos</option><option>Vestidos</option><option>Accesorios</option></Select></Field><Field label="Talle"><Input data-testid="input-product-size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="Ej. S, M, 38" /></Field></div><Field label="Nombre de la prenda"><Input data-testid="input-product-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Camisa Lino" /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Costo de compra"><Input data-testid="input-product-cost" type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="$" /></Field><Field label="Precio de venta"><Input data-testid="input-product-price" required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="$" /></Field><Field label="Stock inicial"><Input data-testid="input-product-stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" /></Field></div><Field label="Foto de la prenda" hint="Pegá la URL pública de la imagen."><Input data-testid="input-product-image-url" name="imagen_url" type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></Field><div className="flex justify-end gap-2"><Button variant="outline" title="cancelar" onClick={() => setOpenForm(false)}>Cancelar</Button><Button title="guardar prenda" type="submit"><Check size={16} /> Guardar prenda</Button></div></form></Modal></div>;
}

function Expenses({ store, setStore, openForm, setOpenForm }: { store: Store; setStore: React.Dispatch<React.SetStateAction<Store>>; openForm: boolean; setOpenForm: (v: boolean) => void }) {
  const [category, setCategory] = useState('Todas'); const [form, setForm] = useState({ date: today(), concept: '', category: 'Mercadería', amount: '' });
  const expenses = store.expenses.filter((e) => category === 'Todas' || e.category === category).sort((a, b) => b.date.localeCompare(a.date)); const total = expenses.reduce((s, e) => s + e.amount, 0);
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.concept || !form.amount) return; setStore((s) => ({ ...s, expenses: [{ id: uid('e'), date: form.date, concept: form.concept, category: form.category, amount: Number(form.amount) }, ...s.expenses] })); setForm({ date: today(), concept: '', category: 'Mercadería', amount: '' }); setOpenForm(false); };
  const remove = (id: string) => { if (window.confirm('¿Eliminar este gasto?')) setStore((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) })); };
  return <div className="space-y-5 fade-in"><div className="grid gap-4 sm:grid-cols-[1fr_auto]"><div className="paper-card rounded-2xl bg-[#dbece0] p-5 text-[#244d3b]"><p className="text-xs font-bold uppercase tracking-[.1em] opacity-65">Total registrado</p><p className="mt-1 text-3xl font-bold">{money(total)}</p><p className="mt-1 text-xs opacity-65">{expenses.length} egresos en este filtro</p></div><Button title="nuevo gasto" onClick={() => setOpenForm(true)} className="h-fit self-start"><Plus size={16} /> Nuevo gasto</Button></div><section className="paper-card overflow-hidden rounded-2xl"><div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Historial de gastos y compras</h2><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">Todo lo que sale de tu caja</p></div><Select data-testid="select-expense-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full sm:w-44"><option>Todas</option><option>Mercadería</option><option>Envíos</option><option>Packaging</option><option>Servicios</option><option>Otros</option><option>Logística</option><option>Insumos</option></Select></div>{expenses.length ? <div className="divide-y divide-[hsl(var(--border))]">{expenses.map((expense) => <div className="group flex items-center gap-3 px-5 py-4 hover:bg-[hsl(var(--muted)/.38)]" key={expense.id}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5dfd1] text-[#773e31]"><ArrowDownRight size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{expense.concept}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{fullDate(expense.date)} · <span className="font-semibold">{expense.category}</span></p></div><p className="font-bold text-[#773e31]">− {money(expense.amount)}</p><button data-testid={`button-delete-expense-${expense.id}`} onClick={() => remove(expense.id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] opacity-0 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100" aria-label={`Eliminar ${expense.concept}`}><Trash2 size={15} /></button></div>)}</div> : <div className="p-5"><EmptyState icon={Receipt} title="No hay gastos registrados" detail="Cuando cargues una compra o egreso, lo vas a ver acá." action={<Button title="nuevo gasto" onClick={() => setOpenForm(true)}><Plus size={16} /> Cargar gasto</Button>} /></div>}</section><Modal open={openForm} onClose={() => setOpenForm(false)} title="Cargar un gasto"><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha"><Input data-testid="input-expense-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Categoría"><Select data-testid="select-expense-form-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Mercadería</option><option>Envíos</option><option>Packaging</option><option>Servicios</option><option>Otros</option></Select></Field></div><Field label="Proveedor / concepto"><Input data-testid="input-expense-concept" required value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} placeholder="Ej. Compra de perchas" /></Field><Field label="Monto"><Input data-testid="input-expense-amount" required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="$" /></Field><div className="flex justify-end gap-2"><Button variant="outline" title="cancelar" onClick={() => setOpenForm(false)}>Cancelar</Button><Button title="guardar gasto" type="submit"><Check size={16} /> Guardar gasto</Button></div></form></Modal></div>;
}

function App() {
  const [store, setStore] = useStore(); const [view, setView] = useState<View>('dashboard'); const [sidebarOpen, setSidebarOpen] = useState(false); const [formOpen, setFormOpen] = useState(false); const [flash, setFlash] = useState<string | null>(null);
  const updateStore: React.Dispatch<React.SetStateAction<Store>> = (updater) => { setStore(updater); setFlash('Cambios guardados'); window.setTimeout(() => setFlash(null), 2600); };
  const openAdd = () => { if (view === 'dashboard') setView('sales'); setFormOpen(true); };
  const page = view === 'dashboard' ? <Dashboard store={store} setView={setView} /> : view === 'sales' ? <Sales store={store} setStore={updateStore} openForm={formOpen} setOpenForm={setFormOpen} /> : view === 'customers' ? <Customers store={store} setStore={updateStore} openForm={formOpen} setOpenForm={setFormOpen} /> : view === 'inventory' ? <Inventory store={store} setStore={updateStore} openForm={formOpen} setOpenForm={setFormOpen} /> : <Expenses store={store} setStore={updateStore} openForm={formOpen} setOpenForm={setFormOpen} />;
  return <div className="app-shell"><Sidebar view={view} setView={(v) => { setView(v); setFormOpen(false); }} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />{sidebarOpen && <button data-testid="button-sidebar-overlay" className="fixed inset-0 z-30 bg-[hsl(224_28%_19%/.35)] lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú" />}<main className="min-h-[100dvh] lg:pl-[252px]"><div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-7 sm:py-8 lg:px-10"><Header view={view} onMenu={() => setSidebarOpen(true)} onAdd={openAdd} />{page}<footer className="mt-10 flex items-center justify-between border-t border-white/15 py-5 text-xs text-white/55"><span>KINSH1P · datos guardados en este dispositivo</span><span className="hidden sm:inline">Versión local 1.0</span></footer></div></main>{flash && <div data-testid="status-saved" className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-xl bg-[#244d3b] px-4 py-3 text-sm font-bold text-[#f2f7ed] shadow-xl"><Check size={16} /> {flash}</div>}</div>;
}

export default App;