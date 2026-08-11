# Archivar pacientes en vez de borrarlos

**Estado: APLICADO** en Supabase (migración `archivar_pacientes_y_fk_historias`).
Se documenta acá porque el proyecto no versiona `supabase/migrations/`, así que sin
esto el cambio de esquema existiría sólo en la base remota.

## El problema

Al intentar eliminar un paciente desde el Directorio, la app mostraba:

```
update or delete on table "pacientes" violates foreign key constraint
"laboratorio_ordenes_patient_id_fkey" on table "laboratorio_ordenes"
```

Investigando, las tres tablas hijas de `pacientes` se comportaban de **tres
formas distintas**, y las dos que *no* bloqueaban eran peores que la que sí:

| Tabla | Al borrar el paciente | Consecuencia |
|---|---|---|
| `ortodoncia` | `CASCADE` | Borraba el tratamiento y sus pagos, en silencio |
| `laboratorio_ordenes` | `NO ACTION` | Bloqueaba el borrado (el error visible) |
| `historias` | **sin foreign key** | Dejaba la historia clínica huérfana e invisible |

### Daño ya presente en producción

- **9 historias huérfanas contra 1 válida.** Registros clínicos (odontograma,
  plan de tratamiento) de pacientes ya borrados, inalcanzables desde la UI.
- El Dashboard y Finanzas sumaban `historias` sin comprobar que el paciente
  existiera, así que esos huérfanos **inflaban las cifras**:

| | Tratamientos | Facturado |
|---|---|---|
| De pacientes que existen | 4 | S/950 |
| De pacientes borrados | 20 | **S/2.365** |

## La decisión

No se resuelve con `CASCADE` en `historias`: eso destruiría odontogramas y
planes de tratamiento de forma irreversible, y una historia clínica tiene
obligación de conservación (el Colegio Odontológico del Perú exige retención por
años, incluso si el paciente deja de atenderse).

Se archiva el paciente y **ningún registro clínico se destruye**.

## SQL aplicado

```sql
-- 1. Marca de archivado. Nullable a propósito: NULL = activo, así no hace falta
--    backfill ni un default que mienta sobre cuándo se archivó algo.
alter table public.pacientes
  add column if not exists archivado_at timestamptz;

comment on column public.pacientes.archivado_at is
  'Fecha en que se archivó el paciente. NULL = activo. Se archiva en vez de borrar porque la historia clínica debe conservarse.';

-- 2. Índice parcial para el listado por defecto (los activos), que es el 99% de
--    las consultas del Directorio.
create index if not exists pacientes_activos_idx
  on public.pacientes (clinica_id)
  where archivado_at is null;

-- 3. FK que faltaba en historias. RESTRICT y no CASCADE: si algún día se borra
--    un paciente de verdad, que falle ruidosamente en vez de llevarse la
--    historia clínica sin avisar. NOT VALID porque las 9 huérfanas existentes
--    no pasarían la restricción, y borrarlas es justamente lo que se decidió
--    NO hacer: valida las filas nuevas sin destruir las viejas.
alter table public.historias
  add constraint historias_patient_id_fkey
  foreign key (patient_id) references public.pacientes(id)
  on delete restrict
  not valid;

-- 4. Ortodoncia deja de borrar en cascada, por el mismo motivo: el plan y los
--    pagos de un tratamiento son registro clínico y financiero.
alter table public.ortodoncia
  drop constraint if exists ortodoncia_paciente_id_fkey;

alter table public.ortodoncia
  add constraint ortodoncia_paciente_id_fkey
  foreign key (paciente_id) references public.pacientes(id)
  on delete restrict;
```

Estado final de las tres FKs, verificado:

| Tabla | `delete_rule` |
|---|---|
| `historias` | `RESTRICT` |
| `laboratorio_ordenes` | `NO ACTION` |
| `ortodoncia` | `RESTRICT` |

(`NO ACTION` y `RESTRICT` bloquean igual el borrado; la diferencia es sólo cuándo
se evalúa la comprobación dentro de la transacción.)

## Cambios en la app

- `Expediente.jsx`: `deletePatient` → `archivarPatient` / `desarchivarPatient`.
  Nueva pestaña **Archivados** en el Directorio; el ícono de papelera pasó a ser
  uno de archivador (una papelera prometía lo contrario de lo que hace) y el
  archivado se muestra atenuado.
- `Dashboard.jsx` y `Caja.jsx`: las historias se filtran contra el conjunto de
  pacientes **activos**, así que ya no entran huérfanas ni archivados a los
  totales. Ambas consultas tuvieron que empezar a pedir `archivado_at`, que
  antes no traían.
- `useContadoresNav.js`: el badge del menú excluye archivados, para que coincida
  con lo que se ve en el Directorio.
- `App.jsx` (buscador global), `Agenda.jsx` (autocompletado de Nueva cita) y
  `Ortodoncia.jsx` (iniciar tratamiento): excluyen archivados. Si no, un
  paciente archivado aparecería en un lugar y no en otro.

## Verificación

Se archivó a un paciente **con orden de laboratorio** — el caso exacto que
fallaba — y funcionó sin error, conservando su orden. Después se restauró a
activo, porque era sólo una prueba.

## Pendiente (deliberado)

Las 9 historias huérfanas **se conservan**: no suman en ninguna cifra, pero
siguen en la base por si hay que auditarlas o recuperar un odontograma. Si
alguna vez se decide limpiarlas, primero habría que poder asociarlas a un
paciente o exportarlas, y después `validate constraint historias_patient_id_fkey`
para que la FK deje de ser `NOT VALID`.
