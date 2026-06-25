'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface BusinessHour {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface Break {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface Professional {
  id: string;
  name: string;
  active: boolean;
}

// weekday: 0=Domingo, 1=Lunes, … 6=Sábado (estándar JS Date)
const WEEKDAYS: { label: string; value: number }[] = [
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
  { label: 'Domingo', value: 0 },
];

/** Genera opciones 07:00–20:00 en pasos de 30 min (formato 24h). */
const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 7; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) break;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

function buildSummary(
  selectedDays: number[],
  desde: string,
  hasta: string,
  hasBreak: boolean,
  breakStart: string,
  breakEnd: string,
): string {
  if (selectedDays.length === 0) {
    return 'Aún no marcaste días. Selecciona al menos uno para guardar.';
  }

  // Ordenar de Lunes a Domingo
  const ordered = [...selectedDays].sort((a, b) => {
    const ra = a === 0 ? 7 : a;
    const rb = b === 0 ? 7 : b;
    return ra - rb;
  });

  let diasTexto: string;
  // Detectar Lunes a Viernes
  if (
    ordered.length === 5 &&
    ordered.includes(1) && ordered.includes(2) && ordered.includes(3) &&
    ordered.includes(4) && ordered.includes(5)
  ) {
    diasTexto = 'Lunes a Viernes';
  } else if (ordered.length === 7) {
    diasTexto = 'todos los días';
  } else {
    const labels = ordered.map((d) => WEEKDAYS.find((w) => w.value === d)!.label);
    if (labels.length === 1) {
      diasTexto = labels[0];
    } else if (labels.length === 2) {
      diasTexto = `${labels[0]} y ${labels[1]}`;
    } else {
      diasTexto = `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
    }
  }

  let texto = `Atiendes ${diasTexto}, de ${desde} a ${hasta}`;
  if (hasBreak) {
    texto += `, con descanso de ${breakStart} a ${breakEnd}`;
  }
  texto += '.';
  return texto;
}

export function HoursEditor() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [profLoading, setProfLoading] = useState(true);
  const [selectedProf, setSelectedProf] = useState<string>('');

  // Inline add state per day (modo avanzado)
  const [newHour, setNewHour] = useState<Record<number, { start: string; end: string }>>({});
  const [newBreak, setNewBreak] = useState<Record<number, { start: string; end: string }>>({});
  const [savingDay, setSavingDay] = useState<number | null>(null);

  // Modo simple
  const [advancedMode, setAdvancedMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [desde, setDesde] = useState('09:00');
  const [hasta, setHasta] = useState('18:00');
  const [hasBreak, setHasBreak] = useState(false);
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadProfessionals = useCallback(async () => {
    setProfLoading(true);
    try {
      const res = await fetch('/api/professionals');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfessionals(data);
      if (data.length > 0 && !selectedProf) {
        setSelectedProf(data[0].id);
      }
    } catch {
      // handled by empty state
    } finally {
      setProfLoading(false);
    }
  }, [selectedProf]);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  const loadAll = useCallback(async () => {
    if (!selectedProf) return;
    setLoading(true);
    setError(false);
    try {
      const [hRes, bRes] = await Promise.all([
        fetch(`/api/business-hours?professionalId=${selectedProf}`),
        fetch(`/api/breaks?professionalId=${selectedProf}`),
      ]);
      if (!hRes.ok || !bRes.ok) throw new Error();
      const [hData, bData] = await Promise.all([hRes.json(), bRes.json()]);
      setHours(hData);
      setBreaks(bData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedProf]);

  useEffect(() => {
    if (selectedProf) loadAll();
    else { setHours([]); setBreaks([]); setLoading(false); }
  }, [selectedProf, loadAll]);

  // Limpiar mensaje de éxito al cambiar cualquier campo del formulario simple
  useEffect(() => {
    setSuccessMsg('');
  }, [selectedDays, desde, hasta, hasBreak, breakStart, breakEnd, selectedProf]);

  const validateTime = (start: string, end: string): string | null => {
    if (!start || !end) return 'Completa la hora de inicio y fin';
    if (start >= end) return 'La hora de fin debe ser posterior a la de inicio';
    return null;
  };

  // ---- Funciones del modo avanzado (existentes) ----
  const addHour = async (weekday: number) => {
    const entry = newHour[weekday] || { start: '', end: '' };
    const err = validateTime(entry.start, entry.end);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setSavingDay(weekday);
    setErrorMsg('');
    try {
      const res = await fetch('/api/business-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekday, start_time: entry.start, end_time: entry.end, professional_id: selectedProf }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No pudimos guardar el bloque.');
      }
      const created = await res.json();
      setHours((prev) => [...prev, created]);
      setNewHour((prev) => ({ ...prev, [weekday]: { start: '', end: '' } }));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'No pudimos guardar el bloque.');
    } finally {
      setSavingDay(null);
    }
  };

  const deleteHour = async (id: string) => {
    try {
      await fetch(`/api/business-hours/${id}`, { method: 'DELETE' });
      setHours((prev) => prev.filter((h) => h.id !== id));
    } catch {
      // ignore
    }
  };

  const addBreak = async (weekday: number) => {
    const entry = newBreak[weekday] || { start: '', end: '' };
    const err = validateTime(entry.start, entry.end);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setSavingDay(weekday);
    setErrorMsg('');
    try {
      const res = await fetch('/api/breaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekday, start_time: entry.start, end_time: entry.end, professional_id: selectedProf }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No pudimos guardar el descanso.');
      }
      const created = await res.json();
      setBreaks((prev) => [...prev, created]);
      setNewBreak((prev) => ({ ...prev, [weekday]: { start: '', end: '' } }));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'No pudimos guardar el descanso.');
    } finally {
      setSavingDay(null);
    }
  };

  const deleteBreak = async (id: string) => {
    try {
      await fetch(`/api/breaks/${id}`, { method: 'DELETE' });
      setBreaks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      // ignore
    }
  };

  // ---- Guardado del modo simple ----
  const timeError = desde && hasta && hasta <= desde
    ? 'La hora de cierre debe ser posterior a la de apertura.'
    : '';

  const breakError = useMemo(() => {
    if (!hasBreak) return '';
    if (breakEnd <= breakStart) return 'La hora de fin del descanso debe ser posterior a la de inicio.';
    if (breakStart < desde || breakEnd > hasta) return 'El descanso debe estar dentro del horario de atención.';
    return '';
  }, [hasBreak, breakStart, breakEnd, desde, hasta]);

  const canSave = selectedDays.length > 0 && !timeError && !breakError && !saving;

  const saveSimple = async () => {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      for (const weekday of selectedDays) {
        // Borrar bloques existentes del día
        const dayHours = hours.filter((h) => h.weekday === weekday);
        const dayBreaks = breaks.filter((b) => b.weekday === weekday);
        await Promise.all([
          ...dayHours.map((h) => fetch(`/api/business-hours/${h.id}`, { method: 'DELETE' })),
          ...dayBreaks.map((b) => fetch(`/api/breaks/${b.id}`, { method: 'DELETE' })),
        ]);

        // Crear nuevo bloque de atención
        const bhRes = await fetch('/api/business-hours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekday, start_time: desde, end_time: hasta, professional_id: selectedProf }),
        });
        if (!bhRes.ok) throw new Error('No pudimos guardar el horario.');

        // Crear descanso si corresponde
        if (hasBreak) {
          const brRes = await fetch('/api/breaks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekday, start_time: breakStart, end_time: breakEnd, professional_id: selectedProf }),
          });
          if (!brRes.ok) throw new Error('No pudimos guardar el descanso.');
        }
      }
      await loadAll();
      setSuccessMsg('Horario guardado correctamente.');
    } catch {
      setErrorMsg('No pudimos guardar el horario. Revisa los datos e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const summary = buildSummary(selectedDays, desde, hasta, hasBreak, breakStart, breakEnd);

  // ---- Render: estados de carga / vacío / error ----
  if (profLoading) return <p className="muted">Cargando profesionales…</p>;

  if (!profLoading && professionals.length === 0) {
    return (
      <div className="alert alert-info">
        Primero crea un profesional para configurar su horario.{' '}
        <a href="/dashboard/profesionales" className="link">Ir a profesionales</a>
      </div>
    );
  }

  if (loading) return <p className="muted">Cargando horario…</p>;
  if (error) {
    return (
      <div className="alert alert-error" role="alert">
        No pudimos cargar el horario.{' '}
        <button className="btn btn-sm btn-ghost" onClick={loadAll}>Reintentar</button>
      </div>
    );
  }

  const selectedProfessional = professionals.find((p) => p.id === selectedProf);

  const DAYS_FULL: { label: string; weekday: number }[] = [
    { label: 'Domingo', weekday: 0 },
    { label: 'Lunes', weekday: 1 },
    { label: 'Martes', weekday: 2 },
    { label: 'Miércoles', weekday: 3 },
    { label: 'Jueves', weekday: 4 },
    { label: 'Viernes', weekday: 5 },
    { label: 'Sábado', weekday: 6 },
  ];

  return (
    <div className="stack">
      {/* Selector de profesional + toggle de modo */}
      <div className="card stack">
        <div className="cluster justify-between">
          {professionals.length > 1 ? (
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label htmlFor="prof">Profesional</label>
              <select
                id="prof"
                value={selectedProf}
                onChange={(e) => setSelectedProf(e.target.value)}
                style={{ maxWidth: 320 }}
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{!p.active ? ' (Inactivo)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div />
          )}
          <label className="cluster gap-2" style={{ marginBottom: 0 }}>
            <span className="text-sm">Modo avanzado</span>
            <input
              type="checkbox"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
              aria-label="Usar modo avanzado por día"
            />
          </label>
        </div>
        {selectedProfessional && !selectedProfessional.active && (
          <span className="badge badge-warn" style={{ alignSelf: 'flex-start' }}>Inactivo</span>
        )}
      </div>

      {/* ====== MODO SIMPLE ====== */}
      {!advancedMode && (
        <div className="card stack">
          {/* Días */}
          <div className="field">
            <label>Días que atiendes</label>
            <p className="text-sm muted">Marca los días en que recibes reservas.</p>
            <div className="cluster gap-2">
              {WEEKDAYS.map((day) => (
                <label key={day.value} className="cluster gap-2">
                  <input
                    type="checkbox"
                    id={`day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          {/* Desde / Hasta */}
          <div className="grid grid-sm-2">
            <div className="field">
              <label htmlFor="desde">Desde</label>
              <select
                id="desde"
                value={desde}
                onChange={(e) => { setDesde(e.target.value); setErrorMsg(''); }}
                aria-invalid={!!timeError}
                aria-describedby={timeError ? 'desde-error' : undefined}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {timeError && <span id="desde-error" className="error-text">{timeError}</span>}
            </div>
            <div className="field">
              <label htmlFor="hasta">Hasta</label>
              <select
                id="hasta"
                value={hasta}
                onChange={(e) => { setHasta(e.target.value); setErrorMsg(''); }}
                aria-invalid={!!timeError}
                aria-describedby={timeError ? 'hasta-error' : undefined}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {timeError && <span id="hasta-error" className="error-text">{timeError}</span>}
            </div>
          </div>

          {/* Descanso / colación */}
          <div className="field">
            <label className="cluster gap-2">
              <input
                type="checkbox"
                checked={hasBreak}
                onChange={(e) => setHasBreak(e.target.checked)}
              />
              ¿Tomas un descanso (colación)?
            </label>

            {hasBreak && (
              <>
                {selectedDays.length === 0 ? (
                  <p className="text-sm muted">Marca al menos un día para configurar el descanso.</p>
                ) : (
                  <div className="grid grid-sm-2">
                    <div className="field">
                      <label htmlFor="break-start">Descanso desde</label>
                      <select
                        id="break-start"
                        value={breakStart}
                        onChange={(e) => { setBreakStart(e.target.value); setErrorMsg(''); }}
                        aria-invalid={!!breakError}
                        aria-describedby={breakError ? 'break-error' : undefined}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="break-end">Descanso hasta</label>
                      <select
                        id="break-end"
                        value={breakEnd}
                        onChange={(e) => { setBreakEnd(e.target.value); setErrorMsg(''); }}
                        aria-invalid={!!breakError}
                        aria-describedby={breakError ? 'break-error' : undefined}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    {breakError && (
                      <span id="break-error" className="error-text" style={{ gridColumn: '1 / -1' }}>{breakError}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Errores y éxito */}
          {errorMsg && (
            <div className="alert alert-error" role="alert">{errorMsg}</div>
          )}
          {successMsg && (
            <div className="alert alert-success" role="status">{successMsg}</div>
          )}

          {/* Botón guardar */}
          <button
            className="btn btn-primary btn-block"
            onClick={saveSimple}
            disabled={!canSave}
            aria-busy={saving}
          >
            {saving ? 'Guardando…' : 'Guardar horario'}
          </button>

          {/* Resumen */}
          <div className="panel">
            <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600 }}>Resumen de tu horario</h3>
            <p className="text-sm">{summary}</p>
          </div>
        </div>
      )}

      {/* ====== MODO AVANZADO ====== */}
      {advancedMode && (
        <>
          <div className="alert alert-info">
            Estás en modo avanzado. Los cambios que hagas aquí reemplazarán el horario configurado en modo simple.
          </div>

          {errorMsg && (
            <div className="alert alert-error" role="alert">{errorMsg}</div>
          )}

          {DAYS_FULL.map(({ label: dayName, weekday }) => {
            const dayHours = hours.filter((h) => h.weekday === weekday).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const dayBreaks = breaks.filter((b) => b.weekday === weekday).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const hourEntry = newHour[weekday] || { start: '', end: '' };
            const breakEntry = newBreak[weekday] || { start: '', end: '' };

            return (
              <div key={weekday} className="card stack">
                <h2 style={{ fontSize: 'var(--fs-xl)' }}>{dayName}</h2>

                {dayHours.length === 0 && (
                  <p className="text-sm muted">Sin bloques. Este día no estará disponible para reservar.</p>
                )}

                {dayHours.length > 0 && (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th scope="col">Desde</th>
                          <th scope="col">Hasta</th>
                          <th scope="col"><span className="sr-only">Eliminar</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayHours.map((h) => (
                          <tr key={h.id}>
                            <td>{h.start_time.slice(0, 5)}</td>
                            <td>{h.end_time.slice(0, 5)}</td>
                            <td>
                              <button className="btn btn-sm btn-danger" onClick={() => deleteHour(h.id)}>
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="cluster gap-2">
                  <label htmlFor={`hour-start-${weekday}`} className="sr-only">Hora de inicio</label>
                  <input
                    id={`hour-start-${weekday}`}
                    type="time"
                    value={hourEntry.start}
                    onChange={(e) => setNewHour((prev) => ({
                      ...prev,
                      [weekday]: { ...hourEntry, start: e.target.value },
                    }))}
                    style={{ maxWidth: 120 }}
                  />
                  <label htmlFor={`hour-end-${weekday}`} className="sr-only">Hora de fin</label>
                  <input
                    id={`hour-end-${weekday}`}
                    type="time"
                    value={hourEntry.end}
                    onChange={(e) => setNewHour((prev) => ({
                      ...prev,
                      [weekday]: { ...hourEntry, end: e.target.value },
                    }))}
                    style={{ maxWidth: 120 }}
                  />
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => addHour(weekday)}
                    disabled={savingDay === weekday}
                  >
                    Añadir bloque
                  </button>
                </div>

                {dayBreaks.length > 0 && (
                  <div className="table-wrap">
                    <p className="text-sm muted" style={{ fontWeight: 600 }}>Descansos</p>
                    <table className="table">
                      <thead>
                        <tr>
                          <th scope="col">Desde</th>
                          <th scope="col">Hasta</th>
                          <th scope="col"><span className="sr-only">Eliminar</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayBreaks.map((b) => (
                          <tr key={b.id}>
                            <td>{b.start_time.slice(0, 5)}</td>
                            <td>{b.end_time.slice(0, 5)}</td>
                            <td>
                              <button className="btn btn-sm btn-danger" onClick={() => deleteBreak(b.id)}>
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="cluster gap-2">
                  <label htmlFor={`break-start-${weekday}`} className="sr-only">Inicio del descanso</label>
                  <input
                    id={`break-start-${weekday}`}
                    type="time"
                    value={breakEntry.start}
                    onChange={(e) => setNewBreak((prev) => ({
                      ...prev,
                      [weekday]: { ...breakEntry, start: e.target.value },
                    }))}
                    style={{ maxWidth: 120 }}
                  />
                  <label htmlFor={`break-end-${weekday}`} className="sr-only">Fin del descanso</label>
                  <input
                    id={`break-end-${weekday}`}
                    type="time"
                    value={breakEntry.end}
                    onChange={(e) => setNewBreak((prev) => ({
                      ...prev,
                      [weekday]: { ...breakEntry, end: e.target.value },
                    }))}
                    style={{ maxWidth: 120 }}
                  />
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => addBreak(weekday)}
                    disabled={savingDay === weekday}
                  >
                    Añadir descanso
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
