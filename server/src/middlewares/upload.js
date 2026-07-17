import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'sonapie/maintenance',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
    ],
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Format non supporté. Utilisez JPG, PNG ou WebP.'))
    }
  },
})

// ─── Photos de logements (galerie commerciale) ────────────────────────────────
// Dossier et résolution distincts (présentation commerciale, pas de maintenance).
const storageLogement = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'sonapie/logements',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1920, height: 1080, crop: 'limit', quality: 'auto' },
    ],
  },
})

export const uploadLogement = multer({
  storage: storageLogement,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Format non supporté. Utilisez JPG, PNG ou WebP.'))
    }
  },
})

export default upload
