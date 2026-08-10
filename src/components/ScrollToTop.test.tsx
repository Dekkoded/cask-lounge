import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import ScrollToTop from './ScrollToTop'

function Home() {
  return <Link to="/whisky/1">go</Link>
}
function Detail() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>back</button>
}

function App() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/whisky/1" element={<Detail />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('scrollt bei Vorwärts-Navigation an den Anfang', () => {
    render(<App />)
    ;(window.scrollTo as ReturnType<typeof vi.fn>).mockClear()
    fireEvent.click(screen.getByText('go'))
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('scrollt bei „Zurück" (POP) nicht', () => {
    render(<App />)
    fireEvent.click(screen.getByText('go'))
    ;(window.scrollTo as ReturnType<typeof vi.fn>).mockClear()
    fireEvent.click(screen.getByText('back'))
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})
