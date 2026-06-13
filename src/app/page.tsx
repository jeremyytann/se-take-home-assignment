const sections = [
  "Pending orders",
  "Processing orders",
  "Completed orders",
  "Cooking bots"
];

export default function OrdersPage() {
  return (
    <main className="content">
      <section className="intro">
        <h1>Orders</h1>
        <p>
          This route is ready for the order queue, VIP priority handling, and
          cooking bot controls.
        </p>
      </section>

      <section className="panel" aria-labelledby="planned-sections">
        <h2 id="planned-sections">App sections</h2>
        <ul>
          {sections.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
