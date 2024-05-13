export function createNewOrder(type, level) {
  const orderId = parseInt(window.sessionStorage.getItem('order_id'));
  var pendingOrders = JSON.parse(window.sessionStorage.getItem('pending_orders')) || [];

  const order = {
    id: orderId,
    type: type,
    level: level,
  };

  const newPendingOrders = [...pendingOrders, order].sort((a, b) => b.level - a.level);;

  // Store the updated orders back to sessionStorage
  window.sessionStorage.setItem('pending_orders', JSON.stringify(newPendingOrders));
  window.sessionStorage.setItem('order_id', JSON.stringify(orderId + 1));
  window.dispatchEvent(new Event('storage'));
}