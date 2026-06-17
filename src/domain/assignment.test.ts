import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assignPendingOrdersToIdleBots,
  BotStatus,
  BotType,
  completeProcessingOrders,
  CustomerType,
  enqueuePendingOrder,
  FAST_ORDER_PROCESSING_TIME_MS,
  ORDER_PROCESSING_TIME_MS,
  OrderStatus,
  removeNewestBot,
  type BotsByStatus,
  type IdleBot,
  type OrdersByStatus,
  type PendingOrder,
  type ProcessingBot
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

function idleBot(id: number, createdAt = id, type = BotType.Normal): IdleBot {
  return {
    id,
    type,
    status: BotStatus.Idle,
    createdAt
  };
}

function processingBot({
  id,
  orderId,
  pickedUpAt,
  completesAt,
  createdAt = id,
  type = BotType.Normal,
  processingElapsedMs
}: {
  id: number;
  orderId: number;
  pickedUpAt: number;
  completesAt: number;
  createdAt?: number;
  type?: BotType;
  processingElapsedMs?: number;
}): ProcessingBot {
  return {
    id,
    type,
    status: BotStatus.Processing,
    createdAt,
    orderId,
    pickedUpAt,
    completesAt,
    ...(processingElapsedMs ? { processingElapsedMs } : {})
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
        [BotStatus.Idle]: [idleBot(1, 10)],
        [BotStatus.Processing]: []
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
        type: BotType.Normal,
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

  it("assigns fast bots with a 5 second processing window", () => {
    const pickedUpAt = 1_000;
    const result = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [idleBot(1, 10, BotType.Fast)],
        [BotStatus.Processing]: []
      },
      orders: {
        ...emptyOrders(),
        [OrderStatus.Pending]: [pendingOrder(1, CustomerType.Normal, 100)]
      },
      pickedUpAt
    });

    assert.equal(
      result.bots[BotStatus.Processing][0].completesAt,
      pickedUpAt + FAST_ORDER_PROCESSING_TIME_MS
    );
    assert.equal(
      result.orders[OrderStatus.Processing][0].completesAt,
      pickedUpAt + FAST_ORDER_PROCESSING_TIME_MS
    );
  });

  it("assigns mixed bot types with their own processing windows", () => {
    const pickedUpAt = 1_000;
    const result = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [
          idleBot(1, 10, BotType.Normal),
          idleBot(2, 20, BotType.Fast)
        ],
        [BotStatus.Processing]: []
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

    assert.deepEqual(
      result.bots[BotStatus.Processing].map((bot) => bot.completesAt),
      [
        pickedUpAt + ORDER_PROCESSING_TIME_MS,
        pickedUpAt + FAST_ORDER_PROCESSING_TIME_MS
      ]
    );
    assert.deepEqual(
      result.orders[OrderStatus.Processing].map((order) => order.completesAt),
      [
        pickedUpAt + ORDER_PROCESSING_TIME_MS,
        pickedUpAt + FAST_ORDER_PROCESSING_TIME_MS
      ]
    );
  });
});

describe("order completion", () => {
  it("does not complete before 10 seconds and completes once 10 seconds have elapsed", () => {
    const pickedUpAt = 2_000;
    const assigned = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [idleBot(1, 10)],
        [BotStatus.Processing]: []
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
    assert.deepEqual(completed.bots[BotStatus.Idle], [idleBot(1, 10)]);
  });

  it("does not complete a fast bot before 5 seconds and completes at 5 seconds", () => {
    const pickedUpAt = 2_000;
    const assigned = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [idleBot(1, 10, BotType.Fast)],
        [BotStatus.Processing]: []
      },
      orders: {
        ...emptyOrders(),
        [OrderStatus.Pending]: [pendingOrder(1, CustomerType.Normal, 100)]
      },
      pickedUpAt
    });

    const tooEarly = completeProcessingOrders({
      ...assigned,
      completedAt: pickedUpAt + FAST_ORDER_PROCESSING_TIME_MS - 1
    });

    assert.equal(tooEarly.orders[OrderStatus.Complete].length, 0);
    assert.equal(tooEarly.orders[OrderStatus.Processing].length, 1);

    const completed = completeProcessingOrders({
      ...tooEarly,
      completedAt: pickedUpAt + FAST_ORDER_PROCESSING_TIME_MS
    });

    assert.deepEqual(completed.orders[OrderStatus.Processing], []);
    assert.deepEqual(completed.orders[OrderStatus.Complete], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Complete,
        createdAt: 100,
        pickedUpAt,
        completedAt: pickedUpAt + FAST_ORDER_PROCESSING_TIME_MS,
        botId: 1
      }
    ]);
    assert.deepEqual(completed.bots[BotStatus.Idle], [
      idleBot(1, 10, BotType.Fast)
    ]);
  });

  it("starts the next pending order from the completion timestamp", () => {
    const pickedUpAt = 2_000;
    const completedAt = pickedUpAt + ORDER_PROCESSING_TIME_MS;
    const assigned = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [idleBot(1, 10)],
        [BotStatus.Processing]: []
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
        type: BotType.Normal,
        status: BotStatus.Processing,
        createdAt: 10,
        orderId: 2,
        pickedUpAt: completedAt,
        completesAt: completedAt + ORDER_PROCESSING_TIME_MS
      }
    ]);
  });

  it("starts the next fast bot order from the completion timestamp with another 5 second window", () => {
    const pickedUpAt = 2_000;
    const completedAt = pickedUpAt + FAST_ORDER_PROCESSING_TIME_MS;
    const assigned = assignPendingOrdersToIdleBots({
      bots: {
        [BotStatus.Idle]: [idleBot(1, 10, BotType.Fast)],
        [BotStatus.Processing]: []
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
        completesAt: completedAt + FAST_ORDER_PROCESSING_TIME_MS,
        botId: 1
      }
    ]);
    assert.deepEqual(result.bots[BotStatus.Processing], [
      processingBot({
        id: 1,
        type: BotType.Fast,
        createdAt: 10,
        orderId: 2,
        pickedUpAt: completedAt,
        completesAt: completedAt + FAST_ORDER_PROCESSING_TIME_MS
      })
    ]);
  });
});

describe("bot removal", () => {
  it("removes the newest idle bot", () => {
    const result = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [idleBot(1, 10), idleBot(2, 20, BotType.Fast)],
        [BotStatus.Processing]: []
      },
      orders: emptyOrders(),
      removedAt: 100
    });

    assert.deepEqual(result.bots[BotStatus.Idle], [idleBot(1, 10)]);
    assert.deepEqual(result.bots[BotStatus.Processing], []);
  });

  it("removes the global newest idle bot regardless of type", () => {
    const result = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [idleBot(1, 30), idleBot(2, 20, BotType.Fast)],
        [BotStatus.Processing]: []
      },
      orders: emptyOrders(),
      removedAt: 100
    });

    assert.deepEqual(result.bots[BotStatus.Idle], [
      idleBot(2, 20, BotType.Fast)
    ]);
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
        [BotStatus.Idle]: [idleBot(1, 10)],
        [BotStatus.Processing]: [
          processingBot({
            id: 2,
            createdAt: 20,
            orderId: 3,
            pickedUpAt,
            completesAt
          })
        ]
      },
      orders: {
        [OrderStatus.Pending]: [
          pendingOrder(1, CustomerType.Vip, 10),
          pendingOrder(2, CustomerType.Normal, 20)
        ],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      },
      removedAt: pickedUpAt + 3_000
    });

    assert.deepEqual(result.bots[BotStatus.Idle], [idleBot(1, 10)]);
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
    assert.equal(
      result.orders[OrderStatus.Pending][1].processingElapsedMs,
      3_000
    );
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
          processingBot({
            id: 1,
            createdAt: 10,
            orderId: interruptedOrder.id,
            pickedUpAt,
            completesAt
          })
        ]
      },
      orders: {
        [OrderStatus.Pending]: [
          pendingOrder(1, CustomerType.Vip, 10),
          pendingOrder(4, CustomerType.Vip, 40),
          pendingOrder(3, CustomerType.Normal, 30)
        ],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      },
      removedAt: pickedUpAt + 3_000
    });

    assert.deepEqual(
      result.orders[OrderStatus.Pending].map((order) => order.id),
      [1, 2, 4, 3]
    );
    assert.deepEqual(result.orders[OrderStatus.Pending][1], {
      id: 2,
      customerType: CustomerType.Vip,
      status: OrderStatus.Pending,
      createdAt: 20,
      processingElapsedMs: 3_000
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
          processingBot({
            id: 1,
            createdAt: 10,
            orderId: interruptedOrder.id,
            pickedUpAt,
            completesAt
          })
        ]
      },
      orders: {
        [OrderStatus.Pending]: [
          pendingOrder(3, CustomerType.Vip, 30),
          pendingOrder(4, CustomerType.Normal, 40),
          pendingOrder(5, CustomerType.Normal, 50)
        ],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      },
      removedAt: pickedUpAt + 3_000
    });

    assert.deepEqual(
      result.orders[OrderStatus.Pending].map((order) => order.id),
      [3, 2, 4, 5]
    );
    assert.deepEqual(result.orders[OrderStatus.Pending][1], {
      id: 2,
      customerType: CustomerType.Normal,
      status: OrderStatus.Pending,
      createdAt: 20,
      processingElapsedMs: 3_000
    });
  });

  it("continues a requeued processing order from its persisted elapsed time", () => {
    const pickedUpAt = 1_000;
    const originalCompletesAt = pickedUpAt + ORDER_PROCESSING_TIME_MS;
    const removedAt = pickedUpAt + 3_000;
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
        [BotStatus.Idle]: [idleBot(1, 10)],
        [BotStatus.Processing]: [
          processingBot({
            id: 2,
            createdAt: 20,
            orderId: interruptedOrder.id,
            pickedUpAt,
            completesAt: originalCompletesAt
          })
        ]
      },
      orders: {
        [OrderStatus.Pending]: [],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      },
      removedAt
    });

    assert.deepEqual(removed.orders[OrderStatus.Pending], [
      {
        ...pendingOrder(1, CustomerType.Normal, 100),
        processingElapsedMs: 3_000
      }
    ]);
    assert.deepEqual(removed.orders[OrderStatus.Processing], []);

    const restarted = completeProcessingOrders({
      ...removed,
      completedAt: removedAt
    });

    assert.deepEqual(restarted.orders[OrderStatus.Complete], []);
    assert.deepEqual(restarted.orders[OrderStatus.Pending], []);
    assert.deepEqual(restarted.orders[OrderStatus.Processing], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Processing,
        createdAt: 100,
        pickedUpAt: removedAt,
        completesAt: removedAt + ORDER_PROCESSING_TIME_MS - 3_000,
        processingElapsedMs: 3_000,
        botId: 1
      }
    ]);
    assert.deepEqual(restarted.bots[BotStatus.Processing], [
      {
        id: 1,
        type: BotType.Normal,
        status: BotStatus.Processing,
        createdAt: 10,
        orderId: 1,
        pickedUpAt: removedAt,
        completesAt: removedAt + ORDER_PROCESSING_TIME_MS - 3_000,
        processingElapsedMs: 3_000
      }
    ]);

    const tooEarlyForRemainingTime = completeProcessingOrders({
      ...restarted,
      completedAt: removedAt + ORDER_PROCESSING_TIME_MS - 3_001
    });

    assert.deepEqual(tooEarlyForRemainingTime.orders[OrderStatus.Complete], []);
    assert.equal(
      tooEarlyForRemainingTime.orders[OrderStatus.Processing][0].pickedUpAt,
      removedAt
    );

    const completedAfterRestartedTimer = completeProcessingOrders({
      ...tooEarlyForRemainingTime,
      completedAt: removedAt + ORDER_PROCESSING_TIME_MS - 3_000
    });

    assert.deepEqual(
      completedAfterRestartedTimer.orders[OrderStatus.Complete],
      [
        {
          id: 1,
          customerType: CustomerType.Normal,
          status: OrderStatus.Complete,
          createdAt: 100,
          pickedUpAt: removedAt,
          completedAt: removedAt + ORDER_PROCESSING_TIME_MS - 3_000,
          botId: 1
        }
      ]
    );
  });

  it("uses persisted elapsed time against a fast bot processing window", () => {
    const pickedUpAt = 1_000;
    const removedAt = pickedUpAt + 3_000;
    const interruptedOrder = {
      id: 1,
      customerType: CustomerType.Normal,
      status: OrderStatus.Processing,
      createdAt: 100,
      pickedUpAt,
      completesAt: pickedUpAt + ORDER_PROCESSING_TIME_MS,
      botId: 2
    } as const;

    const removed = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [idleBot(1, 10, BotType.Fast)],
        [BotStatus.Processing]: [
          processingBot({
            id: 2,
            createdAt: 20,
            orderId: interruptedOrder.id,
            pickedUpAt,
            completesAt: interruptedOrder.completesAt
          })
        ]
      },
      orders: {
        [OrderStatus.Pending]: [],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      },
      removedAt
    });

    const restarted = completeProcessingOrders({
      ...removed,
      completedAt: removedAt
    });

    assert.deepEqual(restarted.orders[OrderStatus.Processing], [
      {
        id: 1,
        customerType: CustomerType.Normal,
        status: OrderStatus.Processing,
        createdAt: 100,
        pickedUpAt: removedAt,
        completesAt: removedAt + FAST_ORDER_PROCESSING_TIME_MS - 3_000,
        processingElapsedMs: 3_000,
        botId: 1
      }
    ]);
  });

  it("accumulates elapsed time across multiple interruptions", () => {
    const firstPickedUpAt = 1_000;
    const firstRemovedAt = firstPickedUpAt + 2_000;
    const secondPickedUpAt = 5_000;
    const secondRemovedAt = secondPickedUpAt + 3_000;
    const interruptedOrder = {
      id: 1,
      customerType: CustomerType.Normal,
      status: OrderStatus.Processing,
      createdAt: 100,
      pickedUpAt: secondPickedUpAt,
      completesAt: secondPickedUpAt + ORDER_PROCESSING_TIME_MS - 2_000,
      processingElapsedMs: firstRemovedAt - firstPickedUpAt,
      botId: 2
    } as const;

    const removed = removeNewestBot({
      bots: {
        [BotStatus.Idle]: [],
        [BotStatus.Processing]: [
          processingBot({
            id: 2,
            createdAt: 20,
            orderId: interruptedOrder.id,
            pickedUpAt: secondPickedUpAt,
            completesAt: interruptedOrder.completesAt,
            processingElapsedMs: interruptedOrder.processingElapsedMs
          })
        ]
      },
      orders: {
        [OrderStatus.Pending]: [],
        [OrderStatus.Processing]: [interruptedOrder],
        [OrderStatus.Complete]: []
      },
      removedAt: secondRemovedAt
    });

    assert.deepEqual(removed.orders[OrderStatus.Pending], [
      {
        ...pendingOrder(1, CustomerType.Normal, 100),
        processingElapsedMs: 5_000
      }
    ]);
  });
});
