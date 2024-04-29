// Always add normal orders at the end
const createNormalOrder = (prevOrders, newOrder) => [...prevOrders, newOrder];

// Add VIP order before all normal orders, but after all VIP orders
const createVIPOrder = (prevOrders, newOrder) => {
  const normalIndex = prevOrders.findIndex(item => item.type === 'Normal');
  const vipIndex = prevOrders.findIndex(item => item.type === 'VIP');

  // If normal order found, add in front of it
  if (normalIndex !== -1) {
    return [
      ...prevOrders.slice(0, normalIndex),
      newOrder,
      ...prevOrders.slice(normalIndex),
    ];
  }

  // If no existing normal order, but VIP order found, add VIP order at the end
  if (vipIndex !== -1) {
    return [...prevOrders, newOrder];
  }

  // If no existing VIP order, add order at the beginning
  return [newOrder, ...prevOrders];
};

export function createNewOrder(type) {
  const orderId = parseInt(window.sessionStorage.getItem('order_id'));
  var pendingOrders = JSON.parse(window.sessionStorage.getItem('pending_orders')) || [];

  const order = {
    id: orderId,
    type: type,
  };

  var newPendingOrders;

  if (type === 'Normal') {
    newPendingOrders = createNormalOrder(pendingOrders, order);
  } else if (type === 'VIP') {
    newPendingOrders = createVIPOrder(pendingOrders, order);
  }

  // Store the updated orders back to sessionStorage
  window.sessionStorage.setItem('pending_orders', JSON.stringify(newPendingOrders));
  window.sessionStorage.setItem('order_id', JSON.stringify(orderId + 1));
  window.dispatchEvent(new Event('storage'));
}