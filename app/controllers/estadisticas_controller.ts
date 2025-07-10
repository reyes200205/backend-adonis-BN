import type { HttpContext } from '@adonisjs/core/http'
import Partida from '#models/partida'

export default class EstadisticasController {
  // Obtener conteo de partidas ganadas y perdidas del usuario autenticado
  public async index({ auth, response }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const userId = user.id

      // Partidas ganadas
      const ganadas = await Partida.query()
        .where('estado', 'finalizado') // Cambié a 'finalizado' para uniformidad
        .where('ganador_id', userId)
        .whereHas('jugadores', (q) => {
          q.where('id_usuario', userId)
        })

      // Partidas perdidas
      const perdidas = await Partida.query()
        .where('estado', 'finalizado')
        .whereHas('jugadores', (q) => {
          q.where('id_usuario', userId)
        })
        .whereNot('ganador_id', userId)

      return response.json({
        success: true,
        ganadas: ganadas.length,
        perdidas: perdidas.length,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message,
      })
    }
  }

  // Listar partidas ganadas o perdidas con detalles
  public async partidas({ auth, params, response }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const userId = user.id
      const tipo = params.tipo

      let partidasQuery = Partida.query()
        .where('estado', 'finalizado')
        .whereHas('jugadores', (q) => q.where('id_usuario', userId))
        .preload('jugadores', (j) => j.preload('usuario'))
        .orderBy('created_at', 'desc')

      if (tipo === 'ganadas') {
        partidasQuery = partidasQuery.where('ganador_id', userId)
      } else {
        partidasQuery = partidasQuery.whereNot('ganador_id', userId)
      }

      const partidas = await partidasQuery

      const data = partidas.map((partida) => {
        const oponente = partida.jugadores.find((j) => j.id_usuario !== userId)

        return {
          id: partida.id,
          nombre: partida.nombre,
          estado: partida.estado,
          resultado: partida.ganador_id === userId ? 'Ganada' : 'Perdida',
          oponente: oponente?.usuario?.fullName ?? 'Sin oponente',
          created_at: partida.createdAt,
        }
      })

      return response.json({
        success: true,
        partidas: data,
        tipo,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener partidas',
        error: error.message,
      })
    }
  }

  
  public async detalle({ auth, params, request, response }: HttpContext) {
    try {
      await auth.authenticate()
      const id = params.id

      const partida = await Partida.query()
        .where('id', id)
        .preload('jugadores', (j) =>
          j
            .preload('usuario')
            .preload('barcos')
            .preload('movimientosAtacante', (m) => m.where('id_partida', id))
            .preload('movimientosDefensor', (m) => m.where('id_partida', id))
        )
        .firstOrFail()

      const movimientos = await partida
        .related('movimientos')
        .query()
        .preload('atacante', (a) => a.preload('usuario'))
        .preload('defensor', (d) => d.preload('usuario'))

      return response.json({
        success: true,
        partida,
        movimientos,
        from: request.input('from', 'mis-partidas'),
      })
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: 'Partida no encontrada',
        error: error.message,
      })
    }
  }
}
