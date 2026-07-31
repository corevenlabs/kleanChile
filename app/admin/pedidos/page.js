import OrdersManager from "../../../src/admin/components/OrdersManager";
import { getOrders } from "../../../src/infra/db/queries/orders.js";
import { requireUser } from "../../../src/lib/adminSession.js";

export const metadata = { title: "Pedidos" };

export default async function Page() {
  await requireUser();

  const orders = await getOrders();
  const pending = orders.filter((order) => order.status === "pending").length;

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-kicker">VENTAS</p>
          <h1>Pedidos</h1>
          <p>
            Confirmar un pedido descuenta su stock. Anular uno confirmado lo devuelve.
          </p>
        </div>
        {pending > 0 && <span className="admin-saved">{pending} por confirmar</span>}
      </header>

      <OrdersManager orders={orders} />
    </section>
  );
}
