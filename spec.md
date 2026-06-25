# Solicitud de cambios (modo fix)

Momo (FIX incremental). NO rompas lo existente: reserva publica, agenda, fichas, recordatorio (endpoint y reminder_sent_at), email, multi-tenant/RLS, el constraint de no-solape POR PROFESIONAL, zona horaria America/Santiago, formato 24h y precios CLP. MEJORA la configuracion de horarios para que sea muy facil y con los menos clicks posibles, entendible para alguien sin mucha educacion.

Reemplaza la pantalla actual de configuracion de horarios (que hoy es trabajosa, bloque por bloque) por un formulario SIMPLE con lenguaje claro y valores por defecto sensatos:

1. "Que dias atiendes?": casillas para Lunes a Domingo, con Lunes a Viernes MARCADAS por defecto.
2. "Desde que hora?" y "Hasta que hora?": menus desplegables en formato 24h, en pasos de 30 minutos, LIMITADOS al rango laboral 07:00 a 20:00 (por defecto 09:00 y 18:00). Sin AM/PM.
3. Toggle opcional "Tomas un descanso (colacion)?": si se activa, muestra "desde" y "hasta" con el mismo rango y pasos (por defecto 13:00 a 14:00).
4. Un solo boton "Guardar horario" que aplica esa configuracion a TODOS los dias seleccionados de una vez: crea o actualiza las filas de business_hours (y de breaks si hay descanso) para cada dia marcado, para el profesional seleccionado.
5. Mostrar un resumen en texto claro debajo, por ejemplo: "Atiendes de Lunes a Viernes, de 09:00 a 18:00, con descanso de 13:00 a 14:00."

Soporte multi-profesional: si el negocio tiene mas de un profesional, un selector arriba para elegir a quien se le configura el horario (por defecto el primero).

Opcional (no el camino principal): mantener un modo "avanzado / por dia" para quien quiera horarios distintos por dia; pero el camino por defecto es el formulario simple de arriba.

Respeta el esquema actual (business_hours y breaks con professional_id), RLS, tz Chile y 24h. Si necesitas tocar la DB usa una migracion nueva incremental (no modifiques las anteriores). Alcance acotado a esta mejora de configuracion de horarios.