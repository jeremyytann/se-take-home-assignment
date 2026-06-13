import { BotStatus, type BotsByStatus, type ProcessingBot } from "./bot";
import {
  OrderStatus,
  type OrdersByStatus,
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
