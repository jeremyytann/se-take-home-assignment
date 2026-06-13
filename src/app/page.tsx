"use client";

import { useEffect, useMemo, useState } from "react";

import {
  assignPendingOrdersToIdleBots,
  BotStatus,
  CustomerType,
  OrderStatus,
  completeProcessingOrders,
  enqueuePendingOrder,
  removeNewestBot,
  type Bot,
  type BotsByStatus,
  type OrdersByStatus,
  type PendingOrder
} from "@/domain";

const INITIAL_ORDER_ID = 1;

type OrdersPageState = {
  bots: BotsByStatus;
  orders: OrdersByStatus;
  nextOrderId: number;
  nextBotId: number;
  currentTime: number;
};

function emptyBots(): BotsByStatus {
  return {
    [BotStatus.Idle]: [],
    [BotStatus.Processing]: []
  };
}

function formatOrderId(orderId: number): string {
  return orderId.toString().padStart(4, "0");
}

function formatBotId(botId: number): string {
  return `BOT-${botId.toString().padStart(2, "0")}`;
}

function formatCustomerType(customerType: CustomerType): string {
  return customerType === CustomerType.Vip ? "VIP" : "Normal";
}

function CustomerTypeBadge({ customerType }: { customerType: CustomerType }) {
  const isVip = customerType === CustomerType.Vip;

  return (
    <span className={`customer-type-badge ${isVip ? "vip" : "normal"}`}>
      {formatCustomerType(customerType)}
    </span>
  );
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`order-status-badge ${status.toLowerCase()}`}>
      {formatOrderStatus(status)}
    </span>
  );
}

function formatOrderStatus(status: BotStatus | OrderStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatRemainingTime(completesAt: number, currentTime: number): string {
  const remainingMs = Math.max(0, completesAt - currentTime);

  if (remainingMs === 0) {
    return "finishing";
  }

  return `${Math.ceil(remainingMs / 1_000)}s remaining`;
}

function getProgress(
  pickedUpAt: number,
  completesAt: number,
  currentTime: number
): number {
  const duration = completesAt - pickedUpAt;

  if (duration <= 0) {
    return 100;
  }

  return Math.min(
    100,
    Math.max(0, ((currentTime - pickedUpAt) / duration) * 100)
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24">
      <path d="M3 5h2l2.4 10.3h9.9l2.1-7.2H8" />
      <path d="M9 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M17 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M13 3v6" />
      <path d="m10.5 5.5 2.5-2.5 2.5 2.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg aria-hidden="true" className="icon icon-fill" viewBox="0 0 24 24">
      <path d="m12 2 2.9 6 6.6 1-4.8 4.7 1.1 6.6L12 17.2l-5.8 3.1 1.1-6.6L2.5 9l6.6-1L12 2Z" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24">
      <path d="M12 5V2" />
      <path d="M8 9h8" />
      <path d="M8 15h8" />
      <path d="M7 19h10a3 3 0 0 0 3-3v-5a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v5a3 3 0 0 0 3 3Z" />
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M4 13H2" />
      <path d="M22 13h-2" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24">
      <path d="M7 4h10v16H7z" />
      <path d="M10 4V2h4v2" />
      <path d="M10 9h4" />
      <path d="M10 13h3" />
      <path d="M18 14.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M18 16.5v2l1.5 1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function EmptyOrderState({
  message,
  title,
  variant
}: {
  message: string;
  title: string;
  variant: "pending" | "complete";
}) {
  return (
    <div className={`order-empty-state ${variant}`}>
      <div className="empty-state-icon" aria-hidden="true">
        {variant === "pending" ? <QueueIcon /> : <CheckIcon />}
      </div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

export default function OrdersPage() {
  const [orderState, setOrderState] = useState<OrdersPageState>(() => ({
    bots: emptyBots(),
    orders: {
      [OrderStatus.Pending]: [],
      [OrderStatus.Processing]: [],
      [OrderStatus.Complete]: []
    },
    nextOrderId: INITIAL_ORDER_ID,
    nextBotId: 1,
    currentTime: Date.now()
  }));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const completedAt = Date.now();

      setOrderState((state) => ({
        ...state,
        ...completeProcessingOrders({
          bots: state.bots,
          orders: state.orders,
          completedAt
        }),
        currentTime: completedAt
      }));
    }, 250);

    return () => window.clearInterval(intervalId);
  }, []);

  const botList = useMemo(
    () =>
      [
        ...orderState.bots[BotStatus.Idle],
        ...orderState.bots[BotStatus.Processing]
      ].sort((firstBot, secondBot) => firstBot.id - secondBot.id),
    [orderState.bots]
  );

  const processingOrdersById = useMemo(
    () =>
      new Map(
        orderState.orders[OrderStatus.Processing].map((order) => [
          order.id,
          order
        ])
      ),
    [orderState.orders]
  );

  const currentPendingOrders = orderState.orders[OrderStatus.Pending];
  const currentCompletedOrders = orderState.orders[OrderStatus.Complete];

  function createOrder(customerType: CustomerType) {
    const createdAt = Date.now();

    setOrderState((state) => {
      const orders: OrdersByStatus = {
        ...state.orders,
        [OrderStatus.Pending]: enqueuePendingOrder(
          state.orders[OrderStatus.Pending],
          {
            id: state.nextOrderId,
            customerType,
            status: OrderStatus.Pending,
            createdAt
          }
        )
      };

      return {
        ...state,
        ...assignPendingOrdersToIdleBots({
          bots: state.bots,
          orders,
          pickedUpAt: createdAt
        }),
        nextOrderId: state.nextOrderId + 1,
        currentTime: createdAt
      };
    });
  }

  function addBot() {
    const createdAt = Date.now();

    setOrderState((state) => {
      const bots: BotsByStatus = {
        ...state.bots,
        [BotStatus.Idle]: [
          ...state.bots[BotStatus.Idle],
          {
            id: state.nextBotId,
            status: BotStatus.Idle,
            createdAt
          }
        ]
      };

      return {
        ...state,
        ...assignPendingOrdersToIdleBots({
          bots,
          orders: state.orders,
          pickedUpAt: createdAt
        }),
        nextBotId: state.nextBotId + 1,
        currentTime: createdAt
      };
    });
  }

  function removeBot() {
    const removedAt = Date.now();

    setOrderState((state) => ({
      ...state,
      ...removeNewestBot({
        bots: state.bots,
        orders: state.orders
      }),
      currentTime: removedAt
    }));
  }

  function renderBotWork(bot: Bot) {
    if (bot.status === BotStatus.Idle) {
      return (
        <>
          <div className="bot-work idle-work">
            <span>Waiting</span>
            <strong>No order</strong>
          </div>
          <div className="progress-track idle" aria-hidden="true">
            <span />
          </div>
          <p>Ready for the next order</p>
        </>
      );
    }

    const order = processingOrdersById.get(bot.orderId);

    return (
      <>
        <div className="bot-work">
          <span>Preparing</span>
          <strong>
            #{formatOrderId(bot.orderId)}
            {order?.customerType === CustomerType.Vip ? <StarIcon /> : null}
          </strong>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span
            style={{
              width: `${getProgress(
                bot.pickedUpAt,
                bot.completesAt,
                orderState.currentTime
              )}%`
            }}
          />
        </div>
        <p>{formatRemainingTime(bot.completesAt, orderState.currentTime)}</p>
      </>
    );
  }

  return (
    <main className="controller-page">
      <section className="controls-section" aria-labelledby="controller-title">
        <div className="order-controls">
          <h1 id="controller-title">Order Controller</h1>
          <div className="order-actions" aria-label="Order controls">
            <button
              className="control-button normal-order"
              type="button"
              onClick={() => createOrder(CustomerType.Normal)}
            >
              <CartIcon />
              New Normal Order
            </button>
            <button
              className="control-button vip-order"
              type="button"
              onClick={() => createOrder(CustomerType.Vip)}
            >
              <StarIcon />
              New VIP Order
            </button>
          </div>
        </div>

        <div className="bot-actions" aria-label="Bot controls">
          <button
            className="control-button remove-bot"
            type="button"
            onClick={removeBot}
            disabled={botList.length === 0}
          >
            <span aria-hidden="true">-</span>
            Bot
          </button>
          <button
            className="control-button add-bot"
            type="button"
            onClick={addBot}
          >
            <span aria-hidden="true">+</span>
            Bot
          </button>
        </div>
      </section>

      <section className="bots-section" aria-labelledby="bots-title">
        <div className="section-heading">
          <h2 id="bots-title">Active Bot Fleet</h2>
          <span className="count-badge neutral">
            {botList.length} bots total
          </span>
        </div>

        {botList.length > 0 ? (
          <div className="bot-strip">
            <div className="bot-grid">
              {botList.map((bot) => (
                <article
                  className={`bot-card ${
                    bot.status === BotStatus.Idle ? "idle" : "processing"
                  }`}
                  key={bot.id}
                >
                  <div className="bot-card-top">
                    <div className="bot-name">
                      <BotIcon />
                      <span>{formatBotId(bot.id)}</span>
                    </div>
                    <span
                      className={`status-badge ${
                        bot.status === BotStatus.Idle ? "idle" : "processing"
                      }`}
                    >
                      {formatOrderStatus(bot.status)}
                    </span>
                  </div>
                  {renderBotWork(bot)}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-bot-list">
            No bots are active. Add a bot to start processing the queue.
          </div>
        )}
      </section>

      <div className="order-columns">
        <section
          className="queue-panel pending-panel"
          aria-labelledby="pending-title"
        >
          <header className="panel-heading">
            <div className="panel-title">
              <QueueIcon />
              <h2 id="pending-title">Pending Queue</h2>
            </div>
            <span className="count-badge warning">
              {currentPendingOrders.length}
            </span>
          </header>
          <div className="queue-panel-body">
            {currentPendingOrders.length > 0 ? (
              <div className="pending-grid">
                {currentPendingOrders.map((order) => (
                  <article
                    className={`order-tile ${
                      order.customerType === CustomerType.Vip ? "vip" : "normal"
                    }`}
                    key={order.id}
                  >
                    <span className="order-label">Order</span>
                    <strong>#{formatOrderId(order.id)}</strong>
                    <div className="order-meta">
                      <span>
                        Type{" "}
                        <CustomerTypeBadge customerType={order.customerType} />
                      </span>
                      <span>
                        Status <OrderStatusBadge status={order.status} />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyOrderState
                variant="pending"
                title="No pending orders"
                message="New orders will appear here until a bot picks them up."
              />
            )}
          </div>
        </section>

        <section
          className="queue-panel complete-panel"
          aria-labelledby="complete-title"
        >
          <header className="panel-heading">
            <div className="panel-title">
              <span className="check-ring">
                <CheckIcon />
              </span>
              <h2 id="complete-title">Complete</h2>
            </div>
            <span className="count-badge success">
              {currentCompletedOrders.length}
            </span>
          </header>
          <div className="queue-panel-body">
            {currentCompletedOrders.length > 0 ? (
              <div className="complete-grid">
                {currentCompletedOrders.map((order) => (
                  <article
                    className={`order-tile complete ${
                      order.customerType === CustomerType.Vip ? "vip" : "normal"
                    }`}
                    key={order.id}
                  >
                    <span className="order-label">Order</span>
                    <strong>#{formatOrderId(order.id)}</strong>
                    <div className="order-meta">
                      <span>
                        Type{" "}
                        <CustomerTypeBadge customerType={order.customerType} />
                      </span>
                      <span>
                        Status <OrderStatusBadge status={order.status} />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyOrderState
                variant="complete"
                title="No completed orders"
                message="Finished orders will land here after a bot completes them."
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
