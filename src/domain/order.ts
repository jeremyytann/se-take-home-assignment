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
