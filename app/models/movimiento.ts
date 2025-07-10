import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

// Importar los modelos relacionados
import Partida from './partida.js'
import JugadoresPartida from './jugadores_partida.js'

export default class Movimiento extends BaseModel {
  static table = 'movimientos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare id_partida: number  

  @column()
  declare id_atacante: number  

  @column()
  declare id_defensor: number  

  @column()
  declare coordenada: string

  @column()
  declare acierto: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  
  @belongsTo(() => Partida, {
    foreignKey: 'id_partida',  
  })
  declare partida: BelongsTo<typeof Partida>

  
  @belongsTo(() => JugadoresPartida, {
    foreignKey: 'id_atacante',  
  })
  declare atacante: BelongsTo<typeof JugadoresPartida>

  
  @belongsTo(() => JugadoresPartida, {
    foreignKey: 'id_defensor',  
  })
  declare defensor: BelongsTo<typeof JugadoresPartida>

  
  serialize() {
    return {
      ...super.serialize(),
      acierto: Boolean(this.acierto),
    }
  }
}