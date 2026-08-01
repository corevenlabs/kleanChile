import { useEffect, useRef } from 'react'

/**
 * useScrollReveal
 * Agrega la clase `is-visible` cuando el elemento entra al viewport.
 * @param {Object} options - IntersectionObserver options
 */
export function useScrollReveal({ repeat = false, ...options } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          if (!repeat) observer.unobserve(el)
        } else if (repeat) {
          el.classList.remove('is-visible')
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -60px 0px',
        ...options,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [repeat])

  return ref
}
