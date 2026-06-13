"use client";

import { useState } from "react";

import {
  CustomerType,
  OrderStatus,
  enqueuePendingOrder,
  type PendingOrder
} from "@/domain";

type BotCard = {
  botId: string;
  orderId: number;
  remaining: string;
  progress: number;
  vip: boolean;
};

type CompleteOrder = {
  id: number;
};

const bots: BotCard[] = [
  {
    botId: "BOT-01",
    orderId: 25,
    remaining: "5s",
    progress: 50,
    vip: true
  },
  {
    botId: "BOT-02",
    orderId: 26,
    remaining: "10s",
    progress: 0,
    vip: true
  },
  {
    botId: "BOT-03",
    orderId: 27,
    remaining: "10s",
    progress: 0,
    vip: true
  },
  { botId: "BOT-04", orderId: 28, remaining: "10s", progress: 0, vip: true }
];

const pendingOrders: PendingOrder[] = [
  {
    id: 29,
    customerType: CustomerType.Vip,
    status: OrderStatus.Pending,
    createdAt: 29
  },
  {
    id: 30,
    customerType: CustomerType.Vip,
    status: OrderStatus.Pending,
    createdAt: 30
  },
  {
    id: 31,
    customerType: CustomerType.Vip,
    status: OrderStatus.Pending,
    createdAt: 31
  },
  {
    id: 8,
    customerType: CustomerType.Normal,
    status: OrderStatus.Pending,
    createdAt: 8
  },
  {
    id: 9,
    customerType: CustomerType.Normal,
    status: OrderStatus.Pending,
    createdAt: 9
  },
  {
    id: 10,
    customerType: CustomerType.Normal,
    status: OrderStatus.Pending,
    createdAt: 10
  },
  {
    id: 11,
    customerType: CustomerType.Normal,
    status: OrderStatus.Pending,
    createdAt: 11
  },
  {
    id: 12,
    customerType: CustomerType.Normal,
    status: OrderStatus.Pending,
    createdAt: 12
  },
  {
    id: 13,
    customerType: CustomerType.Normal,
    status: OrderStatus.Pending,
    createdAt: 13
  },
  {
    id: 14,
    customerType: CustomerType.Normal,
    status: OrderStatus.Pending,
    createdAt: 14
  },
  {
    id: 15,
    customerType: CustomerType.Normal,
    status: OrderStatus.Pending,
    createdAt: 15
  }
];

const completedOrders: CompleteOrder[] = [
  { id: 24 },
  { id: 23 },
  { id: 22 },
  { id: 21 },
  { id: 20 },
  { id: 19 },
  { id: 18 },
  { id: 17 },
  { id: 16 },
  { id: 7 },
  { id: 6 },
  { id: 5 },
  { id: 4 },
  { id: 3 },
  { id: 2 }
];

type OrdersPageState = {
  pendingOrders: PendingOrder[];
  nextOrderId: number;
};

function formatOrderId(orderId: number): string {
  return orderId.toString().padStart(4, "0");
}

function getInitialNextOrderId(): number {
  return (
    Math.max(
      ...bots.map((bot) => bot.orderId),
      ...pendingOrders.map((order) => order.id),
      ...completedOrders.map((order) => order.id)
    ) + 1
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

export default function OrdersPage() {
  const [{ pendingOrders: currentPendingOrders }, setOrderState] =
    useState<OrdersPageState>(() => ({
      pendingOrders,
      nextOrderId: getInitialNextOrderId()
    }));

  function createOrder(customerType: CustomerType) {
    setOrderState((state) => ({
      pendingOrders: enqueuePendingOrder(state.pendingOrders, {
        id: state.nextOrderId,
        customerType,
        status: OrderStatus.Pending,
        createdAt: Date.now()
      }),
      nextOrderId: state.nextOrderId + 1
    }));
  }

  return (
    <main className="controller-page">
      <section className="controls-section" aria-labelledby="controller-title">
        <div>
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
          <button className="control-button remove-bot" type="button">
            <span aria-hidden="true">-</span>
            Bot
          </button>
          <button className="control-button add-bot" type="button">
            <span aria-hidden="true">+</span>
            Bot
          </button>
        </div>
      </section>

      <section className="bots-section" aria-labelledby="bots-title">
        <div className="section-heading">
          <h2 id="bots-title">Active Bot Fleet</h2>
          <span className="count-badge neutral">{bots.length} bots total</span>
        </div>

        <div className="bot-grid">
          {bots.map((bot) => (
            <article className="bot-card" key={bot.botId}>
              <div className="bot-card-top">
                <div className="bot-name">
                  <BotIcon />
                  <span>{bot.botId}</span>
                </div>
                <span className="status-badge">Busy</span>
              </div>
              <div className="bot-work">
                <span>Preparing</span>
                <strong>
                  #{formatOrderId(bot.orderId)}
                  {bot.vip ? <StarIcon /> : null}
                </strong>
              </div>
              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${bot.progress}%` }} />
              </div>
              <p>{bot.remaining} remaining</p>
            </article>
          ))}
        </div>
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
          <div className="pending-grid">
            {currentPendingOrders.map((order) => (
              <article
                className={`order-tile ${
                  order.customerType === CustomerType.Vip ? "vip" : "normal"
                }`}
                key={order.id}
              >
                <span>Order</span>
                <strong>#{formatOrderId(order.id)}</strong>
                <mark>{order.customerType}</mark>
              </article>
            ))}
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
              {completedOrders.length}
            </span>
          </header>
          <div className="complete-grid">
            {completedOrders.map((order) => (
              <article className="complete-tile" key={order.id}>
                <span>Ready for pickup</span>
                <strong>#{formatOrderId(order.id)}</strong>
                <span className="tile-check">
                  <CheckIcon />
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
