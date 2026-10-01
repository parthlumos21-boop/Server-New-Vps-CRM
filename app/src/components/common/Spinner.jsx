import React from 'react'
import './Spinner.css'

const Spinner = ({ 
  size = 'medium',
  color = 'primary',
  fullScreen = false,
  text = ''
}) => {
  if (fullScreen) {
    return (
      <div className="spinner-fullscreen">
        <div className={`spinner spinner-${size} spinner-${color}`}></div>
        {text && <p className="spinner-text">{text}</p>}
      </div>
    )
  }

  return (
    <div className="spinner-container">
      <div className={`spinner spinner-${size} spinner-${color}`}></div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  )
}

export default Spinner
