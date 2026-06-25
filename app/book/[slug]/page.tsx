import { BookingWizard } from './BookingWizard';

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch org name + services server-side for initial render
  let orgName: string | null = null;
  let loadError = false;

  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${base}/api/public/${slug}/services`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        orgName = data[0].org_name ?? null;
      }
    }
  } catch {
    loadError = true;
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--sp-6)', paddingBottom: 'var(--sp-8)' }}>
      <BookingWizard slug={slug} initialOrgName={orgName} initialError={loadError} />
    </div>
  );
}
