import { useEffect, useMemo, useRef, useState } from 'react';

import { Icon } from './Icon';
import { fontOptions, techniques } from '../data/options';
import { useStore } from '../context/StoreContext';
import { apiRequest, resolveMediaUrl, uploadCustomerFile } from '../lib/api';
import {
  getConfiguredUnitPrice,
  getOptionGroups,
  getOptionSurcharge,
  money,
  stars,
} from '../lib/format';

const COLOR_PALETTE = [
  { name: 'Blanco', hex: '#ffffff', border: true },
  { name: 'Negro', hex: '#1a1a1a' },
  { name: 'Crema', hex: '#f5f0e6' },
  { name: 'Rosa coral', hex: '#f08080' },
  { name: 'Rosa', hex: '#ffb6c1' },
  { name: 'Mostaza', hex: '#d4a017' },
  { name: 'Verde bosque', hex: '#228b22' },
  { name: 'Verde', hex: '#4caf50' },
  { name: 'Azul noche', hex: '#191970' },
  { name: 'Azul', hex: '#4682b4' },
  { name: 'Rojo', hex: '#b91c1c' },
  { name: 'Acero', hex: '#b0c4de' },
  { name: 'Negro mate', hex: '#333333' },
  { name: 'Terracota', hex: '#c56b3f' },
  { name: 'Arena', hex: '#d2b48c' },
  { name: 'Natural', hex: '#f5f5dc' },
  { name: 'Coral', hex: '#ff7f50' },
  { name: 'Transparente', hex: '#e0e0e0', border: true },
];

const TEXT_COLORS = [
  { label: 'Negro', value: '#1a1a1a' },
  { label: 'Blanco', value: '#ffffff' },
  { label: 'Rosa', value: '#ef4f73' },
  { label: 'Azul', value: '#0f2f6f' },
];

const TECHNIQUES_BY_CATEGORY = {
  'Ropa Personalizada': ['Bordado', 'Vinil', 'Sublimado'],
  'Regalos Personalizados': ['Sublimado', 'Grabado laser', 'Vinil'],
  'Papeleria Creativa': ['Sublimado'],
  'Boxes de Regalo': ['Sublimado'],
  'Souvenirs Lima': ['Sublimado', 'Grabado laser'],
  'Eventos Corporativos': ['Sublimado', 'Bordado', 'Grabado laser'],
};

const emptyFaceDesign = {
  texto: '',
  color_texto: TEXT_COLORS[0].value,
  imagen_preview: null,
  imagen_url: null,
  texto_posicion: { x: 50, y: 44 },
  imagen_posicion: { x: 50, y: 36 },
  imagen_tamano: 80,
};

function buildFaceDesign(overrides = {}) {
  return {
    ...emptyFaceDesign,
    ...overrides,
    texto_posicion: overrides.texto_posicion || emptyFaceDesign.texto_posicion,
    imagen_posicion: overrides.imagen_posicion || emptyFaceDesign.imagen_posicion,
  };
}

function firstOption(groups, key) {
  return groups[key]?.[0]?.nombre || '';
}

function getColorHex(colorName) {
  const found = COLOR_PALETTE.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
  return found?.hex || '#ccc';
}

function hasColorBorder(colorName) {
  const found = COLOR_PALETTE.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
  return found?.border || false;
}

function normalizeLabel(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function imageMatchesOption(image, optionName) {
  if (!image || !optionName) return false;
  const vista = normalizeLabel(image.vista);
  const alt = normalizeLabel(image.alt);
  const option = normalizeLabel(optionName);
  if (vista.includes(option) || alt.includes(option)) return true;
  if (option === 'atras') return vista.includes('posterior') || alt.includes('posterior') || vista.includes('back');
  if (option === 'doble vista') return vista.includes('doble') || vista.includes('mockup') || alt.includes('doble');
  if (option === 'frontal') return vista.includes('frontal') || vista.includes('adelante') || alt.includes('frontal');
  return false;
}

function findImageForSelections(images, selections, colorOptions, faceOptions) {
  if (!images?.length) return null;

  const colorName = selections.color && colorOptions?.some((option) => option.nombre === selections.color)
    ? selections.color
    : '';
  const faceName = selections.cara && faceOptions?.some((option) => option.nombre === selections.cara)
    ? selections.cara
    : '';

  if (colorName && faceName) {
    const exact = images.find((image) => imageMatchesOption(image, colorName) && imageMatchesOption(image, faceName));
    if (exact) return exact;
  }

  if (colorName) {
    const option = normalizeLabel(colorName);
    const colorImage = images.find((image) => normalizeLabel(image.vista) === option)
      || images.find((image) => normalizeLabel(image.vista).includes(option))
      || images.find((image) => imageMatchesOption(image, colorName));
    if (colorImage) return colorImage;
  }

  if (faceName) {
    const faceImage = images.find((image) => imageMatchesOption(image, faceName));
    if (faceImage) return faceImage;
  }

  return null;
}

export function ProductModal({
  product,
  onClose,
  onAdd,
  initialConfig = null,
  submitLabel = 'Agregar al carrito',
}) {
  const { token } = useStore();
  const [detail, setDetail] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customText, setCustomText] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [fontFamily, setFontFamily] = useState(fontOptions[0]);
  const [fontSize, setFontSize] = useState(28);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0].value);
  const [technique, setTechnique] = useState(techniques[0]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [manualReferenceImage, setManualReferenceImage] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 44 });
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 36 });
  const [imageSize, setImageSize] = useState(80);
  const [activeDesignFace, setActiveDesignFace] = useState('Adelante');
  const [faceDesigns, setFaceDesigns] = useState({
    Adelante: buildFaceDesign(),
    Atrás: buildFaceDesign(),
  });
  const [moveTarget, setMoveTarget] = useState('texto');
  const [selections, setSelections] = useState({ talla: '', tamano: '', color: '', cara: '', figura: '' });
  const [colorQuantities, setColorQuantities] = useState({});
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [userImagePreview, setUserImagePreview] = useState(null);
  const [userImageUrl, setUserImageUrl] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const localPreviewRef = useRef(null);
  const reviewsRef = useRef(null);

  const clearLocalPreview = () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
  };

  useEffect(() => {
    if (!product) return;

    setDetail(product);
    setQuantity(initialConfig?.cantidad || 1);
    setCustomText(initialConfig?.texto_personalizado || '');
    setAdditionalNotes(initialConfig?.configuracion?.indicaciones_adicionales || '');
    setFontFamily(initialConfig?.fuente_texto || fontOptions[0]);
    setFontSize(initialConfig?.tamano_texto || 28);
    setTextColor(initialConfig?.configuracion?.color_texto || TEXT_COLORS[0].value);
    setTechnique(initialConfig?.tecnica_personalizacion || techniques[0]);
    clearLocalPreview();
    setUserImagePreview(initialConfig?.configuracion?.imagen_personalizada_url || null);
    setUserImageUrl(initialConfig?.configuracion?.imagen_personalizada_url || null);
    setUploadError('');
    setSelectedImage(0);
    setManualReferenceImage(false);
    setZoomed(false);
    setTextPosition({
      x: initialConfig?.posicion_x ?? 50,
      y: initialConfig?.posicion_y ?? 44,
    });
    setImagePosition(initialConfig?.configuracion?.imagen_posicion || { x: 50, y: 36 });
    setImageSize(initialConfig?.configuracion?.imagen_tamano || 80);
    setActiveDesignFace(initialConfig?.cara === 'Atrás' ? 'Atrás' : 'Adelante');
    setFaceDesigns({
      Adelante: buildFaceDesign(initialConfig?.configuracion?.disenos_caras?.Adelante),
      Atrás: buildFaceDesign(initialConfig?.configuracion?.disenos_caras?.Atrás),
    });
    setMoveTarget('texto');

    apiRequest(`/products/${product.id_producto}`)
      .then((data) => {
        setDetail(data);
        const groups = getOptionGroups(data);
        setSelections({
          talla: initialConfig?.talla || firstOption(groups, 'talla'),
          tamano: initialConfig?.tamano || firstOption(groups, 'tamano'),
          color: initialConfig?.color_producto || firstOption(groups, 'color'),
          cara: initialConfig?.cara || firstOption(groups, 'cara'),
          figura: initialConfig?.configuracion?.figura || firstOption(groups, 'figura'),
        });
      })
      .catch(() => {
        const groups = getOptionGroups(product);
        setSelections({
          talla: initialConfig?.talla || firstOption(groups, 'talla'),
          tamano: initialConfig?.tamano || firstOption(groups, 'tamano'),
          color: initialConfig?.color_producto || firstOption(groups, 'color'),
          cara: initialConfig?.cara || firstOption(groups, 'cara'),
          figura: initialConfig?.configuracion?.figura || firstOption(groups, 'figura'),
        });
      });
  }, [initialConfig, product]);

  const currentProduct = detail || product;
  const groups = useMemo(() => getOptionGroups(currentProduct), [currentProduct]);

  const availableTechniques = useMemo(() => {
    const categoryTechniques = TECHNIQUES_BY_CATEGORY[currentProduct?.categoria_nombre];
    if (categoryTechniques) return categoryTechniques;
    return techniques;
  }, [currentProduct?.categoria_nombre]);

  useEffect(() => {
    if (availableTechniques.length && !availableTechniques.includes(technique)) {
      setTechnique(availableTechniques[0]);
    }
  }, [availableTechniques, technique]);

  const images = currentProduct?.imagenes?.length
    ? currentProduct.imagenes
    : currentProduct?.imagen_url
      ? [{ url: currentProduct.imagen_url, alt: currentProduct.nombre, vista: 'Principal' }]
      : [];
  const activeImage = images[selectedImage] || images[0];
  const faceOptions = groups.cara?.length > 1 ? groups.cara : null;
  const isPoloProduct = normalizeLabel(currentProduct?.nombre).includes('polo');
  const isStaticSouvenir = ['mini set costa verde', 'taza lima skyline'].includes(normalizeLabel(currentProduct?.nombre));
  const allowsVisualPersonalization = !isStaticSouvenir;
  const designFaces = isPoloProduct
    ? selections.cara === 'Ambos'
      ? ['Adelante', 'Atrás']
      : ['Adelante', 'Atrás'].includes(selections.cara)
        ? [selections.cara]
        : []
    : ['Principal'];
  const currentDesignFace = isPoloProduct
    ? designFaces.includes(activeDesignFace)
      ? activeDesignFace
      : designFaces[0] || 'Adelante'
    : 'Principal';
  const currentFaceDesign = isPoloProduct
    ? buildFaceDesign(faceDesigns[currentDesignFace])
    : buildFaceDesign({
        texto: customText,
        imagen_preview: userImagePreview,
        imagen_url: userImageUrl,
        texto_posicion: textPosition,
        imagen_posicion: imagePosition,
        imagen_tamano: imageSize,
      });
  const currentCustomText = currentFaceDesign.texto;
  const currentTextColor = isPoloProduct ? currentFaceDesign.color_texto : textColor;
  const currentUserImagePreview = currentFaceDesign.imagen_preview;
  const currentImagePosition = currentFaceDesign.imagen_posicion;
  const currentTextPosition = currentFaceDesign.texto_posicion;
  const currentImageSize = currentFaceDesign.imagen_tamano;

  useEffect(() => {
    if (manualReferenceImage) return;
    const effectiveSelections = {
      ...selections,
      cara: isPoloProduct
        ? selections.cara === 'Ambos'
          ? currentDesignFace
          : selections.cara === 'Ninguno'
            ? 'Adelante'
            : selections.cara
        : selections.cara,
    };
    const matchedImage = findImageForSelections(images, effectiveSelections, groups.color, faceOptions);
    if (!matchedImage) return;
    const idx = images.indexOf(matchedImage);
    if (idx >= 0 && idx !== selectedImage) setSelectedImage(idx);
  }, [currentDesignFace, faceOptions, groups.color, images, isPoloProduct, manualReferenceImage, selectedImage, selections]);

  useEffect(() => {
    if (!isPoloProduct) return;
    if (selections.cara === 'Atrás') setActiveDesignFace('Atrás');
    if (selections.cara === 'Adelante' || selections.cara === 'Ninguno') setActiveDesignFace('Adelante');
  }, [isPoloProduct, selections.cara]);

  if (!product || !currentProduct) return null;

  const colorOnlySelections = { ...selections };
  const optionSurcharge = Object.entries(getOptionSurcharge(currentProduct, colorOnlySelections))
    .reduce((sum, [key, val]) => sum + val, 0) || getOptionSurcharge(currentProduct, selections);
  const summaryCustomText = isPoloProduct
    ? designFaces.map((face) => faceDesigns[face]?.texto?.trim() ? `${face}: ${faceDesigns[face].texto.trim()}` : '').filter(Boolean).join(' | ')
    : allowsVisualPersonalization ? customText : '';
  const unitPrice = getConfiguredUnitPrice(currentProduct, quantity, selections, summaryCustomText);
  const textSurcharge = isPoloProduct || !allowsVisualPersonalization ? 0 : customText.trim() ? 3 : 0;
  const canSubmit = currentProduct.stock > 0
    && (!groups.talla || selections.talla)
    && (!groups.tamano || selections.tamano)
    && (!groups.color || selections.color)
    && (!groups.figura || selections.figura)
    && (!faceOptions || selections.cara);

  const updatePosition = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextPosition = {
      x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 100),
    };
    if (moveTarget === 'imagen') {
      if (isPoloProduct && designFaces.length) {
        setFaceDesigns((current) => ({
          ...current,
          [currentDesignFace]: buildFaceDesign({
            ...current[currentDesignFace],
            imagen_posicion: nextPosition,
          }),
        }));
        return;
      }
      setImagePosition(nextPosition);
    } else {
      if (isPoloProduct && designFaces.length) {
        setFaceDesigns((current) => ({
          ...current,
          [currentDesignFace]: buildFaceDesign({
            ...current[currentDesignFace],
            texto_posicion: nextPosition,
          }),
        }));
        return;
      }
      setTextPosition(nextPosition);
    }
  };

  const selectImage = (image, index) => {
    setSelectedImage(index);
    const matchedColor = groups.color?.find((option) => imageMatchesOption(image, option.nombre));
    const matchedFace = faceOptions?.find((option) => imageMatchesOption(image, option.nombre));
    setManualReferenceImage(!matchedColor && !matchedFace);
    setSelections((current) => ({
      ...current,
      ...(matchedColor ? { color: matchedColor.nombre } : {}),
      ...(matchedFace ? { cara: matchedFace.nombre } : {}),
    }));
  };

  const submit = () => {
    onAdd(currentProduct, {
      cantidad: quantity,
      texto_personalizado: summaryCustomText,
      tecnica_personalizacion: technique,
      talla: selections.talla,
      tamano: selections.tamano,
      color_producto: selections.color,
      figura: selections.figura,
      fuente_texto: fontFamily,
      tamano_texto: fontSize,
      cara: selections.cara || activeImage?.vista || '',
      posicion_x: currentTextPosition.x,
      posicion_y: currentTextPosition.y,
      imagen_referencia_url: activeImage?.url || currentProduct.imagen_url,
      precio_personalizacion: optionSurcharge + textSurcharge,
      configuracion: {
        vista: activeImage?.vista || null,
        texto_preview: summaryCustomText,
        indicaciones_adicionales: additionalNotes.trim() || null,
        fuente_texto: fontFamily,
        tamano_texto: fontSize,
        color_texto: currentTextColor,
        color_producto: selections.color,
        figura: selections.figura,
        imagen_personalizada_url: isPoloProduct ? faceDesigns[currentDesignFace]?.imagen_url || null : userImageUrl || null,
        imagen_posicion: currentImagePosition,
        imagen_tamano: currentImageSize,
        disenos_caras: isPoloProduct ? faceDesigns : null,
        recargos: {
          opciones: optionSurcharge,
          texto: textSurcharge,
        },
      },
    });
    onClose();
  };

  const showReviews = () => {
    setShowAllReviews(true);
    setTimeout(() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const allReviews = currentProduct.resenas || [];
  const displayedReviews = showAllReviews ? allReviews : allReviews.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-3 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <article className={`product-modal ${zoomed ? 'product-modal-zoomed' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="product-preview-column">
          <div className={`preview-stage ${zoomed ? 'preview-stage-zoomed' : ''}`} onClick={updatePosition} role="presentation">
            {activeImage ? (
              <img className="h-full w-full object-contain" src={resolveMediaUrl(activeImage.url)} alt={activeImage.alt || currentProduct.nombre} />
            ) : (
              <span className="text-4xl font-black text-forest">Ohana</span>
            )}
            {currentUserImagePreview ? (
              <img
                className="custom-preview-image"
                src={resolveMediaUrl(currentUserImagePreview)}
                alt="Tu diseño"
                style={{
                  left: `${currentImagePosition.x}%`,
                  top: `${currentImagePosition.y}%`,
                  width: `${currentImageSize}px`,
                  height: `${currentImageSize}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                title="Tu diseño estampado. Haz clic en otra parte para mover."
              />
            ) : null}
            {currentCustomText.trim() ? (
              <span
                className="custom-preview-text"
                style={{
                  left: `${currentTextPosition.x}%`,
                  top: `${currentTextPosition.y}%`,
                  fontFamily,
                  fontSize: `${fontSize}px`,
                  color: currentTextColor,
                }}
                title="Haz clic en otra parte de la imagen para mover el texto"
              >
                {currentCustomText}
              </span>
            ) : null}
            <button className="preview-zoom-button" type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setZoomed((current) => !current); }}>
              <Icon className="h-5 w-5" name={zoomed ? 'zoomOut' : 'zoom'} />
              {zoomed ? 'Reducir vista' : 'Ampliar vista'}
            </button>
            <div className="move-target-toggle" onClick={(event) => event.stopPropagation()} role="group" aria-label="Elegir elemento a mover">
              <button className={moveTarget === 'texto' ? 'active' : ''} type="button" onClick={() => setMoveTarget('texto')}>Mover texto</button>
              <button className={moveTarget === 'imagen' ? 'active' : ''} type="button" disabled={!currentUserImagePreview} onClick={() => setMoveTarget('imagen')}>Mover imagen</button>
            </div>
          </div>

          <div className="thumb-strip" aria-label="Galería de producto">
            <div className="thumb-track">
              {images.map((image, index) => (
                <button
                  className={`thumb ${index === selectedImage ? 'thumb-active' : ''}`}
                  key={`${image.url}-${image.vista}`}
                  type="button"
                  onClick={() => selectImage(image, index)}
                >
                  <img src={resolveMediaUrl(image.url)} alt={image.alt || image.vista} />
                  <span>{image.vista}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="product-config-panel">
          <button className="btn-ghost absolute right-4 top-4" type="button" onClick={onClose}>
            <Icon name="x" />
            Cerrar
          </button>
          <div className="pr-28">
            <span className="eyebrow">{currentProduct.nombre}</span>
            <h2 className="text-3xl font-black leading-tight">
              {currentProduct.nombre}{allowsVisualPersonalization && !normalizeLabel(currentProduct.nombre).includes('personalizado') ? ' personalizado' : ''}
            </h2>
            <p className="mt-3 font-sans leading-7 text-stone">{currentProduct.descripcion}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 font-sans text-sm">
              <span className="text-gold">{stars(currentProduct.rating_promedio)}</span>
              <b>{Number(currentProduct.rating_promedio || 0).toFixed(1)}</b>
              <button className="text-stone underline" type="button" onClick={showReviews}>
                {currentProduct.total_resenas || 0} reseñas verificadas
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(currentProduct.escalas_precios || []).map((scale) => (
              <span className="rounded-full bg-mist px-3 py-2 font-sans text-xs font-bold text-forest" key={scale.id_escala || scale.cantidad_min}>
                Desde {scale.cantidad_min}: {money(scale.precio_unitario)}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              Cantidad
              <div className="qty-control">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Icon name="minus" /></button>
                <input min="1" max={currentProduct.stock || 1} type="number" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(currentProduct.stock || 1, Number(event.target.value))))} />
                <button type="button" onClick={() => setQuantity(Math.min(currentProduct.stock || 1, quantity + 1))}><Icon name="plus" /></button>
              </div>
            </label>
            <label className="field">
              Técnica
              <select value={technique} onChange={(event) => setTechnique(event.target.value)}>
                {availableTechniques.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          {groups.talla?.length ? (
            <label className="field">
              Talla
              <select value={selections.talla} onChange={(event) => setSelections((current) => ({ ...current, talla: event.target.value }))}>
                {groups.talla.map((option) => (
                  <option key={option.id_opcion || option.nombre} value={option.nombre}>
                    {option.nombre}{Number(option.recargo) ? ` + ${money(option.recargo)}` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {groups.tamano?.length ? (
            <label className="field">
              Tamaño
              <select value={selections.tamano} onChange={(event) => setSelections((current) => ({ ...current, tamano: event.target.value }))}>
                {groups.tamano.map((option) => (
                  <option key={option.id_opcion || option.nombre} value={option.nombre}>
                    {option.nombre}{Number(option.recargo) ? ` + ${money(option.recargo)}` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {groups.color?.length ? (
            <label className="field">
              Color
              <div className="mt-1 flex flex-wrap gap-2">
                {groups.color.map((option) => (
                  <button
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition ${selections.color === option.nombre ? 'ring-2 ring-forest ring-offset-2' : ''} ${hasColorBorder(option.nombre) ? 'border border-ink/20' : ''}`}
                    key={option.id_opcion || option.nombre}
                    title={option.nombre}
                    type="button"
                    onClick={() => {
                      setManualReferenceImage(false);
                      setSelections((current) => ({ ...current, color: option.nombre }));
                    }}
                  >
                    <span className="h-6 w-6 rounded-full" style={{ backgroundColor: getColorHex(option.nombre) }} />
                  </button>
                ))}
              </div>
              <small className="mt-1 block text-stone">{selections.color || 'Selecciona un color'}</small>
            </label>
          ) : null}

          {groups.figura?.length ? (
            <label className="field">
              Figura de maceta
              <select value={selections.figura} onChange={(event) => setSelections((current) => ({ ...current, figura: event.target.value }))}>
                {groups.figura.map((option) => (
                  <option key={option.id_opcion || option.nombre} value={option.nombre}>
                    {option.nombre}{Number(option.recargo) ? ` + ${money(option.recargo)}` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {faceOptions ? (
            <label className="field">
              Cara
              <select value={selections.cara} onChange={(event) => {
                setManualReferenceImage(false);
                setSelections((current) => ({ ...current, cara: event.target.value }));
              }}>
                {faceOptions.map((option) => (
                  <option key={option.id_opcion || option.nombre} value={option.nombre}>
                    {option.nombre}{Number(option.recargo) ? ` + ${money(option.recargo)}` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {isPoloProduct && selections.cara === 'Ambos' ? (
            <div className="face-edit-toggle" role="group" aria-label="Cara del polo a editar">
              {['Adelante', 'Atrás'].map((face) => (
                <button className={currentDesignFace === face ? 'active' : ''} key={face} type="button" onClick={() => setActiveDesignFace(face)}>
                  Editar {face}
                </button>
              ))}
            </div>
          ) : null}

          {!allowsVisualPersonalization ? (
            <div className="rounded-md border border-ink/10 bg-mist p-3 font-sans text-sm font-bold text-stone">
              Este producto se agrega tal como aparece en la imagen referencial.
            </div>
          ) : isPoloProduct && !designFaces.length ? (
            <div className="rounded-md border border-ink/10 bg-mist p-3 font-sans text-sm font-bold text-stone">
              Este polo se agregará sin texto ni imagen personalizada.
            </div>
          ) : (
            <>
              <label className="field">
                Texto personalizado{isPoloProduct ? ` (${currentDesignFace})` : ''}
                <textarea value={currentCustomText} onChange={(event) => {
                  if (isPoloProduct) {
                    setFaceDesigns((current) => ({
                      ...current,
                      [currentDesignFace]: buildFaceDesign({
                        ...current[currentDesignFace],
                        texto: event.target.value,
                      }),
                    }));
                  } else {
                    setCustomText(event.target.value);
                  }
                }} placeholder="Ej: Para mama, con amor" />
                <small className="text-stone">{isPoloProduct ? 'Usa “Mover texto” y cambia entre Adelante/Atrás para editar cada cara.' : `Usa “Mover texto” y haz clic sobre la imagen. El texto agrega ${money(3)} al precio unitario.`}</small>
              </label>

              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <label className="field">Fuente<select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>{fontOptions.map((font) => <option key={font}>{font}</option>)}</select></label>
                <label className="field">Tamaño de letra ({fontSize}px)<input min="12" max="72" type="range" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label>
              </div>
              <label className="field">
                Color de letra
                <div className="text-color-options">
                  {TEXT_COLORS.map((color) => (
                    <button
                      className={currentTextColor === color.value ? 'active' : ''}
                      key={color.value}
                      type="button"
                      onClick={() => {
                        if (isPoloProduct) {
                          setFaceDesigns((current) => ({
                            ...current,
                            [currentDesignFace]: buildFaceDesign({
                              ...current[currentDesignFace],
                              color_texto: color.value,
                            }),
                          }));
                        } else {
                          setTextColor(color.value);
                        }
                      }}
                    >
                      <span style={{ backgroundColor: color.value }} />
                      {color.label}
                    </button>
                  ))}
                </div>
              </label>

              <div className="field">
            <span>Imagen a estampar{isPoloProduct ? ` (${currentDesignFace})` : ''} (opcional)</span>
            <input ref={fileInputRef} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" type="file" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              clearLocalPreview();
              const localUrl = URL.createObjectURL(file);
              localPreviewRef.current = localUrl;
              if (isPoloProduct) {
                setFaceDesigns((current) => ({
                  ...current,
                  [currentDesignFace]: buildFaceDesign({
                    ...current[currentDesignFace],
                    imagen_preview: localUrl,
                    imagen_url: null,
                  }),
                }));
              } else {
                setUserImagePreview(localUrl);
                setUserImageUrl(null);
              }
              setUploadError('');
              setUploadingImage(true);
              try {
                const data = await uploadCustomerFile(file, token);
                clearLocalPreview();
                if (isPoloProduct) {
                  setFaceDesigns((current) => ({
                    ...current,
                    [currentDesignFace]: buildFaceDesign({
                      ...current[currentDesignFace],
                      imagen_preview: resolveMediaUrl(data.url),
                      imagen_url: data.url,
                    }),
                  }));
                } else {
                  setUserImagePreview(resolveMediaUrl(data.url));
                  setUserImageUrl(data.url);
                }
              } catch (err) {
                console.error(err);
                setUploadError(err.message || 'No se pudo subir la imagen, pero puedes verla como vista previa local.');
              } finally {
                setUploadingImage(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }} />
            {currentUserImagePreview ? (
              <div className="mt-2 flex items-start gap-3">
                <img alt="Tu imagen" className="h-16 w-16 rounded border border-ink/10 object-cover" src={resolveMediaUrl(currentUserImagePreview)} />
                <div className="flex flex-col gap-1">
                  <button className="btn-ghost text-sm" disabled={uploadingImage} type="button" onClick={() => fileInputRef.current?.click()}>{uploadingImage ? 'Subiendo...' : 'Cambiar imagen'}</button>
                  <button className="btn-ghost text-sm text-danger" type="button" onClick={() => {
                    clearLocalPreview();
                    if (isPoloProduct) {
                      setFaceDesigns((current) => ({
                        ...current,
                        [currentDesignFace]: buildFaceDesign({
                          ...current[currentDesignFace],
                          imagen_preview: null,
                          imagen_url: null,
                        }),
                      }));
                    } else {
                      setUserImagePreview(null);
                      setUserImageUrl(null);
                    }
                    setUploadError('');
                    setMoveTarget('texto');
                  }}>Quitar</button>
                </div>
              </div>
            ) : (
              <button className="btn-ghost mt-1 min-h-10 w-full border border-dashed border-ink/20" disabled={uploadingImage} type="button" onClick={() => fileInputRef.current?.click()}>{uploadingImage ? 'Subiendo...' : 'Sube tu imagen para estampar'}</button>
            )}
            {uploadError ? <small className="text-danger">{uploadError}</small> : null}
            <small className="text-stone">Formatos aceptados: JPG, PNG, GIF, WebP (max 5MB). Usa “Mover imagen” y haz clic sobre el producto para ubicar tu diseño.</small>
          </div>

          {currentUserImagePreview ? (
            <div className="image-size-control">
              <span>Tamaño de imagen ({currentImageSize}px)</span>
              <button type="button" onClick={() => {
                if (isPoloProduct) {
                  setFaceDesigns((current) => ({
                    ...current,
                    [currentDesignFace]: buildFaceDesign({
                      ...current[currentDesignFace],
                      imagen_tamano: Math.max(40, buildFaceDesign(current[currentDesignFace]).imagen_tamano - 10),
                    }),
                  }));
                } else {
                  setImageSize((current) => Math.max(40, current - 10));
                }
              }} aria-label="Achicar imagen">
                <Icon name="zoomOut" />
              </button>
              <input min="40" max="180" type="range" value={currentImageSize} onChange={(event) => {
                if (isPoloProduct) {
                  setFaceDesigns((current) => ({
                    ...current,
                    [currentDesignFace]: buildFaceDesign({
                      ...current[currentDesignFace],
                      imagen_tamano: Number(event.target.value),
                    }),
                  }));
                } else {
                  setImageSize(Number(event.target.value));
                }
              }} />
              <button type="button" onClick={() => {
                if (isPoloProduct) {
                  setFaceDesigns((current) => ({
                    ...current,
                    [currentDesignFace]: buildFaceDesign({
                      ...current[currentDesignFace],
                      imagen_tamano: Math.min(180, buildFaceDesign(current[currentDesignFace]).imagen_tamano + 10),
                    }),
                  }));
                } else {
                  setImageSize((current) => Math.min(180, current + 10));
                }
              }} aria-label="Agrandar imagen">
                <Icon name="zoom" />
              </button>
            </div>
          ) : null}
            </>
          )}

          <label className="field">
            Indicaciones adicionales
            <textarea value={additionalNotes} onChange={(event) => setAdditionalNotes(event.target.value)} placeholder="Ej: bordado centrado, envolver para regalo, fecha de entrega o detalle especial" />
            <small className="text-stone">Opcional. Usa este espacio para cualquier detalle extra del pedido.</small>
          </label>

          <div className="reviews-strip" ref={reviewsRef}>
            {displayedReviews.map((review) => (
              <article key={review.id_resena}>
                <strong>{stars(review.rating)} {review.cliente_nombre || 'Cliente'}</strong>
                <p>{review.comentario}</p>
                {review.compra_verificada ? <span>Compra verificada</span> : null}
              </article>
            ))}
            {allReviews.length > 2 && !showAllReviews ? (
              <button className="btn-ghost text-sm text-forest" type="button" onClick={showReviews}>
                Ver todas las reseñas verificadas ({allReviews.length})
              </button>
            ) : null}
          </div>

          <div className="grid gap-2 border-t border-ink/10 pt-4 font-sans">
            <span className="flex justify-between">Base configurada <strong>{money(unitPrice)}</strong></span>
            <span className="flex justify-between text-stone">Stock disponible <strong>{currentProduct.stock}</strong></span>
            <b className="flex justify-between text-xl">Total <strong>{money(unitPrice * quantity)}</strong></b>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn-primary min-h-12 w-full active:scale-[0.98]" type="button" disabled={!canSubmit} onClick={submit}>
              <Icon name="cart" />
              {submitLabel}
            </button>
            <button className="btn-ghost min-h-12 w-full" type="button" onClick={onClose}>Seguir viendo</button>
          </div>
        </div>
      </article>
    </div>
  );
}
