# Resultado — Momo (FIX incremental de configuración de horarios)

## Resumen

Se aplicó un cambio **incremental** sobre la app existente de reservas (Momo) **sin tocar
las migraciones ni los endpoints previos**. El objetivo era reemplazar la pantalla de
configuración de horarios (antes trabajosa, bloque por bloque) por un **formulario simple**
con lenguaje claro y valores por defecto sensatos, manteniendo además un modo avanzado.

El trabajo se concentró en dos archivos del front (App Router):
`app/dashboard/horario/HoursEditor.tsx` y `app/dashboard/horario/page.tsx`. Toda la lógica
de persistencia reutiliza los endpoints ya existentes (`/api/business-hours`, `/api/breaks`,
`/api/professionals`), sin crear nuevas rutas ni cambios de backend.

## Stack real (según archivos del workspace)

- **Next.js 14** (App Router) + **React 18** + **TypeScript** (`package.json`, `next.config.mjs`, `tsconfig.json`).
- **Supabase** como backend de datos vía `@supabase/ssr` y `@supabase/supabase-js`
  (`lib/supabase/server.ts`, `client.ts`, `admin.ts`).
- Multi-tenant por organización mediante `lib/org.ts` (`getCurrentOrg`) y migraciones SQL
  en `supabase/migrations/`.
- No hay otros frameworks (no Django/Flask ni similares).

## Qué se construyó / modificó en este run

### Módulo: Configuración de horarios (`app/dashboard/horario/`)

**`HoursEditor.tsx`** (componente cliente, `'use client'`) — pieza central del cambio:

- **Selector de profesional arriba**: usa `/api/professionals`; por defecto selecciona el
  primero. El `<select>` lista profesionales y marca los inactivos con `(Inactivo)`.
- **Modo simple vs. modo avanzado**: toggle "Modo avanzado". El modo simple es el predeterminado;
  el avanzado conserva la edición por día (estado `newHour`/`newBreak`, `savingDay`,
  altas/bajas por día reutilizando los endpoints).
- **"Días que atiendes"**: casillas Lunes→Domingo (`WEEKDAYS` con valores JS 0=Domingo…6=Sábado),
  con **Lunes a Viernes marcadas por defecto** (`selectedDays = [1,2,3,4,5]`).
- **"Desde" / "Hasta"**: `<select>` generados por `TIME_OPTIONS`, en **pasos de 30 minutos**,
  **limitados a 07:00–20:00**, en **formato 24h sin AM/PM**. Valores por defecto **09:00** y **18:00**.
- **Toggle "¿Tomas un descanso (colación)?"**: al activarse muestra "Descanso desde" / "Descanso
  hasta" con el **mismo rango y pasos**; por defecto **13:00–14:00**.
- **Botón único "Guardar horario"** (`saveSimple`): aplica la configuración a **todos los días
  seleccionados** para el profesional elegido, reescribiendo `business_hours` (y `breaks` si hay
  descanso) vía los endpoints existentes.
- **Resumen en texto claro** (`buildSummary`): genera frases como
  *"Atiendes de Lunes a Viernes, de 09:00 a 18:00, con descanso de 13:00 a 14:00."* Detecta el
  caso "Lunes a Viernes", "todos los días" y enumera días sueltos con "y".
- **Precarga**: al elegir un profesional, el formulario se semilla con su horario actual (días,
  horas y descanso) usando `formInitRef` para no repisar lo que edita el usuario.
- **Validaciones de UI**: estados `timeError` / `breakError` / `errorMsg`, `aria-invalid`,
  `aria-describedby`, `aria-busy`, y deshabilitado del botón vía `canSave`.

**`page.tsx`**: ajusta el título ("Horario de atención") y el subtítulo para describir el nuevo
formulario simple y la opción de modo avanzado.

### Backend reutilizado (no modificado en este run)

- `app/api/business-hours/route.ts` y `app/api/business-hours/[id]/route.ts`
- `app/api/breaks/route.ts` y `app/api/breaks/[id]/route.ts`
- `app/api/professionals/`
- Ambos `route.ts` validan `weekday` (0–6), `start_time`, `end_time` y `professional_id`,
  aplican `org_id` desde `getCurrentOrg()` y filtran por `professionalId` en el GET.

## Archivos reales relevantes en el workspace

- `app/dashboard/horario/HoursEditor.tsx` *(modificado — formulario simple + modo avanzado)*
- `app/dashboard/horario/page.tsx` *(modificado — subtítulo)*
- `app/api/business-hours/route.ts`, `app/api/business-hours/[id]/`
- `app/api/breaks/route.ts`, `app/api/breaks/[id]/`
- `app/api/professionals/`, `app/api/appointments/`, `app/api/clients/`,
  `app/api/services/`, `app/api/public/`, `app/api/cron/`
- `lib/org.ts`, `lib/availability.ts`, `lib/email.ts`, `lib/format.ts`, `lib/database.types.ts`
- `lib/supabase/server.ts`, `client.ts`, `admin.ts`
- `app/dashboard/` (agenda, clientes, servicios, profesionales, resumen, layout, page)
- `app/book/`, `app/(auth)/`, `middleware.ts`
- `supabase/migrations/0001_init.sql` … `0006_professionals.sql`

## Cómo correrlo

Requiere las variables de entorno de Supabase configuradas.

```bash
npm install
npm run dev     # desarrollo (http://localhost:3000)
npm run build   # build de producción
npm run start   # servir build
npm run lint    # ESLint (eslint-config-next)
```

La pantalla está en `/dashboard/horario`.

## Criterios de aceptación CUBIERTOS

- ✅ La pantalla muestra por defecto un formulario simple, no la tabla bloque-por-bloque.
- ✅ "Que días atiendes?" con casillas Lunes a Domingo y Lunes a Viernes marcadas por defecto.
- ✅ "Desde"/"Hasta" como desplegables 24h en pasos de 30 min, limitados a 07:00–20:00,
  con 09:00 y 18:00 por defecto y sin AM/PM.
- ✅ Toggle "¿Tomas un descanso (colación)?" muestra desde/hasta con mismo rango/pasos y
  por defecto 13:00–14:00.
- ✅ Botón único "Guardar horario" aplica la configuración a todos los días seleccionados
  para el profesional elegido, usando `business_hours` y `breaks`.
- ✅ Selector de profesional arriba (por defecto el primero); muestra estado inactivo.
- ✅ Resumen en texto claro debajo.
- ✅ Modo avanzado/por día conservado tras un toggle.
- ✅ No se modificaron migraciones ni endpoints previos; se respeta el esquema
  (`business_hours`/`breaks` con `professional_id`) y el multi-tenant vía `org_id`.

## PENDIENTES / limitaciones reales

- El "guardar todos los días" se implementa en el cliente como **borrado + alta** por día a
  través de los endpoints existentes (varias llamadas HTTP), no como una operación atómica de
  servidor; si falla a mitad de proceso podría quedar un estado parcial.
- El formulario simple aplica el **mismo** horario a todos los días seleccionados; horarios
  distintos por día requieren el **modo avanzado**.
- Las garantías que se piden NO romper (reserva pública, agenda, fichas, recordatorio con
  `reminder_sent_at`, email, RLS multi-tenant, constraint de no-solape por profesional,
  tz America/Santiago, formato 24h, precios CLP) residen en migraciones/endpoints/`lib`
  preexistentes; este run **no las alteró**, pero su verificación funcional completa queda
  fuera del alcance de este cambio de UI.

## Despliegue

✅ Desplegado y verificado en Railway (build OK).
