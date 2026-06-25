'use client';

import { useState, useEffect, useCallback } from 'react';

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

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function HoursEditor() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [profLoading, setProfLoading] = useState(true);
  const [selectedProf, setSelectedProf] = useState<string>('');

  // Inline add state per day
  const [newHour, setNewHour] = useState<Record<number, { start: string; end: string }>>({});
  const [newBreak, setNewBreak] = useState<Record<number, { start: string; end: string }>>({});
  const [savingDay, setSavingDay] = useState<number | null>(null);

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

  const validateTime = (start: string, end: string): string | null => {
    if (!start || !end) return 'Completa la hora de inicio y fin';
    if (start >= end) return 'La hora de fin debe ser posterior a la de inicio';
    return null;
  };

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

  return (
    <div className="stack">
      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="hours-professional">Profesional</label>
          <select
            id="hours-professional"
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
          {selectedProfessional && !selectedProfessional.active && (
            <span className="badge badge-warn" style={{ alignSelf: 'flex-start' }}>Inactivo</span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-error" role="alert">{errorMsg}</div>
      )}
      {DAYS.map((dayName, weekday) => {
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
    </div>
  );
}
