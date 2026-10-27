export const HUNIBOT_ID = 'hunibot'

export const EMPTY_ARRAY = []

export const HUNIBOT_CONTACT = {
  id: HUNIBOT_ID,
  first_name: 'HuniBot',
  role: 'ai',
  is_hunibot: true,
  last_message: 'Asisten properti AI · Online',
  last_message_at: null,
}

export const PAGE_SIZE = 50

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']
export const DOUBLE_TAP_REACTION = '❤️'

export function getOtherId(message, userId) {
  return message.sender_id === userId ? message.receiver_id : message.sender_id
}

export function getRoomId(userId, contactId) {
  if (!userId || !contactId) return null
  return [userId, contactId].sort().join('-')
}
