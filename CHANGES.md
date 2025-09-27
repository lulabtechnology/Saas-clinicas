## 2025-09-27 — FASE 1 (F1.3 fix)
- Reemplazo de `audit_log_generic()` para tolerar tablas sin `tenant_id` (usa JSONB).
- Evita error en triggers de auditoría al insertar en `tenants`.
