import { CustomerDetailPage } from '../../components/customers/CustomerDetailPage';

export default async function CustomerRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailPage customerId={id} />;
}
