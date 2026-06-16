import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BotStatus,
  createInitialOrderControllerState,
  CustomerType,
  ORDER_CONTROLLER_STORAGE_VERSION,
  OrderStatus,
  restoreOrderControllerState,
  serializeOrderControllerState,
  type PersistedOrderControllerState
} from ".";

function persistedState(
  overrides: Partial<PersistedOrderControllerState> = {}
): PersistedOrderControllerState {
  return {
    version: ORDER_CONTROLLER_STORAGE_VERSION,
    bots: {
      [BotStatus.Idle]: [],
      [BotStatus.Processing]: []
    },
    orders: {
      [OrderStatus.Pending]: [],
      [OrderStatus.Processing]: [],
      [OrderStatus.Complete]: []
    },
    nextOrderId: 1,
    nextBotId: 1,
    ...overrides
  };
}

describe("order controller state persistence", () => {
  it("returns the initial state when no saved state exists", () => {
    const restoredAt = 5_000;

    assert.deepEqual(
      restoreOrderControllerState(null, restoredAt),
      createInitialOrderControllerState(restoredAt)
    );
  });

  it("restores valid pending and complete orders with next ids", () => {
    const restoredAt = 5_000;
    const savedState = persistedState({
      bots: {
        [BotStatus.Idle]: [],
        [BotStatus.Processing]: []
      },
      orders: {
        [OrderStatus.Pending]: [
          {
            id: 2,
            customerType: CustomerType.Vip,
            status: OrderStatus.Pending,
            createdAt: 200
          }
        ],
        [OrderStatus.Processing]: [],
        [OrderStatus.Complete]: [
          {
            id: 1,
            customerType: CustomerType.Normal,
            status: OrderStatus.Complete,
            createdAt: 100,
            pickedUpAt: 150,
            completedAt: 10_150,
            botId: 1
          }
        ]
      },
      nextOrderId: 3,
      nextBotId: 2
    });

    const restoredState = restoreOrderControllerState(
      JSON.stringify(savedState),
      restoredAt
    );

    assert.deepEqual(restoredState.bots, savedState.bots);
    assert.deepEqual(restoredState.orders, savedState.orders);
    assert.equal(restoredState.nextOrderId, 3);
    assert.equal(restoredState.nextBotId, 2);
    assert.equal(restoredState.currentTime, restoredAt);
  });

  it("keeps a processing order active when it has not completed yet", () => {
    const savedState = persistedState({
      bots: {
        [BotStatus.Idle]: [],
        [BotStatus.Processing]: [
          {
            id: 1,
            status: BotStatus.Processing,
            createdAt: 100,
            orderId: 1,
            pickedUpAt: 1_000,
            completesAt: 11_000
          }
        ]
      },
      orders: {
        [OrderStatus.Pending]: [],
        [OrderStatus.Processing]: [
          {
            id: 1,
            customerType: CustomerType.Normal,
            status: OrderStatus.Processing,
            createdAt: 100,
            pickedUpAt: 1_000,
            completesAt: 11_000,
            botId: 1
          }
        ],
        [OrderStatus.Complete]: []
      },
      nextOrderId: 2,
      nextBotId: 2
    });

    const restoredState = restoreOrderControllerState(
      JSON.stringify(savedState),
      5_000
    );

    assert.deepEqual(restoredState.bots, savedState.bots);
    assert.deepEqual(restoredState.orders, savedState.orders);
  });

  it("completes an overdue processing order during restore", () => {
    const savedState = persistedState({
      bots: {
        [BotStatus.Idle]: [],
        [BotStatus.Processing]: [
          {
            id: 1,
            status: BotStatus.Processing,
            createdAt: 100,
            orderId: 1,
            pickedUpAt: 1_000,
            completesAt: 11_000
          }
        ]
      },
      orders: {
        [OrderStatus.Pending]: [],
        [OrderStatus.Processing]: [
          {
            id: 1,
            customerType: CustomerType.Normal,
            status: OrderStatus.Processing,
            createdAt: 100,
            pickedUpAt: 1_000,
            completesAt: 11_000,
            botId: 1
          }
        ],
        [OrderStatus.Complete]: []
      },
      nextOrderId: 2,
      nextBotId: 2
    });

    const restoredState = restoreOrderControllerState(
      JSON.stringify(savedState),
      12_000
    );

    assert.deepEqual(restoredState.bots[BotStatus.Processing], []);
    assert.deepEqual(restoredState.bots[BotStatus.Idle], [
      { id: 1, status: BotStatus.Idle, createdAt: 100 }
    ]);
    assert.deepEqual(restoredState.orders[OrderStatus.Processing], []);
    assert.deepEqual(restoredState.orders[OrderStatus.Complete], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Complete,
        createdAt: 100,
        pickedUpAt: 1_000,
        completedAt: 12_000,
        botId: 1
      }
    ]);
  });

  it("falls back safely for corrupt or incompatible saved state", () => {
    const restoredAt = 5_000;

    assert.deepEqual(
      restoreOrderControllerState("{", restoredAt),
      createInitialOrderControllerState(restoredAt)
    );
    assert.deepEqual(
      restoreOrderControllerState(
        JSON.stringify({ ...persistedState(), version: 0 }),
        restoredAt
      ),
      createInitialOrderControllerState(restoredAt)
    );
  });

  it("serializes only durable state", () => {
    const state = createInitialOrderControllerState(5_000);

    assert.deepEqual(JSON.parse(serializeOrderControllerState(state)), {
      version: ORDER_CONTROLLER_STORAGE_VERSION,
      bots: state.bots,
      orders: state.orders,
      nextOrderId: state.nextOrderId,
      nextBotId: state.nextBotId
    });
  });
});
