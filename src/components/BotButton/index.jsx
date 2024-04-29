import React from 'react'
import './index.css'

const BotButton = (props) => {
  const { type, handler } = props;

  return (
    <div className='action' onClick={handler}>
      {type} Bot
    </div>
  )
}

export default BotButton