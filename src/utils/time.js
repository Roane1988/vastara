import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/id'

dayjs.extend(relativeTime)

export function timeAgo(dateString, locale = 'id') {
  if (!dateString) return ''
  const lang = locale === 'en' ? 'en' : 'id'
  const d = dayjs(dateString)
  if (!d.isValid()) return ''
  return d.locale(lang).fromNow()
}
