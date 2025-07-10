import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('authorization')

    if (!authHeader) {
      ctx.response.status(401)
      ctx.response.header('content-type', 'application/json')

      const errorResponse = {
        success: false,
        error: 'No authorization',
        message: 'Token missing or invalid',
      }

      ctx.response.send(JSON.stringify(errorResponse))
      return
    }

    try {
      await ctx.auth.authenticateUsing(['api'])
      await next()
    } catch (error) {
      ctx.response.status(401)
      ctx.response.header('content-type', 'application/json')

      const errorResponse = {
        success: false,
        error: 'No authorization',
        message: 'Token missing or invalid',
        debug: error.message,
      }
      ctx.response.send(JSON.stringify(errorResponse))

      return
    }
  }
}
