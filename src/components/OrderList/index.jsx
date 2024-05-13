import React from 'react'
import './index.css'

const OrderList = (props) => {
  const { type, orders } = props;
  
  return (
    <div className='order-list'>
      <h2>
        {type}
      </h2>

      <div className='orders'>
        {
          orders.map(({ id, type, level }) => (
            <span key={`order-${id}`}>
              {id} ({type} {level})
            </span>
          ))
        }
      </div>
    </div>
  )
}

export default OrderList