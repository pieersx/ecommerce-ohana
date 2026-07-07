const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')
const express = require('express')
const multer = require('multer')

const env = require('../config/env')
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

const useS3 = Boolean(env.uploadsBucket)

let s3Client = null
if (useS3) {
  const { S3Client } = require('@aws-sdk/client-s3')
  s3Client = new S3Client({ region: env.awsRegion })
}

const storage = useS3
  ? multer.memoryStorage()
  : multer.diskStorage({
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

async function storeFile(file) {
  if (!useS3) {
    return `/uploads/${file.filename}`
  }

  const { PutObjectCommand } = require('@aws-sdk/client-s3')
  const ext = path.extname(file.originalname).toLowerCase()
  const key = `uploads/${randomUUID()}${ext}`

  await s3Client.send(new PutObjectCommand({
    Bucket: env.uploadsBucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }))

  return `https://${env.uploadsBucket}.s3.${env.awsRegion}.amazonaws.com/${key}`
}

function handleUpload(req, res) {
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

    storeFile(req.file)
      .then((url) => res.json({ url }))
      .catch(() => res.status(500).json({ message: 'No se pudo guardar el archivo.' }))
  })
}

const router = express.Router()

router.post('/', authenticate, requireRole('admin'), handleUpload)

router.post('/customer', handleUpload)

module.exports = router
