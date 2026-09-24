import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EnrollStudentModal } from '@/features/academy/components/EnrollStudentModal';
import { MarkPaymentModal } from '@/features/academy/components/MarkPaymentModal';
import { useAcademyGroupEnrollments } from '@/features/academy/hooks/useAcademyGroupEnrollments';
import { useAcademyGroups } from '@/features/academy/hooks/useAcademyGroups';
import { useAcademyTuitionPeriod } from '@/features/academy/hooks/useAcademyTuitionPeriod';
import { usePendingAcademyRequests } from '@/features/academy/hooks/usePendingAcademyRequests';
import { useCustomers } from '@/features/customers/hooks/useCustomers';
import {
  calculatePeriodsForEnrollment,
  formatPeriodLabel,
} from '@/features/academy/utils/calculatePeriod';
import { listCurrentMonthPaymentStatus } from '@/features/academy/services/academyTuitionService';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { BackButton } from '@/components/ui/BackButton';
import { buttonClasses } from "@/components/ui/buttonStyles";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

const DAY_ABBREVIATIONS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

export function AcademyGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = id ?? '';
  const { groups, loading: groupsLoading, error: groupsError } = useAcademyGroups();
  const group = groups.find((g) => g.id === groupId);
  const { customers } = useCustomers();
  const {
    enrollments,
    loading,
    error,
    enroll,
    withdraw,
    reload: reloadEnrollments,
  } = useAcademyGroupEnrollments(groupId, group?.businessId ?? '');
  const { tuitionPeriod, loading: tuitionLoading } = useAcademyTuitionPeriod(groupId);
  const {
    requests: pendingRequests,
    loading: pendingLoading,
    error: pendingError,
    approve,
    reject,
    markTrialAttended,
  } = usePendingAcademyRequests(groupId);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionError, setPendingActionError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    listCurrentMonthPaymentStatus()
      .then(setPaymentStatus)
      .catch((err) => console.error('[academy] listCurrentMonthPaymentStatus fallo', err));
  }, [enrollments]);

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

  async function handleApprove(id: string) {
    setPendingActionError(null);
    try {
      await approve(id);
      await reloadEnrollments();
    } catch (err) {
      setPendingActionError(getErrorMessage(err, 'No se pudo aprobar la solicitud.'));
      console.error('[academy] aprobar solicitud fallo', err);
    }
  }

  async function handleReject(id: string) {
    if (!window.confirm('Rechazar esta solicitud de inscripcion?')) return;
    setPendingActionError(null);
    try {
      await reject(id);
    } catch (err) {
      setPendingActionError(getErrorMessage(err, 'No se pudo rechazar la solicitud.'));
      console.error('[academy] rechazar solicitud fallo', err);
    }
  }

  async function handleMarkTrialAttended(id: string) {
    setPendingActionError(null);
    try {
      await markTrialAttended(id);
    } catch (err) {
      setPendingActionError(getErrorMessage(err, 'No se pudo marcar la clase muestra.'));
      console.error('[academy] marcar clase muestra fallo', err);
    }
  }

  function handleOpenPaymentModal(enrollmentId: string) {
    setSelectedEnrollmentId(enrollmentId);
  }

  function handlePaymentSuccess() {
    setSelectedEnrollmentId(null);
  }

  if (groupsLoading) {
    return <LoadingState message="Cargando…" />;
  }

  if (groupsError || !group) {
    return (
      <div className="mx-auto max-w-3xl p-4 text-cuerpo sm:p-6">
        <BackButton />
        <ErrorState message={groupsError ?? 'Grupo no encontrado.'} />
      </div>
    );
  }

  return (
    <div id="academy-group-detail-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <p className="etiqueta mb-2">Academia · Grupo</p>
      <h1 className="mb-1 font-display text-titulo font-medium text-texto">{group.name}</h1>
      <p className="mb-4 text-sm text-texto-suave">
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

      {error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {actionError && <p role="alert" className="mb-4 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{actionError}</p>}

      {(pendingRequests.length > 0 || pendingLoading) && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-acento">Solicitudes pendientes</h2>
          {pendingError && <p role="alert" className="mb-2 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{pendingError}</p>}
          {pendingActionError && <p role="alert" className="mb-2 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{pendingActionError}</p>}
          {pendingLoading ? (
            <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>
          ) : (
            <div id="academy-pending-requests-table" className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Tipo</th>
                    <th>Inscripcion pagada</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <p className="font-medium text-texto">{request.studentName}</p>
                        <p className="text-pequeno text-texto-suave">{request.guardianName ?? '-'}</p>
                      </td>
                      <td className="py-2 text-pequeno text-texto-suave">
                        {request.status === 'PENDIENTE'
                          ? 'Inscripcion'
                          : `Clase muestra (${request.scheduleLabel ?? '-'}, ${request.trialDate ?? '-'})`}
                      </td>
                      <td className="py-2 text-pequeno">
                        {request.status === 'PENDIENTE'
                          ? request.registrationFeePaid
                            ? 'Si (pago de prueba)'
                            : 'No'
                          : '-'}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          {request.status === 'PENDIENTE' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(request.id)}
                                className="accion text-acento"
                              >
                                Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(request.id)}
                                className="accion text-alerta"
                              >
                                Rechazar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkTrialAttended(request.id)}
                              className="accion text-acento"
                            >
                              Marcar atendida
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-subtitulo font-medium text-texto">Alumnos inscritos</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={buttonClasses("primary", "md")}
        >
          Nuevo alumno
        </button>
      </div>

      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {!loading && enrollments.length === 0 && (
        <p className="vacio">Todavía no hay alumnos inscritos.</p>
      )}
      {!loading && enrollments.length > 0 && (
        <div className="tabla-contenedor">
          <table id="academy-enrollments-table" className="tabla">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Fecha de inscripcion</th>
                <th>Colegiatura actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => {
                const currentPeriod = tuitionPeriod
                  ? calculatePeriodsForEnrollment(tuitionPeriod, enrollment.enrollmentDate, 1)[0]
                  : null;
                // Solo tintar si el grupo tiene colegiatura configurada -- sin
                // eso no hay nada que pagar, tintar de rojo seria enganoso.
                const paid =
                  currentPeriod && tuitionPeriod ? paymentStatus.get(enrollment.dependentId) : undefined;

                return (
                  <tr
                    key={enrollment.id}
                    className={paid === true ? 'bg-exito/10' : paid === false ? 'bg-alerta/10' : undefined}
                  >
                    <td>
                      <p className="font-medium text-texto">{enrollment.studentName}</p>
                      <p className="text-pequeno text-texto-suave">{enrollment.guardianName ?? '-'}</p>
                    </td>
                    <td>{enrollment.enrollmentDate}</td>
                    <td>
                      {currentPeriod && tuitionPeriod ? (
                        <span className="flex flex-col items-start gap-1">
                          <span className="text-pequeno text-texto-suave">
                            {formatPeriodLabel(currentPeriod.periodStart, currentPeriod.periodEnd)}
                          </span>
                          {paid !== undefined && (
                            <span
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-tarjeta px-2 py-0.5 text-pequeno font-medium ${
                                paid ? 'text-exito' : 'text-alerta'
                              }`}
                            >
                              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${paid ? 'bg-exito' : 'bg-alerta'}`} />
                              {paid ? 'Pagada' : 'Pendiente'}
                            </span>
                          )}
                        </span>
                      ) : tuitionLoading ? (
                        <span className="text-pequeno text-texto-suave">Cargando...</span>
                      ) : (
                        <span className="text-pequeno text-texto-suave">Sin config. de colegiatura</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        {currentPeriod && tuitionPeriod && (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(enrollment.id)}
                            className="accion text-acento"
                          >
                            Marcar pago
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleWithdraw(enrollment.id)}
                          className="accion text-alerta"
                        >
                          Dar de baja
                        </button>
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

      {selectedEnrollmentId && (
        <MarkPaymentModal
          enrollmentId={selectedEnrollmentId}
          onClose={() => setSelectedEnrollmentId(null)}
          onSuccess={handlePaymentSuccess}
          basePriceCents={tuitionPeriod?.amountCents}
          discountPercent={enrollments.find((e) => e.id === selectedEnrollmentId)?.guardianDiscountPercent}
        />
      )}
    </div>
  );
}