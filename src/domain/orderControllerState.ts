import { completeProcessingOrders } from "./assignment";
import { BotStatus, type BotsByStatus } from "./bot";
import {
  CustomerType,
  OrderStatus,
  type CompleteOrder,
  type OrdersByStatus,
  type PendingOrder,
  type ProcessingOrder
} from "./order";

export const INITIAL_ORDER_ID = 1;
export const INITIAL_BOT_ID = 1;
export const ORDER_CONTROLLER_STORAGE_KEY = "order-controller-state";
export const ORDER_CONTROLLER_STORAGE_VERSION = 1;

export type OrderControllerState = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
  nextOrderId: number;
  nextBotId: number;
  currentTime: number;
};

export type PersistedOrderControllerState = {
  version: typeof ORDER_CONTROLLER_STORAGE_VERSION;
  bots: BotsByStatus;
  orders: OrdersByStatus;
  nextOrderId: number;
  nextBotId: number;
};

export function emptyBots(): BotsByStatus {
  return {
    [BotStatus.Idle]: [],
    [BotStatus.Processing]: []
  };
}

export function emptyOrders(): OrdersByStatus {
  return {
    [OrderStatus.Pending]: [],
    [OrderStatus.Processing]: [],
    [OrderStatus.Complete]: []
  };
}

export function createInitialOrderControllerState(
  currentTime = Date.now()
): OrderControllerState {
  return {
    bots: emptyBots(),
    orders: emptyOrders(),
    nextOrderId: INITIAL_ORDER_ID,
    nextBotId: INITIAL_BOT_ID,
    currentTime
  };
}

export function createPersistedOrderControllerState(
  state: OrderControllerState
): PersistedOrderControllerState {
  return {
    version: ORDER_CONTROLLER_STORAGE_VERSION,
    bots: state.bots,
    orders: state.orders,
    nextOrderId: state.nextOrderId,
    nextBotId: state.nextBotId
  };
}

export function serializeOrderControllerState(
  state: OrderControllerState
): string {
  return JSON.stringify(createPersistedOrderControllerState(state));
}

export function restoreOrderControllerState(
  serializedState: string | null,
  restoredAt = Date.now()
): OrderControllerState {
  if (!serializedState) {
    return createInitialOrderControllerState(restoredAt);
  }

  try {
    const snapshot = JSON.parse(serializedState) as unknown;

    if (!isPersistedOrderControllerState(snapshot)) {
      return createInitialOrderControllerState(restoredAt);
    }

    const restoredState = completeProcessingOrders({
      bots: snapshot.bots,
      orders: snapshot.orders,
      completedAt: restoredAt
    });

    return {
      ...restoredState,
      nextOrderId: snapshot.nextOrderId,
      nextBotId: snapshot.nextBotId,
      currentTime: restoredAt
    };
  } catch {
    return createInitialOrderControllerState(restoredAt);
  }
}

function isPersistedOrderControllerState(
  value: unknown
): value is PersistedOrderControllerState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === ORDER_CONTROLLER_STORAGE_VERSION &&
    isBotsByStatus(value.bots) &&
    isOrdersByStatus(value.orders) &&
    isPositiveInteger(value.nextOrderId) &&
    isPositiveInteger(value.nextBotId)
  );
}

function isBotsByStatus(value: unknown): value is BotsByStatus {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value[BotStatus.Idle]) &&
    value[BotStatus.Idle].every(isIdleBot) &&
    Array.isArray(value[BotStatus.Processing]) &&
    value[BotStatus.Processing].every(isProcessingBot)
  );
}

function isOrdersByStatus(value: unknown): value is OrdersByStatus {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value[OrderStatus.Pending]) &&
    value[OrderStatus.Pending].every(isPendingOrder) &&
    Array.isArray(value[OrderStatus.Processing]) &&
    value[OrderStatus.Processing].every(isProcessingOrder) &&
    Array.isArray(value[OrderStatus.Complete]) &&
    value[OrderStatus.Complete].every(isCompleteOrder)
  );
}

function isIdleBot(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.status === BotStatus.Idle &&
    isPositiveInteger(value.id) &&
    isTimestamp(value.createdAt)
  );
}

function isProcessingBot(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.status === BotStatus.Processing &&
    isPositiveInteger(value.id) &&
    isTimestamp(value.createdAt) &&
    isPositiveInteger(value.orderId) &&
    isTimestamp(value.pickedUpAt) &&
    isTimestamp(value.completesAt)
  );
}

function isPendingOrder(value: unknown): value is PendingOrder {
  return (
    isRecord(value) &&
    value.status === OrderStatus.Pending &&
    isPositiveInteger(value.id) &&
    isCustomerType(value.customerType) &&
    isTimestamp(value.createdAt)
  );
}

function isProcessingOrder(value: unknown): value is ProcessingOrder {
  return (
    isRecord(value) &&
    value.status === OrderStatus.Processing &&
    isPositiveInteger(value.id) &&
    isCustomerType(value.customerType) &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.pickedUpAt) &&
    isTimestamp(value.completesAt) &&
    isPositiveInteger(value.botId)
  );
}

function isCompleteOrder(value: unknown): value is CompleteOrder {
  return (
    isRecord(value) &&
    value.status === OrderStatus.Complete &&
    isPositiveInteger(value.id) &&
    isCustomerType(value.customerType) &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.pickedUpAt) &&
    isTimestamp(value.completedAt) &&
    isPositiveInteger(value.botId)
  );
}

function isCustomerType(value: unknown): value is CustomerType {
  return value === CustomerType.Normal || value === CustomerType.Vip;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
