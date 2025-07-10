import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { registerValidator, loginValidator } from '#validators/auth'

export default class AuthController {


  async register({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(registerValidator)

      const user = await User.create(payload)
      
      const token = await User.accessTokens.create(user)
      
      return response.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        token: token.value!.release()
      })
    } catch (error) {
      return response.status(400).json({
        message: 'Error al registrar usuario',
        errors: error.messages || error.message
      })
    }
  }

  
  async login({ request, response }: HttpContext) {
    try {
      const { email, password } = await request.validateUsing(loginValidator)
      
      
      const user = await User.verifyCredentials(email, password)
      
      
      const token = await User.accessTokens.create(user)
      
      return response.json({
        message: 'Inicio de sesión exitoso',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        token: token.value!.release()
      })
    } catch (error) {
      return response.status(401).json({
        message: 'Credenciales inválidas',
        error: error.message
      })
    }
  }

 
  async logout({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const token = auth.user?.currentAccessToken
      
      if (token) {
        await User.accessTokens.delete(user, token.identifier)
      }
      
      return response.json({
        message: 'Sesión cerrada exitosamente'
      })
    } catch (error) {
      return response.status(400).json({
        message: 'Error al cerrar sesión',
        error: error.message
      })
    }
  }

  
  async me({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      
      return response.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      })
    } catch (error) {
      return response.status(401).json({
        message: 'Usuario no autenticado'
      })
    }
  }
  
}