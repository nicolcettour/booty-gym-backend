-- Actualiza las cuotas impagas del mes actual al cambiar tarifas.
-- Cada sucursal utiliza su propia configuracion.
-- Conserva cuotas pagadas, periodos anteriores e intereses.
-- No incluye la reparacion puntual de noviembre de sucursal 002.

BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.booty_actualizar_tarifas_config()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cuota record;
    tarifa numeric;
    descuento numeric;
BEGIN
    PERFORM pg_advisory_xact_lock(
        hashtextextended('booty_cuotas:' || NEW.gym_id::text, 0)
    );

    FOR cuota IN
        SELECT
            q.clienta_id,
            q.periodo,
            q.frecuencia,
            c.descuento_familiar
        FROM public.booty_cuotas q
        JOIN public.clientas c
          ON c.id = q.clienta_id
         AND c.gym_id = q.gym_id
        WHERE q.gym_id = NEW.gym_id
          AND q.periodo = date_trunc(
              'month',
              now() AT TIME ZONE 'America/Argentina/Buenos_Aires'
          )::date
          AND NOT EXISTS (
              SELECT 1
              FROM public.booty_cuotas_estado e
              WHERE e.gym_id = q.gym_id
                AND e.clienta_id = q.clienta_id
                AND e.periodo = q.periodo
                AND e.pagada
          )
    LOOP
        tarifa := coalesce(
            nullif(
                CASE cuota.frecuencia
                    WHEN 5 THEN NEW.monto_5dias
                    WHEN 4 THEN NEW.monto_4dias
                    WHEN 3 THEN NEW.monto_3dias
                    ELSE NEW.monto_2dias
                END,
                0
            ),
            NEW.monto_cuota,
            0
        );

        IF tarifa <= 0 THEN
            RAISE EXCEPTION
                'Tarifa inválida para frecuencia %',
                cuota.frecuencia;
        END IF;

        descuento := CASE
            WHEN cuota.descuento_familiar
                THEN coalesce(
                    NEW.descuento_familiar_porcentaje, 0
                )
            ELSE 0
        END;

        IF descuento < 0 OR descuento > 100 THEN
            RAISE EXCEPTION
                'Porcentaje de descuento inválido';
        END IF;

        UPDATE public.booty_cuotas
        SET
            monto_sin_descuento = tarifa,
            descuento_porcentaje = descuento,
            monto_base = round(
                tarifa * (1 - descuento / 100), 2
            )
        WHERE gym_id = NEW.gym_id
          AND clienta_id = cuota.clienta_id
          AND periodo = cuota.periodo;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Permite aplicar esta migracion donde el trigger ya fue instalado.
DROP TRIGGER IF EXISTS booty_tarifas_config_cambio
ON public.configuracion;

CREATE TRIGGER booty_tarifas_config_cambio
AFTER UPDATE OF
    monto_cuota,
    monto_2dias,
    monto_3dias,
    monto_4dias,
    monto_5dias
ON public.configuracion
FOR EACH ROW
WHEN (
    ROW(
        OLD.monto_cuota,
        OLD.monto_2dias,
        OLD.monto_3dias,
        OLD.monto_4dias,
        OLD.monto_5dias
    )
    IS DISTINCT FROM
    ROW(
        NEW.monto_cuota,
        NEW.monto_2dias,
        NEW.monto_3dias,
        NEW.monto_4dias,
        NEW.monto_5dias
    )
)
EXECUTE FUNCTION public.booty_actualizar_tarifas_config();

COMMIT;
