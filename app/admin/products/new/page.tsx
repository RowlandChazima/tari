import { ProductForm } from '../product-form';

export const metadata = {
  title: 'Add New Curtain | Tari Admin',
};

export default function NewProductPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <ProductForm isNew={true} />
    </div>
  );
}

