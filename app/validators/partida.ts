import vine from '@vinejs/vine'

export const createPartidasValidator = vine.compile(
  vine.object({
    nombre: vine.string(),
    descripcion: vine.string(),
    estado: vine.string().optional(),
  })
)