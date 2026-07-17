import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import upload from '../middlewares/upload.js'
import { uploaderPhoto, getPhotosByTicket, supprimerPhoto } from '../controllers/photos.controller.js'

const router = Router()

router.use(requireAuth)

// Multer renvoie une erreur structurée en cas de fichier trop lourd ou format invalide
function handleUploadError(err, _req, res, next) {
  if (err) {
    return res.status(400).json({ message: err.message || 'Erreur lors de l\'upload.' })
  }
  next()
}

router.post(
  '/tickets/:ticketId/photos',
  (req, res, next) => upload.single('photo')(req, res, err => {
    if (err) return res.status(400).json({ message: err.message || 'Erreur upload.' })
    next()
  }),
  uploaderPhoto,
)

router.get('/tickets/:ticketId/photos', getPhotosByTicket)

router.delete('/photos/:id', supprimerPhoto)

export default router
