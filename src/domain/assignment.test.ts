import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assignPendingOrdersToIdleBots,
  BotStatus,
  completeProcessingOrders,
  CustomerType,
  enqueuePendingOrder,
  ORDER_PROCESSING_TIME_MS,
  OrderStatus,
  pauseBot,
  removeNewestBot,
  resumeBot,
  type BotsByStatus,
  type OrdersByStatus,
  type PendingOrder
} from ".";

function pendingOrder(
  id: number,
  customerType: CustomerType,
  createdAt = id
): PendingOrder {
  return {
    id,
    customerType,
    status: OrderStatus.Pending,
    createdAt
  };
}

function emptyOrders(): OrdersByStatus {
  return {
    [OrderStatus.Pending]: [],
    [OrderStatus.Processing]: [],
    [OrderStatus.Complete]: []
  };
}

describe("order queue priority", () => {
  it("queues VIP orders behind existing VIP orders and before normal orders", () => {
    const queue = [
      pendingOrder(1, CustomerType.Vip),
      pendingOrder(2, CustomerType.Normal),
      pendingOrder(3, CustomerType.Normal)
    ];

    const nextQueue = enqueuePendingOrder(
      queue,
      pendingOrder(4, CustomerType.Vip)
    );

    assert.deepEqual(
      nextQueue.map((order) => order.id),
      [1, 4, 2, 3]
    );
  });

  it("queues normal orders after all existing pending orders", () => {
    const queue = [
      pendingOrder(1, CustomerType.Vip),
      pendingOrder(2, CustomerType.Normal)
    ];

    const nextQueue = enqueuePendingOrder(
      queue,
      pendingOrder(3, CustomerType.Normal)
    );

    assert.deepEqual(
      nextQueue.map((order) => order.id),
      [1, 2, 3]
    );
  });
});

describe("bot assignment", () => {
  it("moves an idle bot and the next pending order into processing", () => {
    const pickedUpAt = 1_000;
    const result = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [{ id: 1, status: BotStatus.Idle, createdAt: 10 }],
        [BotStatus.Processing]: [],
        [BotStatus.Paused]: []
      },
      orders: {
        ...emptyOrders(),
        [OrderStatus.Pending]: [pendingOrder(1, CustomerType.Normal, 100)]
      },
      pickedUpAt
    });

    assert.deepEqual(result.bots[BotStatus.Idle], []);
    assert.deepEqual(result.orders[OrderStatus.Pending], []);
    assert.deepEqual(result.bots[BotStatus.Processing], [
      {
        id: 1,
        status: BotStatus.Processing,
        createdAt: 10,
        orderId: 1,
        pickedUpAt,
        completesAt: pickedUpAt + ORDER_PROCESSING_TIME_MS
      }
    ]);
    assert.deepEqual(result.orders[OrderStatus.Processing], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Processing,
        createdAt: 100,
        pickedUpAt,
        completesAt: pickedUpAt + ORDER_PROCESSING_TIME_MS,
        botId: 1
      }
    ]);
  });
});

describe("order completion", () => {
  it("does not complete before 10 seconds and completes once 10 seconds have elapsed", () => {
    const pickedUpAt = 2_000;
    const assigned = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [{ id: 1, status: BotStatus.Idle, createdAt: 10 }],
        [BotStatus.Processing]: [],
        [BotStatus.Paused]: []
      },
      orders: {
        ...emptyOrders(),
        [OrderStatus.Pending]: [pendingOrder(1, CustomerType.Normal, 100)]
      },
      pickedUpAt
    });

    const tooEarly = completeProcessingOrders({
      ...assigned,
      completedAt: pickedUpAt + ORDER_PROCESSING_TIME_MS - 1
    });

    assert.equal(tooEarly.orders[OrderStatus.Complete].length, 0);
    assert.equal(tooEarly.orders[OrderStatus.Processing].length, 1);
    assert.equal(tooEarly.bots[BotStatus.Idle].length, 0);

    const completed = completeProcessingOrders({
      ...tooEarly,
      completedAt: pickedUpAt + ORDER_PROCESSING_TIME_MS
    });

    assert.deepEqual(completed.orders[OrderStatus.Processing], []);
    assert.deepEqual(completed.orders[OrderStatus.Complete], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Complete,
        createdAt: 100,
        pickedUpAt,
        completedAt: pickedUpAt + ORDER_PROCESSING_TIME_MS,
        botId: 1
      }
    ]);
    assert.deepEqual(completed.bots[BotStatus.Idle], [
      { id: 1, status: BotStatus.Idle, createdAt: 10 }
    ]);
  });

  it("starts the next pending order from the completion timestamp", () => {
    const pickedUpAt = 2_000;
    const completedAt = pickedUpAt + ORDER_PROCESSING_TIME_MS;
    const assigned = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [{ id: 1, status: BotStatus.Idle, createdAt: 10 }],
        [BotStatus.Processing]: [],
        [BotStatus.Paused]: []
      },
      orders: {
        ...emptyOrders(),
        [OrderStatus.Pending]: [
          pendingOrder(1, CustomerType.Normal, 100),
          pendingOrder(2, CustomerType.Normal, 200)
        ]
      },
      pickedUpAt
    });

    const result = completeProcessingOrders({
      ...assigned,
      completedAt
    });

    assert.deepEqual(result.orders[OrderStatus.Complete], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Complete,
        createdAt: 100,
        pickedUpAt,
        completedAt,
        botId: 1
      }
    ]);
    assert.deepEqual(result.orders[OrderStatus.Processing], [
      {
        id: 2,
        customerType: CustomerType.Normal,
        status: OrderStatus.Processing,
        createdAt: 200,
        pickedUpAt: completedAt,
        completesAt: completedAt + ORDER_PROCESSING_TIME_MS,
        botId: 1
      }
    ]);
    assert.deepEqual(result.bots[BotStatus.Processing], [
      {
        id: 1,
        status: BotStatus.Processing,
        createdAt: 10,
        orderId: 2,
        pickedUpAt: completedAt,
        completesAt: completedAt + ORDER_PROCESSING_TIME_MS
      }
    ]);
  });
});

describe("bot pause and resume", () => {
  it("does not assign pending work to a paused idle bot", () => {
    const paused = pauseBot({
      bots: {
        [BotStatus.Idle]: [{ id: 1, status: BotStatus.Idle, createdAt: 10 }],
        [BotStatus.Processing]: [],
        [BotStatus.Paused]: []
      },
      orders: emptyOrders(),
      botId: 1,
      pausedAt: 1_000
    });

    const result = assignPendingOrdersToIdleBots({
      bots: paused.bots,
      orders: {
        ...paused.orders,
        [OrderStatus.Pending]: [pendingOrder(1, CustomerType.Normal, 100)]
      },
      pickedUpAt: 2_000
    });

    assert.deepEqual(result.orders[OrderStatus.Pending], [
      pendingOrder(1, CustomerType.Normal, 100)
    ]);
    assert.deepEqual(result.bots[BotStatus.Processing], []);
    assert.deepEqual(result.bots[BotStatus.Paused], [
      {
        id: 1,
        status: BotStatus.Paused,
        createdAt: 10,
        pausedAt: 1_000
      }
    ]);
  });

  it("resumes an idle bot and immediately assigns pending work", () => {
    const resumedAt = 3_000;
    const result = resumeBot({
      bots: {
        [BotStatus.Idle]: [],
        [BotStatus.Processing]: [],
        [BotStatus.Paused]: [
          {
            id: 1,
            status: BotStatus.Paused,
            createdAt: 10,
            pausedAt: 1_000
          }
        ]
      },
      orders: {
        ...emptyOrders(),
        [OrderStatus.Pending]: [pendingOrder(1, CustomerType.Normal, 100)]
      },
      botId: 1,
      resumedAt
    });

    assert.deepEqual(result.orders[OrderStatus.Pending], []);
    assert.deepEqual(result.bots[BotStatus.Paused], []);
    assert.deepEqual(result.bots[BotStatus.Processing], [
      {
        id: 1,
        status: BotStatus.Processing,
        createdAt: 10,
        orderId: 1,
        pickedUpAt: resumedAt,
        completesAt: resumedAt + ORDER_PROCESSING_TIME_MS
      }
    ]);
  });

  it("does not complete a paused processing bot on the original timer", () => {
    const pickedUpAt = 1_000;
    const assigned = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [{ id: 1, status: BotStatus.Idle, createdAt: 10 }],
        [BotStatus.Processing]: [],
        [BotStatus.Paused]: []
      },
      orders: {
        ...emptyOrders(),
        [OrderStatus.Pending]: [pendingOrder(1, CustomerType.Normal, 100)]
      },
      pickedUpAt
    });
    const pausedAt = pickedUpAt + 4_000;
    const paused = pauseBot({
      ...assigned,
      botId: 1,
      pausedAt
    });

    const result = completeProcessingOrders({
      ...paused,
      completedAt: pickedUpAt + ORDER_PROCESSING_TIME_MS
    });

    assert.deepEqual(result.orders[OrderStatus.Complete], []);
    assert.equal(result.orders[OrderStatus.Processing].length, 1);
    assert.deepEqual(result.bots[BotStatus.Processing], []);
    assert.deepEqual(result.bots[BotStatus.Paused], [
      {
        id: 1,
        status: BotStatus.Paused,
        createdAt: 10,
        orderId: 1,
        pickedUpAt,
        completesAt: pickedUpAt + ORDER_PROCESSING_TIME_MS,
        pausedAt,
        elapsedMs: 4_000,
        remainingMs: 6_000
      }
    ]);
  });

  it("resumes a processing bot with only the paused order time remaining", () => {
    const pickedUpAt = 1_000;
    const assigned = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [{ id: 1, status: BotStatus.Idle, createdAt: 10 }],
        [BotStatus.Processing]: [],
        [BotStatus.Paused]: []
      },
      orders: {
        ...emptyOrders(),
        [OrderStatus.Pending]: [pendingOrder(1, CustomerType.Normal, 100)]
      },
      pickedUpAt
    });
    const paused = pauseBot({
      ...assigned,
      botId: 1,
      pausedAt: pickedUpAt + 4_000
    });
    const resumedAt = 20_000;
    const resumed = resumeBot({
      ...paused,
      botId: 1,
      resumedAt
    });

    assert.deepEqual(resumed.orders[OrderStatus.Processing], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Processing,
        createdAt: 100,
        pickedUpAt: resumedAt - 4_000,
        completesAt: resumedAt + 6_000,
        botId: 1
      }
    ]);

    const tooEarly = completeProcessingOrders({
      ...resumed,
      completedAt: resumedAt + 6_000 - 1
    });

    assert.deepEqual(tooEarly.orders[OrderStatus.Complete], []);

    const completed = completeProcessingOrders({
      ...tooEarly,
      completedAt: resumedAt + 6_000
    });

    assert.deepEqual(completed.orders[OrderStatus.Complete], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Complete,
        createdAt: 100,
        pickedUpAt: resumedAt - 4_000,
        completedAt: resumedAt + 6_000,
        botId: 1
      }
    ]);
  });

  it("removes a paused processing bot and requeues its order by priority", () => {
    const pickedUpAt = 1_000;
    const completesAt = pickedUpAt + ORDER_PROCESSING_TIME_MS;
    const pausedAt = pickedUpAt + 3_000;
    const interruptedOrder = {
      id: 2,
      customerType: CustomerType.Vip,
      status: OrderStatus.Processing,
      createdAt: 20,
      pickedUpAt,
      completesAt,
      botId: 1
    } as const;

    const result = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [],
        [BotStatus.Processing]: [],
        [BotStatus.Paused]: [
          {
            id: 1,
            status: BotStatus.Paused,
            createdAt: 10,
            orderId: interruptedOrder.id,
            pickedUpAt,
            completesAt,
            pausedAt,
            elapsedMs: 3_000,
            remainingMs: 7_000
          }
        ]
      },
      orders: {
        [OrderStatus.Pending]: [
          pendingOrder(1, CustomerType.Vip, 10),
          pendingOrder(3, CustomerType.Normal, 30)
        ],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      }
    });

    assert.deepEqual(result.bots[BotStatus.Paused], []);
    assert.deepEqual(result.orders[OrderStatus.Processing], []);
    assert.deepEqual(
      result.orders[OrderStatus.Pending].map((order) => order.id),
      [1, 2, 3]
    );
  });
});

describe("bot removal", () => {
  it("removes the newest idle bot", () => {
    const result = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [
          { id: 1, status: BotStatus.Idle, createdAt: 10 },
          { id: 2, status: BotStatus.Idle, createdAt: 20 }
        ],
        [BotStatus.Processing]: [],
        [BotStatus.Paused]: []
      },
      orders: emptyOrders()
    });

    assert.deepEqual(result.bots[BotStatus.Idle], [
      { id: 1, status: BotStatus.Idle, createdAt: 10 }
    ]);
    assert.deepEqual(result.bots[BotStatus.Processing], []);
  });

  it("removes the newest processing bot and requeues its order by priority", () => {
    const pickedUpAt = 1_000;
    const completesAt = pickedUpAt + ORDER_PROCESSING_TIME_MS;
    const interruptedOrder = {
      id: 3,
      customerType: CustomerType.Vip,
      status: OrderStatus.Processing,
      createdAt: 30,
      pickedUpAt,
      completesAt,
      botId: 2
    } as const;

    const result = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [{ id: 1, status: BotStatus.Idle, createdAt: 10 }],
        [BotStatus.Processing]: [
          {
            id: 2,
            status: BotStatus.Processing,
            createdAt: 20,
            orderId: 3,
            pickedUpAt,
            completesAt
          }
        ],
        [BotStatus.Paused]: []
      },
      orders: {
        [OrderStatus.Pending]: [
          pendingOrder(1, CustomerType.Vip, 10),
          pendingOrder(2, CustomerType.Normal, 20)
        ],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      }
    });

    assert.deepEqual(result.bots[BotStatus.Idle], [
      { id: 1, status: BotStatus.Idle, createdAt: 10 }
    ]);
    assert.deepEqual(result.bots[BotStatus.Processing], []);
    assert.deepEqual(
      result.orders[OrderStatus.Pending].map((order) => [
        order.id,
        order.customerType,
        order.status
      ]),
      [
        [1, CustomerType.Vip, OrderStatus.Pending],
        [3, CustomerType.Vip, OrderStatus.Pending],
        [2, CustomerType.Normal, OrderStatus.Pending]
      ]
    );
    assert.deepEqual(result.orders[OrderStatus.Processing], []);
  });

  it("returns an interrupted VIP order before later VIP orders and normal orders", () => {
    const pickedUpAt = 1_000;
    const completesAt = pickedUpAt + ORDER_PROCESSING_TIME_MS;
    const interruptedOrder = {
      id: 2,
      customerType: CustomerType.Vip,
      status: OrderStatus.Processing,
      createdAt: 20,
      pickedUpAt,
      completesAt,
      botId: 1
    } as const;

    const result = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [],
        [BotStatus.Processing]: [
          {
            id: 1,
            status: BotStatus.Processing,
            createdAt: 10,
            orderId: interruptedOrder.id,
            pickedUpAt,
            completesAt
          }
        ],
        [BotStatus.Paused]: []
      },
      orders: {
        [OrderStatus.Pending]: [
          pendingOrder(1, CustomerType.Vip, 10),
          pendingOrder(4, CustomerType.Vip, 40),
          pendingOrder(3, CustomerType.Normal, 30)
        ],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      }
    });

    assert.deepEqual(
      result.orders[OrderStatus.Pending].map((order) => order.id),
      [1, 2, 4, 3]
    );
    assert.deepEqual(result.orders[OrderStatus.Pending][1], {
      id: 2,
      customerType: CustomerType.Vip,
      status: OrderStatus.Pending,
      createdAt: 20
    });
  });

  it("returns an interrupted normal order after VIP orders and before later normal orders", () => {
    const pickedUpAt = 1_000;
    const completesAt = pickedUpAt + ORDER_PROCESSING_TIME_MS;
    const interruptedOrder = {
      id: 2,
      customerType: CustomerType.Normal,
      status: OrderStatus.Processing,
      createdAt: 20,
      pickedUpAt,
      completesAt,
      botId: 1
    } as const;

    const result = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [],
        [BotStatus.Processing]: [
          {
            id: 1,
            status: BotStatus.Processing,
            createdAt: 10,
            orderId: interruptedOrder.id,
            pickedUpAt,
            completesAt
          }
        ],
        [BotStatus.Paused]: []
      },
      orders: {
        [OrderStatus.Pending]: [
          pendingOrder(3, CustomerType.Vip, 30),
          pendingOrder(4, CustomerType.Normal, 40),
          pendingOrder(5, CustomerType.Normal, 50)
        ],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      }
    });

    assert.deepEqual(
      result.orders[OrderStatus.Pending].map((order) => order.id),
      [3, 2, 4, 5]
    );
    assert.deepEqual(result.orders[OrderStatus.Pending][1], {
      id: 2,
      customerType: CustomerType.Normal,
      status: OrderStatus.Pending,
      createdAt: 20
    });
  });

  it("does not complete a requeued processing order on its original timer", () => {
    const pickedUpAt = 1_000;
    const originalCompletesAt = pickedUpAt + ORDER_PROCESSING_TIME_MS;
    const interruptedOrder = {
      id: 1,
      customerType: CustomerType.Normal,
      status: OrderStatus.Processing,
      createdAt: 100,
      pickedUpAt,
      completesAt: originalCompletesAt,
      botId: 2
    } as const;

    const removed = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [{ id: 1, status: BotStatus.Idle, createdAt: 10 }],
        [BotStatus.Processing]: [
          {
            id: 2,
            status: BotStatus.Processing,
            createdAt: 20,
            orderId: interruptedOrder.id,
            pickedUpAt,
            completesAt: originalCompletesAt
          }
        ],
        [BotStatus.Paused]: []
      },
      orders: {
        [OrderStatus.Pending]: [],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      }
    });

    assert.deepEqual(removed.orders[OrderStatus.Pending], [
      pendingOrder(1, CustomerType.Normal, 100)
    ]);
    assert.deepEqual(removed.orders[OrderStatus.Processing], []);

    const restarted = completeProcessingOrders({
      ...removed,
      completedAt: originalCompletesAt
    });

    assert.deepEqual(restarted.orders[OrderStatus.Complete], []);
    assert.deepEqual(restarted.orders[OrderStatus.Pending], []);
    assert.deepEqual(restarted.orders[OrderStatus.Processing], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Processing,
        createdAt: 100,
        pickedUpAt: originalCompletesAt,
        completesAt: originalCompletesAt + ORDER_PROCESSING_TIME_MS,
        botId: 1
      }
    ]);
    assert.deepEqual(restarted.bots[BotStatus.Processing], [
      {
        id: 1,
        status: BotStatus.Processing,
        createdAt: 10,
        orderId: 1,
        pickedUpAt: originalCompletesAt,
        completesAt: originalCompletesAt + ORDER_PROCESSING_TIME_MS
      }
    ]);

    const originalTimerElapsedAgain = completeProcessingOrders({
      ...restarted,
      completedAt: originalCompletesAt + ORDER_PROCESSING_TIME_MS - 1
    });

    assert.deepEqual(
      originalTimerElapsedAgain.orders[OrderStatus.Complete],
      []
    );
    assert.equal(
      originalTimerElapsedAgain.orders[OrderStatus.Processing][0].pickedUpAt,
      originalCompletesAt
    );

    const completedAfterRestartedTimer = completeProcessingOrders({
      ...originalTimerElapsedAgain,
      completedAt: originalCompletesAt + ORDER_PROCESSING_TIME_MS
    });

    assert.deepEqual(
      completedAfterRestartedTimer.orders[OrderStatus.Complete],
      [
        {
          id: 1,
          customerType: CustomerType.Normal,
          status: OrderStatus.Complete,
          createdAt: 100,
          pickedUpAt: originalCompletesAt,
          completedAt: originalCompletesAt + ORDER_PROCESSING_TIME_MS,
          botId: 1
        }
      ]
    );
  });
});
