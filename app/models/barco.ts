import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

// Importar el modelo relacionado
import JugadoresPartida from './jugadores_partida.js'


export default class Barco extends BaseModel {
  static table = 'barcos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare id_jugadores_partida: number

  @column()
  declare coordenada: string | null

  @column()
  declare hundido: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  
  @belongsTo(() => JugadoresPartida, {
    foreignKey: 'id_jugadores_partida',
  })
  declare jugadoresPartida: BelongsTo<typeof JugadoresPartida>

  /**
   * Serializar datos para JSON (equivalente a $casts en Laravel)
   */
  serialize() {
    return {
      ...super.serialize(),
      hundido: Boolean(this.hundido),
    }
  }
}