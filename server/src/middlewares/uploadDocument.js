import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'sonapie/documents',
    resource_type:   'auto', // autorise les PDF en plus des images
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  },
})

const uploadDocument = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Format non supporté. Utilisez JPG, PNG, WebP ou PDF.'))
    }
  },
})

export default uploadDocument
