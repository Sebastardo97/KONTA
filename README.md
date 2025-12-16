# KONTA - Sistema Administrativo Inteligente 🚀

**KONTA** es una plataforma moderna de facturación, punto de venta (POS), gestión de inventarios y sistema multi-usuario diseñada para PyMES en Colombia, con enfoque en experiencia de usuario y cumplimiento contable.

## 🛠️ Stack Tecnológico

*   **Frontend:**
    *   **Next.js 14 (App Router):** Framework de React para aplicaciones web modernas
    *   **TypeScript:** Tipado estático para mayor seguridad
    *   **Tailwind CSS 4:** Sistema de diseño moderno y responsivo
    *   **Lucide React:** Iconografía moderna
    *   **Zustand:** Estado global para el carrito POS

*   **Backend & Base de Datos:**
    *   **Supabase (PostgreSQL):** Backend-as-a-Service con base de datos robusta
    *   **Auth:** Autenticación segura basada en roles
    *   **RLS (Row Level Security):** Seguridad a nivel de fila en BD
    *   **Funciones SQL:** Lógica de negocio en la base de datos

## ✨ Módulos Principales

### 1. **Sistema Multi-Usuario** 👥
*   **Roles:** Admin y Vendedor
*   **Control de Acceso:** Middleware basado en roles
*   **Gestión de Usuarios:** Panel de administración de vendedores

### 2. **Punto de Venta (POS)** 🛒
*   Interfaz rápida para ventas
*   Selección de clientes
*   **Descuentos por ítem** (0-100%)
*   Cálculo automático de totales
*   Actualización automática de inventario

### 3. **Facturación Dual** 📄
*   **Facturas POS:** Legales, reportan a DIAN
*   **Facturas Normales:** Internas, no reportan
*   Creación de facturas con descuentos
*   Asignación de vendedor
*   Filtros por tipo

### 4. **Sistema de Preventas** 📋
*   Admin crea y asigna órdenes a vendedores
*   Vendedores ven sus órdenes asignadas
*   Botón "Ejecutar" convierte a factura
*   Actualización automática de inventario

### 5. **Reportes y Analytics** 📊
*   **Ranking de Vendedores:** Con medallas y métricas
*   **Dashboard Personal:** Performance individual
*   **Filtros de Fecha:** 7/30/90 días, todo el tiempo
*   **Métricas:** Ventas, órdenes, promedio, tendencias

### 6. **Inventario** 📦
*   Gestión de productos
*   Stock en tiempo real
*   Alertas de stock bajo

### 7. **Contabilidad** 💰
*   Proveedores y gastos
*   Actualización automática de stock
*   Exportación a CSV

## 🚀 Configuración Inicial

### 1. Clonar e Instalar
```bash
git clone <repo-url>
cd harmonic-halo
npm install
```

### 2. Variables de Entorno (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Configurar Base de Datos (Supabase)

Ejecutar los siguientes archivos SQL en orden:

1. `supabase/schema.sql` - Schema principal
2. `supabase/accounting_schema.sql` - Contabilidad
3. `supabase/invoice_enhancements.sql` - Tipos de factura y descuentos
4. `supabase/sales_orders.sql` - Sistema de preventas
5. `supabase/seller_performance.sql` - Vistas de reportes
6. `supabase/role_based_access.sql` - RLS y permisos

### 4. Crear Usuarios
En Supabase Auth, crear usuarios:
- Admin: `admin@example.com`
- Vendedor: `vendedor@example.com`

Luego actualizar roles en la tabla `profiles`:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
UPDATE profiles SET role = 'seller' WHERE email = 'vendedor@example.com';
```

### 5. Ejecutar Desarrollo
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 📱 Rutas Principales

### Públicas
- `/login` - Inicio de sesión

### Dashboard (Autenticado)
- `/dashboard` - Home
- `/dashboard/pos` - Punto de venta

### Facturas
- `/dashboard/invoices` - Lista con filtros (All/POS/Normal)
- `/dashboard/invoices/pos/new` - Nueva factura POS
- `/dashboard/invoices/normal/new` - Nueva factura normal

### Preventas (Sales Orders)
- `/dashboard/sales-orders` - Lista de preventas (Admin)
- `/dashboard/sales-orders/new` - Crear preventa (Admin)
- `/dashboard/sales-orders/[id]` - Detalle y ejecutar
- `/dashboard/my-orders` - Mis órdenes asignadas (Vendedor)

### Reportes
- `/dashboard/reports/sales-by-seller` - Ranking de vendedores
- `/dashboard/my-performance` - Dashboard personal

### Administración
- `/dashboard/sellers` - Gestión de vendedores (Admin)
- `/dashboard/customers` - Clientes
- `/dashboard/products` - Productos
- `/dashboard/suppliers` - Proveedores

## 🔐 Roles y Permisos

### Admin
- ✅ Acceso completo
- ✅ Crear/ver todas las facturas
- ✅ Crear y asignar preventas
- ✅ Ver reportes de todos los vendedores
- ✅ Gestionar vendedores

### Vendedor
- ✅ Crear facturas (auto-asignadas)
- ✅ Ver sus propias facturas
- ✅ Ver preventas asignadas
- ✅ Ejecutar preventas
- ✅ Ver su dashboard personal
- ❌ No puede ver facturas de otros vendedores
- ❌ No puede gestionar usuarios

## 🎯 Funcionalidades Clave

### Descuentos por Ítem
- Slider 0-100% en cada producto
- Cálculo automático en tiempo real
- Guarda `discount_percentage` en BD
- Muestra ahorro al cliente

### Preventas (Sales Orders)
1. Admin crea orden con productos
2. Asigna a vendedor específico
3. Vendedor ve en "Mis Órdenes"
4. Vendedor ejecuta → Se crea factura automáticamente
5. Stock se actualiza

### Sistema de Reporting
- Ranking con medallas 🥇🥈🥉
- Filtros de fecha flexibles
- Métricas comparativas
- Visualización de tendencias
- Insights automáticos

## 📊 Base de Datos

### Tablas Principales
- `profiles` - Usuarios con roles
- `customers` - Clientes
- `products` - Inventario
- `invoices` - Facturas (con invoice_type)
- `invoice_items` - Items con descuentos
- `sales_orders` - Preventas
- `sales_order_items` - Items de preventas

### Vistas
- `sales_by_seller` - Ventas agrupadas por vendedor

### Funciones
- `seller_performance(date_from, date_to)` - Métricas de vendedor
- `decrement_stock(product_id, quantity)` - Actualizar inventario

## 🚧 Desarrollo

### Comandos Útiles
```bash
npm run dev      # Servidor desarrollo
npm run build    # Build producción
npm run start    # Servidor producción
npm run lint     # Linter
```

### Estructura de Carpetas
```
src/
├── app/
│   ├── (auth)/login/          # Autenticación
│   ├── (dashboard)/dashboard/ # App principal
│   │   ├── pos/              # Punto de venta
│   │   ├── invoices/         # Facturas
│   │   ├── sales-orders/     # Preventas
│   │   ├── reports/          # Reportes
│   │   └── sellers/          # Gestión vendedores
├── components/               # Componentes reutilizables
├── hooks/                    # Custom hooks (useRole)
├── lib/                      # Utilidades (supabase)
└── store/                    # Estado global (cartStore)
```

## 🎨 Componentes Clave

- `DiscountInput` - Slider de descuento reutilizable
- `SellerSelect` - Dropdown de vendedores
- `RoleGuard` - Control de acceso por rol

## 📝 Próximos Pasos

- [ ] Reportes periódicos automáticos
- [ ] Integración DIAN para facturas POS
- [ ] Generación de PDF con descuentos
- [ ] Dashboard de métricas avanzadas
- [ ] Exportación de reportes

## 🤝 Contribuciones

Este es un proyecto privado, pero si tienes sugerencias, contáctanos.

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

---

**Desarrollado con ❤️ para PyMES colombianas**
