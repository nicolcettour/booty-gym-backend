CREATE OR REPLACE VIEW booty_cuotas_estado AS
SELECT
    q.gym_id,
    q.clienta_id,
    q.periodo,
    q.nombre,
    q.apellido,
    q.frecuencia,
    q.monto_base,
    q.interes_porcentaje,
    q.creada_en,

    EXTRACT(month FROM q.periodo)::integer AS mes,
    EXTRACT(year FROM q.periodo)::integer AS anio,

    round(
        (
            CASE
                WHEN (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= (q.periodo + 9)
                    THEN q.monto_base
                ELSE q.monto_sin_descuento
            END
        )
        *
        CASE
            WHEN (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date > (q.periodo + 9)
                THEN 1::numeric + q.interes_porcentaje / 100::numeric
            ELSE 1::numeric
        END
    ) AS monto,

    (
        EXISTS (
            SELECT 1
            FROM pagos p
            WHERE p.gym_id::text = q.gym_id
              AND p.clienta_id = q.clienta_id
              AND
                CASE
                    WHEN p.mes IS NOT NULL
                     AND p.anio IS NOT NULL
                        THEN p.mes::numeric = EXTRACT(month FROM q.periodo)
                         AND p.anio::numeric = EXTRACT(year FROM q.periodo)
                    ELSE
                        date_trunc(
                            'month',
                            p.fecha_pago AT TIME ZONE 'America/Argentina/Buenos_Aires'
                        )::date = q.periodo
                END
        )
    ) AS pagada,

    q.monto_sin_descuento,

    CASE
        WHEN (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= (q.periodo + 9)
            THEN q.descuento_porcentaje
        ELSE 0
    END AS descuento_porcentaje

FROM booty_cuotas q;
