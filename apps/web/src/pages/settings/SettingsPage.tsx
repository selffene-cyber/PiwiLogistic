import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Configuracion</h1>
      <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
        <Cog6ToothIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Configuracion del sistema</p>
      </div>
    </div>
  );
}