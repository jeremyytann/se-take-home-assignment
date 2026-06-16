import {
  BotStatus,
  type Bot,
  type BotsByStatus,
  type IdleBot,
  type PausedBot,
  type PausedProcessingBot,
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
  processingTimeMs?: TimestampMs;
};

export type AssignPendingOrdersResult = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
};

export type CompleteProcessingOrdersInput = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
  completedAt: TimestampMs;
  processingTimeMs?: TimestampMs;
};

export type CompleteProcessingOrdersResult = AssignPendingOrdersResult;

export type RemoveNewestBotInput = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
};

export type RemoveNewestBotResult = AssignPendingOrdersResult;

export type PauseBotInput = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
  botId: number;
  pausedAt: TimestampMs;
};

export type PauseBotResult = AssignPendingOrdersResult;

export type ResumeBotInput = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
  botId: number;
  resumedAt: TimestampMs;
  processingTimeMs?: TimestampMs;
};

export type ResumeBotResult = AssignPendingOrdersResult;

export function assignPendingOrdersToIdleBots({
  bots,
  orders,
  pickedUpAt,
  processingTimeMs = ORDER_PROCESSING_TIME_MS
}: AssignPendingOrdersInput): AssignPendingOrdersResult {
  const assignmentCount = Math.min(
    bots[BotStatus.Idle].length,
    orders[OrderStatus.Pending].length
  );

  if (assignmentCount === 0) {
    return { bots, orders };
  }

  const completesAt = pickedUpAt + processingTimeMs;
  const assignedBots = bots[BotStatus.Idle].slice(0, assignmentCount);
  const assignedOrders = orders[OrderStatus.Pending].slice(0, assignmentCount);

  const processingBots: ProcessingBot[] = assignedBots.map((bot, index) => ({
    ...bot,
    status: BotStatus.Processing,
    orderId: assignedOrders[index].id,
    pickedUpAt,
    completesAt
  }));

  const processingOrders: ProcessingOrder[] = assignedOrders.map(
    (order, index) => ({
      ...order,
      status: OrderStatus.Processing,
      pickedUpAt,
      completesAt,
      botId: assignedBots[index].id
    })
  );

  return {
    bots: {
      [BotStatus.Idle]: bots[BotStatus.Idle].slice(assignmentCount),
      [BotStatus.Processing]: [
        ...bots[BotStatus.Processing],
        ...processingBots
      ],
      [BotStatus.Paused]: bots[BotStatus.Paused]
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
  completedAt,
  processingTimeMs
}: CompleteProcessingOrdersInput): CompleteProcessingOrdersResult {
  const activeProcessingOrderIds = new Set(
    bots[BotStatus.Processing].map((bot) => bot.orderId)
  );
  const completedOrders = orders[OrderStatus.Processing].filter(
    (order) =>
      activeProcessingOrderIds.has(order.id) && order.completesAt <= completedAt
  );

  if (completedOrders.length === 0) {
    return assignPendingOrdersToIdleBots({
      bots,
      orders,
      pickedUpAt: completedAt,
      processingTimeMs
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
      ),
      [BotStatus.Paused]: bots[BotStatus.Paused]
    },
    orders: nextOrders,
    pickedUpAt: completedAt,
    processingTimeMs
  });
}

export function removeNewestBot({
  bots,
  orders
}: RemoveNewestBotInput): RemoveNewestBotResult {
  const newestBot = [
    ...bots[BotStatus.Idle],
    ...bots[BotStatus.Processing],
    ...bots[BotStatus.Paused]
  ].reduce<Bot | undefined>((newest, bot) => {
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
        [BotStatus.Processing]: bots[BotStatus.Processing],
        [BotStatus.Paused]: bots[BotStatus.Paused]
      },
      orders
    };
  }

  if (
    newestBot.status === BotStatus.Paused &&
    !isPausedProcessingBot(newestBot)
  ) {
    return {
      bots: {
        [BotStatus.Idle]: bots[BotStatus.Idle],
        [BotStatus.Processing]: bots[BotStatus.Processing],
        [BotStatus.Paused]: bots[BotStatus.Paused].filter(
          (bot) => bot.id !== newestBot.id
        )
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
        createdAt: interruptedOrder.createdAt
      } satisfies PendingOrder)
    : orders[OrderStatus.Pending];

  return {
    bots: {
      [BotStatus.Idle]: bots[BotStatus.Idle],
      [BotStatus.Processing]: bots[BotStatus.Processing].filter(
        (bot) => bot.id !== newestBot.id
      ),
      [BotStatus.Paused]: bots[BotStatus.Paused].filter(
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

export function pauseBot({
  bots,
  orders,
  botId,
  pausedAt
}: PauseBotInput): PauseBotResult {
  const idleBot = bots[BotStatus.Idle].find((bot) => bot.id === botId);

  if (idleBot) {
    return {
      bots: {
        [BotStatus.Idle]: bots[BotStatus.Idle].filter(
          (bot) => bot.id !== botId
        ),
        [BotStatus.Processing]: bots[BotStatus.Processing],
        [BotStatus.Paused]: [
          ...bots[BotStatus.Paused],
          {
            id: idleBot.id,
            status: BotStatus.Paused,
            createdAt: idleBot.createdAt,
            pausedAt
          }
        ]
      },
      orders
    };
  }

  const processingBot = bots[BotStatus.Processing].find(
    (bot) => bot.id === botId
  );

  if (!processingBot) {
    return { bots, orders };
  }

  const elapsedMs = Math.max(0, pausedAt - processingBot.pickedUpAt);
  const remainingMs = Math.max(0, processingBot.completesAt - pausedAt);

  return {
    bots: {
      [BotStatus.Idle]: bots[BotStatus.Idle],
      [BotStatus.Processing]: bots[BotStatus.Processing].filter(
        (bot) => bot.id !== botId
      ),
      [BotStatus.Paused]: [
        ...bots[BotStatus.Paused],
        {
          id: processingBot.id,
          status: BotStatus.Paused,
          createdAt: processingBot.createdAt,
          orderId: processingBot.orderId,
          pickedUpAt: processingBot.pickedUpAt,
          completesAt: processingBot.completesAt,
          pausedAt,
          elapsedMs,
          remainingMs
        }
      ]
    },
    orders
  };
}

export function resumeBot({
  bots,
  orders,
  botId,
  resumedAt,
  processingTimeMs
}: ResumeBotInput): ResumeBotResult {
  const pausedBot = bots[BotStatus.Paused].find((bot) => bot.id === botId);

  if (!pausedBot) {
    return { bots, orders };
  }

  const nextPausedBots = bots[BotStatus.Paused].filter(
    (bot) => bot.id !== botId
  );

  if (!isPausedProcessingBot(pausedBot)) {
    return assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [
          ...bots[BotStatus.Idle],
          {
            id: pausedBot.id,
            status: BotStatus.Idle,
            createdAt: pausedBot.createdAt
          }
        ],
        [BotStatus.Processing]: bots[BotStatus.Processing],
        [BotStatus.Paused]: nextPausedBots
      },
      orders,
      pickedUpAt: resumedAt,
      processingTimeMs
    });
  }

  const pickedUpAt = resumedAt - pausedBot.elapsedMs;
  const completesAt = resumedAt + pausedBot.remainingMs;
  const resumedBot: ProcessingBot = {
    id: pausedBot.id,
    status: BotStatus.Processing,
    createdAt: pausedBot.createdAt,
    orderId: pausedBot.orderId,
    pickedUpAt,
    completesAt
  };
  const nextOrders: OrdersByStatus = {
    [OrderStatus.Pending]: orders[OrderStatus.Pending],
    [OrderStatus.Processing]: orders[OrderStatus.Processing].map((order) =>
      order.id === pausedBot.orderId
        ? {
            ...order,
            pickedUpAt,
            completesAt
          }
        : order
    ),
    [OrderStatus.Complete]: orders[OrderStatus.Complete]
  };

  return {
    bots: {
      [BotStatus.Idle]: bots[BotStatus.Idle],
      [BotStatus.Processing]: [...bots[BotStatus.Processing], resumedBot],
      [BotStatus.Paused]: nextPausedBots
    },
    orders: nextOrders
  };
}

function isPausedProcessingBot(bot: PausedBot): bot is PausedProcessingBot {
  return "orderId" in bot;
}
