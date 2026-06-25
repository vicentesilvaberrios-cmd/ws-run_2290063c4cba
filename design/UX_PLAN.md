# Plan de UX — Configuración de horarios (formulario simple)

> Fix incremental sobre `app/dashboard/horario/`. Camino principal: formulario simple y claro. Secundario: editor avanzado por día.

---

## Pantalla única afectada

### `app/dashboard/horario/page.tsx` — "Horario de atención"
- **Objetivo**: que cualquier persona (baja alfabetización digital) configure el horario de un profesional en pocos clics, sin jerga.
- **Layout**: `.container` + `.stack`. Encabezado (`.title` + `.subtitle`) y debajo `<HoursEditor />`.
- **Subtítulo nuevo** (texto exacto):
  > "Elige los días y horarios en que atiendes. Puedes usar el modo simple o, si necesitas algo distinto cada día, usar el modo avanzado."
- **Responsive**: el encabezado se apila vertical; en ≥640px el título y el subtítulo pueden ir lado a lado con `.cluster`/`justify-between` si se desea.

---

## `app/dashboard/horario/HoursEditor.tsx` — Editor

### Estados globales del componente
- Carga profesionales → `profLoading`: texto "Cargando profesionales…".
- Sin profesionales → `.alert alert-info`: "Primero crea un profesional para configurar su horario." + enlace "Ir a profesionales" (`/dashboard/profesionales`).
- Cargando horario → texto "Cargando horario…".
- Error de carga → `.alert alert-error` con botón "Reintentar".
- Éxito tras guardar → `.alert alert-success` breve: "Horario guardado correctamente."

### Estructura visual (modo SIMPLE — defecto)
- Encapsulado en `.card` con `.stack` interna.
- Toggle superior a la derecha (`.cluster justify-between`): etiqueta "Modo avanzado" + `<input type="checkbox">` con `aria-label="Usar modo avanzado por día"`. Por defecto OFF.

#### 1) Selector de profesional (solo si `professionals.length > 1`)
- `.field` con `<label for="prof">` "Profesional" y `<select id="prof">`.
- Por defecto el primero de la lista.
- Bajo el selector, si está inactivo: `.badge badge-warn` "Inactivo".

#### 2) "¿Qué días atiendes?"
- `.field` con `<label>` "Días que atiendes" y `<p class="text-sm muted">` "Marca los días en que recibes reservas."
- Grupo de 7 casillas en `.cluster gap-2` (wrappea en móvil):
  - Cada una: `<label class="cluster gap-2">` con `<input type="checkbox">` y texto del día (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo — en ese orden).
  - Lunes a Viernes **marcadas** por defecto; Sábado y Domingo **no**.
  - Cada `<input>` con `id="day-0" … id="day-6"` y label `htmlFor` correspondiente.

#### 3) "¿Desde qué hora?" y "¿Hasta qué hora?"
- `.grid grid-sm-2` con dos `.field`:
  - "Desde" → `<select>` con opciones `07:00 … 20:00` en pasos de 30 min. Default `09:00`.
  - "Hasta" → `<select>` igual. Default `18:00`.
  - Formato 24h puro, sin "AM/PM".
  - Validación visual: si `Hasta <= Desde`, marcar con `aria-invalid="true"` + `.error-text` "La hora de cierre debe ser posterior a la de apertura."

#### 4) Toggle "¿Tomas un descanso (colación)?"
- `<label class="cluster">` con `<input type="checkbox">` + texto "¿Tomas un descanso (colación)?".
- Cuando activo, se despliega una `.grid grid-sm-2` con:
  - "Descanso desde" → `<select>` 07:00–20:00 / 30min, default `13:00`.
  - "Descanso hasta" → `<select>` igual, default `14:00`.
  - Mismo tratamiento de error si `Hasta_descanso <= Desde_descanso` o si el descanso se sale del horario laboral.
- Si **ningún día** está marcado: deshabilitar el bloque de descanso y mostrar `.muted` "Marca al menos un día para configurar el descanso."

#### 5) Botón "Guardar horario"
- `<button class="btn btn-primary btn-block">` con texto "Guardar horario".
- Disabled mientras guarda: texto cambia a "Guardando…" + `aria-busy="true"`.
- Acción: para cada día marcado, `DELETE` filas existentes del profesional (`/api/business-hours?professionalId=…` y `/api/breaks?professionalId=…`) y luego `POST` las nuevas filas del día. Si hay descanso activado, crear también la fila de break.

#### 6) Resumen en texto claro (debajo del botón)
- `.panel` con borde suave, encabezado `Resumen de tu horario` y cuerpo en español plano:
  - Si todos los días marcados tienen mismo horario: "Atiendes de [días, ej. "Lunes a Viernes"] de [Desde] a [Hasta][, con descanso de D a H]."
  - Si el usuario marcó días no contiguos (p. ej. Lun, Mié, Vie): listar literalmente, ej. "Atiendes Lunes, Miércoles y Viernes, de 09:00 a 18:00, con descanso de 13:00 a 14:00."
  - Si Sábado/Domingo marcados: incluirlos en el mismo formato.
  - Si no hay descanso: omitir la parte del descanso.
  - Si no marcó días: "Aún no marcaste días. Selecciona al menos uno para guardar."
- El resumen se **actualiza en vivo** (a medida que cambian selects y checkboxes).

### Modo AVANZADO (detrás del toggle, opcional)
- Cuando el toggle está activo, **se oculta** el formulario simple y se muestra la UI actual bloque-por-bloque (`addHour/deleteHour/addBreak/deleteBreak`), reutilizando exactamente lo ya existente.
- Mostrar un `.alert alert-info` arriba: "Estás en modo avanzado. Los cambios que hagas aquí reemplazarán el horario configurado en modo simple."
- El toggle siempre visible arriba a la derecha.

### Accesibilidad (toda la pantalla)
- Cada `.field` con `<label>` visible asociado por `htmlFor`/`id`.
- Checkboxes de días con texto visible (no solo casillas vacías).
- Errores con `aria-invalid="true"` + `.error-text` + `aria-describedby`.
- Estados no comunicados solo por color: usar `.badge-ok/-warn/-danger` con texto.
- Foco visible (ya cubierto por `:focus-visible` global).
- Tablas del modo avanzado dentro de `.table-wrap` con scroll horizontal en móvil.

### Responsive
- `.grid grid-sm-2` en los pares "Desde/Hasta" y "Descanso desde/hasta".
- Días: `.cluster` con `flex-wrap` (se reordenan en móvil).
- Botón "Guardar horario": `btn-block` en móvil, tamaño normal en escritorio.
- Selector de profesional a ancho completo en móvil (`<select class="w-full">`).

### Copy de referencia (catálogo de strings)
- Títulos: "Horario de atención", "¿Qué días atiendes?", "Horario de atención", "¿Tomas un descanso (colación)?", "Resumen de tu horario".
- Botones: "Guardar horario", "Reintentar", "Ir a profesionales", "Añadir bloque" (avanzado), "Añadir descanso" (avanzado), "Eliminar" (avanzado).
- Mensajes de error (en español humano):
  - "La hora de cierre debe ser posterior a la de apertura."
  - "La hora de fin del descanso debe ser posterior a la de inicio."
  - "El descanso debe estar dentro del horario de atención."
  - "No pudimos guardar el horario. Revisa los datos e inténtalo de nuevo."
  - "No pudimos cargar el horario. Reintentar."
- Mensajes de éxito: "Horario guardado correctamente."
- Vacío (sin profesionales): "Primero crea un profesional para configurar su horario."

### Consistencia con el resto
- Solo clases del design system (`.card`, `.panel`, `.field`, `.input`, `.btn`, `.btn-primary`, `.alert`, `.badge`, `.cluster`, `.grid`, `.stack`).
- Sin estilos inline ni colores hardcodeados (excepto el `style={{ maxWidth }}` ya existente en selects, que se conserva solo si aporta legibilidad).
- Mantener el patrón de navbar y el breadcrumb actual del dashboard sin cambios.