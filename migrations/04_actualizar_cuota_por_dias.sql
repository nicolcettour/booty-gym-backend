-- BOOTY: probar primero en una rama de Neon creada desde production.
-- Solo actua ante futuros cambios de frecuencia. No recalcula datos al instalar.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.booty_cuota_dias_cambio()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    mes_actual date := date_trunc('month', now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    frecuencia_anterior integer;
    frecuencia_nueva integer;
    cfg public.configuracion%ROWTYPE;
    tarifa numeric;
    descuento numeric;
BEGIN
    IF NEW.gym_id IS DISTINCT FROM OLD.gym_id THEN RETURN NEW; END IF;
    frecuencia_anterior := CASE WHEN coalesce(trim(OLD.dias),'')='' THEN 2
        ELSE greatest(2,least(5,cardinality(string_to_array(OLD.dias,',')))) END;
    frecuencia_nueva := CASE WHEN coalesce(trim(NEW.dias),'')='' THEN 2
        ELSE greatest(2,least(5,cardinality(string_to_array(NEW.dias,',')))) END;
    IF frecuencia_anterior = frecuencia_nueva THEN RETURN NEW; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.booty_cuotas_gimnasios WHERE gym_id=NEW.gym_id) THEN RETURN NEW; END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('booty_cuotas:'||NEW.gym_id,0));
    IF NOT EXISTS (SELECT 1 FROM public.booty_cuotas_estado
        WHERE gym_id=NEW.gym_id AND clienta_id=NEW.id
          AND periodo=mes_actual AND NOT pagada) THEN RETURN NEW; END IF;

    SELECT * INTO cfg FROM public.configuracion WHERE gym_id=NEW.gym_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Falta configuracion para %',NEW.gym_id; END IF;
    tarifa := coalesce(nullif(CASE frecuencia_nueva
        WHEN 5 THEN cfg.monto_5dias WHEN 4 THEN cfg.monto_4dias
        WHEN 3 THEN cfg.monto_3dias ELSE cfg.monto_2dias END,0),cfg.monto_cuota,0);
    IF tarifa <= 0 THEN RAISE EXCEPTION 'Tarifa faltante o invalida para % dias',frecuencia_nueva; END IF;
    descuento := CASE WHEN NEW.descuento_familiar THEN cfg.descuento_familiar_porcentaje ELSE 0 END;
    IF descuento IS NULL OR descuento < 0 OR descuento > 100 THEN
        RAISE EXCEPTION 'Descuento familiar invalido';
    END IF;

    UPDATE public.booty_cuotas q SET
        frecuencia=frecuencia_nueva,
        monto_sin_descuento=tarifa,
        descuento_porcentaje=descuento,
        monto_base=round(tarifa*(1-descuento/100),2)
    WHERE q.gym_id=NEW.gym_id AND q.clienta_id=NEW.id AND q.periodo=mes_actual
      AND NOT EXISTS (SELECT 1 FROM public.booty_cuotas_estado e
        WHERE e.gym_id=q.gym_id AND e.clienta_id=q.clienta_id
          AND e.periodo=q.periodo AND e.pagada);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booty_cuota_dias_clienta ON public.clientas;
CREATE TRIGGER booty_cuota_dias_clienta
AFTER UPDATE OF dias ON public.clientas
FOR EACH ROW WHEN (OLD.dias IS DISTINCT FROM NEW.dias)
EXECUTE FUNCTION public.booty_cuota_dias_cambio();

INSERT INTO public.booty_cuotas_migraciones(version)
VALUES ('20261009_cuota_dias_v1') ON CONFLICT DO NOTHING;
COMMIT;
SELECT version,aplicada_en FROM public.booty_cuotas_migraciones
WHERE version='20261009_cuota_dias_v1';
