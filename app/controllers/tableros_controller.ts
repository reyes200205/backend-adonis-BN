import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Partida from '#models/partida'
import JugadoresPartida from '#models/jugadores_partida'
import Barco from '#models/barco'
import Movimiento from '#models/movimiento'
import logger from '@adonisjs/core/services/logger'

export default class TableroController {
  static dispararValidator = vine.compile(
    vine.object({
      posicion: vine
        .string()
        .minLength(2)
        .maxLength(3)
        .regex(/^[A-J](10|[1-9])$/),
    })
  )

  async tablero({ params, auth, response }: HttpContext) {
    try {
      const partidaId = params.id
      const userId = auth.user?.id

      if (!userId) {
        return response.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      // Buscar partida
      const partida = await Partida.findOrFail(partidaId)

      // Buscar jugador actual
      const jugadorActual = await JugadoresPartida.query()
        .where('id_partida', partida.id)
        .where('id_usuario', userId)
        .preload('usuario', (query) => {
          query.select('id', 'fullName', 'email')
        })
        .first()

      if (!jugadorActual) {
        return response.status(403).json({
          success: false,
          error: 'No tienes acceso a esta partida',
        })
      }

      // Debug del estado de la partida
      console.log('=== DEBUG TABLERO ===')
      console.log('Estado partida:', partida.estado)
      console.log('Ganador ID:', partida.ganador_id)
      console.log('User ID:', userId)

      if (partida.estado !== 'en_curso' && partida.estado !== 'finalizado') {
        return response.status(400).json({
          success: false,
          error: 'La partida aún no ha comenzado',
          redirect: `/partidas/${partidaId}/espera`,
        })
      }

      const jugadores = await JugadoresPartida.query()
        .where('id_partida', partida.id)
        .preload('usuario', (query) => {
          query.select('id', 'fullName', 'email')
        })

      if (jugadores.length < 2) {
        return response.status(400).json({
          success: false,
          error: 'Esperando que se una otro jugador',
          redirect: `/partidas/${partidaId}/espera`,
        })
      }

      const oponente = jugadores.find((j) => j.id_usuario !== userId)

      if (!oponente) {
        return response.status(400).json({
          success: false,
          error: 'No se encontró el oponente',
        })
      }

      const misBarcos = await Barco.query().where('id_jugadores_partida', jugadorActual.id)
      const misBarcosCoords = misBarcos.map((barco) => barco.coordenada).filter(Boolean)

      const movimientosContraOponente = await Movimiento.query()
        .where('id_partida', partida.id)
        .where('id_atacante', jugadorActual.id)
        .where('id_defensor', oponente.id)

      const barcosOponenteVisibles = movimientosContraOponente
        .filter((mov) => mov.acierto)
        .map((mov) => mov.coordenada)

      const todosMovimientos = await Movimiento.query().where('id_partida', partida.id)

      const misMovimientos = todosMovimientos.filter((mov) => mov.id_atacante === jugadorActual.id)
      const movimientosOponente = todosMovimientos.filter(
        (mov) => mov.id_defensor === jugadorActual.id
      )

      const estadisticasMias = {
        totalDisparos: misMovimientos.length,
        impactos: misMovimientos.filter((mov) => mov.acierto).length,
        precision:
          misMovimientos.length > 0
            ? Math.round(
                (misMovimientos.filter((mov) => mov.acierto).length / misMovimientos.length) *
                  100 *
                  10
              ) / 10
            : 0,
      }

      const estadisticasOponente = {
        totalDisparos: movimientosOponente.length,
        impactos: movimientosOponente.filter((mov) => mov.acierto).length,
        precision:
          movimientosOponente.length > 0
            ? Math.round(
                (movimientosOponente.filter((mov) => mov.acierto).length /
                  movimientosOponente.length) *
                  100 *
                  10
              ) / 10
            : 0,
      }

      const misDisparosFormateados = await this.formatearDisparos(misMovimientos)
      const disparosOponenteFormateados = await this.formatearDisparos(movimientosOponente)

      const juegoTerminado = partida.estado === 'finalizado'
      let ganador = null
      let mensaje = null

      if (juegoTerminado) {
        if (partida.ganador_id === userId) {
          ganador = 'jugador'
          mensaje = '¡Felicitaciones! Has ganado la partida 🎉'
        } else {
          ganador = 'oponente'
          mensaje = 'Has perdido esta partida 😔'
        }
      }

      const responseData = {
        success: true,
        data: {
          partida: partida,
          jugadorActual: jugadorActual,
          oponente: oponente,

          miTablero: {
            barcos: misBarcosCoords,
            disparos: disparosOponenteFormateados,
            estadisticas: estadisticasOponente,
            esPropio: true,
            mostrarBarcos: true,
            puedeDisparar: false,
          },

          tableroOponente: {
            barcos: barcosOponenteVisibles,
            disparos: misDisparosFormateados,
            estadisticas: estadisticasMias,
            esPropio: false,
            mostrarBarcos: false,
            puedeDisparar: jugadorActual.es_turno && !juegoTerminado,
          },

          esMiTurno: jugadorActual.es_turno && !juegoTerminado,
          juegoTerminado: juegoTerminado,
          ganador: ganador,
          mensaje: mensaje,

          // Información adicional para el estado final
          resultadoFinal: juegoTerminado
            ? {
                ganador: {
                  id: partida.ganador_id,
                  esGanador: partida.ganador_id === userId,
                  nombre:
                    partida.ganador_id === userId
                      ? jugadorActual.usuario.fullName
                      : oponente.usuario.fullName,
                },
                perdedor: {
                  id: partida.ganador_id === userId ? oponente.id_usuario : userId,
                  esGanador: false,
                  nombre:
                    partida.ganador_id === userId
                      ? oponente.usuario.fullName
                      : jugadorActual.usuario.fullName,
                },
              }
            : null,
        },
      }

      return response.json(responseData)
    } catch (error) {
      console.error('Error al cargar el tablero:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al cargar el tablero: ' + error.message,
      })
    }
  }

  async disparar({ request, params, auth, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(TableroController.dispararValidator)
      const partidaId = params.id
      const userId = auth.user?.id

      if (!userId) {
        return response.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const partida = await Partida.findOrFail(partidaId)

      if (partida.estado !== 'en_curso') {
        return response.status(400).json({
          success: false,
          error: 'La partida no está en curso',
        })
      }

      const jugadorActual = await JugadoresPartida.query()
        .where('id_partida', partidaId)
        .where('id_usuario', userId)
        .first()

      if (!jugadorActual) {
        return response.status(403).json({
          success: false,
          error: 'No tienes acceso a esta partida',
        })
      }

      if (!jugadorActual.es_turno) {
        return response.status(400).json({
          success: false,
          error: 'No es tu turno',
        })
      }

      const oponente = await JugadoresPartida.query()
        .where('id_partida', partidaId)
        .where('id_usuario', '!=', userId)
        .first()

      if (!oponente) {
        return response.status(400).json({
          success: false,
          error: 'No se encontró el oponente',
        })
      }

      // Verificar si ya disparó a esta posición
      const yaDisparo = await Movimiento.query()
        .where('id_partida', partidaId)
        .where('id_atacante', jugadorActual.id)
        .where('id_defensor', oponente.id)
        .where('coordenada', payload.posicion)
        .first()

      if (yaDisparo) {
        return response.status(400).json({
          success: false,
          error: 'Ya disparaste a esa posición',
        })
      }

      // Verificar si hay un barco en esa posición
      const barcoImpactado = await Barco.query()
        .where('id_jugadores_partida', oponente.id)
        .where('coordenada', payload.posicion)
        .where('hundido', false)
        .first()

      const acierto = !!barcoImpactado
      let resultado = acierto ? 'impacto' : 'agua'

      // Si hay impacto, marcar el barco como hundido
      if (barcoImpactado) {
        barcoImpactado.hundido = true
        await barcoImpactado.save()
        resultado = 'hundido'
      }

      // Crear el movimiento
      await Movimiento.create({
        id_partida: partidaId,
        id_atacante: jugadorActual.id,
        id_defensor: oponente.id,
        coordenada: payload.posicion,
        acierto: acierto,
      })

      // Verificar si el juego terminó ANTES de cambiar el turno
      const barcosRestantes = await Barco.query()
        .where('id_jugadores_partida', oponente.id)
        .where('hundido', false)
        .count('* as total')

      const barcosRestantesCount = Number(barcosRestantes[0].$extras.total)
      const juegoTerminado = barcosRestantesCount === 0

      console.log('=== DEBUG DISPARO ===')
      console.log('Barcos restantes:', barcosRestantesCount)
      console.log('Juego terminado:', juegoTerminado)
      console.log('Partida antes de actualizar:', {
        id: partida.id,
        estado: partida.estado,
        ganador_id: partida.ganador_id,
      })

      let esMiTurno = false

      if (juegoTerminado) {
        console.log('Actualizando partida...')

        // MÉTODO 1: Actualizar usando el objeto partida
        partida.estado = 'finalizado' // ← Cambiar 'finalizada' por 'finalizado'
        partida.ganador_id = userId
        await partida.save()

        // MÉTODO 2: Si el anterior no funciona, usar query builder
        // await Partida.query()
        //   .where('id', partidaId)
        //   .update({
        //     estado: 'finalizada',
        //     ganador_id: userId
        //   })

        // MÉTODO 3: Recargar la partida desde la BD y actualizar
        // await partida.refresh()
        // partida.estado = 'finalizada'
        // partida.ganador_id = userId
        // await partida.save()

        // Verificar que se guardó correctamente
        const partidaActualizada = await Partida.findOrFail(partidaId)
        console.log('Partida después de guardar:', {
          id: partidaActualizada.id,
          estado: partidaActualizada.estado,
          ganador_id: partidaActualizada.ganador_id,
        })

        // Marcar ambos jugadores como sin turno
        jugadorActual.es_turno = false
        await jugadorActual.save()

        oponente.es_turno = false
        await oponente.save()

        console.log('Juego terminado. Partida actualizada:', {
          estado: partida.estado,
          ganador_id: partida.ganador_id,
          ganador: userId,
          perdedor: oponente.id_usuario,
        })
      } else {
        // Solo cambiar turno si el juego no terminó
        jugadorActual.es_turno = false
        await jugadorActual.save()

        oponente.es_turno = true
        await oponente.save()

        esMiTurno = false
      }

      const responseData = {
        success: true,
        resultado: resultado,
        posicion: payload.posicion,
        juegoTerminado: juegoTerminado,
        esMiTurno: esMiTurno,
        mensaje: juegoTerminado
          ? '¡Felicitaciones! Has ganado la partida 🎉'
          : this.obtenerMensajeResultado(resultado, payload.posicion),
        barcosRestantes: barcosRestantesCount,
        turnoActual: juegoTerminado ? null : oponente.id,
        // Información adicional para el juego terminado
        ganador: juegoTerminado
          ? {
              id: userId,
              esGanador: true,
              mensaje: '¡Felicitaciones! Has ganado la partida 🎉',
            }
          : null,
        perdedor: juegoTerminado
          ? {
              id: oponente.id_usuario,
              esGanador: false,
              mensaje: 'Has perdido esta partida 😔',
            }
          : null,
      }

      return response.json(responseData)
    } catch (error) {
      console.error('Error en disparar:', error)

      if (error.messages) {
        return response.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          messages: error.messages,
        })
      }

      return response.status(500).json({
        success: false,
        error: 'Ocurrió un error inesperado',
        message: error.message,
      })
    }
  }

  // Método privado para formatear disparos - CORREGIDO
  private async formatearDisparos(movimientos: any[]): Promise<any[]> {
    logger.info('Formateando disparos:', { cantidad: movimientos.length })

    if (!movimientos || movimientos.length === 0) {
      return []
    }

    const disparosFormateados = []

    for (const movimiento of movimientos) {
      let hundido = false

      if (movimiento.acierto) {
        const barcoImpactado = await Barco.query()
          .where('id_jugadores_partida', movimiento.id_defensor) // Cambiado de 'idJugadorPartida' a 'id_jugadores_partida'
          .where('coordenada', movimiento.coordenada)
          .first()

        if (barcoImpactado) {
          hundido = barcoImpactado.hundido
        }
      }

      disparosFormateados.push({
        posicion: movimiento.coordenada,
        impacto: movimiento.acierto,
        hundido: hundido,
        resultado: hundido ? 'hundido' : movimiento.acierto ? 'impacto' : 'agua',
      })
    }

    logger.info('Disparos formateados completados:', { cantidad: disparosFormateados.length })
    return disparosFormateados
  }

  // Método privado para obtener mensaje de resultado
  private obtenerMensajeResultado(resultado: string, posicion: string): string {
    switch (resultado) {
      case 'agua':
        return `Agua en ${posicion}`
      case 'impacto':
        return `¡Impacto en ${posicion}!`
      case 'hundido':
        return `¡Barco hundido en ${posicion}!`
      default:
        return `Disparo en ${posicion}`
    }
  }
}
