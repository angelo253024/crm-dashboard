export const users = [
  { id: "u1", full_name: "Ana Garc铆a", role: "sales_rep", avatar_url: "https://i.pravatar.cc/150?u=u1", quota_amount: 50000, status: "active" },
  { id: "u2", full_name: "Angelo Israel Miranda Vivero", role: "sales_manager", avatar_url: "https://i.pravatar.cc/150?u=u2", quota_amount: 100000, status: "active" }
];

export const stages = [
  { id: "s1", name: "Prospecto", display_order: 1, win_probability: 10 },
  { id: "s2", name: "Cotizaci贸n", display_order: 2, win_probability: 30 },
  { id: "s3", name: "Agendado", display_order: 3, win_probability: 60 },
  { id: "s4", name: "Completado", display_order: 4, win_probability: 100 },
  { id: "s5", name: "Cancelado", display_order: 5, win_probability: 0 }
];

export const customers = [
  { id: "c1", company_name: "Transportes Robles", industry: "Log铆stica", contact_person: "Carlos Ruiz" },
  { id: "c2", company_name: "Flota Corporativa", industry: "Empresarial", contact_person: "Laura M茅ndez" },
  { id: "c3", company_name: "Taxis del Norte", industry: "Transporte", contact_person: "Pedro S谩nchez" },
  { id: "c4", company_name: "Concesionaria Autoplaza", industry: "Venta Automotriz", contact_person: "Elena G贸mez" },
  { id: "c5", company_name: "Cliente Particular", industry: "Individual", contact_person: "Roberto D铆az" }
];

export const deals = [
  { id: "d1", title: "Lavado Flota (10 autos)", customer_id: "c1", owner_id: "u1", stage_id: "s4", amount: 1500.00, currency: "BOB", status: "won", created_at: "2024-01-10T10:00:00Z", closed_at: "2024-02-15T14:30:00Z" },
  { id: "d2", title: "Suscripci贸n Mensual", customer_id: "c2", owner_id: "u1", stage_id: "s3", amount: 2500.00, currency: "BOB", status: "open", created_at: "2024-03-01T09:00:00Z", expected_close_date: "2024-03-30" },
  { id: "d3", title: "Limpieza Tapicer铆a Taxis", customer_id: "c3", owner_id: "u2", stage_id: "s4", amount: 3500.00, currency: "BOB", status: "won", created_at: "2024-02-05T11:00:00Z", closed_at: "2024-03-10T16:00:00Z" },
  { id: "d4", title: "Encerado Premium", customer_id: "c4", owner_id: "u1", stage_id: "s2", amount: 800.00, currency: "BOB", status: "open", created_at: "2024-03-15T10:00:00Z", expected_close_date: "2024-04-10" },
  { id: "d5", title: "Lavado Express", customer_id: "c5", owner_id: "u2", stage_id: "s5", amount: 150.00, currency: "BOB", status: "lost", created_at: "2024-01-20T08:00:00Z", closed_at: "2024-02-28T10:00:00Z" },
  
  { id: "d6", title: "Pulido y Encerado", customer_id: "c1", owner_id: "u1", stage_id: "s4", amount: 900.00, currency: "BOB", status: "won", created_at: "2024-04-01T10:00:00Z", closed_at: "2024-04-15T14:30:00Z" },
  { id: "d7", title: "Lavado Flota Camiones", customer_id: "c2", owner_id: "u2", stage_id: "s1", amount: 4200.00, currency: "BOB", status: "open", created_at: "2024-04-10T09:00:00Z", expected_close_date: "2024-05-15" },
  { id: "d8", title: "Tratamiento Cer谩mico", customer_id: "c3", owner_id: "u1", stage_id: "s4", amount: 2000.00, currency: "BOB", status: "won", created_at: "2024-05-05T11:00:00Z", closed_at: "2024-05-20T16:00:00Z" },
  { id: "d9", title: "Limpieza Motor", customer_id: "c4", owner_id: "u2", stage_id: "s3", amount: 350.00, currency: "BOB", status: "open", created_at: "2024-06-01T10:00:00Z", expected_close_date: "2024-06-25" },
  { id: "d10", title: "Suscripci贸n Flota Premium", customer_id: "c5", owner_id: "u1", stage_id: "s2", amount: 6500.00, currency: "BOB", status: "open", created_at: "2024-06-15T08:00:00Z", expected_close_date: "2024-07-30" },
  
  { id: "d11", title: "Renovaci贸n Anual", customer_id: "c1", owner_id: "u2", stage_id: "s3", amount: 3000.00, currency: "BOB", status: "open", created_at: "2024-07-01T10:00:00Z", expected_close_date: "2024-08-15" },
  { id: "d12", title: "Limpieza Acondicionador", customer_id: "c2", owner_id: "u1", stage_id: "s4", amount: 450.00, currency: "BOB", status: "won", created_at: "2024-07-10T09:00:00Z", closed_at: "2024-07-28T14:30:00Z" },
  { id: "d13", title: "Lavado Completo x5", customer_id: "c3", owner_id: "u2", stage_id: "s1", amount: 750.00, currency: "BOB", status: "open", created_at: "2024-08-05T11:00:00Z", expected_close_date: "2024-09-10" },
  { id: "d14", title: "Preparaci贸n Autos Nuevos", customer_id: "c4", owner_id: "u1", stage_id: "s4", amount: 5000.00, currency: "BOB", status: "won", created_at: "2024-08-15T10:00:00Z", closed_at: "2024-08-30T16:00:00Z" },
  { id: "d15", title: "Lavado B谩sico Particular", customer_id: "c5", owner_id: "u2", stage_id: "s5", amount: 80.00, currency: "BOB", status: "lost", created_at: "2024-08-20T08:00:00Z", closed_at: "2024-09-05T10:00:00Z" },

  { id: "d16", title: "Suscripci贸n Q3", customer_id: "c1", owner_id: "u1", stage_id: "s2", amount: 2200.00, currency: "BOB", status: "open", created_at: "2024-09-01T10:00:00Z", expected_close_date: "2024-10-15" },
  { id: "d17", title: "Desinfecci贸n Ozono", customer_id: "c2", owner_id: "u2", stage_id: "s4", amount: 600.00, currency: "BOB", status: "won", created_at: "2024-09-10T09:00:00Z", closed_at: "2024-09-25T14:30:00Z" },
  { id: "d18", title: "Servicio VIP Completo", customer_id: "c3", owner_id: "u1", stage_id: "s3", amount: 1200.00, currency: "BOB", status: "open", created_at: "2024-09-15T11:00:00Z", expected_close_date: "2024-10-30" },
  { id: "d19", title: "Lavado Ecol贸gico", customer_id: "c4", owner_id: "u2", stage_id: "s1", amount: 200.00, currency: "BOB", status: "open", created_at: "2024-09-20T10:00:00Z", expected_close_date: "2024-11-10" },
  { id: "d20", title: "Flota de Entregas", customer_id: "c5", owner_id: "u1", stage_id: "s4", amount: 3500.00, currency: "BOB", status: "won", created_at: "2024-09-25T08:00:00Z", closed_at: "2024-10-05T10:00:00Z" }
];



export const workers = [
  { id: "w1", name: "Carlos Ram韗ez", status: "en_servicio", avatar_url: "https://i.pravatar.cc/150?u=w1", zone: "Norte" },
  { id: "w2", name: "Luis Fernandez", status: "disponible", avatar_url: "https://i.pravatar.cc/150?u=w2", zone: "Centro" },
  { id: "w3", name: "Miguel Rojas", status: "descanso", avatar_url: "https://i.pravatar.cc/150?u=w3", zone: "Sur" }
];

export const products = [
  { id: "p1", name: "Lavado B醩ico", price: 80, stock: "Ilimitado", category: "Servicio" },
  { id: "p2", name: "Encerado Premium", price: 150, stock: "Ilimitado", category: "Servicio" },
  { id: "p3", name: "Shampoo CarWash 5L", price: 120, stock: 15, category: "Insumo" },
  { id: "p4", name: "Cera de Carnauba", price: 90, stock: 8, category: "Insumo" }
];

export const appointments = [
  { id: "a1", date: "2024-10-15T10:00:00Z", customer: "Transportes Robles", service: "Lavado Flota", worker: "Carlos Ram韗ez", status: "en_proceso" },
  { id: "a2", date: "2024-10-15T14:30:00Z", customer: "Flota Corporativa", service: "Desinfecci髇 Ozono", worker: "Luis Fernandez", status: "pendiente" },
  { id: "a3", date: "2024-10-16T09:00:00Z", customer: "Cliente Particular", service: "Lavado B醩ico", worker: "Miguel Rojas", status: "confirmada" }
];

