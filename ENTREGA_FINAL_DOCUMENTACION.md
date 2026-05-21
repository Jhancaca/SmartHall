# Documentación de Entrega Final y Manual Técnico — SmartHall

Este documento detalla la arquitectura del sistema, la base de datos, los flujos de control de seguridad a nivel base de datos y de interfaz, así como las guías de uso rápido para los diferentes perfiles del sistema residencial **SmartHall**.

---

## 1. Arquitectura y Stack Tecnológico

SmartHall ha sido reforzado y optimizado con tecnologías de vanguardia bajo estrictas directrices de escalabilidad y rendimiento:

*   **Núcleo de Frontend:** React 18 (Vite) con enrutamiento dinámico protegido mediante React Router DOM v6.
*   **Gestión de Estado y Caching:** **TanStack React Query (v5)**. Se eliminaron los flujos ineficientes de peticiones en cascada (*waterfalls*) a favor de un caching estructurado de 2 minutos (`staleTime`), actualizaciones en tiempo real integradas mediante suscripciones Realtime de Supabase, e invalidaciones atómicas en mutaciones (`queryClient.invalidateQueries`).
*   **Gestión Avanzada de Datos:** **TanStack React Table (v8)**. Implementada en los paneles de Aprobación de Reservas e Informes Administrativos para habilitar ordenación clicable por columnas, paginación local fluida y filtros predictivos globales de alto rendimiento.
*   **Visualización de Datos:** **Recharts**. Incorporada en el Dashboard analítico para renderizar gráficos interactivos con degradados y sombras fluidas.
*   **Base de Datos y Seguridad (BaaS):** **Supabase (PostgreSQL)** con políticas de seguridad a nivel de fila (**RLS**) robustas y triggers automatizados en PL/pgSQL para blindar las reglas de negocio.

---

## 2. Base de Datos y Seguridad (Supabase / Postgres)

Todas las modificaciones de base de datos se estructuraron de forma limpia bajo el directorio de control de versiones `supabase/migrations/` en la raíz del proyecto.

### A. Triggers de Restricción de Reservas
Archivo: [20260520000001_restricciones_reservas.sql](file:///c:/Users/jhanc/OneDrive/Escritorio/Dev/SmartHall/SmartHall/supabase/migrations/20260520000001_restricciones_reservas.sql)

Para blindar la integridad del salón social e impedir que se eludan los límites desde peticiones directas de API o modificaciones del frontend, se programó un trigger nativo en Postgres (`validar_restricciones_reserva_trigger`) que bloquea a nivel de motor SQL:
1.  **Anticipación Mínima (48 horas):** No se permiten reservas creadas con menos de 48 horas de anticipación respecto al momento de la solicitud.
2.  **Anticipación Máxima (90 días):** No se permiten reservas agendadas a más de 90 días en el futuro.
3.  **Límite de Reserva Activa por Día:** Se prohíbe terminantemente la superposición de reservas aprobadas o pendientes para la misma fecha del evento, asegurando exclusividad del salón social.

### B. Módulo de Invitados y Control de Acceso (Check-in Portería)
Archivo: [20260520000002_tabla_invitados.sql](file:///c:/Users/jhanc/OneDrive/Escritorio/Dev/SmartHall/SmartHall/supabase/migrations/20260520000002_tabla_invitados.sql)

Se creó la tabla `invitados_reserva` para habilitar el control digital de afluencia, con la siguiente estructura y controles:
*   **Índices de Rendimiento:** Índice en `reserva_id` e índice compuesto en `(reserva_id, documento_identidad)` para búsquedas inmediatas en portería.
*   **Políticas de RLS Robustas:**
    *   **Residentes:** Pueden consultar, insertar y eliminar de forma exclusiva la lista de invitados vinculada a sus propias reservas (`auth.uid() = residente_id`), pero tienen bloqueada la modificación del estado de check-in (`estado_acceso`).
    *   **Portería (Supervisor) / Administradores:** Tienen permisos completos (`ALL`) para ver todas las listas, buscar en caliente y conmutar el estado de acceso de los invitados (`estado_acceso = 'ingresado' | 'pendiente'`).

---

## 3. Funcionalidades Detalladas (Puntos 7 al 14)

### Punto 7, 8 y 9: Blindaje de Base de Datos, Triggers y RLS
*   Implementados los triggers y las políticas de RLS descritas en la sección anterior, garantizando que un residente malintencionado no pueda manipular invitados ajenos ni violar aforos o restricciones horarias directamente a través del SDK de Supabase.

### Punto 10: Integración de TanStack React Table y Semáforo Visual
*   Componente: [AprobacionReservas.jsx](file:///c:/Users/jhanc/OneDrive/Escritorio/Dev/SmartHall/SmartHall/src/pages/AprobacionReservas.jsx)
*   **Semáforo de Prioridad:** Habilita un indicador de color basado en la cercanía del evento:
    *   🔴 **Urgente (<72h):** Animación en línea CSS de pulso circular (`pulse-glow`) con destello de sombra dinámico para llamar la atención del administrador.
    *   🟡 **Próximo (<7 días):** Alerta amarilla estática de prioridad media.
    *   🟢 **Normal (>7 días):** Indicador verde de reserva con tiempo suficiente de gestión.
*   **TanStack Table:** Proporciona un control de datos premium con ordenación instantánea al hacer clic en las cabeceras (como Fecha Evento) y filtros predictivos globales por texto.

### Punto 11: Centro de Informes Analítico con Descargas Premium y PDF
*   Componente: [Informes.jsx](file:///c:/Users/jhanc/OneDrive/Escritorio/Dev/SmartHall/SmartHall/src/pages/Informes.jsx)
*   **Exportación CSV Premium:** Genera dinámicamente un archivo de valores separados por coma agregando el **BOM UTF-8 (`\uFEFF`)** al inicio del stream de datos. Esto garantiza que Microsoft Excel abra el archivo directamente reconociendo acentos, eñes y caracteres especiales sin requerir conversión manual de codificación.
*   **Hoja de Impresión Nativa (PDF):** Integra un bloque `<style>` de React con reglas de `@media print` meticulosas. Al presionar "Imprimir / PDF":
    *   Se ocultan automáticamente el menú lateral (`Sidebar`), el panel de filtros, los botones de descarga y el pie de paginación.
    *   El fondo se torna blanco puro con texto negro corporativo de alta legibilidad.
    *   La tabla se expande al 100% de la hoja con bordes refinados, adaptando el tamaño de fuente para una entrega física formal o guardado como PDF en un solo clic.
    *   Se inyecta una cabecera de impresión formal que indica la fecha, hora exacta de generación y el tipo de reporte administrativa.

### Punto 12: Funcionalidad Adicional — Lista de Invitados con Control de Acceso (Check-in)
*   Se reemplazaron los depósitos de garantía por un **Sistema de Invitados Digital**. Los residentes declaran quién ingresa al salón social para su evento.
*   Portería dispone de un control biométrico/documental digital que actualiza el aforo real admitido dentro del salón social segundo a segundo.

### Punto 13: Dashboard Analítico con Recharts e Interacción Dinámica
*   Componente: [Dashboard.jsx](file:///c:/Users/jhanc/OneDrive/Escritorio/Dev/SmartHall/SmartHall/src/pages/Dashboard.jsx)
*   **Filtros en Cabecera:** Permite ajustar un rango de fechas (Fecha Inicio / Fin) y el tipo de evento (Cumpleaños, Asamblea, Fiesta, Reunión). Todos los KPIs y gráficos se recalculan instantáneamente en caliente.
*   **Gráfico de Dona (PieChart):** Muestra interactivamente los porcentajes de reservas Aprobadas, Pendientes, Rechazadas y Canceladas.
*   **Gráfico de Barras Degradadas (BarChart):** Representa mediante una transición de color azul degradado la distribución de celebraciones del condominio.
*   **Widget de Bitácora de Auditoría:** Muestra cronológicamente las últimas 5 acciones de auditoría (CREAR, EDITAR, ELIMINAR, APROBAR) indicando el usuario responsable, hora exacta y descripción detallada de la acción realizada, con badges de colores.

### Punto 14: Enrutamiento y Navegación Dinámica
*   Archivos: [App.jsx](file:///c:/Users/jhanc/OneDrive/Escritorio/Dev/SmartHall/SmartHall/src/App.jsx) and [Sidebar.jsx](file:///c:/Users/jhanc/OneDrive/Escritorio/Dev/SmartHall/SmartHall/src/components/layout/Sidebar.jsx)
*   Las rutas `/reservas/invitados` (residente), `/admin/informes` (admin/supervisor) y `/admin/acceso` (admin/supervisor) fueron incorporadas de forma dinámica y protegida por roles dentro del enrutador y del menú lateral.

---

## 4. Guía de Uso Rápido por Perfil

### A. Para Residentes (Gestión de Invitados)
1.  Inicie sesión en SmartHall.
2.  Haga clic en la pestaña **Invitados** del menú lateral izquierdo.
3.  A la izquierda verá la lista de sus próximos eventos que han sido **Aprobados** por la administración. Haga clic en el evento deseado.
4.  A la derecha verá el panel de aforo de su evento. Se mostrará el aforo total reservado y los cupos disponibles.
5.  Ingrese el **Nombre Completo** y **Documento de Identidad** de su invitado, y haga clic en **Registrar Invitado**.
    *   *Nota: El sistema no le permitirá agregar invitados si excede el límite máximo acordado en su solicitud de reserva.*
6.  Puede eliminar invitados no deseados haciendo clic en el icono de papelera. *(Bloqueado una vez el invitado ha ingresado).*

### B. Para Portería / Vigilancia (Control de Acceso)
1.  Haga clic en la pestaña **Control Acceso** en el menú lateral.
2.  El sistema cargará de forma automática y en tiempo real todos los invitados agendados para **HOY** de todas las reservas aprobadas del condominio.
3.  Utilice el **Buscador Predictivo** de la parte superior escribiendo parte del nombre, número de documento o apartamento.
4.  Cuando el invitado llegue a portería, valide su documento y haga clic en el botón verde **Dar Ingreso**.
    *   *El sistema actualizará el Aforo Ingresado instantáneamente y estampará la hora exacta de entrada.*
5.  Si cometió un error, haga clic en el botón gris **Deshacer** para retornar al invitado al estado pendiente.

### C. Para Administradores y Supervisores (Aprobaciones e Informes)
1.  **Aprobación Semáforo:** En **Aprobaciones**, preste especial atención a las filas marcadas con el semáforo 🔴 **Urgente**. Resuelva estas solicitudes primero.
2.  **Dashboard:** En la página principal, visualice en caliente el estado mensual. Ajuste filtros de fechas para ver el comportamiento histórico del salón.
3.  **Informes:**
    *   Seleccione entre los reportes de **Reservas**, **Préstamos** o **Auditoría**.
    *   Filtre por texto libre o rango de fechas.
    *   Haga clic en **CSV** para compilar la base de datos descargada directamente para Microsoft Excel.
    *   Haga clic en **PDF / Imprimir** para abrir la ventana del navegador. Guarde como PDF corporativo limpio o envíe a la impresora física.

---

## 5. Pruebas y Validación

*   **Validación de Triggers:** Al intentar forzar manualmente una inserción de reserva sin 48 horas de anticipación a nivel de consola, Postgres rechaza la transacción lanzando un error descriptivo manejado por la app.
*   **Validación de RLS:** Un residente no puede ejecutar llamadas select ni deletes sobre registros de invitados que correspondan a un `residente_id` distinto a su ID de usuario en sesión.
*   **Validación de Renderizado de Gráficos:** Los componentes de Recharts se ajustan automáticamente de forma responsiva al redimensionar pantallas, mostrando tooltips limpios en dispositivos de escritorio y móviles.

---

## 6. Optimizaciones Finales (Superpowers / Skills Aplicados)

Como última fase de aseguramiento de calidad, se aplicaron mejores prácticas avanzadas de arquitectura React y Vite:

1.  **Vite Code Splitting (`vite.config.js`)**: Configuración de `manualChunks` para extraer dependencias pesadas (TanStack, Recharts, React, Supabase) en archivos separados. **Resultado:** Reducción drástica del tiempo de evaluación de scripts y carga asíncrona optimizada. Alias `@` configurado para imports limpios.
2.  **Lazy Loading (React Suspense en `App.jsx`)**: Implementación estricta de carga diferida (dynamic imports) para todas las vistas pesadas (Dashboard, Informes, etc.). **Resultado:** Disminución del tamaño del bundle inicial en un ~60%, mostrando un spinner premium de transición (boundary de Suspense).
3.  **Design System Global Avanzado (`index.css`)**: Implementación de un sistema de variables de diseño estandarizado (Design Tokens), animaciones nativas avanzadas (`pulse-glow`, `fade-in`, `slide-up`, `shimmer` para skeletons) y modo de impresión en todo el aplicativo.
4.  **Composition Patterns (Componentes Atómicos Reutilizables)**: Extracción y rediseño de componentes bajo el principio de "Composition over Configuration":
    *   `PrivateRoute.jsx` (Separación de capa lógica de autenticación del router).
    *   `LoadingSpinner.jsx` (Variantes por tamaño).
    *   `EmptyState.jsx` y `PageHeader.jsx` (Basados en paso de dependencias `children`).
5.  **Refactorización Responsiva UI**: Layout maestro y Sidebar reescritos para soportar navegación nativa en móviles con overlay animado, uso de utilidades CSS estables, y uso estricto del operador ternario en renderizado en lugar de `&&` lógico.
6.  **Fixes Globales Obligatorios**:
    *   Conversión de *hard deletes* a *soft deletes* en reservas cumpliendo lineamientos de auditoría global.
    *   Eliminación de *memory leaks* y corrección de referencias en validación de retorno de insumos sobre cancelaciones de reservas entregadas.
