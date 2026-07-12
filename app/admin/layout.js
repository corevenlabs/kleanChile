import AdminLayout from "../../src/admin/components/AdminLayout";
import ProtectedRoute from "../../src/admin/components/ProtectedRoute";

export const metadata = { title: "Administración | KleanChile" };

export default function Layout({ children }) {
  return <ProtectedRoute><AdminLayout>{children}</AdminLayout></ProtectedRoute>;
}
