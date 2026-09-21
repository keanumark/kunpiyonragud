import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const maxFileSize = 8 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'blob:', 'data:'],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 1, fields: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photo'));
    }
    callback(null, true);
  }
});

app.post('/api/confessions', (request, response, next) => {
  if (process.env.NODE_ENV === 'production' && !request.secure) {
    return response.status(400).json({ error: 'Secure HTTPS connection required.' });
  }
  upload.single('photo')(request, response, async (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'That photo is larger than 8 MB.'
        : error.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Please upload a valid JPG, PNG, or WebP image.'
          : 'The upload could not be completed.';
      return response.status(400).json({ error: message });
    }
    if (error) return next(error);

    const confession = typeof request.body?.confession === 'string'
      ? request.body.confession.trim()
      : '';
    if (!confession || confession.length > 2000) {
      return response.status(400).json({ error: 'Write a confession between 1 and 2,000 characters.' });
    }
    if (!request.file) {
      return response.status(400).json({ error: 'Please attach a photo before sending.' });
    }

    const detectedType = await fileTypeFromBuffer(request.file.buffer);
    if (!detectedType || !allowedTypes.has(detectedType.mime)) {
      return response.status(400).json({ error: 'Please upload a valid JPG, PNG, or WebP image.' });
    }

    // Replace this with a database or private object-storage write in production.
    // The file is held in memory only and is not written to disk by this endpoint.
    return response.status(201).json({ message: 'Your confession is on its way.' });
  });
});

app.use((error, _request, response, _next) => {
  console.error('Upload error:', error.message);
  response.status(500).json({ error: 'Something went wrong while sending your confession.' });
});

app.listen(port, () => {
  console.log(`Confession app running at http://localhost:${port}`);
});