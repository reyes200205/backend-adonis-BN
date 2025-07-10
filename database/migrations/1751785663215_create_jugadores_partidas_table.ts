import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'jugadores_partida'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.bigInteger('id_usuario').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.bigInteger('id_partida').unsigned().references('id').inTable('partidas').onDelete('SET NULL')
      table.boolean('es_turno')
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}