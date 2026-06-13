import type { BotId, OrderId, TimestampMs } from "./primitives";

export enum CustomerType {
  Normal = "NORMAL",
  Vip = "VIP"
}

export enum OrderStatus {
  Pending = "PENDING",
  Processing = "PROCESSING",
  Complete = "COMPLETE"
}

export type PendingOrder = {
  id: OrderId;
  customerType: CustomerType;
  status: OrderStatus.Pending;
  createdAt: TimestampMs;
};

export type ProcessingOrder = {
  id: OrderId;
  customerType: CustomerType;
  status: OrderStatus.Processing;
  createdAt: TimestampMs;
  pickedUpAt: TimestampMs;
  completesAt: TimestampMs;
  botId: BotId;
};

export type CompleteOrder = {
  id: OrderId;
  customerType: CustomerType;
  status: OrderStatus.Complete;
  createdAt: TimestampMs;
  pickedUpAt: TimestampMs;
  completedAt: TimestampMs;
  botId: BotId;
};

export type Order = PendingOrder | ProcessingOrder | CompleteOrder;

export type OrderByStatus<TStatus extends OrderStatus> = Extract<
  Order,
  { status: TStatus }
>;

export type OrdersByStatus = {
  [OrderStatus.Pending]: PendingOrder[];
  [OrderStatus.Processing]: ProcessingOrder[];
  [OrderStatus.Complete]: CompleteOrder[];
};

export type NewOrderInput = {
  customerType: CustomerType;
  createdAt: TimestampMs;
};

export type OrderQueue = PendingOrder[];

export type CustomerPriority = CustomerType.Vip | CustomerType.Normal;

export function enqueuePendingOrder(
  queue: OrderQueue,
  order: PendingOrder
): OrderQueue {
  if (order.customerType === CustomerType.Normal) {
    return [...queue, order];
  }

  const nextNormalOrderIndex = queue.findIndex(
    (queuedOrder) => queuedOrder.customerType === CustomerType.Normal
  );

  if (nextNormalOrderIndex === -1) {
    return [...queue, order];
  }

  return [
    ...queue.slice(0, nextNormalOrderIndex),
    order,
    ...queue.slice(nextNormalOrderIndex)
  ];
}
