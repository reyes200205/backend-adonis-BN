import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'partidas'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.string('nombre')
      table.text('descripcion')
      table.enum('estado', ['esperando','en_progreso','finalizado', 'en_curso'])
      table.bigInteger('ganador_id').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}