import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, manyToMany, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import type { ManyToMany, HasMany } from '@adonisjs/lucid/types/relations'

import JugadoresPartida from './jugadores_partida.js'
import Partida from './partida.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column({ serializeAs: null })
  declare rememberToken: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

 
  @manyToMany(() => Partida, {
    pivotTable: 'jugadores_partida',
    localKey: 'id',
    pivotForeignKey: 'id_usuario',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'id_partida',
  })
  declare partidas: ManyToMany<typeof Partida>

  @hasMany(() => JugadoresPartida, {
    foreignKey: 'id_usuario',
  })
  declare jugadoresPartida: HasMany<typeof JugadoresPartida>

  static accessTokens = DbAccessTokensProvider.forModel(User)
}