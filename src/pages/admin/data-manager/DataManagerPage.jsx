import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaTag,
  FaImage,
  FaDatabase,
  FaBookOpen,
  FaArrowRight,
} from 'react-icons/fa'
import './DataManagerPage.css'

const BulkUploadIllustration = () => (
  <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="dm-card-graphic">
    <g filter="url(#shadow-orange)">
      {/* 3D Oval Pedestal Base Stage */}
      <ellipse cx="120" cy="160" rx="75" ry="22" fill="#FFEDD5" opacity="0.9" />
      <path d="M45 160 C45 175 195 175 195 160 V168 C195 183 45 183 45 168 Z" fill="#FED7AA" />
      <ellipse cx="120" cy="157" rx="70" ry="18" fill="#FFF7ED" />

      {/* Stacked Cards behind */}
      <rect x="135" y="48" width="56" height="76" rx="12" fill="#FED7AA" transform="rotate(8 135 48)" />
      <rect x="122" y="52" width="56" height="76" rx="12" fill="#FFE4E6" transform="rotate(4 122 52)" />
      <rect x="108" y="56" width="56" height="76" rx="12" fill="#FFEDD5" transform="rotate(1 108 56)" />

      {/* Front Main White Card */}
      <rect x="75" y="60" width="68" height="82" rx="16" fill="url(#front-card-white)" stroke="#FFF7ED" strokeWidth="2.5" />
      
      {/* Tray Box */}
      <path d="M92 98 V118 C92 121 95 124 98 124 H120 C123 124 126 121 126 118 V98" stroke="#F97316" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="#FFF7ED" />
      
      {/* Upward Arrow */}
      <line x1="109" y1="112" x2="109" y2="86" stroke="#F97316" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M100 95 L109 84 L118 95" stroke="#F97316" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <linearGradient id="front-card-white" x1="75" y1="60" x2="143" y2="142" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#FFF7ED" />
      </linearGradient>
      <filter id="shadow-orange" x="0" y="0" width="220" height="200" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#EA580C" floodOpacity="0.16" />
      </filter>
    </defs>
  </svg>
)

const ImageGalleryIllustration = () => (
  <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="dm-card-graphic">
    <g filter="url(#shadow-blue)">
      {/* 3D Oval Pedestal Base Stage */}
      <ellipse cx="120" cy="160" rx="75" ry="22" fill="#DBEAFE" opacity="0.9" />
      <path d="M45 160 C45 175 195 175 195 160 V168 C195 183 45 183 45 168 Z" fill="#BFDBFE" />
      <ellipse cx="120" cy="157" rx="70" ry="18" fill="#EFF6FF" />

      {/* Stacked Photo Cards */}
      <rect x="135" y="44" width="58" height="80" rx="12" fill="#60A5FA" transform="rotate(10 135 44)" opacity="0.85" />
      <rect x="118" y="50" width="58" height="80" rx="12" fill="#93C5FD" transform="rotate(5 118 50)" />
      
      {/* Front Photo Card */}
      <rect x="75" y="58" width="70" height="84" rx="16" fill="url(#front-photo-card)" stroke="#EFF6FF" strokeWidth="2.5" />
      <circle cx="96" cy="80" r="7.5" fill="#FB923C" />
      <path d="M110 126 L126 98 L142 126 Z" fill="#2563EB" opacity="0.85" />
      <path d="M85 126 L108 90 L128 126 Z" fill="#3B82F6" />
    </g>
    <defs>
      <linearGradient id="front-photo-card" x1="75" y1="58" x2="145" y2="142" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#EFF6FF" />
      </linearGradient>
      <filter id="shadow-blue" x="0" y="0" width="220" height="200" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#2563EB" floodOpacity="0.16" />
      </filter>
    </defs>
  </svg>
)

const DocumentBaseIllustration = () => (
  <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="dm-card-graphic">
    <g filter="url(#shadow-green)">
      {/* 3D Oval Pedestal Base Stage */}
      <ellipse cx="120" cy="160" rx="75" ry="22" fill="#DCFCE7" opacity="0.9" />
      <path d="M45 160 C45 175 195 175 195 160 V168 C195 183 45 183 45 168 Z" fill="#BBF7D0" />
      <ellipse cx="120" cy="157" rx="70" ry="18" fill="#F0FDF4" />

      {/* 3D Folders */}
      <path d="M110 42 H155 C160 42 164 46 164 51 V125 C164 130 160 134 155 134 H110 C105 134 101 130 101 125 V51 C101 46 105 42 110 42 Z" fill="#047857" transform="rotate(7 132 88)" />
      <path d="M96 48 H142 C147 48 151 52 151 57 V130 C151 135 147 139 142 139 H96 C91 139 87 135 87 130 V57 C87 52 91 48 96 48 Z" fill="#10B981" transform="rotate(3 119 93)" />
      
      {/* Front White Page with Corner Fold */}
      <path d="M72 58 H120 C125 58 128 61 128 66 V136 C128 141 124 144 119 144 H72 C67 144 63 141 63 136 V67 C63 62 67 58 72 58 Z" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="2.5" />
      <path d="M115 58 L128 71 H119 C116.7 71 115 69.3 115 67 V58 Z" fill="#CBD5E1" />
      
      {/* Document Lines */}
      <rect x="74" y="74" width="28" height="4.5" rx="2.25" fill="#10B981" />
      <rect x="74" y="86" width="42" height="3.5" rx="1.75" fill="#A7F3D0" />
      <rect x="74" y="96" width="38" height="3.5" rx="1.75" fill="#A7F3D0" />
      <rect x="74" y="106" width="44" height="3.5" rx="1.75" fill="#A7F3D0" />
      <rect x="74" y="116" width="32" height="3.5" rx="1.75" fill="#A7F3D0" />
    </g>
    <defs>
      <filter id="shadow-green" x="0" y="0" width="220" height="200" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#16A34A" floodOpacity="0.16" />
      </filter>
    </defs>
  </svg>
)

const KnowledgeBaseIllustration = () => (
  <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="dm-card-graphic">
    <g filter="url(#shadow-purple)">
      {/* 3D Oval Pedestal Base Stage */}
      <ellipse cx="120" cy="160" rx="75" ry="22" fill="#F3E8FF" opacity="0.9" />
      <path d="M45 160 C45 175 195 175 195 160 V168 C195 183 45 183 45 168 Z" fill="#E9D5FF" />
      <ellipse cx="120" cy="157" rx="70" ry="18" fill="#FAF5FF" />

      {/* Stacked Book Volumes */}
      <rect x="135" y="44" width="56" height="86" rx="10" fill="#A855F7" transform="rotate(10 135 44)" />
      <rect x="118" y="50" width="56" height="86" rx="10" fill="#C084FC" transform="rotate(5 118 50)" />
      
      {/* Front 3D Purple Book */}
      <rect x="75" y="58" width="64" height="90" rx="12" fill="url(#purple-book-cover)" stroke="#F3E8FF" strokeWidth="2.5" />
      <rect x="75" y="58" width="10" height="90" rx="4" fill="#6B21A8" />
      <path d="M135 62 V144 H139 C141 144 142 142 142 140 V66 C142 64 141 62 139 62 Z" fill="#F1F5F9" />

      {/* Open Book Emblem */}
      <path d="M92 94 C96 92.5 101 92.5 105 94 V112 C101 110.5 96 110.5 92 112 V94 Z" fill="#FFFFFF" />
      <path d="M118 94 C114 92.5 109 92.5 105 94 V112 C109 110.5 114 110.5 118 112 V94 Z" fill="#FFFFFF" />
    </g>
    <defs>
      <linearGradient id="purple-book-cover" x1="75" y1="58" x2="139" y2="148" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9333EA" />
        <stop offset="1" stopColor="#7E22CE" />
      </linearGradient>
      <filter id="shadow-purple" x="0" y="0" width="220" height="200" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#9333EA" floodOpacity="0.2" />
      </filter>
    </defs>
  </svg>
)

const DataManagerCard = ({ icon: Icon, title, description, theme, onAction, Illustration }) => {
  return (
    <div
      className={`dm-card dm-card--${theme}`}
      onClick={onAction}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onAction()}
    >
      <div className="dm-card-left">
        <div>
          <div className="dm-card-badge">
            <Icon />
          </div>
          <h3 className="dm-card-title">{title}</h3>
          <p className="dm-card-description">{description}</p>
        </div>
        <div className="dm-card-action-btn">
          <FaArrowRight />
        </div>
      </div>
      <div className="dm-card-illustration">
        <div className="dm-card-arc" />
        <Illustration />
      </div>
    </div>
  )
}

const DataManagerPage = () => {
  const navigate = useNavigate()

  return (
    <div className="dm-page">
      <div className="dm-header">
        <div className="dm-eyebrow">DATA MANAGEMENT</div>
        <h1 className="dm-title">
          Data <span className="dm-title-highlight">Manager</span>
        </h1>
        <p className="dm-subtitle">
          Manage bulk uploads, media, documents, and knowledge base — all in one place.
        </p>
      </div>

      <div className="dm-container">
        <div className="dm-cards-grid">
          <DataManagerCard
            icon={FaTag}
            title="Bulk Upload"
            description="This action allows to bulk upload contexts."
            theme="orange"
            onAction={() => navigate('/admin/bulk-uploads')}
            Illustration={BulkUploadIllustration}
          />

          <DataManagerCard
            icon={FaImage}
            title="Image Gallery"
            description="This action allows to add images to system image gallery."
            theme="blue"
            onAction={() => navigate('/admin/data-manager/image-gallery')}
            Illustration={ImageGalleryIllustration}
          />

          <DataManagerCard
            icon={FaDatabase}
            title="Document Base"
            description="This action allows to add documents & shows the bulk uploaded docs."
            theme="green"
            onAction={() => navigate('/admin/data-manager/document-base')}
            Illustration={DocumentBaseIllustration}
          />

          <DataManagerCard
            icon={FaBookOpen}
            title="Knowledge Base"
            description="This action allows to add & view Knowledge Base."
            theme="purple"
            onAction={() => navigate('/admin/data-manager/knowledge-base')}
            Illustration={KnowledgeBaseIllustration}
          />
        </div>
      </div>
    </div>
  )
}

export default DataManagerPage
