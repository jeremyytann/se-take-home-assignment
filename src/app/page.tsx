type BotCard = {
  botId: string;
  orderId: string;
  remaining: string;
  progress: number;
  vip: boolean;
};

type PendingOrder = {
  id: string;
  kind: "VIP" | "NORMAL";
};

type CompleteOrder = {
  id: string;
};

const bots: BotCard[] = [
  {
    botId: "BOT-01",
    orderId: "0025",
    remaining: "5s",
    progress: 50,
    vip: true
  },
  {
    botId: "BOT-02",
    orderId: "0026",
    remaining: "10s",
    progress: 0,
    vip: true
  },
  {
    botId: "BOT-03",
    orderId: "0027",
    remaining: "10s",
    progress: 0,
    vip: true
  },
  { botId: "BOT-04", orderId: "0028", remaining: "10s", progress: 0, vip: true }
];

const pendingOrders: PendingOrder[] = [
  { id: "0029", kind: "VIP" },
  { id: "0030", kind: "VIP" },
  { id: "0031", kind: "VIP" },
  { id: "0008", kind: "NORMAL" },
  { id: "0009", kind: "NORMAL" },
  { id: "0010", kind: "NORMAL" },
  { id: "0011", kind: "NORMAL" },
  { id: "0012", kind: "NORMAL" },
  { id: "0013", kind: "NORMAL" },
  { id: "0014", kind: "NORMAL" },
  { id: "0015", kind: "NORMAL" }
];

const completedOrders: CompleteOrder[] = [
  { id: "0024" },
  { id: "0023" },
  { id: "0022" },
  { id: "0021" },
  { id: "0020" },
  { id: "0019" },
  { id: "0018" },
  { id: "0017" },
  { id: "0016" },
  { id: "0007" },
  { id: "0006" },
  { id: "0005" },
  { id: "0004" },
  { id: "0003" },
  { id: "0002" }
];

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
  return (
    <main className="controller-page">
      <section className="controls-section" aria-labelledby="controller-title">
        <div>
          <h1 id="controller-title">Order Controller</h1>
          <div className="order-actions" aria-label="Order controls">
            <button className="control-button normal-order" type="button">
              <CartIcon />
              New Normal Order
            </button>
            <button className="control-button vip-order" type="button">
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
                  #{bot.orderId}
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
            <span className="count-badge warning">13</span>
          </header>
          <div className="pending-grid">
            {pendingOrders.map((order) => (
              <article
                className={`order-tile ${order.kind === "VIP" ? "vip" : "normal"}`}
                key={order.id}
              >
                <span>Order</span>
                <strong>#{order.id}</strong>
                <mark>{order.kind}</mark>
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
            <span className="count-badge success">16</span>
          </header>
          <div className="complete-grid">
            {completedOrders.map((order) => (
              <article className="complete-tile" key={order.id}>
                <span>Ready for pickup</span>
                <strong>#{order.id}</strong>
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
