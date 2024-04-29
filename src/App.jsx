import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { createNewOrder } from './helpers/order_helper';
import OrderList from './components/OrderList';
import OrderButton from './components/OrderButton';
import BotButton from './components/BotButton';
import { createNewBot, deleteNewestBot } from './helpers/bot_helper';
import BotList from './components/BotList';

function App() {
  // Bots
  const [bots, setBots] = useState([]);

  // Orders
  const [pendingOrders, setPendingOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  
  // Listen to storage event and update orders to states
  const handleStorageChange = useCallback(() => {
    const updatedPendingOrders = JSON.parse(window.sessionStorage.getItem('pending_orders')) || [];
    const updatedCompletedOrders = JSON.parse(window.sessionStorage.getItem('completed_orders')) || [];

    setPendingOrders(updatedPendingOrders);
    setCompletedOrders(updatedCompletedOrders);
  }, []);

  useEffect(() => {
    const initializeData = () => {
      window.sessionStorage.setItem('bot_id', JSON.stringify(1));
      window.sessionStorage.setItem('order_id', JSON.stringify(1));
      window.sessionStorage.setItem('pending_orders', JSON.stringify([]));
      window.sessionStorage.setItem('completed_orders', JSON.stringify([]));
    }

    initializeData();

    // Add event listener for storage
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const processCreateOrder = (type) => {
    createNewOrder(type);
  }

  const processCreateBot = () => {
    createNewBot(setBots);
  }

  const processDeleteBot = () => {
    deleteNewestBot(bots, setBots);
  }

  return (
    <div className='app'>
      <h2>
        McDonald's Order List
      </h2>

      <div className='section'>
        <OrderButton type='Normal' handler={() => processCreateOrder('Normal')} />
        <OrderButton type='VIP' handler={() => processCreateOrder('VIP')} />

        <BotButton type='+' handler={() => processCreateBot()} />
        <BotButton type='-' handler={() => processDeleteBot()} />
      </div>

      <div className='section'>
        <OrderList type='PENDING' orders={pendingOrders} />
        <OrderList type='COMPLETE' orders={completedOrders} />
      </div>

      {
        bots.length > 0 && (
          <div>
            <h2>
              McDonald's Bot List
            </h2>

            <div className='section'>
              <BotList bots={bots} />
            </div>
          </div>
        )
      }
    </div>
  )
}

export default App
