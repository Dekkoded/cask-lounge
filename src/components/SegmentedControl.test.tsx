import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SegmentedControl from './SegmentedControl'

const options = [
  { value: 'a', label: 'Erste' },
  { value: 'b', label: 'Zweite' },
] as const

describe('SegmentedControl', () => {
  it('rendert alle Optionen als Buttons', () => {
    render(<SegmentedControl value="a" onChange={() => {}} options={[...options]} />)
    expect(screen.getByText('Erste')).toBeInTheDocument()
    expect(screen.getByText('Zweite')).toBeInTheDocument()
  })

  it('meldet die gewählte Option per onChange', () => {
    const onChange = vi.fn()
    render(<SegmentedControl value="a" onChange={onChange} options={[...options]} />)
    fireEvent.click(screen.getByText('Zweite'))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('schiebt die Pille auf das aktive Segment (translateX pro Index)', () => {
    const { container, rerender } = render(
      <SegmentedControl value="a" onChange={() => {}} options={[...options]} />,
    )
    const pill = container.querySelector('[aria-hidden]') as HTMLElement
    expect(pill.style.transform).toBe('translateX(0%)')
    rerender(<SegmentedControl value="b" onChange={() => {}} options={[...options]} />)
    expect(pill.style.transform).toBe('translateX(100%)')
  })
})
