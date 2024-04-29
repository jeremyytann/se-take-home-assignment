import React from 'react'
import './index.css'

const BotList = (props) => {
  const { bots } = props;
  
  return (
    <div className='bot-list'>
      {
        bots.map(({ id, status, processing }) => (
          <div key={`bot-${id}`} className='bot'>
            <span>ID: { id }</span>
            <span>Status: { status }</span>
            <span>Processing order: { processing.id && `${processing.id} (${processing.type})` || '-' }</span>
          </div>
        ))
      }
    </div>
  )
}

export default BotList