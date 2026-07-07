const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')
const express = require('express')
const multer = require('multer')

const { authenticate, requireRole } = require('../middleware/auth')

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOADS_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${randomUUID()}${ext}`)
  },
})

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes (jpeg, png, webp, gif, svg).'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})

const router = express.Router()

router.post('/', authenticate, requireRole('admin'), (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? err.code === 'LIMIT_FILE_SIZE'
          ? 'El archivo excede el límite de 5MB.'
          : err.message
        : err.message
      return res.status(400).json({ message })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ningún archivo.' })
    }

    res.json({ url: `/uploads/${req.file.filename}` })
  })
})

router.post('/customer', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? err.code === 'LIMIT_FILE_SIZE'
          ? 'El archivo excede el límite de 5MB.'
          : err.message
        : err.message
      return res.status(400).json({ message })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ningún archivo.' })
    }

    res.json({ url: `/uploads/${req.file.filename}` })
  })
})

module.exports = router
