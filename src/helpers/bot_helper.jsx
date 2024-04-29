export function createNewBot(botHandler) {
  // Function to track for latest order list, set to every 100ms
  const trackOrderList = () => {
    var updatedPendingOrders = JSON.parse(window.sessionStorage.getItem('pending_orders')) || [];

    // Only pickup and process order when bot is idle
    if (updatedPendingOrders.length > 0 && bot.status === 'Idle') {
      // Bot always picking up the first order
      const firstOrder = updatedPendingOrders[0];

      bot.status = 'Busy';
      bot.processing = firstOrder;

      // Remove the first order from pending order list
      updatedPendingOrders = updatedPendingOrders.slice(1);

      // Update it back to the sessionStorage
      window.sessionStorage.setItem('pending_orders', JSON.stringify(updatedPendingOrders));
      window.dispatchEvent(new Event('storage'));

      // Each order required 10 seconds to complete process
      const timeoutId = setTimeout(() => {
        // Store the processed order in completed order list in sessionStorage
        var completedOrders = JSON.parse(window.sessionStorage.getItem('completed_orders')) || [];
        completedOrders.push(bot.processing);

        window.sessionStorage.setItem('completed_orders', JSON.stringify(completedOrders));
        window.dispatchEvent(new Event('storage'));
  
        // Reset bot to idle
        bot.status = 'Idle';
        bot.processing = {};
        
        // Update bot state back to idle
        botHandler(prevBots => {
          const index = prevBots.findIndex(b => b.id === bot.id);
          
          if (index !== -1) {
            prevBots[index] = bot;
          }

          return [...prevBots];
        });
      }, 10000);

      // Update bot state with timeoutId for destroy purpose
      bot.timeoutId = timeoutId;

      botHandler(prevBots => {
        const index = prevBots.findIndex(b => b.id === bot.id);
          
        if (index !== -1) {
          prevBots[index] = bot;
        }

        return [...prevBots];
      });
    }
  };

  const botId = parseInt(window.sessionStorage.getItem('bot_id'));

  const bot = {
    id: botId,
    status: 'Idle',
    processing: {},
    intervalId: setInterval(trackOrderList, 100),
    timeoutId: null,
  };
  
  botHandler(prevBots => {
    return [...prevBots, bot];
  })

  window.sessionStorage.setItem('bot_id', JSON.stringify(botId + 1));
}

// Always destroy the newest bot
export function deleteNewestBot(bots, botHandler) {
  if (bots.length > 0) {
    const lastBot = bots[bots.length - 1];
  
    // Clear the bot's tracking interval and processing timeout
    clearInterval(lastBot.intervalId);
    clearTimeout(lastBot.timeoutId);

    // If there's processing order, add it back to the beginning of the pending orders
    const processingOrder = lastBot.processing;
    
    if (Object.keys(processingOrder).length > 0) {
      var updatedPendingOrders = JSON.parse(window.sessionStorage.getItem('pending_orders')) || [];
      updatedPendingOrders = [processingOrder, ...updatedPendingOrders];
  
      window.sessionStorage.setItem('pending_orders', JSON.stringify(updatedPendingOrders));
      window.dispatchEvent(new Event('storage'));
    }

    botHandler(prevBots => prevBots.slice(0, prevBots.length - 1));
  }
}