import { useEffect } from 'react'

const BASE_TITLE = 'HuniOne — Platform Properti Terpercaya'
const BASE_DESC = 'Temukan properti impian Anda di HuniOne. Jual, beli, dan sewa properti dengan mudah dan aman.'

export default function useSEO({ title, description, image } = {}) {
  useEffect(() => {
    const pageTitle = title ? `${title} | HuniOne` : BASE_TITLE
    document.title = pageTitle

    const upsertMeta = (attr, key, content) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    const upsertLink = (rel, href) => {
      let el = document.head.querySelector(`link[rel="${rel}"]`)
      if (!el) {
        el = document.createElement('link')
        el.rel = rel
        document.head.appendChild(el)
      }
      el.setAttribute('href', href)
    }

    const url = window.location.href
    const origin = window.location.origin
    const ogImage = image || `${origin}/favicon.png`

    upsertMeta('name', 'description', description || BASE_DESC)
    upsertMeta('name', 'robots', 'index, follow')
    upsertLink('canonical', url)

    upsertMeta('property', 'og:title', title || BASE_TITLE)
    upsertMeta('property', 'og:description', description || BASE_DESC)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:site_name', 'HuniOne')
    upsertMeta('property', 'og:locale', 'id_ID')
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('property', 'og:image:alt', title || BASE_TITLE)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title || BASE_TITLE)
    upsertMeta('name', 'twitter:description', description || BASE_DESC)
    upsertMeta('name', 'twitter:image', ogImage)

    return () => {
      document.title = BASE_TITLE
      upsertMeta('name', 'description', BASE_DESC)
      upsertMeta('property', 'og:title', BASE_TITLE)
      upsertMeta('property', 'og:description', BASE_DESC)
    }
  }, [title, description, image])
}
