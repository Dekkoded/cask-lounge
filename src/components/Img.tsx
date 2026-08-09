import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

/**
 * Bild, das beim Laden sanft einblendet statt hart zu poppen (Emil: nur
 * opacity, GPU-schonend). Drop-in für <img> – gleiche Props.
 *
 * Cache-sicher: Ist das Bild beim Mount schon fertig (Cache-Hit), kann das
 * native onLoad-Event ausbleiben; deshalb prüfen wir im Effect zusätzlich
 * `complete`/`naturalWidth`, damit nichts dauerhaft unsichtbar hängt.
 */
export default function Img({ className = '', onLoad, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (el?.complete && el.naturalWidth > 0) setLoaded(true)
  }, [props.src])

  return (
    <img
      ref={ref}
      {...props}
      onLoad={e => { setLoaded(true); onLoad?.(e) }}
      data-loaded={loaded ? '' : undefined}
      className={`img-fade ${className}`}
    />
  )
}
