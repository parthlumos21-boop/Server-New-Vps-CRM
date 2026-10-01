import React, { useMemo, useState } from 'react'
import { FaArrowLeft, FaChevronRight, FaSearch } from 'react-icons/fa'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { SUPPORT_CENTRAL_CATEGORIES, getSupportCategory } from './supportCentralContent'
import './SupportCentralPage.css'

const SupportCentralPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { categoryKey } = useParams()
  const [searchTerm, setSearchTerm] = useState('')

  const isAdminRoute = location.pathname.startsWith('/admin')
  const basePath = isAdminRoute ? '/admin/support-requests' : '/support-requests'
  const activeCategory = categoryKey ? getSupportCategory(categoryKey) : null

  const filteredArticles = useMemo(() => {
    if (!activeCategory) {
      return []
    }

    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return activeCategory.articles
    }

    return activeCategory.articles.filter((article) => (
      article.title.toLowerCase().includes(query)
      || article.summary.toLowerCase().includes(query)
      || article.body.toLowerCase().includes(query)
    ))
  }, [activeCategory, searchTerm])

  const handleBack = () => {
    if (activeCategory) {
      navigate(`${basePath}/help`)
      return
    }

    navigate(`${basePath}/list`)
  }

  return (
    <div className="support-central-page">
      <div className="support-central-shell">
        <div className="support-central-header">
          <button type="button" className="support-central-back" onClick={handleBack}>
            <FaArrowLeft />
            <span>{activeCategory ? 'Back to Support Central' : 'Back to Support Requests'}</span>
          </button>

          <div className="support-central-title-group">
            <h1>{activeCategory ? activeCategory.title : 'Support Central'}</h1>
            <p>
              {activeCategory
                ? 'Browse support articles and guidance for this module.'
                : 'Choose a module to open its support articles and quick help guidance.'}
            </p>
          </div>
        </div>

        {activeCategory ? (
          <section className="support-central-article-panel">
            <div className="support-central-article-toolbar">
              <div className="support-central-search">
                <FaSearch className="support-central-search-icon" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={`Search ${activeCategory.title} articles`}
                />
              </div>

              <span className="support-central-article-count">
                {filteredArticles.length} article{filteredArticles.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="support-central-article-list">
              {filteredArticles.length > 0 ? filteredArticles.map((article, index) => (
                <article key={`${activeCategory.key}-${article.title}`} className="support-central-article-card">
                  <div className="support-central-article-index">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="support-central-article-copy">
                    <h2>{article.title}</h2>
                    <p className="support-central-article-summary">{article.summary}</p>
                    <p className="support-central-article-body">{article.body}</p>
                  </div>
                </article>
              )) : (
                <div className="support-central-empty-state">
                  No support articles match your search.
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="support-central-grid" aria-label="Support categories">
            {SUPPORT_CENTRAL_CATEGORIES.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.key}
                  type="button"
                  className="support-central-card"
                  onClick={() => navigate(`${basePath}/help/${category.key}`)}
                >
                  <span
                    className="support-central-card-icon"
                    style={{ '--support-accent': category.color }}
                  >
                    <Icon />
                  </span>
                  <strong>{category.title}</strong>
                  <span className="support-central-card-meta">
                    {category.articles.length} article{category.articles.length === 1 ? '' : 's'}
                  </span>
                  <span className="support-central-card-arrow" aria-hidden="true">
                    <FaChevronRight />
                  </span>
                </button>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}

export default SupportCentralPage
