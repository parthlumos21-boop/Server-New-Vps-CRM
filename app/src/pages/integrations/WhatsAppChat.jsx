import React, { useState, useEffect, useRef } from 'react'
import { FaUserCircle, FaPaperPlane, FaSearch, FaCheckDouble, FaSpinner, FaInfoCircle } from 'react-icons/fa'
import { FiChevronDown } from 'react-icons/fi'
import { integrationApi } from '../../services/integrationApi'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { CRM_OWNER_DIRECTORY } from '../../features/users/crmUserDirectory'
import './WhatsAppWebPage.css' // Reuse the existing CSS

const isKevalVShahUser = (user = {}) => {
  const normalizedName = String(user?.name || user?.email || '').trim().toLowerCase()
  return normalizedName === 'keval v shah'
    || normalizedName === 'keval@swatiswitchgears.com'
    || normalizedName.includes('keval v shah')
}

const WhatsAppChat = () => {
  const { addNotification } = useData()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const isAdmin = user?.role === 'admin'
  const [selectedFilterUser, setSelectedFilterUser] = useState(isAdmin ? 'All Users' : (user?.name || 'My Chats'))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    try {
      const data = await integrationApi.getWhatsappCloudChats()
      setChats(data)
    } catch (error) {
      addNotification('error', 'Error', 'Failed to load chats')
    } finally {
      setLoading(false)
    }
  }

  const selectChat = async (chatId) => {
    setSelectedChat(chatId)
    try {
      const data = await integrationApi.getWhatsappCloudMessages(chatId)
      setMessages(data)
    } catch (error) {
      addNotification('error', 'Error', 'Failed to load messages')
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!msgInput.trim() || !selectedChat) return
    
    const body = msgInput.trim()
    setMsgInput('')

    // Optimistically add message
    const tempMsg = {
      messageId: Date.now().toString(),
      fromMe: true,
      body,
      timestamp: Date.now(),
      status: 'sending'
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      await integrationApi.sendWhatsappCloud({ to: selectedChat, message: body })
      // Reload messages to get the real status
      const data = await integrationApi.getWhatsappCloudMessages(selectedChat)
      setMessages(data)
    } catch (error) {
      addNotification('error', 'Error', 'Failed to send message')
      setMessages(prev => prev.filter(m => m.messageId !== tempMsg.messageId))
    }
  }

  if (loading) {
    return (
      <div className="wa-dash-loading">
        <FaSpinner className="wa-dash-spinner" />
        <p>Loading Chats...</p>
      </div>
    )
  }

  return (
    <div className="wa-container">
      <div className="wa-sidebar">
        <div 
          className="wa-sidebar-header" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '15px 20px', 
            cursor: isAdmin ? 'pointer' : 'default', 
            position: 'relative' 
          }} 
          ref={dropdownRef} 
          onClick={() => isAdmin && setDropdownOpen(!dropdownOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FaUserCircle className="wa-icon-avatar" />
            <h3 style={{ margin: 0, paddingLeft: 10, fontSize: '16px', fontWeight: 600 }}>{selectedFilterUser}</h3>
          </div>
          {isAdmin && <FiChevronDown style={{ color: '#666' }} />}
          
          {isAdmin && dropdownOpen && (
            <div className="wa-user-dropdown-menu">
              <div 
                className={`wa-user-dropdown-item ${selectedFilterUser === 'All Users' ? 'active' : ''}`}
                onClick={() => setSelectedFilterUser('All Users')}
              >
                All Users
              </div>
              {CRM_OWNER_DIRECTORY.map(u => (
                <div 
                  key={u.ownerCode}
                  className={`wa-user-dropdown-item ${selectedFilterUser === u.name ? 'active' : ''}`}
                  onClick={() => setSelectedFilterUser(u.name)}
                >
                  {u.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="wa-search-bar">
          <FaSearch className="wa-search-icon" />
          <input type="text" placeholder="Search or start new chat" className="wa-search-input" />
        </div>
        <div className="wa-chat-list">
          {chats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No chats found</div>
          ) : (
            chats.map(c => (
              <div 
                key={c.chatId} 
                className={`wa-chat-item ${selectedChat === c.chatId ? 'active' : ''}`}
                onClick={() => selectChat(c.chatId)}
              >
                <FaUserCircle className="wa-chat-avatar" />
                <div className="wa-chat-info">
                  <div className="wa-chat-name">
                    <span>{c.name || c.chatId}</span>
                    {c.unreadCount > 0 && <span className="wa-badge">{c.unreadCount}</span>}
                  </div>
                  <div className="wa-chat-last-msg">
                    {c.lastMessage?.body || 'No messages yet'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="wa-main">
        {selectedChat ? (
          <>
            <div className="wa-main-header">
              <FaUserCircle className="wa-icon-avatar" />
              <span className="wa-main-title">
                {chats.find(c => c.chatId === selectedChat)?.name || selectedChat}
              </span>
            </div>
            <div className="wa-messages-area">
              {messages.map(m => (
                <div key={m.messageId} className={`wa-message-row ${m.fromMe ? 'sent' : 'received'}`}>
                  <div className="wa-message-bubble">
                    <span className="wa-message-text">{m.body}</span>
                    <span className="wa-message-meta">
                      {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {m.fromMe && <FaCheckDouble className={`wa-read-tick ${m.status === 'read' ? 'read' : ''}`} />}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <form className="wa-input-area" onSubmit={handleSend}>
              <input 
                type="text" 
                placeholder="Type a message" 
                value={msgInput} 
                onChange={(e) => setMsgInput(e.target.value)} 
                className="wa-message-input"
              />
              <button type="submit" className="wa-send-btn"><FaPaperPlane /></button>
            </form>
          </>
        ) : (
          <div className="wa-empty-state">
            <h3>WhatsApp for CRM</h3>
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {isKevalVShahUser(user) && (
        <div className="wa-crm-panel">
          <div className="wa-crm-header">
            <FaInfoCircle className="wa-crm-icon" />
            <h3>CRM Info</h3>
          </div>
          {selectedChat ? (
            <div className="wa-crm-content">
              <div className="wa-crm-detail">
                <span className="wa-crm-label">Contact Name</span>
                <span className="wa-crm-value">{chats.find(c => c.chatId === selectedChat)?.name || 'Unknown'}</span>
              </div>
              <div className="wa-crm-detail">
                <span className="wa-crm-label">Phone</span>
                <span className="wa-crm-value">{selectedChat.split('@')[0]}</span>
              </div>
              <div className="wa-crm-detail">
                <span className="wa-crm-label">Status</span>
                <span className="wa-crm-value" style={{ color: '#059669' }}>Active Lead</span>
              </div>
              <div className="wa-crm-detail">
                <span className="wa-crm-label">Assigned To</span>
                <span className="wa-crm-value">Keval V Shah</span>
              </div>
              
              <button className="wa-btn wa-btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                View Full Profile
              </button>
            </div>
          ) : (
            <div className="wa-crm-empty">
              Select a chat to view CRM details
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WhatsAppChat
