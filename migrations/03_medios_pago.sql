-- Aplicar primero en la rama de prueba. Requiere cuotas persistentes instaladas.
-- Conserva la función original y todos los pagos existentes, incluidos MP App socias.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION booty_registrar_pago_con_medio(
 p_gym text, p_clienta integer, p_mes integer, p_anio integer,
 p_monto numeric, p_usuario text, p_medio text
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE pago_id integer;
BEGIN
 IF p_medio IS NULL OR p_medio NOT IN ('EFECTIVO','TRANSFERENCIA') THEN
  RAISE EXCEPTION 'Elegí Efectivo o Transferencia';
 END IF;
 -- La función original valida cuota, importe, período y duplicados bajo su bloqueo.
 pago_id := booty_registrar_pago(p_gym,p_clienta,p_mes,p_anio,p_monto,p_usuario);
 UPDATE pagos SET medio_pago=p_medio WHERE id=pago_id AND gym_id=p_gym;
 IF NOT FOUND THEN RAISE EXCEPTION 'No se pudo guardar el medio de pago'; END IF;
 RETURN pago_id;
END $$;
INSERT INTO booty_cuotas_migraciones(version)
 VALUES ('20261008_medios_pago_v1') ON CONFLICT DO NOTHING;
COMMIT;
SELECT version,aplicada_en FROM booty_cuotas_migraciones WHERE version='20261008_medios_pago_v1';
