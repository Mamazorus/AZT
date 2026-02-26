import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import Cropper from 'react-easy-crop'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { auth, db, storage } from '../firebase'

// ─── Timeout wrapper ──────────────────────────────────────────────────────────
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ])
}

// ─── Firestore helpers ────────────────────────────────────────────────────────
async function uploadBlob(blob, projectId, slot, isVideo = false) {
  const ext     = isVideo ? 'mp4' : 'jpg'
  const prefix  = isVideo ? 'media' : 'image'
  const path    = `projects/${projectId}/${prefix}-${slot}.${ext}`
  const fileRef = ref(storage, path)
  const task    = uploadBytesResumable(fileRef, blob)

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Upload timeout')), 60000)
    task.on(
      'state_changed',
      null,
      (err) => { clearTimeout(timeout); reject(err) },
      async () => { clearTimeout(timeout); resolve(await getDownloadURL(task.snapshot.ref)) }
    )
  })
}

async function getNextNumber() {
  const snapshot = await withTimeout(getDocs(collection(db, 'projects')))
  return { number: String(snapshot.size + 1).padStart(2, '0'), order: snapshot.size }
}

async function addProject(form, blobs, blobTypes, thumbBlob) {
  const { number, order } = await getNextNumber()
  const tempId       = `temp_${Date.now()}`
  const uploadedUrls = ['', '', '', '']

  for (let i = 0; i < 4; i++) {
    if (blobs[i]) uploadedUrls[i] = await uploadBlob(blobs[i], tempId, i, blobTypes[i] === 'video')
  }

  let thumbnail = ''
  if (thumbBlob) thumbnail = await uploadBlob(thumbBlob, tempId, 'thumb')

  const docRef = await withTimeout(
    addDoc(collection(db, 'projects'), {
      number, order, ...form, images: uploadedUrls, mediaTypes: blobTypes,
      thumbnail, createdAt: serverTimestamp(),
    })
  )

  return { id: docRef.id, number, order, ...form, images: uploadedUrls, mediaTypes: blobTypes, thumbnail }
}

async function updateProject(id, form, blobs, blobTypes, existingUrls, thumbBlob, existingThumb) {
  const finalUrls   = [...existingUrls]
  const finalTypes  = [...blobTypes]

  for (let i = 0; i < 4; i++) {
    if (blobs[i]) finalUrls[i] = await uploadBlob(blobs[i], id, i, blobTypes[i] === 'video')
  }

  let thumbnail = existingThumb ?? ''
  if (thumbBlob) thumbnail = await uploadBlob(thumbBlob, id, 'thumb')

  await withTimeout(updateDoc(doc(db, 'projects', id), {
    ...form, images: finalUrls, mediaTypes: finalTypes, thumbnail,
  }))
  return { images: finalUrls, mediaTypes: finalTypes, thumbnail }
}

async function deleteProject(project) {
  await withTimeout(deleteDoc(doc(db, 'projects', project.id)))
  for (const url of project.images) {
    if (!url) continue
    try { await deleteObject(ref(storage, url)) } catch {}
  }
  if (project.thumbnail) {
    try { await deleteObject(ref(storage, project.thumbnail)) } catch {}
  }
}

async function reorderProjects(projects) {
  const batch = writeBatch(db)
  projects.forEach((p, i) => {
    batch.update(doc(db, 'projects', p.id), {
      order:  i,
      number: String(i + 1).padStart(2, '0'),
    })
  })
  await withTimeout(batch.commit(), 10000)
}

// ─── Image : crop + compression Canvas ───────────────────────────────────────
function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

async function getCroppedBlob(imageSrc, pixelCrop, rotation = 0, maxDim = 1920) {
  const image  = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx    = canvas.getContext('2d')

  const rotRad    = (rotation * Math.PI) / 180
  const bBoxW     = Math.abs(Math.cos(rotRad) * image.width)  + Math.abs(Math.sin(rotRad) * image.height)
  const bBoxH     = Math.abs(Math.sin(rotRad) * image.width)  + Math.abs(Math.cos(rotRad) * image.height)

  canvas.width  = bBoxW
  canvas.height = bBoxH
  ctx.translate(bBoxW / 2, bBoxH / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height)

  let outW = pixelCrop.width
  let outH = pixelCrop.height
  if (outW > maxDim || outH > maxDim) {
    const ratio = Math.min(maxDim / outW, maxDim / outH)
    outW = Math.round(outW * ratio)
    outH = Math.round(outH * ratio)
  }

  const outCanvas = document.createElement('canvas')
  outCanvas.width  = outW
  outCanvas.height = outH

  if (outW !== pixelCrop.width || outH !== pixelCrop.height) {
    const tmp = document.createElement('canvas')
    tmp.width  = pixelCrop.width
    tmp.height = pixelCrop.height
    tmp.getContext('2d').putImageData(data, 0, 0)
    outCanvas.getContext('2d').drawImage(tmp, 0, 0, outW, outH)
  } else {
    outCanvas.getContext('2d').putImageData(data, 0, 0)
  }

  return new Promise(resolve => outCanvas.toBlob(resolve, 'image/jpeg', 0.85))
}

// ─── Vidéo : trim + crop + compress via FFmpeg.wasm ──────────────────────────
const FFMPEG_VERSION = '0.12.6'

async function processVideo(videoSrc, trimStart, trimEnd, cropPixels, onProgress, onLoadingDone) {
  const { FFmpeg }               = await import('@ffmpeg/ffmpeg')
  const { fetchFile, toBlobURL } = await import('@ffmpeg/util')

  const ffmpeg = new FFmpeg()
  ffmpeg.on('progress', ({ progress }) =>
    onProgress(Math.round(Math.min(100, Math.max(0, progress * 100))))
  )

  const base = `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm`
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`,   'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  onLoadingDone?.() // FFmpeg prêt, passage en phase "traitement"

  await ffmpeg.writeFile('input.mp4', await fetchFile(videoSrc))

  const filters = []
  if (cropPixels) {
    const { x, y, width, height } = cropPixels
    filters.push(`crop=${width}:${height}:${x}:${y}`)
  }
  filters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2')

  const args = [
    '-i',       'input.mp4',
    '-ss',      String(trimStart),
    '-to',      String(trimEnd),
    '-vf',      filters.join(','),
    '-c:v',     'libx264',
    '-crf',     '26',
    '-preset',  'veryfast',
    '-movflags','+faststart',
    'output.mp4',
  ]

  await ffmpeg.exec(args)
  const data = await ffmpeg.readFile('output.mp4')
  return new Blob([data.buffer], { type: 'video/mp4' })
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// ─── CropModal ────────────────────────────────────────────────────────────────
const ASPECT_OPTIONS = [
  { label: '3:4',    value: 3 / 4 },
  { label: '4:5',    value: 4 / 5 },
  { label: '1:1',    value: 1 },
  { label: '9:16',   value: 9 / 16 },
  { label: 'A3',     value: 297 / 420 },
  { label: 'CUSTOM', value: 'custom' },
]

// onCropCoords : optionnel, utilisé pour le recadrage vidéo (retourne les coords, pas un blob)
function CropModal({ imageSrc, onConfirm, onCancel, lockedAspect, onCropCoords }) {
  const [crop,              setCrop]              = useState({ x: 0, y: 0 })
  const [zoom,              setZoom]              = useState(1)
  const [rotation,          setRotation]          = useState(0)
  const [aspect,            setAspect]            = useState(lockedAspect ?? 3 / 4)
  const [customW,           setCustomW]           = useState(4)
  const [customH,           setCustomH]           = useState(3)
  const [cropperKey,        setCropperKey]        = useState(String(lockedAspect ?? 0.75))
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [processing,        setProcessing]        = useState(false)

  const computedAspect = aspect === 'custom' ? customW / customH : aspect

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), [])

  const handleAspectChange = (value) => {
    setAspect(value)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropperKey(String(value))
  }

  const commitCustom = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropperKey(`custom-${customW}-${customH}`)
  }

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    if (onCropCoords) { onCropCoords(croppedAreaPixels); return }
    setProcessing(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation)
      onConfirm(blob)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      <div className="relative flex-1">
        <Cropper
          key={cropperKey}
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={computedAspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle:  { border: '1px solid rgba(255,255,255,0.4)' },
          }}
        />
      </div>

      <div className="bg-black px-6 py-4 flex flex-col gap-3">
        {/* Format — masqué si aspect verrouillé */}
        {!lockedAspect && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-white/40 uppercase tracking-widest shrink-0">FORMAT</span>
            <div className="flex gap-1">
              {ASPECT_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleAspectChange(opt.value)}
                  className={`text-xs uppercase tracking-widest px-2 py-1 transition-colors duration-150 ${
                    aspect === opt.value ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sliders W/H pour CUSTOM */}
        {aspect === 'custom' && !lockedAspect && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 uppercase tracking-widest shrink-0 w-16">W / H</span>
            <input
              type="range" min={1} max={20} step={1} value={customW}
              onChange={e => setCustomW(Number(e.target.value))}
              onMouseUp={commitCustom} onTouchEnd={commitCustom}
              className="flex-1 accent-white"
            />
            <span className="text-xs text-white/40 tabular-nums w-5 text-center">{customW}</span>
            <span className="text-xs text-white/20">:</span>
            <input
              type="range" min={1} max={20} step={1} value={customH}
              onChange={e => setCustomH(Number(e.target.value))}
              onMouseUp={commitCustom} onTouchEnd={commitCustom}
              className="flex-1 accent-white"
            />
            <span className="text-xs text-white/40 tabular-nums w-5 text-center">{customH}</span>
          </div>
        )}

        {/* Zoom */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40 uppercase tracking-widest shrink-0 w-16">ZOOM</span>
          <input
            type="range" min={1} max={10} step={0.1} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 accent-white"
          />
          <span className="text-xs text-white/40 tabular-nums w-8 text-right">{zoom.toFixed(1)}x</span>
        </div>

        {/* Rotation */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40 uppercase tracking-widest shrink-0 w-16">ROTATE</span>
          <input
            type="range" min={0} max={360} step={1} value={rotation}
            onChange={e => setRotation(Number(e.target.value))}
            className="flex-1 accent-white"
          />
          <span className="text-xs text-white/40 tabular-nums w-8 text-right">{rotation}°</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-6 pt-1">
          <button onClick={onCancel} className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors duration-150">
            CANCEL
          </button>
          <button onClick={handleConfirm} disabled={processing} className="text-xs uppercase tracking-widest text-white hover:opacity-60 transition-opacity duration-150 disabled:opacity-30">
            {processing ? 'PROCESSING...' : 'CONFIRM'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── VideoEditModal ───────────────────────────────────────────────────────────
function VideoEditModal({ videoSrc, onConfirm, onCancel }) {
  const videoRef = useRef()

  const [duration,    setDuration]    = useState(0)
  const [trimStart,   setTrimStart]   = useState(0)
  const [trimEnd,     setTrimEnd]     = useState(0)
  const [step,        setStep]        = useState('trim')   // 'trim' | 'crop' | 'loading' | 'processing'
  const [frameUrl,    setFrameUrl]    = useState(null)
  const [cropPixels,  setCropPixels]  = useState(null)
  const [ffProgress,  setFfProgress]  = useState(0)
  const [ffError,     setFfError]     = useState(null)

  const handleLoaded = () => {
    const d = videoRef.current?.duration || 0
    setDuration(d)
    setTrimEnd(d)
  }

  const extractFrame = () => {
    const video = videoRef.current
    if (!video) return
    const canvas   = document.createElement('canvas')
    canvas.width   = video.videoWidth
    canvas.height  = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    setFrameUrl(canvas.toDataURL('image/jpeg', 0.95))
    setStep('crop')
  }

  const handleCropCoords = (pixels) => {
    setCropPixels(pixels)
    setFrameUrl(null)
    setStep('trim')
  }

  const handleProcess = async () => {
    setStep('loading')
    setFfProgress(0)
    setFfError(null)
    try {
      const end  = trimEnd > trimStart ? trimEnd : duration
      const blob = await processVideo(
        videoSrc, trimStart, end, cropPixels,
        setFfProgress,
        () => setStep('processing'),
      )
      onConfirm(blob)
    } catch (err) {
      setFfError('Erreur FFmpeg. Vérifie ta connexion ou essaie une vidéo plus courte.')
      setStep('trim')
    }
  }

  if (step === 'crop' && frameUrl) {
    return (
      <CropModal
        imageSrc={frameUrl}
        onCropCoords={handleCropCoords}
        onCancel={() => { setFrameUrl(null); setStep('trim') }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {/* Player vidéo */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          className="max-h-full max-w-full"
          onLoadedMetadata={handleLoaded}
        />
        {cropPixels && (
          <div className="absolute top-3 right-3 bg-white/20 text-white text-[10px] uppercase tracking-widest px-2 py-1">
            CADRÉ
          </div>
        )}
      </div>

      <div className="bg-black px-6 py-4 flex flex-col gap-4">
        {/* Trim start */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40 uppercase tracking-widest shrink-0 w-16">DÉBUT</span>
          <input
            type="range" min={0} max={duration} step={0.01}
            value={trimStart}
            onChange={e => {
              const v = Number(e.target.value)
              setTrimStart(v)
              if (v >= trimEnd) setTrimEnd(Math.min(v + 0.5, duration))
              if (videoRef.current) videoRef.current.currentTime = v
            }}
            className="flex-1 accent-white"
          />
          <span className="text-xs text-white/40 tabular-nums w-10 text-right">{formatTime(trimStart)}</span>
        </div>

        {/* Trim end */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40 uppercase tracking-widest shrink-0 w-16">FIN</span>
          <input
            type="range" min={0} max={duration} step={0.01}
            value={trimEnd}
            onChange={e => {
              const v = Number(e.target.value)
              setTrimEnd(v)
              if (v <= trimStart) setTrimStart(Math.max(v - 0.5, 0))
              if (videoRef.current) videoRef.current.currentTime = v
            }}
            className="flex-1 accent-white"
          />
          <span className="text-xs text-white/40 tabular-nums w-10 text-right">{formatTime(trimEnd)}</span>
        </div>

        {/* Durée sélectionnée */}
        <div className="text-xs text-white/20 text-center tabular-nums">
          {formatTime(Math.max(0, trimEnd - trimStart))} sélectionné
        </div>

        {/* Progression FFmpeg */}
        {(step === 'loading' || step === 'processing') && (
          <div className="flex flex-col gap-2">
            {step === 'processing' && (
              <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-300" style={{ width: `${ffProgress}%` }} />
              </div>
            )}
            <span className="text-xs text-white/40 text-center uppercase tracking-widest">
              {step === 'loading'
                ? 'CHARGEMENT FFMPEG...'
                : `TRAITEMENT ${ffProgress} %`}
            </span>
          </div>
        )}

        {ffError && (
          <span className="text-xs text-red-400 uppercase tracking-wide text-center">{ffError}</span>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors duration-150"
          >
            CANCEL
          </button>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={extractFrame}
              disabled={step === 'loading' || step === 'processing'}
              className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors duration-150 disabled:opacity-30"
            >
              {cropPixels ? 'RE-CADRER' : 'CADRER'}
            </button>
            <button
              type="button"
              onClick={handleProcess}
              disabled={step === 'loading' || step === 'processing' || trimEnd <= trimStart}
              className="text-xs uppercase tracking-widest text-white hover:opacity-60 transition-opacity duration-150 disabled:opacity-30"
            >
              {step === 'loading' ? 'CHARGEMENT...' : step === 'processing' ? 'TRAITEMENT...' : 'CONFIRMER'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── LoginGate ────────────────────────────────────────────────────────────────
function LoginGate() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const messages = {
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/user-not-found':     'Aucun compte trouvé.',
        'auth/wrong-password':     'Mot de passe incorrect.',
        'auth/invalid-email':      'Email invalide.',
        'auth/too-many-requests':  'Trop de tentatives. Réessaie plus tard.',
      }
      setError(messages[err.code] ?? 'Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white relative flex items-center justify-center">
      {/* Flèche retour */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-xs uppercase tracking-widest text-muted hover:text-black transition-colors duration-150"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M5 12l7 7M5 12l7-7" />
        </svg>
        HOME
      </Link>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-xs px-6">
        <span className="text-xs uppercase tracking-widest text-muted text-center">
          ADMIN ACCESS
        </span>

        <label className="flex flex-col gap-2">
          <span className="text-xs text-muted uppercase tracking-wider">EMAIL</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            className="border-b border-black bg-transparent outline-none text-sm py-1 tracking-wide"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs text-muted uppercase tracking-wider">PASSWORD</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="border-b border-black bg-transparent outline-none text-sm py-1 tracking-wide"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="text-xs uppercase tracking-widest text-muted hover:text-black transition-colors duration-150 disabled:opacity-30 mt-2"
        >
          {loading ? 'CONNEXION...' : 'ENTER'}
        </button>

        {error && (
          <span className="text-xs uppercase tracking-wide text-red-400 text-center">{error}</span>
        )}
      </form>
    </div>
  )
}

// ─── SortableRow ──────────────────────────────────────────────────────────────
function SortableRow({ project, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-4 border-b border-gray-100">
      {/* Poignée drag */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted hover:text-black transition-colors duration-150 p-1 shrink-0 touch-none"
        tabIndex={-1}
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="3"  r="1.5" />
          <circle cx="9" cy="3"  r="1.5" />
          <circle cx="3" cy="8"  r="1.5" />
          <circle cx="9" cy="8"  r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </button>

      <img
        src={project.thumbnail || project.images[0]}
        alt={project.client}
        className="w-12 h-16 object-cover bg-black flex-shrink-0"
      />

      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-sm uppercase tracking-wide truncate">{project.client}</span>
        <span className="text-xs text-muted uppercase tracking-wider">
          {project.number} — {project.category} — {project.date}
        </span>
      </div>

      <div className="flex gap-4 shrink-0">
        <button
          onClick={() => onEdit(project)}
          className="text-xs uppercase tracking-widest text-muted hover:text-black transition-colors duration-150"
        >
          EDIT
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="text-xs uppercase tracking-widest text-muted hover:text-red-400 transition-colors duration-150"
        >
          DELETE
        </button>
      </div>
    </div>
  )
}

// ─── SortableSlot ─────────────────────────────────────────────────────────────
function SortableSlot({ slot, index, onFileSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id })
  const fileRef = useRef()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:  isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex:   isDragging ? 10 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => fileRef.current.click()}
          className="aspect-[3/4] bg-black relative overflow-hidden group w-full block"
        >
          {slot.url && slot.type === 'video' ? (
            <video
              src={slot.url}
              muted
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-150"
            />
          ) : slot.url ? (
            <img
              src={slot.url}
              alt={`Slot ${index + 1}`}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-150"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-muted">{String(index + 1).padStart(2, '0')}</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <span className="text-xs text-white uppercase tracking-wide">
              {slot.url ? 'RECADRER' : 'AJOUTER'}
            </span>
          </div>
        </button>

        {/* Poignée de drag — coin supérieur gauche */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-white/50 hover:text-white p-1 touch-none transition-colors duration-150"
          tabIndex={-1}
        >
          <svg width="10" height="14" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="3" cy="3"  r="1.5" />
            <circle cx="9" cy="3"  r="1.5" />
            <circle cx="3" cy="8"  r="1.5" />
            <circle cx="9" cy="8"  r="1.5" />
            <circle cx="3" cy="13" r="1.5" />
            <circle cx="9" cy="13" r="1.5" />
          </svg>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={e => { if (e.target.files[0]) onFileSelect(slot.id, e.target.files[0]); e.target.value = '' }}
        />
      </div>
      <span className="text-xs text-muted text-center">
        {index === 0 ? 'MAIN' : `VAR. ${index}`}{slot.type === 'video' ? ' · VID' : ''}
      </span>
    </div>
  )
}

// ─── ProjectForm ──────────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = ['music', 'sportif', 'event']
const SOFTWARE_OPTIONS = ['PHOTOSHOP', 'ILLUSTRATOR', 'AFTER EFFECTS', 'PREMIERE PRO', 'LIGHTROOM', 'INDESIGN']

function ProjectForm({ initial, onSave, onCancel, isSaving, saveError }) {
  const isEdit = !!initial

  const [form, setForm] = useState({
    client:   initial?.client   ?? '',
    category: initial?.category ?? 'music',
    software: initial?.software ?? 'PHOTOSHOP',
    date:     initial?.date     ?? String(new Date().getFullYear()),
  })

  // Slots : tableau ordonné de { id, blob, url, type: 'image'|'video' }
  const [slots, setSlots] = useState(() => {
    const urls   = initial?.images     ?? ['', '', '', '']
    const types  = initial?.mediaTypes ?? urls.map(() => 'image')
    return urls.map((url, i) => ({ id: `slot-${i}`, blob: null, url, type: types[i] ?? 'image' }))
  })

  // Miniature séparée pour la home page
  const [thumbBlob,    setThumbBlob]    = useState(null)
  const [thumbUrl,     setThumbUrl]     = useState(initial?.thumbnail ?? '')
  const thumbInputRef                   = useRef()

  // Crop modal : null | { target: 'slot', id, src } | { target: 'thumb', src }
  const [cropModal,  setCropModal]  = useState(null)
  // Video modal : null | { slotId, src }
  const [videoModal, setVideoModal] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ── Handlers image slots ───────────────────────────────────────────────────
  const handleSlotFileSelect = (slotId, file) => {
    if (!file) return
    if (file.type.startsWith('video/')) {
      setVideoModal({ slotId, src: URL.createObjectURL(file) })
    } else {
      setCropModal({ target: 'slot', id: slotId, src: URL.createObjectURL(file) })
    }
  }

  // ── Handlers thumbnail ─────────────────────────────────────────────────────
  const handleThumbFileSelect = (file) => {
    if (!file) return
    setCropModal({ target: 'thumb', src: URL.createObjectURL(file) })
  }

  // ── Crop confirm ───────────────────────────────────────────────────────────
  const handleCropConfirm = (blob) => {
    const { target, src } = cropModal
    URL.revokeObjectURL(src)

    if (target === 'slot') {
      const { id } = cropModal
      setSlots(prev => prev.map(s =>
        s.id === id ? { ...s, blob, url: URL.createObjectURL(blob), type: 'image' } : s
      ))
    } else {
      if (thumbUrl.startsWith('blob:')) URL.revokeObjectURL(thumbUrl)
      setThumbBlob(blob)
      setThumbUrl(URL.createObjectURL(blob))
    }

    setCropModal(null)
  }

  // ── Handlers vidéo ─────────────────────────────────────────────────────────
  const handleVideoConfirm = (blob) => {
    const { slotId, src } = videoModal
    URL.revokeObjectURL(src)
    setSlots(prev => prev.map(s =>
      s.id === slotId ? { ...s, blob, url: URL.createObjectURL(blob), type: 'video' } : s
    ))
    setVideoModal(null)
  }

  // ── Drag-and-drop images ───────────────────────────────────────────────────
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = slots.findIndex(s => s.id === active.id)
    const newIdx = slots.findIndex(s => s.id === over.id)
    setSlots(prev => arrayMove(prev, oldIdx, newIdx))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave({
      form,
      blobs:         slots.map(s => s.blob),
      blobTypes:     slots.map(s => s.type),
      existingUrls:  slots.map(s => s.blob ? '' : s.url),
      thumbBlob,
      existingThumb: initial?.thumbnail ?? '',
    })
  }

  return (
    <>
      {cropModal && (
        <CropModal
          imageSrc={cropModal.src}
          onConfirm={handleCropConfirm}
          onCancel={() => { URL.revokeObjectURL(cropModal.src); setCropModal(null) }}
          lockedAspect={cropModal.target === 'thumb' ? 3 / 4 : undefined}
        />
      )}

      {videoModal && (
        <VideoEditModal
          videoSrc={videoModal.src}
          onConfirm={handleVideoConfirm}
          onCancel={() => { URL.revokeObjectURL(videoModal.src); setVideoModal(null) }}
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">

        {/* Champs texte */}
        <div className="grid grid-cols-2 gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted uppercase tracking-wider">CLIENT</span>
            <input
              value={form.client}
              onChange={e => setForm(f => ({ ...f, client: e.target.value.toUpperCase() }))}
              required
              className="border-b border-black bg-transparent outline-none text-sm uppercase tracking-wide py-1"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted uppercase tracking-wider">DATE</span>
            <input
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
              className="border-b border-black bg-transparent outline-none text-sm tracking-wide py-1"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted uppercase tracking-wider">CATEGORY</span>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="border-b border-black bg-transparent outline-none text-sm uppercase tracking-wide py-1 cursor-pointer"
            >
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted uppercase tracking-wider">SOFTWARE</span>
            <select
              value={form.software}
              onChange={e => setForm(f => ({ ...f, software: e.target.value }))}
              className="border-b border-black bg-transparent outline-none text-sm uppercase tracking-wide py-1 cursor-pointer"
            >
              {SOFTWARE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        {/* Miniature */}
        <div>
          <span className="text-xs text-muted uppercase tracking-wider">THUMBNAIL — HOME PAGE</span>
          <div className="mt-4 flex items-start gap-5">
            <button
              type="button"
              onClick={() => thumbInputRef.current.click()}
              className="w-20 aspect-[3/4] bg-black relative overflow-hidden group flex-shrink-0"
            >
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt="Thumbnail"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-150"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-muted">+</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <span className="text-[10px] text-white uppercase tracking-wide">
                  {thumbUrl ? 'RECADRER' : 'AJOUTER'}
                </span>
              </div>
            </button>
            <p className="text-xs text-muted leading-relaxed pt-1">
              Image distincte affichée dans la grille de la home page.
              <br />Format 3:4 forcé.
              {!thumbUrl && (
                <span className="block mt-1 opacity-50">Si vide, l'image principale (slot 1) sera utilisée.</span>
              )}
            </p>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { handleThumbFileSelect(e.target.files[0]); e.target.value = '' }}
            />
          </div>
        </div>

        {/* Images — drag-and-drop */}
        <div>
          <span className="text-xs text-muted uppercase tracking-wider">IMAGES — MAIN + 3 VARIANTS</span>
          <p className="text-xs text-muted opacity-50 mt-1">Glisse les slots pour réordonner.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={slots.map(s => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-4 mt-4">
                {slots.map((slot, i) => (
                  <SortableSlot
                    key={slot.id}
                    slot={slot}
                    index={i}
                    onFileSelect={handleSlotFileSelect}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {saveError && (
          <p className="text-xs text-red-400 uppercase tracking-wide">{saveError}</p>
        )}

        <div className="flex gap-6 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="text-xs uppercase tracking-widest hover:opacity-60 transition-opacity duration-150 disabled:opacity-30"
          >
            {isSaving ? 'SAVING...' : isEdit ? 'UPDATE PROJECT' : 'ADD PROJECT'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs uppercase tracking-widest text-muted hover:text-black transition-colors duration-150"
          >
            CANCEL
          </button>
        </div>
      </form>
    </>
  )
}

// ─── Admin (page principale) ──────────────────────────────────────────────────
export default function Admin() {
  const [user,          setUser]          = useState(undefined)
  const [projects,      setProjects]      = useState([])
  const [loading,       setLoading]       = useState(false)
  const [view,          setView]          = useState('list')
  const [editing,       setEditing]       = useState(null)
  const [isSaving,      setIsSaving]      = useState(false)
  const [saveError,     setSaveError]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getDocs(query(collection(db, 'projects')))
      .then(snap => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ao = a.order ?? (parseInt(a.number) - 1)
            const bo = b.order ?? (parseInt(b.number) - 1)
            return ao - bo
          })
        setProjects(sorted)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-xs uppercase tracking-widest text-muted">LOADING</span>
      </div>
    )
  }

  if (!user) return <LoginGate />

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = projects.findIndex(p => p.id === active.id)
    const newIndex = projects.findIndex(p => p.id === over.id)
    const reordered = arrayMove(projects, oldIndex, newIndex)
      .map((p, i) => ({ ...p, order: i, number: String(i + 1).padStart(2, '0') }))
    setProjects(reordered)
    reorderProjects(reordered)
  }

  const handleAdd = async ({ form, blobs, blobTypes, thumbBlob }) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const newProject = await addProject(form, blobs, blobTypes, thumbBlob)
      setProjects(prev => [...prev, newProject])
      setView('list')
    } catch {
      setSaveError('SAVE FAILED — CHECK FIREBASE CONFIG')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async ({ form, blobs, blobTypes, existingUrls, thumbBlob, existingThumb }) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const { images: finalUrls, mediaTypes: finalTypes, thumbnail } = await updateProject(
        editing.id, form, blobs, blobTypes, existingUrls, thumbBlob, existingThumb
      )
      setProjects(prev => prev.map(p =>
        p.id === editing.id ? { ...p, ...form, images: finalUrls, mediaTypes: finalTypes, thumbnail } : p
      ))
      setView('list')
      setEditing(null)
    } catch {
      setSaveError('UPDATE FAILED — CHECK FIREBASE CONFIG')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirmed = async () => {
    const project = projects.find(p => p.id === deleteConfirm)
    if (!project) return
    try {
      await deleteProject(project)
      setProjects(prev => prev.filter(p => p.id !== deleteConfirm))
    } catch {}
    setDeleteConfirm(null)
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 h-[60px] px-6 flex items-center justify-between bg-white border-b border-gray-100 z-[100]">
        <Link to="/" className="text-sm font-medium tracking-wide uppercase transition-opacity duration-150 hover:opacity-60">
          MAËL AUZENET
        </Link>
        <span className="text-xs text-muted uppercase tracking-widest">ADMIN</span>
        <button
          onClick={() => signOut(auth)}
          className="text-xs uppercase tracking-widest text-muted hover:text-black transition-colors duration-150"
        >
          LOGOUT
        </button>
      </header>

      <main className="pt-[80px] pb-16 px-6 max-w-4xl mx-auto">

        {/* ── LISTE ── */}
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between py-8">
              <span className="text-xs text-muted uppercase tracking-widest">
                {projects.length} PROJECTS
              </span>
              <button
                onClick={() => { setSaveError(null); setView('add') }}
                className="text-xs uppercase tracking-widest hover:opacity-60 transition-opacity duration-150"
              >
                + ADD PROJECT
              </button>
            </div>

            {loading ? (
              <span className="text-xs text-muted uppercase tracking-widest">LOADING...</span>
            ) : (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={projects.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col">
                    {projects.map(project => (
                      <SortableRow
                        key={project.id}
                        project={project}
                        onEdit={(p) => { setSaveError(null); setEditing(p); setView('edit') }}
                        onDelete={(id) => setDeleteConfirm(id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}

        {/* ── AJOUT ── */}
        {view === 'add' && (
          <>
            <div className="py-8">
              <span className="text-xs text-muted uppercase tracking-widest">NEW PROJECT</span>
            </div>
            <ProjectForm
              initial={null}
              onSave={handleAdd}
              onCancel={() => setView('list')}
              isSaving={isSaving}
              saveError={saveError}
            />
          </>
        )}

        {/* ── ÉDITION ── */}
        {view === 'edit' && editing && (
          <>
            <div className="py-8">
              <span className="text-xs text-muted uppercase tracking-widest">
                EDIT — {editing.client}
              </span>
            </div>
            <ProjectForm
              initial={editing}
              onSave={handleEdit}
              onCancel={() => { setView('list'); setEditing(null) }}
              isSaving={isSaving}
              saveError={saveError}
            />
          </>
        )}

        {/* ── CONFIRMATION SUPPRESSION ── */}
        {deleteConfirm && (
          <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-[200]">
            <div className="flex flex-col items-center gap-6 p-10 bg-white border border-gray-100">
              <span className="text-xs uppercase tracking-widest text-muted">DELETE THIS PROJECT?</span>
              <span className="text-sm uppercase tracking-wide">
                {projects.find(p => p.id === deleteConfirm)?.client}
              </span>
              <div className="flex gap-8">
                <button
                  onClick={handleDeleteConfirmed}
                  className="text-xs uppercase tracking-widest hover:opacity-60 transition-opacity duration-150"
                >
                  CONFIRM
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="text-xs uppercase tracking-widest text-muted hover:text-black transition-colors duration-150"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
