import { BanknotesIcon } from '@heroicons/react/24/outline';

export default function BonusesPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Bonos</h1>
      <div className="bg-white rounded-md border border-gray-200 p-8 text-center">
        <BanknotesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Configuracion de bonos</p>
      </div>
    </div>
  );
}