import { UserGroupIcon } from '@heroicons/react/24/outline';

export default function ClientsListPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Clientes</h1>
      <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
        <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay clientes disponibles</p>
      </div>
    </div>
  );
}