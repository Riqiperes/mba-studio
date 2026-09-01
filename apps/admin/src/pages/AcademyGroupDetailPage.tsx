import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { EnrollStudentModal } from '@/features/academy/components/EnrollStudentModal';
import { MarkPaymentModal } from '@/features/academy/components/MarkPaymentModal';
import { TuitionStatusBadge } from '@/features/academy/components/TuitionStatusBadge';
import { useAcademyGroupEnrollments } from '@/features/academy/hooks/useAcademyGroupEnrollments';
import { useAcademyGroups } from '@/features/academy/hooks/useAcademyGroups';
import { useAcademyTuitionPeriod } from '@/features/academy/hooks/useAcademyTuitionPeriod';
import { useCustomers } from '@/features/customers/hooks/useCustomers';
import { calculatePeriodsForEnrollment, formatPeriodLabel } from '@/features/academy/utils/calculatePeriod';
import { getErrorMessage } from '@/utils/getErrorMessage';

const DAY_ABBREVIATIONS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

export function AcademyGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = id ?? '';
  const { groups, loading: groupsLoading, error: groupsError } = useAcademyGroups();
  const group = groups.find((g) => g.id === groupId);
  const { customers } = useCustomers();
  const { enrollments, loading, error, enroll, withdraw } = useAcademyGroupEnrollments(
    groupId,
    group?.businessId ?? '',
  );
  const { tuitionPeriod, loading: tuitionLoading } = useAcademyTuitionPeriod(groupId);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleWithdraw(enrollmentId: string) {
    if (!window.confirm('Dar de baja a este alumno del grupo?')) return;
    setActionError(null);
    try {
      await withdraw(enrollmentId);
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudo dar de baja.'));
      console.error('[academy] baja fallo', err);
    }
  }

  async function handleEnroll(dependentId: string, enrollmentDate: string) {
    await enroll(dependentId, enrollmentDate);
  }

  function handleOpenPaymentModal(enrollmentId: string) {
    setSelectedEnrollmentId(enrollmentId);
  }

  function handlePaymentSuccess() {
    setSelectedEnrollmentId(null);
  }

  if (groupsLoading) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-gray-500">Cargando...</div>;
  }

  if (groupsError || !group) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-sm text-red-600">
        {groupsError ?? 'Grupo no encontrado.'}
      </div>
    );
  }

  return (
    <div id="academy-group-detail-page" className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-semibold text-brand-primary">{group.name}</h1>
      <p className="mb-4 text-sm text-gray-500">
        {group.instructorName ?? 'Sin instructor'}
        {' · '}
        {group.schedules.length === 0
          ? 'Sin horario'
          : group.schedules
              .map(
                (s) =>
                  `${DAY_ABBREVIATIONS[s.dayOfWeek]} ${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}`,
              )
              .join(', ')}
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Alumnos inscritos</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo alumno
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {!loading && enrollments.length === 0 && (
        <p className="text-sm text-gray-500">Todavia no hay alumnos inscritos.</p>
      )}
      {!loading && enrollments.length > 0 && (
        <div className="overflow-x-auto">
          <table id="academy-enrollments-table" className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2">Alumno</th>
                <th className="py-2">Tutor</th>
                <th className="py-2">Fecha de inscripcion</th>
                <th className="py-2">Colegiatura actual</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => {
                const currentPeriod = tuitionPeriod
                  ? calculatePeriodsForEnrollment(tuitionPeriod, enrollment.enrollmentDate, 1)[0]
                  : null;

                return (
                  <tr key={enrollment.id} className="border-b border-gray-100">
                    <td className="py-2">{enrollment.studentName}</td>
                    <td className="py-2">{enrollment.guardianName ?? '-'}</td>
                    <td className="py-2">{enrollment.enrollmentDate}</td>
                    <td className="py-2">
                      {currentPeriod && tuitionPeriod ? (
                        <>
                          <TuitionStatusBadge status="NO_PAGADO" />
                          <span className="ml-2 text-xs text-gray-500">
                            {formatPeriodLabel(currentPeriod.periodStart, currentPeriod.periodEnd)}
                          </span>
                        </>
                      ) : tuitionLoading ? (
                        <span className="text-xs text-gray-500">Cargando...</span>
                      ) : (
                        <span className="text-xs text-gray-500">Sin config. de colegiatura</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleWithdraw(enrollment.id)}
                          className="text-gray-600 hover:underline"
                        >
                          Dar de baja
                        </button>
                        {currentPeriod && tuitionPeriod && (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(enrollment.id)}
                            className="text-brand-primary hover:underline text-sm"
                          >
                            Marcar pago
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EnrollStudentModal
        open={modalOpen}
        businessId={group.businessId}
        customers={customers}
        onClose={() => setModalOpen(false)}
        onSubmit={handleEnroll}
      />

      <MarkPaymentModal
        enrollmentId={selectedEnrollmentId ?? ''}
        onClose={() => setSelectedEnrollmentId(null)}
        onSuccess={handlePaymentSuccess}
        initialPeriods={tuitionPeriod && selectedEnrollmentId
          ? calculatePeriodsForEnrollment(
              tuitionPeriod,
              enrollments.find((e) => e.id === selectedEnrollmentId)?.enrollmentDate ?? '',
              12,
            ).map((p) => ({
              value: `${p.periodStart}|${p.periodEnd}`,
              label: p.label,
              periodStart: p.periodStart,
              periodEnd: p.periodEnd,
            }))
          : []}
      />
    </div>
  );
}