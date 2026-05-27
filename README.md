# SmartHall 🏢✨

> Sistema web moderno para la gestión inteligente de reservas e inventario de espacios comunes en unidades residenciales.

SmartHall es una plataforma diseñada para digitalizar y simplificar la gestión de zonas sociales, salones de eventos e inventarios de propiedades horizontales o unidades residenciales. Permite a los residentes solicitar reservas y préstamos de insumos con facilidad, al tiempo que proporciona a los administradores y supervisores herramientas potentes para auditar, autorizar y dar seguimiento a las actividades y recursos del recinto.

---

## 🚀 Características Principales

### 👤 Gestión de Usuarios y Roles
- **Administrador**: Acceso global. Capacidad de crear roles, gestionar inventario, aprobar/rechazar reservas y visualizar auditorías.
- **Supervisor**: Permisos operativos para aprobar entregas de inventario y gestionar reservas, con acceso a reportes y notificaciones.
- **Residente**: Vista restringida para crear solicitudes de reserva, pedir insumos prestados en reservas aprobadas, y consultar el historial propio.

### 📅 Módulo de Reservas
- Solicitud de reservas de salón social con comprobador de disponibilidad en tiempo real.
- Criterios y restricciones configurables (Ej: solo solicitar con 48h de anticipación).
- Módulo de aprobación administrativa con semáforo de prioridad temporal integrado.
- Eliminación lógica (Soft-delete) para mantener estricta auditoría sin perder información vital.

### 📦 Módulo de Inventario y Préstamos
- Registro de categorías e insumos disponibles (sillas, mobiliario, limpieza, audiovisual).
- Préstamo asociado específicamente a una reserva pre-aprobada.
- Trazabilidad y cambio de estado del préstamo (solicitado, entregado, devuelto, dañado).
- Actualización automática de existencias y control de daño.

### 📊 Dashboard y Notificaciones
- Visualización de KPIS mediante tableros dinámicos (reservas pendientes, insumos agotados, etc).
- Sistema de notificaciones integradas y actualización de tablas en vivo mediante conexión Realtime con la base de datos.

---

## 🛠️ Stack Tecnológico

El proyecto cuenta con las siguientes tecnologías (Frontend & BaaS):

- **[React 18](https://react.dev/)**: Biblioteca de interfaces de usuario.
- **[Vite](https://vitejs.dev/)**: Empaquetador extremadamente rápido (Bundler).
- **[Supabase](https://supabase.com/)**: Backend-as-a-Service (PostgreSQL, Auth, Realtime, RLS).
- **[React Router v6](https://reactrouter.com/)**: Navegación y enrutamiento SPA.
- **[@tanstack/react-query](https://tanstack.com/query)**: Sincronización, caché y manejo del estado de peticiones asíncronas.
- **[@tanstack/react-table](https://tanstack.com/table)**: Creación de tablas avanzadas con ordenación y filtrado robusto.
- **[Lucide React](https://lucide.dev/)**: Colección limpia de iconos vectoriales.
- **[Recharts](https://recharts.org/)**: Gráficas y analíticas modulares basadas en componentes de React.

---

## ⚙️ Configuración y Puesta en Marcha

### 1. Clonar e Instalar
Debes tener instalado **Node.js**:
```bash
# Instalar todas las dependencias
npm install
```

### 2. Variables de Entorno
Clona localmente el archivo `.env.example` (o crea un archivo `.env` en la raíz del proyecto) y configura tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu_supabase_project_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```


### 3. Lanzamiento del entorno de desarrollo
```bash
npm run dev
```

---

## 📂 Organización del Proyecto

```text
📦 SmartHall
 ┣ 📂 bd/                  # Scripts SQL y esquemas de Supabase.
 ┣ 📂 src/
 ┃ ┣ 📂 components/       # Componentes reusables (UI, layout, auth).
 ┃ ┣ 📂 context/          # Proveedores de Contexto (Auth, Búsqueda global, Tostadas).
 ┃ ┣ 📂 css/              # Hojas de estilo general.
 ┃ ┣ 📂 hooks/            # Custom Hooks para consumir datos mediante React-Query.
 ┃ ┣ 📂 lib/              # Configuración base (como el cliente de supabase.js).
 ┃ ┣ 📂 pages/            # Vistas principales de las rutas de la aplicación.
 ┃ ┣ 📜 App.jsx           # Enrutador principal y cascarón global.
 ┃ ┗ 📜 main.jsx          # Punto de entrada de la aplicación.
 ┣ 📜 index.html
 ┣ 📜 package.json
 ┗ 📜 vite.config.js
```
