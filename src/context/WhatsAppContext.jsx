import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'
import { io } from 'socket.io-client'
import api, { getStoredAuthToken } from '../services/apiClient'
import { getSocketBaseUrl } from '../services/runtimeUrls'

const WhatsAppContext = createContext()

export const WhatsAppProvider = ({ children }) => {
  const { user } = useAuth()
  const { addNotification } = useData()
  const [socket, setSocket] = useState(null)
  const [status, setStatus] = useState('DISCONNECTED')
  const [error, setError] = useState(null)
  const [qr, setQr] = useState(null)
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoadingChats, setIsLoadingChats] = useState(false)

  useEffect(() => {
    if (user) {
      const newSocket = io(getSocketBaseUrl(), {
        query: { userId: user._id || user.id },
        auth: { token: getStoredAuthToken() }
      })
      
      newSocket.on('whatsapp_status_update', (data) => {
        setStatus(data.status)
        setQr(data.qr)
        setError(data.error || null)
        if (data.status === 'READY') {
          fetchChats()
        }
      })

      newSocket.on('whatsapp_chats_synced', () => {
        fetchChats()
      })

      newSocket.on('whatsapp_message', (msg) => {
        setMessages(prev => [...prev, msg])
        fetchChats() // update last message in chat list
      })

      setSocket(newSocket)

      // Initial status check
      api.get('/integrations/whatsapp/qr').then(res => {
        if (res.data?.success) {
          setStatus(res.data.data.status)
          setQr(res.data.data.qr)
          setError(res.data.data.error || null)
          if (res.data.data.status === 'READY') {
            fetchChats()
          }
        }
      })

      return () => newSocket.close()
    }
  }, [user])

  const fetchChats = async () => {
    setIsLoadingChats(true)
    try {
      const res = await api.get('/integrations/whatsapp/chats')
      if (res.data?.success) {
        setChats(res.data.data)
      }
    } catch (e) {
      console.error(e)
    }
    setIsLoadingChats(false)
  }

  const selectChat = async (chatId) => {
    setSelectedChat(chatId)
    try {
      const res = await api.get(`/integrations/whatsapp/chats/${encodeURIComponent(chatId)}/messages`)
      if (res.data?.success) {
        setMessages(res.data.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const sendMessage = async (to, body) => {
    try {
      await api.post('/integrations/whatsapp/send', { to, message: body })
      // Optomistically add message or rely on socket
    } catch (e) {
      addNotification?.('error', 'Failed to send message')
    }
  }

  const logout = async () => {
    try {
      await api.post('/integrations/whatsapp/logout')
      setStatus('DISCONNECTED')
      setError(null)
      setChats([])
      setSelectedChat(null)
      setMessages([])
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <WhatsAppContext.Provider value={{
      status, error, qr, chats, selectedChat, messages, isLoadingChats,
      selectChat, sendMessage, logout
    }}>
      {children}
    </WhatsAppContext.Provider>
  )
}

export const useWhatsApp = () => useContext(WhatsAppContext)
