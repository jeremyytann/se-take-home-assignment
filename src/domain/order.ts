import type { BotId, OrderId, TimestampMs } from "./primitives";

export enum CustomerType {
  Normal = "NORMAL",
  Delivery = "DELIVERY",
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

export type CustomerPriority =
  | CustomerType.Vip
  | CustomerType.Delivery
  | CustomerType.Normal;

const CUSTOMER_PRIORITY_RANK: Record<CustomerType, number> = {
  [CustomerType.Vip]: 0,
  [CustomerType.Delivery]: 1,
  [CustomerType.Normal]: 2
};

export function enqueuePendingOrder(
  queue: OrderQueue,
  order: PendingOrder
): OrderQueue {
  const insertIndex = queue.findIndex(
    (queuedOrder) => comparePendingOrderPriority(order, queuedOrder) < 0
  );

  if (insertIndex === -1) {
    return [...queue, order];
  }

  return [...queue.slice(0, insertIndex), order, ...queue.slice(insertIndex)];
}

function comparePendingOrderPriority(
  firstOrder: PendingOrder,
  secondOrder: PendingOrder
): number {
  if (firstOrder.customerType !== secondOrder.customerType) {
    return (
      CUSTOMER_PRIORITY_RANK[firstOrder.customerType] -
      CUSTOMER_PRIORITY_RANK[secondOrder.customerType]
    );
  }

  if (firstOrder.createdAt !== secondOrder.createdAt) {
    return firstOrder.createdAt - secondOrder.createdAt;
  }

  return firstOrder.id - secondOrder.id;
}

export function requeueInterruptedOrder(
  queue: OrderQueue,
  order: PendingOrder
): OrderQueue {
  const insertIndex = queue.findIndex(
    (queuedOrder) => comparePendingOrderPriority(order, queuedOrder) < 0
  );

  if (insertIndex === -1) {
    return [...queue, order];
  }

  return [...queue.slice(0, insertIndex), order, ...queue.slice(insertIndex)];
}
