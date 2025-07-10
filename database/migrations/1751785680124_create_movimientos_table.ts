import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'movimientos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.bigInteger('id_partida').unsigned().references('id').inTable('partidas').onDelete('CASCADE')
      table.bigInteger('id_atacante').unsigned().references('id').inTable('jugadores_partida').onDelete('CASCADE')
      table.bigInteger('id_defensor').unsigned().references('id').inTable('jugadores_partida').onDelete('CASCADE')
      table.string('coordenada', 255)
      table.boolean('acierto').defaultTo(false)
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}