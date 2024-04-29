import React from 'react'
import './index.css'

const OrderButton = (props) => {
  const { type, handler } = props;

  return (
    <div className='action' onClick={handler}>
      New {type} Order
    </div>
  )
}

export default OrderButton