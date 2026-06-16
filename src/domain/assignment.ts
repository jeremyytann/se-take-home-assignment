import {
  BotStatus,
  type BotsByStatus,
  type IdleBot,
  type ProcessingBot
} from "./bot";
import {
  OrderStatus,
  requeueInterruptedOrder,
  type CompleteOrder,
  type OrdersByStatus,
  type PendingOrder,
  type ProcessingOrder
} from "./order";
import type { TimestampMs } from "./primitives";

export const ORDER_PROCESSING_TIME_MS = 10_000;

export type AssignPendingOrdersInput = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
  pickedUpAt: TimestampMs;
};

export type AssignPendingOrdersResult = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
};

export type CompleteProcessingOrdersInput = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
  completedAt: TimestampMs;
};

export type CompleteProcessingOrdersResult = AssignPendingOrdersResult;

export type RemoveNewestBotInput = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
};

export type RemoveNewestBotResult = AssignPendingOrdersResult;

export function assignPendingOrdersToIdleBots({
  bots,
  orders,
  pickedUpAt
}: AssignPendingOrdersInput): AssignPendingOrdersResult {
  const assignmentCount = Math.min(
    bots[BotStatus.Idle].length,
    orders[OrderStatus.Pending].length
  );

  if (assignmentCount === 0) {
    return { bots, orders };
  }

  const assignedBots = bots[BotStatus.Idle].slice(0, assignmentCount);
  const assignedOrders = orders[OrderStatus.Pending].slice(0, assignmentCount);

  const processingBots: ProcessingBot[] = assignedBots.map((bot, index) => ({
    ...bot,
    status: BotStatus.Processing,
    orderId: assignedOrders[index].id,
    pickedUpAt,
    completesAt: pickedUpAt + assignedOrders[index].processingTimeMs
  }));

  const processingOrders: ProcessingOrder[] = assignedOrders.map(
    (order, index) => ({
      ...order,
      status: OrderStatus.Processing,
      pickedUpAt,
      completesAt: pickedUpAt + order.processingTimeMs,
      botId: assignedBots[index].id
    })
  );

  return {
    bots: {
      [BotStatus.Idle]: bots[BotStatus.Idle].slice(assignmentCount),
      [BotStatus.Processing]: [...bots[BotStatus.Processing], ...processingBots]
    },
    orders: {
      [OrderStatus.Pending]: orders[OrderStatus.Pending].slice(assignmentCount),
      [OrderStatus.Processing]: [
        ...orders[OrderStatus.Processing],
        ...processingOrders
      ],
      [OrderStatus.Complete]: orders[OrderStatus.Complete]
    }
  };
}

export function completeProcessingOrders({
  bots,
  orders,
  completedAt
}: CompleteProcessingOrdersInput): CompleteProcessingOrdersResult {
  const completedOrders = orders[OrderStatus.Processing].filter(
    (order) => order.completesAt <= completedAt
  );

  if (completedOrders.length === 0) {
    return assignPendingOrdersToIdleBots({
      bots,
      orders,
      pickedUpAt: completedAt
    });
  }

  const completedOrderIds = new Set(completedOrders.map((order) => order.id));

  const idleBots: IdleBot[] = bots[BotStatus.Processing]
    .filter((bot) => completedOrderIds.has(bot.orderId))
    .map((bot) => ({
      id: bot.id,
      status: BotStatus.Idle,
      createdAt: bot.createdAt
    }));

  const nextOrders: OrdersByStatus = {
    [OrderStatus.Pending]: orders[OrderStatus.Pending],
    [OrderStatus.Processing]: orders[OrderStatus.Processing].filter(
      (order) => !completedOrderIds.has(order.id)
    ),
    [OrderStatus.Complete]: [
      ...orders[OrderStatus.Complete],
      ...completedOrders.map<CompleteOrder>((order) => ({
        id: order.id,
        customerType: order.customerType,
        status: OrderStatus.Complete,
        createdAt: order.createdAt,
        processingTimeMs: order.processingTimeMs,
        pickedUpAt: order.pickedUpAt,
        completedAt,
        botId: order.botId
      }))
    ]
  };

  return assignPendingOrdersToIdleBots({
    bots: {
      [BotStatus.Idle]: [...bots[BotStatus.Idle], ...idleBots],
      [BotStatus.Processing]: bots[BotStatus.Processing].filter(
        (bot) => !completedOrderIds.has(bot.orderId)
      )
    },
    orders: nextOrders,
    pickedUpAt: completedAt
  });
}

export function removeNewestBot({
  bots,
  orders
}: RemoveNewestBotInput): RemoveNewestBotResult {
  const newestBot = [
    ...bots[BotStatus.Idle],
    ...bots[BotStatus.Processing]
  ].reduce<IdleBot | ProcessingBot | undefined>((newest, bot) => {
    if (!newest) {
      return bot;
    }

    if (bot.createdAt > newest.createdAt) {
      return bot;
    }

    if (bot.createdAt === newest.createdAt && bot.id > newest.id) {
      return bot;
    }

    return newest;
  }, undefined);

  if (!newestBot) {
    return { bots, orders };
  }

  if (newestBot.status === BotStatus.Idle) {
    return {
      bots: {
        [BotStatus.Idle]: bots[BotStatus.Idle].filter(
          (bot) => bot.id !== newestBot.id
        ),
        [BotStatus.Processing]: bots[BotStatus.Processing]
      },
      orders
    };
  }

  const interruptedOrder = orders[OrderStatus.Processing].find(
    (order) => order.id === newestBot.orderId
  );

  const nextProcessingOrders = orders[OrderStatus.Processing].filter(
    (order) => order.id !== newestBot.orderId
  );

  const nextPendingOrders = interruptedOrder
    ? requeueInterruptedOrder(orders[OrderStatus.Pending], {
        id: interruptedOrder.id,
        customerType: interruptedOrder.customerType,
        status: OrderStatus.Pending,
        createdAt: interruptedOrder.createdAt,
        processingTimeMs: interruptedOrder.processingTimeMs
      } satisfies PendingOrder)
    : orders[OrderStatus.Pending];

  return {
    bots: {
      [BotStatus.Idle]: bots[BotStatus.Idle],
      [BotStatus.Processing]: bots[BotStatus.Processing].filter(
        (bot) => bot.id !== newestBot.id
      )
    },
    orders: {
      [OrderStatus.Pending]: nextPendingOrders,
      [OrderStatus.Processing]: nextProcessingOrders,
      [OrderStatus.Complete]: orders[OrderStatus.Complete]
    }
  };
}
