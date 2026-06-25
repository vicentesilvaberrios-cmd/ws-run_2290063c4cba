import { HoursEditor } from './HoursEditor';

export default function HorarioPage() {
  return (
    <div className="stack">
      <div>
        <h1>Horario de atención</h1>
        <p className="subtitle">
          Marca cuándo atiende cada profesional y sus descansos. Tus clientes verán horarios según la persona que elijan.
        </p>
      </div>
      <HoursEditor />
    </div>
  );
}
