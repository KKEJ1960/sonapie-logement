import { Router } from 'express'
import authRoutes from './auth.routes.js'
import healthRoutes from './health.routes.js'
import adminRoutes from './admin.routes.js'
import superAdminRoutes from './superAdmin.routes.js'
import directionRoutes from './direction.routes.js'
import locataireRoutes from './locataire.routes.js'
import ticketsRoutes from './tickets.routes.js'
import interventionsRoutes from './interventions.routes.js'
import photosRoutes from './photos.routes.js'
import serviceLogementRoutes from './serviceLogement.routes.js'
import logementsRoutes from './logements.routes.js'
import chatRoutes from './chat.routes.js'
import dossierRoutes from './dossier.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/health', healthRoutes)
router.use('/admin', adminRoutes)
router.use('/super-admin', superAdminRoutes)
router.use('/direction', directionRoutes)
router.use('/locataire', locataireRoutes)
router.use('/tickets', ticketsRoutes)
router.use('/interventions', interventionsRoutes)
router.use(photosRoutes) // montage direct : /tickets/:id/photos et /photos/:id
router.use('/service-logement', serviceLogementRoutes)
router.use('/logements', logementsRoutes)
router.use('/conversations', chatRoutes)
router.use('/dossiers', dossierRoutes)

export default router
