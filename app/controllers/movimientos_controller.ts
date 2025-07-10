import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Partida from '#models/partida'
import Barco from '#models/barco'
import Movimiento from '#models/movimiento'

export default class MovimientosController {
  
  
  static registrarMovimientoValidator = vine.compile(
    vine.object({
      idPartida: vine.number().exists(async (db, value) => {
        const partida = await db.from('partidas').where('id', value).first()
        return !!partida
      }),
      idAtacante: vine.number().exists(async (db, value) => {
        const jugador = await db.from('jugadores_partida').where('id', value).first()
        return !!jugador
      }),
      idDefensor: vine.number().exists(async (db, value) => {
        const jugador = await db.from('jugadores_partida').where('id', value).first()
        return !!jugador
      }),
      coordenada: vine.string().maxLength(255),
    })
  )

  
  async registrarMovimiento({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(MovimientosController.registrarMovimientoValidator)
      
      let acierto = false

      
      const barco = await Barco.query()
        .where('idJugadoresPartida', payload.idDefensor)
        .where('coordenada', payload.coordenada)
        .first()

      if (barco) {
        acierto = true
        barco.coordenada = null
        await barco.save()
      }

      
      const movimiento = await Movimiento.create({
        idPartida: payload.idPartida,
        idAtacante: payload.idAtacante,
        idDefensor: payload.idDefensor,
        coordenada: payload.coordenada,
        acierto: acierto,
      })

      return response.json({
        success: true,
        movimiento: movimiento,
        acierto: acierto,
        mensaje: acierto ? '¡Acierto!' : 'Fallaste el tiro.'
      })

    } catch (error) {
      return response.status(400).json({
        success: false,
        error: error.messages || 'Error al registrar el movimiento'
      })
    }
  }

  
  async obtenerMovimientos({ params, response }: HttpContext) {
    try {
      const idPartida = params.id_partida

      // Validar que la partida existe
      const partida = await Partida.find(idPartida)
      if (!partida) {
        return response.status(404).json({
          success: false,
          error: 'Partida no encontrada'
        })
      }

      
      const movimientos = await Movimiento.query()
        .where('idPartida', idPartida)
        .orderBy('createdAt', 'desc')
        .exec()

      return response.json({
        success: true,
        movimientos: movimientos,
      })

    } catch (error) {
      return response.status(500).json({
        success: false,
        error: 'Error al obtener los movimientos'
      })
    }
  }

  
  async obtenerMovimientosDetallados({ params, response }: HttpContext) {
    try {
      const idPartida = params.id_partida

      const movimientos = await Movimiento.query()
        .where('idPartida', idPartida)
        .preload('atacante', (query) => {
          query.preload('usuario')
        })
        .preload('defensor', (query) => {
          query.preload('usuario')
        })
        .orderBy('createdAt', 'desc')
        .exec()

      return response.json({
        success: true,
        movimientos: movimientos,
      })

    } catch (error) {
      return response.status(500).json({
        success: false,
        error: 'Error al obtener los movimientos detallados'
      })
    }
  }

  
  async obtenerEstadisticasMovimientos({ params, response }: HttpContext) {
    try {
      const idPartida = params.id_partida

      const estadisticas = await Movimiento.query()
        .where('idPartida', idPartida)
        .groupBy('idAtacante')
        .select('idAtacante')
        .count('* as totalMovimientos')
        .sum('acierto as totalAciertos')
        .exec()

      return response.json({
        success: true,
        estadisticas: estadisticas,
      })

    } catch (error) {
      return response.status(500).json({
        success: false,
        error: 'Error al obtener las estadísticas'
      })
    }
  }
}