export const users = [
  { id: "u1", full_name: "Ana García", role: "sales_rep", avatar_url: "https://i.pravatar.cc/150?u=u1", quota_amount: 50000, status: "active" },
  { id: "u2", full_name: "Angelo Israel Miranda Vivero", role: "sales_manager", avatar_url: "https://i.pravatar.cc/150?u=u2", quota_amount: 100000, status: "active" }
];

export const stages = [
  { id: "s1", name: "Prospect", display_order: 1, win_probability: 10 },
  { id: "s2", name: "Lead", display_order: 2, win_probability: 30 },
  { id: "s3", name: "Negotiation", display_order: 3, win_probability: 60 },
  { id: "s4", name: "Closed Won", display_order: 4, win_probability: 100 },
  { id: "s5", name: "Closed Lost", display_order: 5, win_probability: 0 }
];

export const customers = [
  { id: "c1", company_name: "TechSolutions SL", industry: "Software", contact_person: "Carlos Ruiz" },
  { id: "c2", company_name: "GlobalCorp Inc", industry: "Manufacturing", contact_person: "Laura Méndez" },
  { id: "c3", company_name: "CloudNet", industry: "IT", contact_person: "Pedro Sánchez" },
  { id: "c4", company_name: "DesignStudio", industry: "Marketing", contact_person: "Elena Gómez" },
  { id: "c5", company_name: "FinTech Hub", industry: "Finance", contact_person: "Roberto Díaz" }
];

export const deals = [
  { id: "d1", title: "Licencia Enterprise 2024", customer_id: "c1", owner_id: "u1", stage_id: "s4", amount: 25000.00, currency: "EUR", status: "won", created_at: "2024-01-10T10:00:00Z", closed_at: "2024-02-15T14:30:00Z" },
  { id: "d2", title: "Renovación Anual", customer_id: "c2", owner_id: "u1", stage_id: "s3", amount: 12000.00, currency: "EUR", status: "open", created_at: "2024-03-01T09:00:00Z", expected_close_date: "2024-03-30" },
  { id: "d3", title: "Migración Cloud", customer_id: "c3", owner_id: "u2", stage_id: "s4", amount: 45000.00, currency: "EUR", status: "won", created_at: "2024-02-05T11:00:00Z", closed_at: "2024-03-10T16:00:00Z" },
  { id: "d4", title: "Consultoría UX", customer_id: "c4", owner_id: "u1", stage_id: "s2", amount: 8500.00, currency: "EUR", status: "open", created_at: "2024-03-15T10:00:00Z", expected_close_date: "2024-04-10" },
  { id: "d5", title: "Integración API", customer_id: "c5", owner_id: "u2", stage_id: "s5", amount: 18000.00, currency: "EUR", status: "lost", created_at: "2024-01-20T08:00:00Z", closed_at: "2024-02-28T10:00:00Z" },
  
  { id: "d6", title: "Licencia Standard", customer_id: "c1", owner_id: "u1", stage_id: "s4", amount: 5000.00, currency: "EUR", status: "won", created_at: "2024-04-01T10:00:00Z", closed_at: "2024-04-15T14:30:00Z" },
  { id: "d7", title: "Soporte Premium", customer_id: "c2", owner_id: "u2", stage_id: "s1", amount: 20000.00, currency: "EUR", status: "open", created_at: "2024-04-10T09:00:00Z", expected_close_date: "2024-05-15" },
  { id: "d8", title: "Expansión Licencias", customer_id: "c3", owner_id: "u1", stage_id: "s4", amount: 30000.00, currency: "EUR", status: "won", created_at: "2024-05-05T11:00:00Z", closed_at: "2024-05-20T16:00:00Z" },
  { id: "d9", title: "Auditoría Seguridad", customer_id: "c4", owner_id: "u2", stage_id: "s3", amount: 15000.00, currency: "EUR", status: "open", created_at: "2024-06-01T10:00:00Z", expected_close_date: "2024-06-25" },
  { id: "d10", title: "Desarrollo a Medida", customer_id: "c5", owner_id: "u1", stage_id: "s2", amount: 60000.00, currency: "EUR", status: "open", created_at: "2024-06-15T08:00:00Z", expected_close_date: "2024-07-30" },
  
  { id: "d11", title: "Renovación 2025", customer_id: "c1", owner_id: "u2", stage_id: "s3", amount: 26000.00, currency: "EUR", status: "open", created_at: "2024-07-01T10:00:00Z", expected_close_date: "2024-08-15" },
  { id: "d12", title: "Servicios Cloud", customer_id: "c2", owner_id: "u1", stage_id: "s4", amount: 14000.00, currency: "EUR", status: "won", created_at: "2024-07-10T09:00:00Z", closed_at: "2024-07-28T14:30:00Z" },
  { id: "d13", title: "Soporte Nivel 3", customer_id: "c3", owner_id: "u2", stage_id: "s1", amount: 9000.00, currency: "EUR", status: "open", created_at: "2024-08-05T11:00:00Z", expected_close_date: "2024-09-10" },
  { id: "d14", title: "Campaña Ads", customer_id: "c4", owner_id: "u1", stage_id: "s4", amount: 11000.00, currency: "EUR", status: "won", created_at: "2024-08-15T10:00:00Z", closed_at: "2024-08-30T16:00:00Z" },
  { id: "d15", title: "Onboarding VIP", customer_id: "c5", owner_id: "u2", stage_id: "s5", amount: 5000.00, currency: "EUR", status: "lost", created_at: "2024-08-20T08:00:00Z", closed_at: "2024-09-05T10:00:00Z" },

  { id: "d16", title: "Licencia Q3", customer_id: "c1", owner_id: "u1", stage_id: "s2", amount: 22000.00, currency: "EUR", status: "open", created_at: "2024-09-01T10:00:00Z", expected_close_date: "2024-10-15" },
  { id: "d17", title: "Actualización Sistema", customer_id: "c2", owner_id: "u2", stage_id: "s4", amount: 18000.00, currency: "EUR", status: "won", created_at: "2024-09-10T09:00:00Z", closed_at: "2024-09-25T14:30:00Z" },
  { id: "d18", title: "Integración ERP", customer_id: "c3", owner_id: "u1", stage_id: "s3", amount: 42000.00, currency: "EUR", status: "open", created_at: "2024-09-15T11:00:00Z", expected_close_date: "2024-10-30" },
  { id: "d19", title: "Branding Kit", customer_id: "c4", owner_id: "u2", stage_id: "s1", amount: 7500.00, currency: "EUR", status: "open", created_at: "2024-09-20T10:00:00Z", expected_close_date: "2024-11-10" },
  { id: "d20", title: "Análisis Datos", customer_id: "c5", owner_id: "u1", stage_id: "s4", amount: 35000.00, currency: "EUR", status: "won", created_at: "2024-09-25T08:00:00Z", closed_at: "2024-10-05T10:00:00Z" }
];
