import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'


const PartidasController = () => import('../app/controllers/partidas_controller.js')
const MovimientosController = () => import('../app/controllers/movimientos_controller.js')
const TableroController = () => import('../app/controllers/tableros_controller.js')
const AuthController = () => import('../app/controllers/auth_controller.js')



router.group(() => {
  router.post('/register', [AuthController, 'register'])
  router.post('/login', [AuthController, 'login'])
  router.post('/logout', [AuthController, 'logout']).use(middleware.auth())
  router.get('/me', [AuthController, 'me']).use(middleware.auth())
}).prefix('/auth')

router.group(() => {
  router.get('/partidas', [PartidasController, 'index'])
  router.post('/partidas', [PartidasController, 'store'])
  router.get('/partidas/:id', [PartidasController, 'obtenerPartida'])
  router.post('/partidas/:id/unirse', [PartidasController, 'unirse'])
  router.get('partidas/:id_partida/verificar-estado', [PartidasController, 'verificarEstado'])
  router.get('/mis-partidas', [PartidasController, 'misPartidas'])
  router.get('detalle-partida/:id', [PartidasController, 'detallePartida'])
}).middleware([middleware.auth()])



router.group(() => {
  router.post('/movimientos', [MovimientosController, 'registrarMovimiento'])
  router.get('/movimientos/partida/:id_partida', [MovimientosController, 'obtenerMovimientos'])
  router.get('/movimientos/partida/:id_partida/detallados', [MovimientosController, 'obtenerMovimientosDetallados'])
  router.get('/movimientos/partida/:id_partida/estadisticas', [MovimientosController, 'obtenerEstadisticasMovimientos'])
}).middleware([middleware.auth()])


router.group(() => {
  router.get('/tablero/:id', [TableroController, 'tablero'])
  router.post('/tablero/:id/disparar', [TableroController, 'disparar'])
  
}).middleware([middleware.auth()])


