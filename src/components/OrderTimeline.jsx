import React from 'react';
import { CheckCircle, Circle, XCircle, Clock } from 'lucide-react';

export default function OrderTimeline({ reserva }) {
  if (!reserva) return null;

  // Normalizar el estado
  const rawState = String(reserva.estado_reserva || reserva.estado || '').toUpperCase();
  const hasWorker = !!reserva.trabajador_id;
  
  // Determinación de estados
  const isCancelled = rawState.includes('CANCELAD');
  
  const isWorkerAssigned = hasWorker || ['ASIGNADA', 'ACEPTADA', 'CAMINO', 'LLEGO', 'LLEGADA', 'INICIAD', 'PROCESO', 'FINALIZAD', 'COMPLETAD', 'TERMINAD', 'PAGO'].some(s => rawState.includes(s));
  const isEnCamino = ['CAMINO', 'LLEGO', 'LLEGADA', 'INICIAD', 'PROCESO', 'FINALIZAD', 'COMPLETAD', 'TERMINAD', 'PAGO'].some(s => rawState.includes(s));
  const isLlego = ['LLEGO', 'LLEGADA', 'INICIAD', 'PROCESO', 'FINALIZAD', 'COMPLETAD', 'TERMINAD', 'PAGO'].some(s => rawState.includes(s));
  const isIniciado = ['INICIAD', 'PROCESO', 'FINALIZAD', 'COMPLETAD', 'TERMINAD', 'PAGO'].some(s => rawState.includes(s));
  const isFinalizado = ['FINALIZAD', 'COMPLETAD', 'TERMINAD', 'PAGO'].some(s => rawState.includes(s));
  const isPagado = rawState.includes('PAGO') || String(reserva.payment_status).toUpperCase() === 'PAGADO' || String(reserva.payment_status).toUpperCase() === 'COMPLETADO';

  const timelineSteps = [];

  // 1. Reserva creada (Siempre completa si existe la reserva)
  timelineSteps.push({ 
    label: 'Reserva creada', 
    completed: true, 
    active: !isWorkerAssigned && !isCancelled && hasWorker // Solo activa si esperamos al trabajador, pero aquí ya está creada. En realidad es completada.
  });

  if (isCancelled) {
    timelineSteps.push({ 
      label: 'Reserva cancelada', 
      completed: false, 
      active: true, 
      isError: true 
    });
  } else {
    if (!isWorkerAssigned) {
      timelineSteps.push({ 
        label: 'Esperando que un trabajador acepte el servicio', 
        completed: false, 
        active: true,
        isPending: true
      });
    } else {
      timelineSteps.push({ 
        label: 'Trabajador asignado', 
        completed: isWorkerAssigned, 
        active: isWorkerAssigned && !isEnCamino 
      });
      timelineSteps.push({ 
        label: 'En camino', 
        completed: isEnCamino, 
        active: isEnCamino && !isLlego 
      });
      timelineSteps.push({ 
        label: 'Llegó al cliente', 
        completed: isLlego, 
        active: isLlego && !isIniciado 
      });
      timelineSteps.push({ 
        label: 'Servicio iniciado', 
        completed: isIniciado, 
        active: isIniciado && !isFinalizado 
      });
      timelineSteps.push({ 
        label: 'Servicio finalizado', 
        completed: isFinalizado, 
        active: isFinalizado && !isPagado 
      });
      timelineSteps.push({ 
        label: 'Pago registrado', 
        completed: isPagado, 
        active: isPagado 
      });
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--card-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '16px' }}>Línea de Tiempo de la Orden</h3>
      
      {/* Añadimos estilos de animación aquí para que sea autocontenido */}
      <style>
        {`
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          .timeline-active-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background-color: var(--accent-green);
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            z-index: -1;
          }
          .step-fade-in {
            animation: fadeIn 0.4s ease-out forwards;
          }
        `}
      </style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
        {/* Línea vertical de fondo */}
        <div style={{ position: 'absolute', left: '11px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>
        
        {timelineSteps.map((step, idx) => {
          // Determinar la opacidad: activo o completado = 1, pendiente = 0.5
          const opacity = step.completed || step.active || step.isError ? 1 : 0.5;
          
          return (
            <div key={idx} className="step-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1, opacity }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {step.active && !step.isError && <div className="timeline-active-ring"></div>}
                
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: step.isError ? '#ef4444' : (step.completed || step.active ? 'var(--accent-green)' : 'var(--card-bg)'), 
                  border: (!step.completed && !step.active && !step.isError) ? '2px solid var(--text-muted)' : 'none',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: step.completed || step.active || step.isError ? '#fff' : 'var(--text-muted)', 
                  boxShadow: (step.completed || step.active) ? '0 0 10px rgba(28, 169, 201, 0.4)' : 'none',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {step.isError ? <XCircle size={14} /> : 
                   step.isPending ? <Clock size={14} /> : 
                   step.completed ? <CheckCircle size={14} /> : 
                   step.active ? <Circle size={10} fill="#fff" stroke="none" /> : 
                   <Circle size={14} />}
                </div>
              </div>
              
              <div style={{ 
                fontWeight: step.active ? 'bold' : '500', 
                color: step.isError ? '#ef4444' : (step.active ? 'var(--accent-green)' : 'var(--text-main)'), 
                fontSize: '14px', 
                transition: 'color 0.3s ease' 
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
