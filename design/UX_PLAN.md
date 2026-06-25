# Plan de UX — Múltiples profesionales

Alcance: CRUD de profesionales, horarios y descansos por profesional, selección de profesional en reserva pública y agenda. Mantener reserva pública, agenda, fichas, recordatorio, RLS multi-tenant, no-solape, zona horaria Chile y CLP.

Convenciones del design system: `.container`, `.card`, `.panel`, `.btn`/`.btn-primary`/`.btn-danger`/`.btn-ghost`/`.btn-sm`, `.field`/`.input`, `.table`/`.table-wrap`, `.badge` (`-ok`/`-warn`/`-danger`/`-info`), `.alert` (`-error`/`-info`/`-success`), `.navbar`, `.kpi`, `.empty-state`, `.grid` (`-sm-2`/`-md-3`/`-md-4`), `.cluster`, `.stack`. Sin jerga técnica en UI; verbos del dominio.

---

## 1. `app/dashboard/layout.tsx` (EDIT) — Navegación del panel

- **Objetivo:** que el dueño acceda a la gestión de profesionales desde la barra superior.
- **Cambio:** añadir un nuevo `Link` en `.navbar-nav` con texto "Profesionales", entre "Servicios" y "Horario" (orden natural del flujo: servicios → profesionales → horario → agenda).
- **Copy:** etiqueta `Profesionales` (consistente con el resto: Inicio, Resumen, Servicios, Horario, Agenda, Fichas).
- **Accesibilidad:** el link comparte el patrón `aria-label="Panel"` del nav existente; el foco visible global del design system aplica.
- **Responsive:** sin cambios; la navbar ya hace `flex-wrap: wrap`.

---

## 2. `app/dashboard/profesionales/page.tsx` (NEW) + `ProfessionalsManager.tsx` (NEW) — Gestión de profesionales

### 2.1 Ruta
- **Path:** `app/dashboard/profesionales/page.tsx`.
- **Objetivo para el usuario:** administrar el equipo: agregar personas, editar su nombre, activarlas o desactivarlas, y eliminarlas cuando ya no trabajan en el negocio.

### 2.2 Layout y componentes
- Contenedor `.container` `.stack`.
- Cabecera: `<h1>Profesionales</h1>` + `.subtitle` "Agrega a tu equipo para asignar horarios y citas por persona."
- `.card` que envuelve `ProfessionalsManager` (formulario de alta) + `.card` con `.table-wrap` (listado).
- `ProfessionalsManager` (cliente): estados de carga, vacío, error y éxito; usa los mismos patrones que `HoursEditor` y `AgendaList`.

### 2.3 Copy de la UI (en español, sin jerga)
- **Formulario "Agregar profesional":**
  - `<label>` "Nombre del profesional" (placeholder "Ej: Camila Rojas").
  - Botón primario `.btn .btn-primary`: **"Agregar profesional"**.
  - Botón secundario (al editar, cancelar): "Cancelar".
- **Tabla de profesionales (`.table` con `.table-wrap`):**
  - Columnas: `Nombre`, `Estado`, `Acciones` (`<th>` con `scope="col"`; `sr-only` para "Editar"/"Eliminar" si van con icono).
  - Estado: `.badge .badge-ok` "Activo" / `.badge .badge-warn` "Inactivo".
  - Acciones por fila:
    - Editar nombre → botón `.btn .btn-sm .btn-ghost` "Editar".
    - Activar/Desactivar → botón `.btn .btn-sm .btn-ghost` "Desactivar" o "Activar" (etiqueta cambia según estado actual; el cambio se hace de inmediato, sin modal).
    - Eliminar → botón `.btn .btn-sm .btn-danger` "Eliminar" (acción destructiva: pide confirmación).
- **Confirmación de eliminación:** `window.confirm('¿Eliminar a [Nombre]? Sus horarios quedarán sin asignar.')`. Texto humano, menciona la consecuencia, no jerga.
- **Estados:**
  - Cargando: `<p class="muted">Cargando profesionales…</p>`.
  - Vacío (`.empty-state`): "Aún no hay profesionales. Agrega al primero para empezar a asignar horarios y citas."
  - Error (`.alert .alert-error` con botón "Reintentar"): "No pudimos cargar los profesionales."
  - Error de campo al guardar: `.error-text` junto al input; "Escribe un nombre para continuar."
  - Éxito al guardar/desactivar/eliminar: `.alert .alert-success` breve "Listo, guardamos los cambios." (auto-dismiss tras unos segundos o al cerrar).

### 2.4 Formulario de edición
- Al pulsar "Editar", la fila se transforma en inputs (o aparece una mini `.panel` debajo) con `Nombre` y dos botones: **"Guardar"** (`.btn .btn-sm .btn-primary`) y **"Cancelar"** (`.btn .btn-sm .btn-ghost`).
- `aria-invalid` y `aria-describedby` en el input; mensaje de error visible con `.error-text`.

### 2.5 Responsive
- Móvil: la tabla va en `.table-wrap` (scroll horizontal). Bajo 640px el formulario "Agregar profesional" apila label/input/botón verticalmente con `.cluster` que ya hace `flex-wrap`.

### 2.6 Accesibilidad
- Todo input con `<label htmlFor>`. Botones con texto visible (sin icono-only).
- Estado no comunicado solo por color: combinar `.badge` con texto ("Activo"/"Inactivo").
- Foco visible heredado del design system.

---

## 3. `app/dashboard/horario/HoursEditor.tsx` (EDIT) — Horarios y descansos por profesional

### 3.1 Objetivo
El dueño configura los bloques de atención y descansos de **cada profesional**, no del negocio en general.

### 3.2 Cambio de layout
- Encima del listado por día, dentro de un `.card`, agregar un selector de profesional:
  - `<label htmlFor="hours-professional">Profesional</label>`
  - `<select>` con profesionales activos (y, si los hay, la opción por defecto migrada). Si no hay profesionales: `.alert .alert-info` "Primero crea un profesional para configurar su horario."
- El resto del editor (bloques y descansos por día) se mantiene tal cual, pero cada POST/PUT debe incluir `professional_id`.

### 3.3 Copy
- Etiqueta del selector: "Profesional".
- Texto introductorio (en `horario/page.tsx`): actualizar el `.subtitle` a "Marca cuándo atiende cada profesional y sus descansos. Tus clientes verán horarios según la persona que elijan."
- Si el profesional está inactivo, mostrar nota discreta: `<span class="badge badge-warn">Inactivo</span>` junto al nombre en el selector.
- Mensajes de error existentes se mantienen, humanizados: "No pudimos guardar el bloque.", "No pudimos guardar el descanso.", "No pudimos cargar el horario."

### 3.4 Estados (sin cambios estructurales)
- Cargando: "Cargando horario…".
- Vacío por día: "Sin bloques. Este día no estará disponible para reservar." (mismo texto; aplica al profesional seleccionado).
- Error con reintento: ya cubierto.

### 3.5 Responsive y a11y
- `.cluster` para el selector + etiqueta en móvil apila verticalmente.
- `<label>` asociado a cada `<select>`/`<input>`; errores con `aria-invalid` y `aria-describedby`.

### 3.6 Comportamiento al cambiar de profesional
- Al cambiar el `select`, recargar bloques y descansos del nuevo profesional.
- Si hay cambios sin guardar, mostrar `window.confirm('Tienes cambios sin guardar en el horario actual. ¿Cambiar de profesional igualmente?')` antes de descartar.

---

## 4. `app/book/[slug]/BookingWizard.tsx` (EDIT) — Reserva pública con selección de profesional

### 4.1 Objetivo
El cliente final elige quién lo atiende, o deja que el negocio le asigne cualquiera disponible.

### 4.2 Nuevo paso
Insertar un **Paso 1.5 — Profesional** entre "Servicio" y "Fecha". Numeración actual: 1 Servicio, 2 Fecha, 3 Horario, 4 Datos, 5 Confirmar. El nuevo paso se coloca como **nuevo paso 2**, desplazando los demás:

- 1 Servicio
- **2 Profesional** (nuevo)
- 3 Fecha
- 4 Horario
- 5 Datos
- 6 Confirmar

Actualizar `STEP_LABELS` y el indicador de pasos superior.

### 4.3 Carga de datos
- Al llegar al paso 2, llamar a `/api/public/[slug]/professionals` (nuevo). Mostrar `<p class="muted">Cargando profesionales…</p>` mientras tanto; error con `.alert .alert-error` y botón "Reintentar".
- Si la lista está vacía: `.empty-state` "Este negocio aún no tiene profesionales disponibles. Vuelve a intentarlo más tarde." (improbable por backfill, pero cubrir el caso).

### 4.4 UI del selector
- `<h2>¿Con quién quieres tu cita?</h2>`.
- Opciones en `.grid .grid-sm-2` (botones `.btn .btn-ghost .btn-block`, o `.btn-primary` cuando esté seleccionado):
  - **"Cualquiera disponible"** (opción por defecto, seleccionada al entrar). Texto secundario `.muted .text-sm`: "Te asignaremos al primero libre."
  - Por cada profesional activo: nombre + (opcional) `.muted .text-sm` con un dato útil del dominio, p. ej. "Disponible toda la semana" o el primer bloque libre del día. Sin jerga.
- Botón **"Siguiente"** (`.btn .btn-primary`) abajo; al pulsar, fija selección y pasa al paso 3 (Fecha).
- Botón **"Atrás"** (`.btn .btn-ghost`) para volver a Servicio.
- Si el usuario llega al paso 3 sin haber pasado por el 2 (estado legacy), preseleccionar "Cualquiera disponible" sin romper flujo.

### 4.5 Cambio en disponibilidad y POST
- `loadSlots` envía también `professionalId` (o `null`/omitido para "cualquiera") a `/api/public/[slug]/availability`.
- El POST de reserva en `handleConfirm` envía `professionalId` en el cuerpo.
- Almacenar `professionalName` (y `professionalId` por si se necesita) en `sessionStorage` junto al resto de la confirmación.

### 4.6 Mensajes nuevos
- Si tras seleccionar profesional la lista de horarios queda vacía en una fecha: "No hay horarios disponibles con [Nombre] para ese día. Prueba otra fecha o elige otro profesional." + botón "Cambiar profesional".
- Si la reserva devuelve 409 (sollo): "Ese horario acaba de ser reservado por otra persona. Te mostraremos las opciones disponibles." (mensaje existente, verificar que aplica al profesional seleccionado).
- Confirmación: añadir al `panel` de resumen una línea `Profesional` con el nombre (o "Cualquiera disponible" si el back lo asigna).

### 4.7 Indicador de pasos
- Actualizar la barra de pasos para que muestre 6 pasos; truncar texto en móvil con `text-sm` y permitir scroll horizontal si no entra.

### 4.8 Responsive y a11y
- Móvil: el grid de profesionales pasa a una columna; los botones mantienen altura táctil ≥ 40px.
- Cada botón-profesional es navegable con teclado; `aria-pressed` para indicar selección.
- `<select>` no se usa aquí (mejor experiencia con grid de botones), pero si en el futuro se agrega filtro, mantener `<label>` asociado.

---

## 5. `app/book/[slug]/confirmacion/page.tsx` (EDIT) — Confirmación pública

### 5.1 Objetivo
Mostrar al cliente el nombre del profesional con el que quedó agendado, cuando esté disponible.

### 5.2 Cambio
- Añadir `professionalName?: string` a la interfaz `BookingData` (campo opcional).
- En el `.panel` de resumen, insertar una nueva fila entre "Servicio" y "Duración" (o justo después de "Servicio", según jerarquía visual):
  - `<span class="muted text-sm">Profesional</span>` + valor con `font-weight: 600`.
- Si `professionalName` viene vacío o ausente (caso legacy o asignado por sistema sin nombre), **omitir la fila** (no mostrar label sin valor).
- Sin cambios en estados de carga, vacío, error ni en el copy del badge "Reserva confirmada".

### 5.3 Responsive y a11y
- Sin cambios estructurales; el `.panel` ya es responsive.
- Si se omite la fila, no afecta al flujo de teclado ni al foco del `<h1>`.

---

## 6. `app/dashboard/agenda/AgendaList.tsx` (EDIT) — Agenda y formulario de cita manual

### 6.1 Objetivo
El dueño ve quién atiende cada cita y puede crear citas eligiendo profesional.

### 6.2 Listado de agenda
- Añadir una nueva columna `Profesional` en la `.table` de citas, entre `Servicio` y `Cliente` (orden natural: cuándo → qué → con quién → para quién).
- Celda: nombre del profesional. Si llega vacío (datos legacy), mostrar `—`.
- Sin cambios en KPIs, ni en el filtro por día.

### 6.3 Formulario "Nueva cita" (`CreateAppointmentForm`)
- Añadir un nuevo `.field` con el selector de profesional **encima** del selector de servicio (o entre servicio y horarios; recomendado **encima de servicio** para que la disponibilidad se filtre primero por persona y luego por servicio):
  - `<label htmlFor="form-professional">Profesional</label>`
  - `<select>` con profesionales activos. Opción por defecto: "Selecciona un profesional".
  - `aria-invalid` + `.error-text` si está vacío al enviar: "Elige un profesional para la cita."
- Al cambiar de profesional (o de servicio), recargar `slots` desde la API correspondiente enviando ambos parámetros.
- El POST debe incluir `professional_id`.
- Estado vacío del selector: si no hay profesionales activos, `.alert .alert-info` "Crea y activa un profesional antes de agendar citas."

### 6.4 Copy y mensajes
- Etiqueta del nuevo selector: "Profesional".
- Mensaje de éxito al guardar: añadir variante según `email_sent`. Ya existe; verificar que sigue siendo humano.
- Error de solapamiento (409) desde la API: traducir a "Ya tienes una cita de [Nombre del cliente] con [Profesional] en ese horario. Elige otro horario o profesional." (mantener tono humano).

### 6.5 Estados
- Cargando profesionales: `<p class="muted">Cargando profesionales…</p>` (dentro del formulario).
- Error cargando profesionales: `.alert .alert-error` con botón "Reintentar".
- El resto de estados (slots, error de envío, éxito) ya están cubiertos con el patrón actual.

### 6.6 Responsive y a11y
- La nueva columna aumenta el ancho de la tabla; se mantiene en `.table-wrap` (scroll horizontal en móvil).
- Selector con `<label>` asociado; mensajes de error con `aria-invalid` y `aria-describedby`.

---

## 7. Consistencia transversal

- **Botones primarios** solo uno por vista/paso: "Agregar profesional", "Siguiente", "Guardar cita", "Confirmar reserva".
- **Acciones destructivas** siempre con confirmación (`window.confirm` con texto humano) y color `.btn-danger`.
- **Estados** uniformes en todas las pantallas: cargando (`<p class="muted">Cargando…</p>`), vacío (`.empty-state`), error (`.alert .alert-error` + reintentar), éxito (`.alert .alert-success` breve).
- **Sin jerga**: nunca "CRUD", "endpoint", "API", "id", "submit" en UI. Verbos del dominio: agregar, editar, desactivar, eliminar, guardar, confirmar, reservar.
- **Zona horaria y moneda**: textos existentes (formato Chile) se mantienen; no se introducen campos nuevos que las expongan.
- **Multitenant**: la nueva página de profesionales hereda `org` desde el layout del dashboard; no requiere login adicional.

## 8. Resumen de copy nuevo (catálogo rápido)

- Títulos: "Profesionales", "¿Con quién quieres tu cita?", "Editar profesional".
- Etiquetas: "Nombre del profesional", "Profesional".
- Botones: "Agregar profesional", "Guardar", "Cancelar", "Editar", "Desactivar", "Activar", "Eliminar", "Reintentar", "Cambiar profesional".
- Opciones: "Cualquiera disponible".
- Estados: "Cargando profesionales…", "Cargando horario…", "Aún no hay profesionales.", "No pudimos cargar los profesionales.", "Escribe un nombre para continuar.", "Listo, guardamos los cambios.", "Elige un profesional para la cita.", "No hay horarios disponibles con [Nombre] para ese día."
- Confirmación destructiva: "¿Eliminar a [Nombre]? Sus horarios quedarán sin asignar."
