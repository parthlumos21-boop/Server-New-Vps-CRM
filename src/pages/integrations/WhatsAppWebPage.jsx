import React, { useState } from 'react'
import { WhatsAppProvider, useWhatsApp } from '../../context/WhatsAppContext'
import { FaUserCircle, FaPaperPlane, FaEllipsisV, FaSearch, FaCheckDouble } from 'react-icons/fa'
import './WhatsAppWebPage.css'

const WhatsAppUI = ({ isEmbedded = false, mode = 'full' }) => {
  const { 

    status, error, qr, chats, selectedChat, messages, 
    selectChat, sendMessage, logout 
  } = useWhatsApp()
  const [msgInput, setMsgInput] = useState('')

  if (status !== 'READY') {
    return (
      <div className={`wa-qr-container ${isEmbedded ? 'embedded' : ''}`} style={isEmbedded ? { margin: '0 auto', border: 'none', boxShadow: 'none' } : {}}>
        <h2>Connect WhatsApp</h2>
        <p>Status: {status}</p>
        {error && (
          <div style={{ color: '#ef4444', background: '#fef2f2', padding: '10px', borderRadius: '4px', margin: '10px 0', border: '1px solid #f87171' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        {qr && <img src={qr} alt="WhatsApp QR Code" className="wa-qr-image" />}
        <button className="wa-btn" onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>
          Refresh Connection
        </button>
      </div>
    )
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!msgInput.trim() || !selectedChat) return
    sendMessage(selectedChat, msgInput)
    setMsgInput('')
  }

  if (mode === 'login' && status === 'READY') {
    return (
      <div className={`wa-qr-container ${isEmbedded ? 'embedded' : ''}`} style={isEmbedded ? { margin: '0 auto', border: 'none', boxShadow: 'none' } : {}}>
        <h2>WhatsApp Connected!</h2>
        <p>Your WhatsApp is successfully authenticated.</p>
        <button className="wa-btn" onClick={() => window.location.href = '/admin/whatsapp-chat'} style={{ marginTop: '1rem', background: '#25D366' }}>
          Open WhatsApp Chat
        </button>
      </div>
    )
  }

  return (
    <div className={`wa-container ${isEmbedded ? 'embedded' : ''}`}>
      <div className="wa-sidebar">
        <div className="wa-sidebar-header">
          <FaUserCircle className="wa-icon-avatar" />
          <div className="wa-header-actions">
            <button onClick={logout} className="wa-btn-icon" title="Logout"><FaEllipsisV /></button>
          </div>
        </div>
        <div className="wa-search-bar">
          <FaSearch className="wa-search-icon" />
          <input type="text" placeholder="Search or start new chat" className="wa-search-input" />
        </div>
        <div className="wa-chat-list">
          {chats.map(c => (
            <div 
              key={c.chatId} 
              className={`wa-chat-item ${selectedChat === c.chatId ? 'active' : ''}`}
              onClick={() => selectChat(c.chatId)}
            >
              <FaUserCircle className="wa-chat-avatar" />
              <div className="wa-chat-info">
                <div className="wa-chat-name">
                  <span>{c.name || c.chatId.split('@')[0]}</span>
                  {c.unreadCount > 0 && <span className="wa-badge">{c.unreadCount}</span>}
                </div>
                <div className="wa-chat-last-msg">
                  {c.lastMessage?.body || 'No messages yet'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="wa-main">
        {selectedChat ? (
          <>
            <div className="wa-main-header">
              <FaUserCircle className="wa-icon-avatar" />
              <span className="wa-main-title">{chats.find(c => c.chatId === selectedChat)?.name || selectedChat}</span>
            </div>
            <div className="wa-messages-area">
              {messages.map(m => (
                <div key={m.messageId} className={`wa-message-row ${m.fromMe ? 'sent' : 'received'}`}>
                  <div className="wa-message-bubble">
                    {m.hasMedia && m.mediaUrl ? (
                      <img src={m.mediaUrl} alt="media" className="wa-message-media" />
                    ) : null}
                    <span className="wa-message-text">{m.body}</span>
                    <span className="wa-message-meta">
                      {new Date(m.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {m.fromMe && <FaCheckDouble className={`wa-read-tick ${m.ack === 3 ? 'read' : ''}`} />}
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
    </div>
  )
}

const WhatsAppWebPage = ({ isEmbedded = false, mode = 'full' }) => {
  return (
    <WhatsAppProvider>
      <WhatsAppUI isEmbedded={isEmbedded} mode={mode} />
    </WhatsAppProvider>
  )
}

export default WhatsAppWebPage
