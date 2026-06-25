'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardHomeClient({
  orgName,
  slug,
  needsSetup,
  todayApptsCount,
}: {
  orgName: string;
  slug: string;
  needsSetup: boolean;
  todayApptsCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const [noShowCount, setNoShowCount] = useState<number | null>(null);
  const [bookUrl, setBookUrl] = useState(`/book/${slug}`);

  useEffect(() => {
    setBookUrl(`${window.location.origin}/book/${slug}`);

    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/appointments?date=${today}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setNoShowCount(Array.isArray(data) ? data.filter((a: { status: string }) => a.status === 'no_show').length : 0);
      })
      .catch(() => setNoShowCount(0));
  }, [slug]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  return (
    <div className="stack">
      <h1>Hola, {orgName}</h1>

      {needsSetup && (
        <div className="alert alert-info">
          Configura tus servicios y horario para empezar a recibir reservas.
        </div>
      )}

      <div className="grid grid-sm-2">
        <div className="panel kpi">
          <span className="label">Citas de hoy</span>
          <span className="value">{todayApptsCount}</span>
        </div>
        <div className="panel kpi">
          <span className="label">No-shows de hoy</span>
          <span className="value">{noShowCount === null ? '…' : noShowCount}</span>
        </div>
      </div>

      <div className="panel stack">
        <label className="text-sm muted" style={{ fontWeight: 600 }}>Tu link para reservar</label>
        <div className="cluster gap-2">
          <code
            className="text-sm"
            style={{
              background: 'var(--surface-2)',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              flex: 1,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {bookUrl}
          </code>
          <button className="btn btn-sm" onClick={handleCopy}>
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      <div className="cluster">
        <Link href="/dashboard/agenda" className="btn btn-primary">Ver agenda de hoy</Link>
        <Link href="/dashboard/servicios" className="btn btn-ghost">Gestionar servicios</Link>
        <Link href="/dashboard/horario" className="btn btn-ghost">Configurar horario</Link>
      </div>
    </div>
  );
}
