import type { HttpContext } from '@adonisjs/core/http'
import { createPartidasValidator } from '#validators/partida'
import Partida from '#models/partida'
import JugadoresPartida from '#models/jugadores_partida'
import Barco from '#models/barco'
import Movimiento from '#models/movimiento'

export default class PartidaController {
  

  async store({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const payload = await request.validateUsing(createPartidasValidator)
      
      const partida = await Partida.create({
        nombre: payload.nombre || `Partida de ${user.fullName}`,
        descripcion: payload.descripcion || '',
        estado: 'esperando',
      })
      
      const jugadorPartida = await JugadoresPartida.create({
        id_usuario: user.id,
        id_partida: partida.id,
        es_turno: false,
      })
      
      await this.generarBarcosParaJugador(jugadorPartida.id)
      
      return response.status(201).json({
        success: true,
        message: 'Partida creada exitosamente',
        data: {
          partida,
          JugadoresPartida: jugadorPartida,
        },
      })
    } catch (error) {
      return response.status(400).json({  
        success: false,
        message: 'Error al crear la partida',
        errors: error.messages || error.message  
      })
    }
  }

  async obtenerPartida({ params, response }: HttpContext) {
    try {
      const partida = await Partida.findOrFail(params.id)
      const totalJugadoresResult = await JugadoresPartida.query()
        .where('id_partida', partida.id)  
        .count('* as total')

      const totalJugadores = totalJugadoresResult[0].$extras.total
      return response.json({
        success: true,
        partida,
        totalJugadores,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener la partida',
        error: error.message,
      })
    }
  }
  
  async index({ response }: HttpContext) {
    try {
      const partidas = await Partida.query()
        .where('estado', 'esperando')
        .preload('usuarios', (query) => {
          query.select('id', 'full_name', 'email')  
        })
        .withCount('usuarios')
        .having('usuarios_count', '<', 2)

      return response.json({
        success: true,
        data: partidas,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener las partidas',
        error: error.message,
      })
    }
  }
  
  async salaEspera({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const partida = await Partida.findOrFail(params.id)

      const jugadorActual = await JugadoresPartida.query()
        .where('id_partida', partida.id)  
        .where('id_usuario', user.id)    
        .first()

      if (!jugadorActual) {
        return response.status(403).json({
          success: false,
          message: 'No tienes acceso a esta partida',
        })
      }

      const totalJugadores = await JugadoresPartida.query()
        .where('id_partida', partida.id)  
        .count('* as total')

      const totalJugadoresCount = totalJugadores[0].$extras.total

      
      if (totalJugadoresCount >= 2 && partida.estado === 'en_curso') {
        return response.json({
          success: true,
          debeRedirigir: true,
          mensaje: '¡La partida ha comenzado!',
          urlRedireccion: `/juego/tablero/${partida.id}`,
        })
      }

      const jugadores = await JugadoresPartida.query()
        .where('id_partida', partida.id)  
        .preload('usuario', (query) => {
          query.select('id', 'full_name', 'email')  
        })

      return response.json({
        success: true,
        data: {
          partida,
          jugadorActual,
          totalJugadores: totalJugadoresCount,
          jugadores,
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener la sala de espera',
        error: error.message,
      })
    }
  }

  
  async verificarEstado({ params, response }: HttpContext) {
    try {
      const partida = await Partida.findOrFail(params.id_partida)
      const totalJugadores = await JugadoresPartida.query()
        .where('id_partida', partida.id)  
        .count('* as total')

      const totalJugadoresCount = Number(totalJugadores[0].$extras.total)

      
      if (totalJugadoresCount >= 2 && partida.estado === 'esperando') {
        partida.estado = 'en_curso'
        await partida.save()

        
        const primerJugador = await JugadoresPartida.query()
          .where('id_partida', partida.id)  
          .orderBy('createdAt', 'asc')
          .first()

        if (primerJugador) {
          primerJugador.es_turno = true  
          await primerJugador.save()
        }
      }

     
      await partida.refresh()

      return response.json({
        success: true,
        data: {
          estado: partida.estado,
          totalJugadores: totalJugadoresCount,
          puedeIniciar: totalJugadoresCount >= 2,
          debeRedirigir: totalJugadoresCount >= 2 && partida.estado === 'en_curso',
          urlRedireccion: `/juego/tablero/${partida.id}`,
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al verificar el estado',
        error: error.message,
      })
    }
  }

  


  async unirse({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const partida = await Partida.findOrFail(params.id)

      if (partida.estado !== 'esperando') {
        return response.status(400).json({
          success: false,
          message: 'Esta partida ya ha comenzado',
        })
      }

      const totalJugadores = await JugadoresPartida.query()
        .where('id_partida', partida.id)  
        .count('* as total')

      if (totalJugadores[0].$extras.total >= 2) {
        return response.status(400).json({
          success: false,
          message: 'No se puede unirse a la partida, ya está llena',
        })
      }

      const jugadorExistente = await JugadoresPartida.query()
        .where('id_partida', partida.id)  
        .where('id_usuario', user.id)    
        .first()

      
      if (jugadorExistente) {
        const tieneBarcosAsignados = await Barco.query()
          .where('id_jugadores_partida', jugadorExistente.id)  
          .first()

        if (!tieneBarcosAsignados) {
          await this.generarBarcosParaJugador(jugadorExistente.id)
        }

        return response.json({
          success: true,
          message: 'Ya estás en esta partida',
          data: {
            partida,
            JugadoresPartida: jugadorExistente,
          },
        })
      }
      
      const nuevoJugadorPartida = await JugadoresPartida.create({
        id_usuario: user.id,
        id_partida: partida.id,
        es_turno: false,
      }) 
      
      await this.generarBarcosParaJugador(nuevoJugadorPartida.id)

      const jugadoresActuales = await JugadoresPartida.query()
        .where('id_partida', partida.id)  
        .count('* as total')

      if (jugadoresActuales[0].$extras.total >= 2) {
        partida.estado = 'en_curso'
        await partida.save()

        
        const primerJugador = await JugadoresPartida.query()
          .where('id_partida', partida.id)  
          .orderBy('createdAt', 'asc')
          .first()

        if (primerJugador) {
          primerJugador.es_turno = true  
          await primerJugador.save()
        }
      }

      return response.status(201).json({
        success: true,
        message: 'Te has unido a la partida. ¡Empieza la partida!',
        data: {
          partida,
          JugadoresPartida: nuevoJugadorPartida,  
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al unirse a la partida',
        error: error.message,
      })
    }
  }

  
  async cancelar({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const partida = await Partida.findOrFail(params.id)

      const jugadorActual = await JugadoresPartida.query()
        .where('id_partida', partida.id)  
        .where('id_usuario', user.id)    
        .first()

      if (jugadorActual) {
        await jugadorActual.delete()

        
        const jugadoresRestantes = await JugadoresPartida.query()
          .where('id_partida', partida.id)  
          .count('* as total')

        if (jugadoresRestantes[0].$extras.total === 0) {
          await partida.delete()
        }
      }

      return response.json({
        success: true,
        message: 'Has salido de la partida',
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al cancelar la partida',
        error: error.message,
      })
    }
  }

  
  async misPartidas({ response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()

      const misPartidas = await Partida.query()
        .whereHas('jugadores', (query) => {
          query.where('id_usuario', user.id)  
        })
        .preload('jugadores', (query) => {
          query.preload('usuario')
        })
        .orderBy('createdAt', 'desc')

      const partidasFormateadas = misPartidas.map((partida) => {
        let resultado = null
        if (partida.estado === 'finalizado') {
          resultado = partida.ganador_id === user.id ? 'Ganada' : 'Perdida'
        }

        const oponente = partida.jugadores.find(
          (jugador) => jugador.id_usuario !== user.id
        )

        return {
          id: partida.id,
          nombre: partida.nombre,
          estado: partida.estado,
          resultado,
          oponente: oponente?.usuario?.fullName|| 'Sin oponente',
          createdAt: partida.createdAt,
        }
      })

      return response.json({
        success: true,
        data: partidasFormateadas,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener las partidas',
        error: error.message,
      })
    }
  }

   public async detallePartida({ params, response }: HttpContext) {
    try {
      const { id } = params

      const partida = await Partida.query()
        .where('id', id)
        .preload('jugadores', (jugadorQuery) => {
          jugadorQuery
            .preload('usuario', (usuarioQuery) => {
              usuarioQuery.select('id', 'full_name', 'email')
            })
            .preload('barcos')
            .preload('movimientosAtacante', (movimientoQuery) => {
              movimientoQuery.where('id_partida', id)
            })
            .preload('movimientosDefensor', (movimientoQuery) => {
              movimientoQuery.where('id_partida', id)
            })
        })
        .firstOrFail()

      const movimientos = await Movimiento.query()
        .where('id_partida', id)
        .preload('atacante', (query) => {
          query.preload('usuario', (usuarioQuery) => {
            usuarioQuery.select('id', 'full_name', 'email')
          })
        })
        .preload('defensor', (query) => {
          query.preload('usuario', (usuarioQuery) => {
            usuarioQuery.select('id', 'full_name', 'email')
          })
        })

      return response.json({
        success: true,
        data: {
          partida: partida.serialize(),
          movimientos: movimientos.map(mov => mov.serialize()),
        }
      })
    } catch (error) {
      console.error('Error al obtener detalle de partida:', error)
      return response.status(404).json({
        success: false,
        error: 'Partida no encontrada'
      })
    }
  }
  
  private async generarBarcosParaJugador(jugadoresPartidaId: number): Promise<void> {  
    const coordenadas: string[] = []
    const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const numeros = [1, 2, 3, 4, 5, 6, 7, 8]

    for (const letra of letras) {
      for (const numero of numeros) {
        coordenadas.push(letra + numero)
      }
    }

    
    for (let i = coordenadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[coordenadas[i], coordenadas[j]] = [coordenadas[j], coordenadas[i]]
    }

    const barcosCoords = coordenadas.slice(0, 15)

    
    for (const coord of barcosCoords) {
      await Barco.create({
        id_jugadores_partida: jugadoresPartidaId,  
        coordenada: coord,
        hundido: false,
      })
    }
  }
}