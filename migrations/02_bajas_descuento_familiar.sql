-- BOOTY: bajas y descuento familiar. Aplicar primero en una NUEVA rama de prueba.
-- Requiere cuotas persistentes ya instaladas. No ejecutar las migraciones de septiembre otra vez.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE clientas, configuracion, booty_cuotas, pagos IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE clientas ADD COLUMN IF NOT EXISTS activa boolean NOT NULL DEFAULT true;
ALTER TABLE clientas ADD COLUMN IF NOT EXISTS fecha_baja timestamptz;
ALTER TABLE clientas ADD COLUMN IF NOT EXISTS descuento_familiar boolean NOT NULL DEFAULT false;
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS descuento_familiar_porcentaje numeric NOT NULL DEFAULT 0 CHECK (descuento_familiar_porcentaje BETWEEN 0 AND 100);
ALTER TABLE booty_cuotas ADD COLUMN IF NOT EXISTS monto_sin_descuento numeric;
ALTER TABLE booty_cuotas ADD COLUMN IF NOT EXISTS descuento_porcentaje numeric NOT NULL DEFAULT 0 CHECK (descuento_porcentaje BETWEEN 0 AND 100);
UPDATE booty_cuotas SET monto_sin_descuento=monto_base WHERE monto_sin_descuento IS NULL;
ALTER TABLE booty_cuotas ALTER COLUMN monto_sin_descuento SET NOT NULL;
ALTER TABLE booty_cuotas DROP CONSTRAINT IF EXISTS booty_cuotas_monto_base_check;
ALTER TABLE booty_cuotas ADD CONSTRAINT booty_cuotas_monto_base_check CHECK (monto_base>=0);
CREATE TABLE IF NOT EXISTS booty_clientas_bajas (
 id bigserial PRIMARY KEY, gym_id text NOT NULL, clienta_id integer NOT NULL REFERENCES clientas(id),
 desde date NOT NULL, hasta date, baja_en timestamptz NOT NULL DEFAULT now(),
 baja_por text NOT NULL, reactivada_en timestamptz, reactivada_por text,
 CHECK (extract(day FROM desde)=1), CHECK (hasta IS NULL OR (hasta>=desde AND extract(day FROM hasta)=1))
);
CREATE UNIQUE INDEX IF NOT EXISTS booty_baja_abierta ON booty_clientas_bajas(gym_id,clienta_id) WHERE hasta IS NULL;
CREATE OR REPLACE FUNCTION booty_generar_cuotas(p_gym text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE c record; cfg record; frecuencia integer; base numeric; interes numeric;
        hasta date := date_trunc('month',now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM booty_cuotas_gimnasios WHERE gym_id=p_gym) THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('booty_cuotas:' || p_gym, 0));
 SELECT * INTO cfg FROM configuracion WHERE gym_id=p_gym;
 IF NOT FOUND THEN RAISE EXCEPTION 'Falta configuración de cuotas para %',p_gym; END IF;
 interes := coalesce(cfg.interes,0);
 IF interes < 0 THEN RAISE EXCEPTION 'Interés inválido para %',p_gym; END IF;
 FOR c IN SELECT * FROM clientas WHERE gym_id=p_gym LOOP
  IF c.inicio_cuotas IS NULL THEN RAISE EXCEPTION 'Falta inicio de cuotas para clienta %',c.id; END IF;
  -- Misma regla de frecuencia que el administrativo actual: días separados por coma.
  frecuencia := CASE WHEN coalesce(trim(c.dias),'')='' THEN 2
                ELSE greatest(2,least(5,cardinality(string_to_array(c.dias,',')))) END;
  base := coalesce(nullif(CASE frecuencia WHEN 5 THEN cfg.monto_5dias
           WHEN 4 THEN cfg.monto_4dias WHEN 3 THEN cfg.monto_3dias ELSE cfg.monto_2dias END,0),cfg.monto_cuota,0);
  IF base <= 0 THEN RAISE EXCEPTION 'Tarifa faltante o inválida: clienta %, gym %',c.id,p_gym; END IF;
  INSERT INTO booty_cuotas(gym_id,clienta_id,periodo,nombre,apellido,frecuencia,monto_base,interes_porcentaje,monto_sin_descuento,descuento_porcentaje)
  SELECT p_gym,c.id,serie::date,coalesce(c.nombre,''),coalesce(c.apellido,''),frecuencia,round(base*(1-CASE WHEN c.descuento_familiar THEN cfg.descuento_familiar_porcentaje ELSE 0 END/100),2),interes,base,CASE WHEN c.descuento_familiar THEN cfg.descuento_familiar_porcentaje ELSE 0 END
    FROM generate_series(date_trunc('month',c.inicio_cuotas::timestamp),hasta::timestamp,interval '1 month') serie
  WHERE NOT EXISTS (SELECT 1 FROM booty_clientas_bajas b
    WHERE b.gym_id=p_gym AND b.clienta_id=c.id AND serie::date>=b.desde
      AND (b.hasta IS NULL OR serie::date<b.hasta))
  ON CONFLICT (gym_id,clienta_id,periodo) DO NOTHING;
 END LOOP;
END $$;

CREATE OR REPLACE VIEW booty_cuotas_estado AS
SELECT q.gym_id,q.clienta_id,q.periodo,q.nombre,q.apellido,q.frecuencia,
 q.monto_base,q.interes_porcentaje,q.creada_en,
 extract(month FROM q.periodo)::integer AS mes,
 extract(year FROM q.periodo)::integer AS anio,
 round(q.monto_base * CASE WHEN (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date > q.periodo + 9
       THEN 1 + q.interes_porcentaje/100 ELSE 1 END) AS monto,
 EXISTS (
   SELECT 1 FROM pagos p WHERE p.gym_id=q.gym_id AND p.clienta_id=q.clienta_id
    AND CASE WHEN p.mes IS NOT NULL AND p.anio IS NOT NULL
       THEN p.mes=extract(month FROM q.periodo) AND p.anio=extract(year FROM q.periodo)
       ELSE date_trunc('month',p.fecha_pago AT TIME ZONE 'America/Argentina/Buenos_Aires')::date=q.periodo END
 ) AS pagada, q.monto_sin_descuento, q.descuento_porcentaje
FROM booty_cuotas q;


-- Cambiar el descuento solo actualiza cuotas impagas del mes actual.
-- La tarifa original de cada cuota se conserva; el interes se aplica al neto.
CREATE OR REPLACE FUNCTION booty_actualizar_descuentos(p_gym text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('booty_cuotas:'||p_gym,0));
 UPDATE booty_cuotas q SET
  descuento_porcentaje=CASE WHEN c.descuento_familiar THEN cfg.descuento_familiar_porcentaje ELSE 0 END,
  monto_base=round(q.monto_sin_descuento*(1-CASE WHEN c.descuento_familiar THEN cfg.descuento_familiar_porcentaje ELSE 0 END/100),2)
 FROM clientas c,configuracion cfg
 WHERE q.gym_id=p_gym AND c.gym_id=p_gym AND cfg.gym_id=p_gym AND c.id=q.clienta_id
  AND q.periodo=date_trunc('month',now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
  AND NOT EXISTS (SELECT 1 FROM booty_cuotas_estado e WHERE e.gym_id=q.gym_id AND e.clienta_id=q.clienta_id AND e.periodo=q.periodo AND e.pagada);
END $$;
CREATE OR REPLACE FUNCTION booty_descuento_cambio() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM booty_actualizar_descuentos(NEW.gym_id::text);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS booty_descuento_clienta ON clientas;
CREATE TRIGGER booty_descuento_clienta AFTER UPDATE OF descuento_familiar ON clientas
FOR EACH ROW WHEN (OLD.descuento_familiar IS DISTINCT FROM NEW.descuento_familiar) EXECUTE FUNCTION booty_descuento_cambio();
DROP TRIGGER IF EXISTS booty_descuento_config ON configuracion;
CREATE TRIGGER booty_descuento_config AFTER UPDATE OF descuento_familiar_porcentaje ON configuracion
FOR EACH ROW WHEN (OLD.descuento_familiar_porcentaje IS DISTINCT FROM NEW.descuento_familiar_porcentaje) EXECUTE FUNCTION booty_descuento_cambio();
-- Serializa incluso los pagos que llegan desde otros servicios.
CREATE OR REPLACE FUNCTION booty_pago_bloqueo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('booty_cuotas:'||NEW.gym_id,0));
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS booty_pago_bloqueo ON pagos;
CREATE TRIGGER booty_pago_bloqueo BEFORE INSERT ON pagos FOR EACH ROW EXECUTE FUNCTION booty_pago_bloqueo();

CREATE OR REPLACE FUNCTION booty_cambiar_actividad(p_gym text,p_clienta integer,p_activa boolean,p_usuario text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE c record; mes date:=date_trunc('month',now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
 IF p_activa IS NULL THEN RAISE EXCEPTION 'Estado invalido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('booty_cuotas:'||p_gym,0));
 SELECT * INTO c FROM clientas WHERE gym_id=p_gym AND id=p_clienta FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Clienta no encontrada' USING ERRCODE='P0002'; END IF;
 IF c.activa=p_activa THEN RETURN; END IF;
 PERFORM booty_generar_cuotas(p_gym);
 IF NOT p_activa THEN
  INSERT INTO booty_clientas_bajas(gym_id,clienta_id,desde,baja_por)
   VALUES(p_gym,p_clienta,(mes+interval '1 month')::date,p_usuario);
  UPDATE clientas SET activa=false,fecha_baja=now() WHERE gym_id=p_gym AND id=p_clienta;
 ELSE
  UPDATE booty_clientas_bajas SET hasta=greatest(desde,mes),reactivada_en=now(),reactivada_por=p_usuario
   WHERE gym_id=p_gym AND clienta_id=p_clienta AND hasta IS NULL;
  UPDATE clientas SET activa=true,fecha_baja=NULL WHERE gym_id=p_gym AND id=p_clienta;
  PERFORM booty_generar_cuotas(p_gym);
 END IF;
END $$;
INSERT INTO booty_cuotas_migraciones(version) VALUES('20261006_bajas_descuento_v1') ON CONFLICT DO NOTHING;
COMMIT;
SELECT gym_id,count(*) FILTER(WHERE activa) AS activas,count(*) FILTER(WHERE NOT activa) AS dadas_de_baja
FROM clientas GROUP BY gym_id ORDER BY gym_id;
