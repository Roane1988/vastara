import { useEffect } from 'react'

const BASE_TITLE = 'HuniOne — Platform Properti Terpercaya'
const BASE_DESC = 'Temukan properti impian Anda di HuniOne. Jual, beli, dan sewa properti dengan mudah dan aman.'

export default function useSEO({ title, description, image } = {}) {
  useEffect(() => {
    document.title = title ? `${title} | HuniOne` : BASE_TITLE

    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.name = name
        document.head.appendChild(el)
      }
      el.content = content
    }

    setMeta('description', description || BASE_DESC)
    setMeta('og:title', title || BASE_TITLE)
    setMeta('og:description', description || BASE_DESC)
    setMeta('og:type', 'website')
    setMeta('og:url', window.location.href)
    if (image) setMeta('og:image', image)

    return () => {
      document.title = BASE_TITLE
      setMeta('description', BASE_DESC)
      setMeta('og:title', BASE_TITLE)
      setMeta('og:description', BASE_DESC)
    }
  }, [title, description, image])
}