import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

// Importar los modelos relacionados
import User from './user.js'
import Partida from './partida.js'
import Barco from './barco.js'
import Movimiento from './movimiento.js'

export default class JugadoresPartida extends BaseModel {
  static table = 'jugadores_partida'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare id_usuario: number  // ← Cambiar aquí

  @column()
  declare id_partida: number  // ← Cambiar aquí

  @column()
  declare es_turno: boolean   // ← Cambiar aquí

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relaciones

  /**
   * Relación: Usuario que participa en la partida
   */
  @belongsTo(() => User, {
    foreignKey: 'id_usuario',
  })
  declare usuario: BelongsTo<typeof User>

  /**
   * Relación: Partida en la que participa el jugador
   */
  @belongsTo(() => Partida, {
    foreignKey: 'id_partida',
  })
  declare partida: BelongsTo<typeof Partida>

  /**
   * Relación: Barcos del jugador en esta partida
   */
  @hasMany(() => Barco, {
    foreignKey: 'id_jugadores_partida',
  })
  declare barcos: HasMany<typeof Barco>

  /**
   * Relación: Movimientos donde este jugador es el atacante
   */
  @hasMany(() => Movimiento, {
    foreignKey: 'id_atacante',
  })
  declare movimientosAtacante: HasMany<typeof Movimiento>

  /**
   * Relación: Movimientos donde este jugador es el defensor
   */
  @hasMany(() => Movimiento, {
    foreignKey: 'id_defensor',
  })
  declare movimientosDefensor: HasMany<typeof Movimiento>

  /**
   * Serializar datos para JSON
   */
  serialize() {
    return {
      ...super.serialize(),
      es_turno: Boolean(this.es_turno),
    }
  }
}