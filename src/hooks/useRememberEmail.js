import { useState } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'huni_one_remembered_email'

export function getRememberedEmail() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function saveRememberedEmail(email) {
  try {
    localStorage.setItem(STORAGE_KEY, email)
  } catch {
    // localStorage unavailable — ignore
  }
}

export function clearRememberedEmail() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage unavailable — ignore
  }
}

function emailFromUrl(location) {
  return (new URLSearchParams(location.search).get('email') || '').trim()
}

export function useRememberEmail() {
  const location = useLocation()
  const [email, setEmail] = useState(() => {
    const fromUrl = emailFromUrl(location)
    return fromUrl || getRememberedEmail()
  })
  const [remember, setRemember] = useState(() => Boolean(emailFromUrl(location) || getRememberedEmail()))

  function handleToggleRemember(next) {
    setRemember(next)
    if (next) {
      saveRememberedEmail(email)
    } else {
      clearRememberedEmail()
    }
  }

  function persistRememberedEmail() {
    if (remember) saveRememberedEmail(email)
    else clearRememberedEmail()
  }

  return {
    email,
    setEmail,
    remember,
    setRemember,
    handleToggleRemember,
    persistRememberedEmail,
  }
}
