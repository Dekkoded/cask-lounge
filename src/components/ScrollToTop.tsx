import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Setzt den Scroll bei jeder Vorwärts-Navigation an den Seitenanfang – sonst
 * landet man z.B. aus einer weit gescrollten Liste mitten in der Detailseite.
 * Bei „Zurück" (POP) bleibt die vom Browser wiederhergestellte Position
 * erhalten (Apple-typisch: vorwärts = neuer Anfang, zurück = da weiter, wo man
 * war). Reagiert nur auf Pfadwechsel, nicht auf ?view=…-Tabs derselben Seite.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navType])

  return null
}
