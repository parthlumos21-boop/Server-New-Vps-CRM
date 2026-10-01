import React, { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCheck,
  FaTimes,
  FaUndo,
  FaRedo,
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaListOl,
  FaListUl,
  FaIndent,
  FaOutdent,
  FaLink,
  FaImage,
  FaTable,
  FaCode,
  FaExpand,
  FaInfoCircle,
  FaTag,
} from 'react-icons/fa'
import './AddKnowledgeBasePage.css'

/* ── Toolbar button ─────────────────────────────────────── */
const ToolBtn = ({ icon: Icon, title, onClick, active }) => (
  <button
    type="button"
    title={title}
    className={`akb-tool-btn${active ? ' akb-tool-btn--active' : ''}`}
    onMouseDown={(e) => { e.preventDefault(); onClick() }}
  >
    <Icon />
  </button>
)

/* ── Toolbar separator ──────────────────────────────────── */
const Sep = () => <span className="akb-tool-sep" />

/* ── Rich text editor ───────────────────────────────────── */
const RichEditor = ({ editorRef }) => {
  const [fullscreen, setFullscreen] = useState(false)

  const exec = useCallback((cmd, value = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }, [editorRef])

  const insertTable = () => {
    const html = '<table border="1" style="border-collapse:collapse;width:100%"><tr><td style="padding:4px 8px">&nbsp;</td><td style="padding:4px 8px">&nbsp;</td><td style="padding:4px 8px">&nbsp;</td></tr><tr><td style="padding:4px 8px">&nbsp;</td><td style="padding:4px 8px">&nbsp;</td><td style="padding:4px 8px">&nbsp;</td></tr></table><p></p>'
    exec('insertHTML', html)
  }

  const insertLink = () => {
    const url = window.prompt('Enter URL:', 'https://')
    if (url) exec('createLink', url)
  }

  const insertImage = () => {
    const url = window.prompt('Enter image URL:', 'https://')
    if (url) exec('insertImage', url)
  }

  const MENU_ITEMS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Table', 'Help']

  const FONT_SIZES = ['8pt','10pt','11pt','12pt','14pt','16pt','18pt','24pt','36pt']
  const FONT_FAMILIES = ['System Font','Arial','Georgia','Courier New','Times New Roman','Verdana']
  const PARA_STYLES = ['Paragraph','Heading 1','Heading 2','Heading 3','Heading 4','Preformatted']
  const PARA_TAGS   = ['p','h1','h2','h3','h4','pre']

  return (
    <div className={`akb-editor-wrap${fullscreen ? ' akb-editor-wrap--fullscreen' : ''}`}>
      {/* ── Menu bar ── */}
      <div className="akb-menu-bar">
        {MENU_ITEMS.map((item) => (
          <button key={item} type="button" className="akb-menu-item">{item}</button>
        ))}
      </div>

      {/* ── Toolbar row 1 ── */}
      <div className="akb-toolbar">
        <ToolBtn icon={FaUndo}          title="Undo"         onClick={() => exec('undo')} />
        <ToolBtn icon={FaRedo}          title="Redo"         onClick={() => exec('redo')} />
        <Sep />

        <select
          className="akb-tool-select akb-tool-select--para"
          title="Paragraph style"
          onChange={(e) => {
            const tag = PARA_TAGS[e.target.selectedIndex]
            exec('formatBlock', tag)
          }}
        >
          {PARA_STYLES.map((s) => <option key={s}>{s}</option>)}
        </select>

        <select
          className="akb-tool-select akb-tool-select--font"
          title="Font family"
          onChange={(e) => exec('fontName', e.target.value)}
        >
          {FONT_FAMILIES.map((f) => <option key={f}>{f}</option>)}
        </select>

        <select
          className="akb-tool-select akb-tool-select--size"
          title="Font size"
          defaultValue="12pt"
          onChange={(e) => exec('fontSize', FONT_SIZES.indexOf(e.target.value) + 1)}
        >
          {FONT_SIZES.map((s) => <option key={s}>{s}</option>)}
        </select>

        <Sep />
        <label className="akb-color-label" title="Text color">
          A
          <input type="color" className="akb-color-input" defaultValue="#000000"
            onChange={(e) => exec('foreColor', e.target.value)} />
        </label>
        <label className="akb-color-label akb-color-label--bg" title="Background color">
          A
          <input type="color" className="akb-color-input" defaultValue="#ffff00"
            onChange={(e) => exec('hiliteColor', e.target.value)} />
        </label>
        <Sep />

        <ToolBtn icon={FaBold}          title="Bold"         onClick={() => exec('bold')} />
        <ToolBtn icon={FaItalic}        title="Italic"       onClick={() => exec('italic')} />
        <ToolBtn icon={FaUnderline}     title="Underline"    onClick={() => exec('underline')} />
        <ToolBtn icon={FaStrikethrough} title="Strikethrough" onClick={() => exec('strikeThrough')} />
        <Sep />

        <ToolBtn icon={FaAlignLeft}     title="Align left"   onClick={() => exec('justifyLeft')} />
        <ToolBtn icon={FaAlignCenter}   title="Align center" onClick={() => exec('justifyCenter')} />
        <ToolBtn icon={FaAlignRight}    title="Align right"  onClick={() => exec('justifyRight')} />
        <ToolBtn icon={FaAlignJustify}  title="Justify"      onClick={() => exec('justifyFull')} />
        <Sep />

        <ToolBtn icon={FaListOl}        title="Ordered list"   onClick={() => exec('insertOrderedList')} />
        <ToolBtn icon={FaListUl}        title="Unordered list" onClick={() => exec('insertUnorderedList')} />
        <ToolBtn icon={FaIndent}        title="Indent"         onClick={() => exec('indent')} />
        <ToolBtn icon={FaOutdent}       title="Outdent"        onClick={() => exec('outdent')} />
        <Sep />

        <ToolBtn icon={FaLink}          title="Insert link"    onClick={insertLink} />
        <ToolBtn icon={FaImage}         title="Insert image"   onClick={insertImage} />
        <ToolBtn icon={FaTable}         title="Insert table"   onClick={insertTable} />
        <ToolBtn icon={FaCode}          title="Code"           onClick={() => exec('formatBlock', 'pre')} />
        <Sep />

        <ToolBtn icon={FaExpand}        title="Fullscreen"     onClick={() => setFullscreen((v) => !v)} />
      </div>

      {/* ── Content area ── */}
      <div
        ref={editorRef}
        className="akb-editor-content"
        contentEditable
        suppressContentEditableWarning
      />
    </div>
  )
}

/* ── Keywords tag input ─────────────────────────────────── */
const KeywordsInput = ({ keywords, onChange }) => {
  const [inputVal, setInputVal] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputVal.trim()) {
      e.preventDefault()
      const tag = inputVal.trim()
      if (!keywords.includes(tag)) onChange([...keywords, tag])
      setInputVal('')
    }
    if (e.key === 'Backspace' && !inputVal && keywords.length) {
      onChange(keywords.slice(0, -1))
    }
  }

  return (
    <div className="akb-keywords-box">
      {keywords.map((kw) => (
        <span key={kw} className="akb-keyword-tag">
          <FaTag className="akb-keyword-tag-icon" />
          {kw}
          <button
            type="button"
            className="akb-keyword-remove"
            onClick={() => onChange(keywords.filter((k) => k !== kw))}
          >
            <FaTimes />
          </button>
        </span>
      ))}
      <input
        className="akb-keywords-input"
        placeholder={keywords.length ? '' : 'Type and press Enter…'}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────── */
const VISIBLE_OPTIONS = ['All Users', 'Admin Only', 'My Team', 'Only Me']

const AddKnowledgeBasePage = ({ basePath = '/admin/data-manager' }) => {
  const navigate = useNavigate()
  const editorRef = useRef(null)

  const [title,      setTitle]      = useState('')
  const [keywords,   setKeywords]   = useState([])
  const [attachment, setAttachment] = useState(null)
  const [visibleTo,  setVisibleTo]  = useState('All Users')
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5 MB limit.')
      return
    }
    setAttachment(f)
  }

  const handleAdd = () => {
    if (!title.trim()) {
      alert('Please enter a title.')
      return
    }
    navigate(`${basePath}/knowledge-base`)
  }

  return (
    <div className="akb-page">
      {/* ── Top bar ── */}
      <div className="akb-topbar">
        <span className="akb-topbar-title">Add Knowledge Base</span>
        <div className="akb-topbar-actions">
          <button type="button" className="akb-btn akb-btn--green" onClick={handleAdd}>
            <FaCheck className="akb-btn-icon" /> Add
          </button>
          <button type="button" className="akb-btn akb-btn--red" onClick={() => navigate(`${basePath}/knowledge-base`)}>
            <FaTimes className="akb-btn-icon" /> Cancel
          </button>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="akb-form-wrap">
        {/* Title */}
        <div className="akb-row akb-row--title">
          <label className="akb-label" htmlFor="akb-title">Title</label>
          <input
            id="akb-title"
            className="akb-input"
            placeholder="Enter Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Keywords + Attachment row */}
        <div className="akb-row akb-row--two-col">
          <div className="akb-field-group">
            <div className="akb-label-row">
              <label className="akb-label">Keywords</label>
              <FaInfoCircle className="akb-info-icon" title="Keywords help users find this article" />
            </div>
            <KeywordsInput keywords={keywords} onChange={setKeywords} />
            <span className="akb-field-note">
              <FaInfoCircle className="akb-note-icon" />
              Note: Key in text and press Enter key to add new values to the keywords.
            </span>
          </div>

          <div className="akb-field-group">
            <div className="akb-label-row">
              <label className="akb-label">Add Attachment</label>
              <FaInfoCircle className="akb-info-icon" title="Attach a file to this article" />
            </div>
            <div className="akb-attach-row">
              <input
                className="akb-input akb-input--attach"
                readOnly
                value={attachment ? attachment.name : ''}
                placeholder=""
              />
              <button type="button" className="akb-choose-btn" onClick={() => fileRef.current?.click()}>
                Choose file
              </button>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
            </div>
            <span className="akb-field-note">
              <FaInfoCircle className="akb-note-icon" />
              Note: Max file size is 5 MB. Document storage available: 937 MB.
            </span>

            <div className="akb-visible-row">
              <label className="akb-label akb-label--inline">Visible To</label>
              <select
                className="akb-select"
                value={visibleTo}
                onChange={(e) => setVisibleTo(e.target.value)}
              >
                {VISIBLE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Description + Editor */}
        <div className="akb-row akb-row--editor">
          <span className="akb-section-label">Description</span>
          <RichEditor editorRef={editorRef} />
        </div>
      </div>
    </div>
  )
}

export default AddKnowledgeBasePage
