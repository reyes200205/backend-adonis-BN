import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany, hasManyThrough } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany, HasManyThrough } from '@adonisjs/lucid/types/relations'


import User from './user.js'
import Movimiento from './movimiento.js'
import JugadoresPartida from './jugadores_partida.js'
import Barco from './barco.js'

export default class Partida extends BaseModel {
  static table = 'partidas'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column()
  declare descripcion: string | null

  @column()
  declare estado: string

  @column()
  declare ganador_id: number | null  

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

 
  @belongsTo(() => User, {
    foreignKey: 'ganador_id',  
  })
  declare ganador: BelongsTo<typeof User>

  
  @hasMany(() => JugadoresPartida, {
    foreignKey: 'id_partida',  
  })
  declare jugadores: HasMany<typeof JugadoresPartida>

  
  @manyToMany(() => User, {
    pivotTable: 'jugadores_partida',
    localKey: 'id',
    pivotForeignKey: 'id_partida',       
    relatedKey: 'id',
    pivotRelatedForeignKey: 'id_usuario', 
  })
  declare usuarios: ManyToMany<typeof User>

  
  @hasMany(() => Movimiento, {
    foreignKey: 'id_partida',  // ← Cambiar aquí (si corresponde)
  })
  declare movimientos: HasMany<typeof Movimiento>

  /**
   * Relación: Barcos de todos los jugadores en la partida (Has Many Through)
   */
  @hasManyThrough([
    () => Barco,
    () => JugadoresPartida,
  ], {
    localKey: 'id',
    foreignKey: 'id_partida',          // ← Cambiar aquí
    throughLocalKey: 'id',
    throughForeignKey: 'id_jugador_partida',  // ← Cambiar aquí (si corresponde)
  })
  declare barcos: HasManyThrough<typeof Barco>

  /**
   * Serializar datos para JSON
   */
  serialize() {
    return {
      ...super.serialize(),
    }
  }
}